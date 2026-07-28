/**
 * AI 2.7 推送匹配引擎 + Phase 1B 主权接管
 *
 * NOTIFICATION_SOVEREIGNTY_ENABLED=0：保留旧行为（PushPreference + Socket，不写 Notification*）
 * =1：DEMAND_MATCHED 经 NotificationDecisionService；站内 Message 必落库；Socket 仅实时提示
 */

import { prisma } from '../lib/prisma.js'
import type { Server as SocketIOServer } from 'socket.io'
import { canTakeOverNotificationTraffic } from '../config/notification-sovereignty.js'
import {
  evaluateNotificationDecision,
  type NotificationDecision,
} from './notification-decision.service.js'
import { recordNotificationDeliveries } from './notification-delivery.service.js'

export const DEMAND_MATCH_TAG = '[DEMAND_MATCH]'

interface PushTarget {
  ageMin?: number
  ageMax?: number
  tags?: string[]
  regions?: number[]
  excludeKeywords?: string[]
  /** Stage 1.1: 仅当为 true 时才在 where 中加 autoReceive 筛透。手动推送路由不传此参。 */
  autoReceiveOnly?: boolean
}

export interface PushResult {
  totalMatched: number
  totalRejected: number
  totalSent: number
  rejectReasons: Record<string, number>
  sovereignty?: boolean
}

/** 7 步判断链（legacy） */
export async function shouldReceivePush(
  userId: string,
  target: PushTarget,
): Promise<{ accept: boolean; reason?: string }> {
  const pref = await prisma.pushPreference.findUnique({
    where: { userId },
  })
  if (!pref) return { accept: true }

  if (!pref.receivePushes) return { accept: false, reason: 'GLOBAL_OFF' }

  if (target.excludeKeywords?.some((kw) => pref.excludeKeywords.includes(kw))) {
    return { accept: false, reason: 'EXCLUDE_KEYWORD' }
  }

  if (target.tags?.some((t) => pref.excludeTags.includes(t))) {
    return { accept: false, reason: 'EXCLUDE_TAG' }
  }

  if (target.regions?.some((r) => pref.excludeRegions.includes(r))) {
    return { accept: false, reason: 'EXCLUDE_REGION' }
  }

  return { accept: true }
}

async function alreadyDeliveredDemandMatch(userId: string, demandId: string): Promise<boolean> {
  const n = await prisma.notificationDelivery.count({
    where: {
      userId,
      eventType: 'DEMAND_MATCHED',
      resourceType: 'Demand',
      resourceId: demandId,
      status: { in: ['SENT', 'QUEUED'] },
    },
  })
  return n > 0
}

function buildDemandMatchMessage(input: {
  title: string
  demandId: string
  decision: NotificationDecision
  sourceRef: string
}): string {
  return [
    `${DEMAND_MATCH_TAG} ${input.title}`,
    `原因：${input.decision.reasonText}`,
    `reasonCode=${input.decision.reasonCode}`,
    `sourceRef=${input.sourceRef || '(none)'}`,
    `demandId=${input.demandId}`,
    '管理订阅：设置 → 推送设置',
  ].join('\n')
}

async function deliverInAppDemandMatch(input: {
  userId: string
  demandId: string
  title: string
  decision: NotificationDecision
  sourceRef: string
}): Promise<void> {
  if (!input.decision.channels.includes('IN_APP')) return
  await prisma.message.create({
    data: {
      fromUserId: input.userId,
      toUserId: input.userId,
      type: 'SYSTEM',
      content: buildDemandMatchMessage(input),
    },
  })
}

/** 主权路径：仅向有效 DEMAND_MATCHED 订阅投递 */
async function matchAndPushSovereign(
  demandId: string,
  target: PushTarget,
  io?: SocketIOServer,
): Promise<PushResult> {
  const result: PushResult = {
    totalMatched: 0,
    totalRejected: 0,
    totalSent: 0,
    rejectReasons: {},
    sovereignty: true,
  }

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: {
      id: true,
      title: true,
      tagName: true,
      regionId: true,
      tags: true,
      minPrice: true,
      description: true,
    },
  })
  if (!demand) return result

  const demandTags =
    demand.tags && demand.tags.length > 0
      ? demand.tags
      : demand.tagName
        ? [demand.tagName]
        : target.tags || []
  const demandRegions =
    target.regions && target.regions.length > 0
      ? target.regions
      : demand.regionId
        ? [demand.regionId]
        : []

  const subscriptions = await prisma.notificationSubscription.findMany({
    where: {
      eventType: 'DEMAND_MATCHED',
      mode: { not: 'OFF' },
    },
    take: 2000,
  })

  result.totalMatched = subscriptions.length
  const sentUsers = new Set<string>()

  for (const sub of subscriptions) {
    if (sentUsers.has(sub.userId)) continue

    if (await alreadyDeliveredDemandMatch(sub.userId, demandId)) {
      result.totalRejected++
      result.rejectReasons.DUPLICATE = (result.rejectReasons.DUPLICATE || 0) + 1
      continue
    }

    const intent = {
      userId: sub.userId,
      eventType: 'DEMAND_MATCHED' as const,
      sourceRef: sub.sourceRef,
      resourceType: 'Demand',
      resourceId: demandId,
      filterContext: {
        tags: demandTags,
        regionIds: demandRegions,
        price: demand.minPrice != null ? Number(demand.minPrice) : undefined,
        keywords: [demand.title, demand.description || ''].filter(Boolean),
      },
    }

    const decision = await evaluateNotificationDecision({ prisma }, intent)
    await recordNotificationDeliveries(prisma, { intent, decision, preview: false })

    if (!decision.deliver) {
      result.totalRejected++
      const code = decision.suppressionCode || decision.reasonCode || 'SUPPRESSED'
      result.rejectReasons[code] = (result.rejectReasons[code] || 0) + 1
      continue
    }

    try {
      await deliverInAppDemandMatch({
        userId: sub.userId,
        demandId,
        title: demand.title,
        decision,
        sourceRef: sub.sourceRef,
      })
      if (io) {
        io.to(`user:${sub.userId}`).emit('push:new_demand', {
          demandId,
          title: demand.title,
          tagName: demand.tagName || '',
          regionId: demand.regionId || null,
          pushedAt: new Date().toISOString(),
          reasonCode: decision.reasonCode,
          reasonText: decision.reasonText,
          sourceRef: sub.sourceRef,
          settingsPath: '/push-settings',
        })
      }
      sentUsers.add(sub.userId)
      result.totalSent++
    } catch {
      result.totalRejected++
      result.rejectReasons.SEND_FAILED = (result.rejectReasons.SEND_FAILED || 0) + 1
    }
  }

  return result
}

/** Legacy 路径：不写 Notification* */
async function matchAndPushLegacy(
  demandId: string,
  target: PushTarget,
  io?: SocketIOServer,
): Promise<PushResult> {
  const result: PushResult = {
    totalMatched: 0,
    totalRejected: 0,
    totalSent: 0,
    rejectReasons: {},
    sovereignty: false,
  }

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { title: true, tagName: true, regionId: true },
  })

  const where: any = { status: 'IDLE' }
  if (target.autoReceiveOnly) where.autoReceive = true
  if (target.tags && target.tags.length > 0) {
    where.tagName = { in: target.tags }
  }
  if (target.regions && target.regions.length > 0) {
    where.regionId = { in: target.regions }
  }

  const providers = await prisma.userTag.findMany({
    where,
    select: { userId: true },
    take: 500,
  })

  result.totalMatched = providers.length

  const accepted: string[] = []
  for (const p of providers) {
    const { accept, reason } = await shouldReceivePush(p.userId, target)
    if (!accept) {
      result.totalRejected++
      if (reason) {
        result.rejectReasons[reason] = (result.rejectReasons[reason] || 0) + 1
      }
    } else {
      accepted.push(p.userId)
    }
  }

  result.totalSent = accepted.length

  if (io && accepted.length > 0) {
    for (const userId of accepted) {
      try {
        io.to(`user:${userId}`).emit('push:new_demand', {
          demandId,
          title: demand?.title || '',
          tagName: demand?.tagName || '',
          regionId: demand?.regionId || null,
          pushedAt: new Date().toISOString(),
        })
      } catch {
        // 单条失败不阻塞
      }
    }
  }

  return result
}

export async function matchAndPush(
  demandId: string,
  target: PushTarget,
  io?: SocketIOServer,
): Promise<PushResult> {
  if (canTakeOverNotificationTraffic('DEMAND_MATCHED')) {
    return matchAndPushSovereign(demandId, target, io)
  }
  return matchAndPushLegacy(demandId, target, io)
}

/**
 * Stage 1.1: 需求发布后自动触发一次推送
 * 主权开启后：只投递给已有 DEMAND_MATCHED 订阅（通常由 autoReceive 迁移/同步产生）
 */
export async function triggerAutoReceivePush(
  demandId: string,
  io?: SocketIOServer,
): Promise<PushResult> {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { tagName: true, regionId: true, tags: true },
  })
  if (!demand) {
    return { totalMatched: 0, totalRejected: 0, totalSent: 0, rejectReasons: {} }
  }
  const tags =
    demand.tags && demand.tags.length > 0
      ? demand.tags
      : demand.tagName
        ? [demand.tagName]
        : undefined
  const regions = demand.regionId ? [demand.regionId] : undefined
  return matchAndPush(
    demandId,
    {
      tags,
      regions,
      autoReceiveOnly: true,
    },
    io,
  )
}
