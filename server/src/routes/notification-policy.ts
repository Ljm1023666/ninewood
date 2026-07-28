/**
 * 用户主权通知 API（Phase 1A）。
 * 不接管 push-engine；不写 Message/Socket。
 */

import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { success, fail, paginated } from '../utils/response.js'
import {
  deliveriesQuerySchema,
  policyUpdateSchema,
  previewSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  categoryForEventType,
} from '../services/notification-policy.schema.js'
import { previewNotificationDecision } from '../services/notification-delivery.service.js'
import { getEventDefinition } from '../services/notification-event-registry.js'
import { isNotificationSovereigntyApiEnabled } from '../config/notification-sovereignty.js'

export const notificationPolicyRouter = Router()

function denyIfDisabled(_req: Request, res: Response, next: () => void) {
  // Phase 1A：flag 关闭时仍开放 API 供本地/测试；生产可设关闭。
  // 默认开启 API 挂载；仅当显式 NOTIFICATION_SOVEREIGNTY_API=0 时拒绝。
  if (!isNotificationSovereigntyApiEnabled()) {
    fail(res, '通知主权 API 已关闭', 404)
    return
  }
  next()
}

notificationPolicyRouter.use(authMiddleware, denyIfDisabled)

function zodFail(res: Response, e: unknown) {
  if (e instanceof ZodError) return fail(res, '参数错误', 400, e.errors)
  const msg = e instanceof Error ? e.message : '服务器错误'
  return fail(res, msg, 500)
}

async function getOrCreatePolicy(userId: string) {
  return prisma.notificationPolicy.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

// GET /api/notifications/policy
notificationPolicyRouter.get('/policy', async (req: Request, res: Response) => {
  try {
    const policy = await getOrCreatePolicy(req.user!.userId)
    success(res, policy)
  } catch (e) {
    zodFail(res, e)
  }
})

// PUT /api/notifications/policy
notificationPolicyRouter.put('/policy', async (req: Request, res: Response) => {
  try {
    const data = policyUpdateSchema.parse(req.body)
    const update: Record<string, unknown> = { ...data }
    // 允许显式清空安静时段
    if (data.quietHoursStart === null) update.quietHoursStart = null
    if (data.quietHoursEnd === null) update.quietHoursEnd = null

    const policy = await prisma.notificationPolicy.upsert({
      where: { userId: req.user!.userId },
      update,
      create: {
        userId: req.user!.userId,
        timezone: data.timezone ?? 'Asia/Shanghai',
        quietHoursStart: data.quietHoursStart ?? null,
        quietHoursEnd: data.quietHoursEnd ?? null,
        dailyInterruptCap: data.dailyInterruptCap ?? 3,
        nonEssentialPaused: data.nonEssentialPaused ?? false,
      },
    })
    success(res, policy, '策略已更新')
  } catch (e) {
    zodFail(res, e)
  }
})

// GET /api/notifications/subscriptions
notificationPolicyRouter.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const list = await prisma.notificationSubscription.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    success(res, { items: list })
  } catch (e) {
    zodFail(res, e)
  }
})

// POST /api/notifications/subscriptions
notificationPolicyRouter.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const body = subscriptionCreateSchema.parse(req.body)
    const def = getEventDefinition(body.eventType)
    if (!def) return fail(res, 'eventType 未注册', 400)
    if (def.category === 'TRANSACTIONAL_REQUIRED') {
      return fail(res, '交易必要通知无需也不允许创建订阅', 400)
    }

    const sourceRef = body.sourceRef ?? ''
    try {
      const created = await prisma.notificationSubscription.create({
        data: {
          userId: req.user!.userId,
          category: def.category,
          eventType: body.eventType,
          mode: body.mode,
          channels: body.channels,
          filters: body.filters ?? {},
          sourceRef,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      })
      success(res, created, '订阅已创建', 201)
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return fail(res, '相同 eventType/sourceRef 订阅已存在', 409)
      }
      throw err
    }
  } catch (e) {
    zodFail(res, e)
  }
})

// PUT /api/notifications/subscriptions/:id
notificationPolicyRouter.put('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const body = subscriptionUpdateSchema.parse(req.body)
    const existing = await prisma.notificationSubscription.findUnique({
      where: { id: req.params.id as string },
    })
    if (!existing || existing.userId !== req.user!.userId) {
      return fail(res, '订阅不存在', 404)
    }
    const updated = await prisma.notificationSubscription.update({
      where: { id: existing.id },
      data: {
        ...(body.mode != null ? { mode: body.mode } : {}),
        ...(body.channels != null ? { channels: body.channels } : {}),
        ...(body.filters != null ? { filters: body.filters } : {}),
        ...(body.expiresAt !== undefined
          ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
          : {}),
      },
    })
    success(res, updated, '订阅已更新')
  } catch (e) {
    zodFail(res, e)
  }
})

// DELETE /api/notifications/subscriptions/:id
notificationPolicyRouter.delete('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.notificationSubscription.findUnique({
      where: { id: req.params.id as string },
    })
    if (!existing || existing.userId !== req.user!.userId) {
      return fail(res, '订阅不存在', 404)
    }
    await prisma.notificationSubscription.delete({ where: { id: existing.id } })
    success(res, { id: existing.id }, '订阅已删除')
  } catch (e) {
    zodFail(res, e)
  }
})

// GET /api/notifications/deliveries
notificationPolicyRouter.get('/deliveries', async (req: Request, res: Response) => {
  try {
    const q = deliveriesQuerySchema.parse(req.query)
    const where: any = { userId: req.user!.userId }
    if (q.status) where.status = q.status
    const [items, total] = await Promise.all([
      prisma.notificationDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.notificationDelivery.count({ where }),
    ])
    paginated(res, items, q.page, q.limit, total)
  } catch (e) {
    zodFail(res, e)
  }
})

// POST /api/notifications/preview — 无副作用
notificationPolicyRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const body = previewSchema.parse(req.body)
    if (!categoryForEventType(body.eventType)) {
      return fail(res, 'eventType 未注册', 400)
    }
    const before = await prisma.notificationDelivery.count({
      where: { userId: req.user!.userId },
    })
    const decision = await previewNotificationDecision(prisma, {
      userId: req.user!.userId,
      eventType: body.eventType,
      sourceRef: body.sourceRef ?? '',
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      filterContext: body.filterContext,
      taskQuiet: body.taskQuiet,
    })
    const after = await prisma.notificationDelivery.count({
      where: { userId: req.user!.userId },
    })
    success(res, {
      decision,
      sideEffect: { deliveryCountBefore: before, deliveryCountAfter: after },
    })
  } catch (e) {
    zodFail(res, e)
  }
})

const QUIET_RESOURCE_TYPES = new Set(['LOOP_RUN', 'ORDER', 'AGENT_TASK', 'DEMAND'])

// GET /api/notifications/completion/:resourceType/:resourceId
notificationPolicyRouter.get(
  '/completion/:resourceType/:resourceId',
  async (req: Request, res: Response) => {
    try {
      const resourceType = String(req.params.resourceType || '').toUpperCase()
      const resourceId = String(req.params.resourceId || '')
      if (!QUIET_RESOURCE_TYPES.has(resourceType) || !resourceId) {
        return fail(res, '无效的资源类型或 ID', 400)
      }
      const { buildCompletionSummary } = await import('../services/task-quiet.service.js')
      const summary = await buildCompletionSummary(
        resourceType as 'LOOP_RUN' | 'ORDER' | 'AGENT_TASK' | 'DEMAND',
        resourceId,
      )
      if (!summary) return fail(res, '该资源尚未 Quiet', 404)
      const row = await prisma.taskQuietRecord.findUnique({
        where: {
          resourceType_resourceId: { resourceType, resourceId },
        },
      })
      if (row?.userId && row.userId !== req.user!.userId) {
        return fail(res, '无权查看', 403)
      }
      success(res, summary)
    } catch (e) {
      zodFail(res, e)
    }
  },
)

// POST /api/notifications/quiet — 幂等补写 Quiet
notificationPolicyRouter.post('/quiet', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      resourceType?: string
      resourceId?: string
      outcomeStatus?: string
      outcomeSummary?: string
      nextRequiredAction?: { label: string; action: string } | null
    }
    const resourceType = String(body.resourceType || '').toUpperCase()
    const resourceId = String(body.resourceId || '')
    if (!QUIET_RESOURCE_TYPES.has(resourceType) || !resourceId) {
      return fail(res, '无效的资源类型或 ID', 400)
    }
    if (!body.outcomeStatus || !body.outcomeSummary) {
      return fail(res, 'outcomeStatus 与 outcomeSummary 必填', 400)
    }
    const { quietTask } = await import('../services/task-quiet.service.js')
    const summary = await quietTask({
      resourceType: resourceType as 'LOOP_RUN' | 'ORDER' | 'AGENT_TASK' | 'DEMAND',
      resourceId,
      outcomeStatus: body.outcomeStatus as
        | 'SUCCEEDED'
        | 'FAILED'
        | 'INCONCLUSIVE'
        | 'CANCELLED'
        | 'WITHDRAWN'
        | 'EXPIRED',
      outcomeSummary: String(body.outcomeSummary),
      userId: req.user!.userId,
      nextRequiredAction: body.nextRequiredAction ?? null,
    })
    if (summary.alreadyQuiet) {
      return fail(res, '任务已 Quiet', 409, { code: 'TASK_ALREADY_QUIET', summary })
    }
    success(res, summary)
  } catch (e) {
    zodFail(res, e)
  }
})
