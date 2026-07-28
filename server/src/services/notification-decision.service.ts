/**
 * 通知决策服务（Phase 1A）。
 * 不接入 push-engine / Socket；仅评估 + 可选审计写入。
 */

import type { NotificationCategory, NotificationPolicy, PrismaClient } from '@prisma/client'
import {
  getEventDefinition,
  isNonEssentialCategory,
  type NotificationCategoryName,
  type NotificationChannelName,
  type NotificationModeName,
} from './notification-event-registry.js'

export type SuppressionCode =
  | 'NOT_SUBSCRIBED'
  | 'QUIET_HOURS'
  | 'DAILY_CAP'
  | 'EXPIRED'
  | 'FILTER_MISS'
  | 'TASK_QUIET'
  | 'NON_ESSENTIAL_PAUSED'
  | 'INVALID_EVENT'

export type NotificationDecision = {
  deliver: boolean
  mode: NotificationModeName
  channels: NotificationChannelName[]
  reasonCode: string
  reasonText: string
  suppressionCode?: SuppressionCode
  category: NotificationCategoryName
  subscriptionId?: string | null
  /** 安静时段下 Windows 应延迟（站内仍可投递时为 true） */
  deferWindows?: boolean
}

export type NotificationFilterContext = {
  tags?: string[]
  regionIds?: number[]
  price?: number
  keywords?: string[]
  /** AgentTask 订阅绑定 */
  taskId?: string
}

export type NotificationIntent = {
  userId: string
  eventType: string
  sourceRef?: string | null
  resourceType?: string | null
  resourceId?: string | null
  filterContext?: NotificationFilterContext
  /** Phase 2 Quiet：对应 sourceRef 已进入安静 */
  taskQuiet?: boolean
  now?: Date
}

type SubscriptionFilters = {
  tags?: string[]
  regionIds?: number[]
  maxPrice?: number
  excludeKeywords?: string[]
  excludeTags?: string[]
  excludeRegions?: number[]
  taskId?: string
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function isValidQuietHHMM(value: string | null | undefined): boolean {
  if (value == null || value === '') return true
  return HHMM.test(value)
}

/** 判断 now 是否落在安静时段（支持跨午夜） */
export function isInQuietHours(
  now: Date,
  timezone: string,
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  if (!start || !end) return false
  if (!HHMM.test(start) || !HHMM.test(end)) return false
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const cur = hour * 60 + minute
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = sh * 60 + sm
  const e = eh * 60 + em
  if (s === e) return false
  if (s < e) return cur >= s && cur < e
  return cur >= s || cur < e
}

function startOfDayInTimezone(now: Date, timezone: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const target = fmt.format(now)
  let t = now.getTime()
  for (let i = 0; i < 48 * 60; i++) {
    const prev = t - 60_000
    if (fmt.format(new Date(prev)) !== target) {
      return new Date(t)
    }
    t = prev
  }
  return new Date(now.getTime() - 24 * 3600 * 1000)
}

function parseFilters(raw: unknown): SubscriptionFilters {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as SubscriptionFilters
}

function matchesFilters(
  filters: SubscriptionFilters,
  ctx: NotificationFilterContext | undefined,
): boolean {
  if (filters.taskId) {
    if (!ctx?.taskId || ctx.taskId !== filters.taskId) return false
  }
  if (!ctx) {
    // 无上下文时：若订阅要求正匹配条件则失败；仅排除条件则通过
    if (
      (filters.tags && filters.tags.length > 0) ||
      (filters.regionIds && filters.regionIds.length > 0) ||
      filters.taskId
    ) {
      return false
    }
    return true
  }
  if (filters.tags && filters.tags.length > 0) {
    const tags = ctx.tags || []
    if (!filters.tags.some((t) => tags.includes(t))) return false
  }
  if (filters.regionIds && filters.regionIds.length > 0) {
    const regions = ctx.regionIds || []
    if (!filters.regionIds.some((r) => regions.includes(r))) return false
  }
  if (typeof filters.maxPrice === 'number' && typeof ctx.price === 'number') {
    if (ctx.price > filters.maxPrice) return false
  }
  if (filters.excludeTags?.length && ctx.tags?.some((t) => filters.excludeTags!.includes(t))) {
    return false
  }
  if (filters.excludeRegions?.length && ctx.regionIds?.some((r) => filters.excludeRegions!.includes(r))) {
    return false
  }
  if (filters.excludeKeywords?.length && ctx.keywords?.length) {
    const hit = filters.excludeKeywords.some((kw) =>
      ctx.keywords!.some((k) => k.includes(kw) || kw.includes(k)),
    )
    if (hit) return false
  }
  return true
}

function suppressed(
  category: NotificationCategoryName,
  code: SuppressionCode,
  reasonCode: string,
  reasonText: string,
): NotificationDecision {
  return {
    deliver: false,
    mode: 'OFF',
    channels: [],
    reasonCode,
    reasonText,
    suppressionCode: code,
    category,
  }
}

export type DecisionDeps = {
  prisma: PrismaClient
}

export async function evaluateNotificationDecision(
  deps: DecisionDeps,
  intent: NotificationIntent,
): Promise<NotificationDecision> {
  const now = intent.now ?? new Date()
  const def = getEventDefinition(intent.eventType)
  if (!def) {
    return suppressed(
      'USER_REQUESTED',
      'INVALID_EVENT',
      'INVALID_EVENT',
      '事件类型未注册，拒绝投递',
    )
  }

  const category = def.category
  const sourceRef = intent.sourceRef ?? ''
  const nonEssential = isNonEssentialCategory(category)

  let policy = await deps.prisma.notificationPolicy.findUnique({
    where: { userId: intent.userId },
  })
  // 无策略行时使用默认值（不创建，避免把旧偏好解释为同意）
  const effectivePolicy: Pick<
    NotificationPolicy,
    'timezone' | 'quietHoursStart' | 'quietHoursEnd' | 'dailyInterruptCap' | 'nonEssentialPaused'
  > = policy ?? {
    timezone: 'Asia/Shanghai',
    quietHoursStart: null,
    quietHoursEnd: null,
    dailyInterruptCap: 3,
    nonEssentialPaused: false,
  }

  if (intent.taskQuiet && nonEssential) {
    return suppressed(
      category,
      'TASK_QUIET',
      'TASK_QUIET',
      '任务已进入 Quiet，停止该 sourceRef 的非必要通知',
    )
  }

  // Phase 2：资源或 sourceRef 已 Quiet 时抑制非必要通知
  if (nonEssential) {
    const { isResourceQuieted } = await import('./task-quiet.service.js')
    const quieted = await isResourceQuieted({
      resourceId: intent.resourceId,
      sourceRef: sourceRef || null,
    })
    if (quieted) {
      return suppressed(
        category,
        'TASK_QUIET',
        'TASK_QUIET',
        '任务已进入 Quiet，停止该 sourceRef 的非必要通知',
      )
    }
  }

  if (nonEssential && effectivePolicy.nonEssentialPaused) {
    return suppressed(
      category,
      'NON_ESSENTIAL_PAUSED',
      'NON_ESSENTIAL_PAUSED',
      '用户已暂停全部非必要通知',
    )
  }

  // 交易必要：默认站内投递，无需订阅
  if (!nonEssential) {
    const quiet = isInQuietHours(
      now,
      effectivePolicy.timezone,
      effectivePolicy.quietHoursStart,
      effectivePolicy.quietHoursEnd,
    )
    const channels: NotificationChannelName[] = ['IN_APP']
    // 安静时段：仍投递站内；Windows 标记延迟（Phase 1A 不实现适配器）
    if (!quiet) channels.push('WINDOWS')
    return {
      deliver: true,
      mode: 'IMMEDIATE',
      channels,
      reasonCode: 'TRANSACTIONAL_REQUIRED',
      reasonText: `${def.description}：交易必要通知默认站内投递，不受每日上限影响`,
      category,
      subscriptionId: null,
      deferWindows: quiet,
    }
  }

  // 非必要：必须显式订阅且 mode != OFF
  const sub = await deps.prisma.notificationSubscription.findUnique({
    where: {
      userId_eventType_sourceRef: {
        userId: intent.userId,
        eventType: intent.eventType,
        sourceRef,
      },
    },
  })

  if (!sub || sub.mode === 'OFF' || sub.channels.length === 0) {
    return suppressed(
      category,
      'NOT_SUBSCRIBED',
      'NOT_SUBSCRIBED',
      '无有效正向订阅，非必要通知默认不投递',
    )
  }

  if (sub.expiresAt && sub.expiresAt.getTime() <= now.getTime()) {
    return suppressed(category, 'EXPIRED', 'EXPIRED', '订阅已过期')
  }

  if (sub.category !== (category as NotificationCategory)) {
    return suppressed(
      category,
      'NOT_SUBSCRIBED',
      'CATEGORY_MISMATCH',
      '订阅类别与事件类别不一致',
    )
  }

  const filters = parseFilters(sub.filters)
  if (!matchesFilters(filters, intent.filterContext)) {
    return suppressed(category, 'FILTER_MISS', 'FILTER_MISS', '未匹配订阅过滤条件')
  }

  // 每日打扰上限：仅统计非必要且已 SENT/QUEUED 的投递
  const dayStart = startOfDayInTimezone(now, effectivePolicy.timezone)
  const used = await deps.prisma.notificationDelivery.count({
    where: {
      userId: intent.userId,
      category: { in: ['USER_REQUESTED', 'DIGEST', 'RELATIONSHIP'] },
      status: { in: ['SENT', 'QUEUED'] },
      createdAt: { gte: dayStart },
    },
  })
  if (used >= effectivePolicy.dailyInterruptCap) {
    return suppressed(
      category,
      'DAILY_CAP',
      'DAILY_CAP',
      `已达每日非必要打扰上限（${effectivePolicy.dailyInterruptCap}）`,
    )
  }

  const quiet = isInQuietHours(
    now,
    effectivePolicy.timezone,
    effectivePolicy.quietHoursStart,
    effectivePolicy.quietHoursEnd,
  )

  let mode = sub.mode as NotificationModeName
  let channels = sub.channels.map((c) => c as NotificationChannelName)

  if (quiet) {
    // 安静时段：即时机会转摘要或抑制 Windows
    if (mode === 'IMMEDIATE') {
      if (channels.includes('IN_APP')) {
        mode = 'DIGEST'
        channels = channels.filter((c) => c === 'IN_APP' || c === 'EMAIL')
        return {
          deliver: true,
          mode,
          channels: channels.length ? channels : ['IN_APP'],
          reasonCode: 'QUIET_HOURS_DIGEST',
          reasonText: '安静时段：即时机会改为摘要/站内，Windows 弹窗延迟',
          category,
          subscriptionId: sub.id,
          deferWindows: true,
          suppressionCode: 'QUIET_HOURS',
        }
      }
      return suppressed(
        category,
        'QUIET_HOURS',
        'QUIET_HOURS',
        '安静时段抑制即时打扰',
      )
    }
  }

  return {
    deliver: true,
    mode,
    channels,
    reasonCode: 'SUBSCRIBED_MATCH',
    reasonText: `匹配订阅 ${sub.eventType}${sourceRef ? ` / ${sourceRef}` : ''}`,
    category,
    subscriptionId: sub.id,
    deferWindows: false,
  }
}

/** 供测试注入的轻量包装 */
export function createNotificationDecisionService(prisma: PrismaClient) {
  return {
    evaluate: (intent: NotificationIntent) => evaluateNotificationDecision({ prisma }, intent),
  }
}
