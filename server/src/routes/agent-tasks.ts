/**
 * Task 10 · /api/agent/tasks API 路由
 *
 * 详见 docs/specs/TASK-10-agent-automation.md §6
 *
 * 端点：
 *   GET    /                  任务列表
 *   POST   /                  创建任务（配额 ≤5，超额 400）
 *   GET    /:id               详情 + recentRuns
 *   PATCH  /:id               修改（启停 / schedule / filters / channels）
 *   DELETE /:id               删除
 *   POST   /:id/run-now       立即执行（同步等待 + 双通道投递）
 *   GET    /inbox             结果箱（分页）
 *   GET    /inbox/unread-count
 *   POST   /inbox/:runId/read 标记已读
 */

import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { computeNextRunAt, describeSchedule, ScheduleValidationError } from '../services/agent/task-schedule.js'
import { getTaskType, DEMAND_DIGEST_ID } from '../services/agent/task-types/index.js'
import { maybeDeliverAgentTaskMessage } from '../cron/agent-task-scheduler.js'
import {
  deleteAgentTaskResultSubscription,
  syncAgentTaskResultSubscription,
} from '../services/notification-subscription-sync.js'
import {
  buildAgentTaskFromDescription,
  TaskBuildError,
} from '../services/agent/task-builder.js'

export const agentTasksRouter = Router()

const MAX_ACTIVE_TASKS = 5
const VALID_FREQUENCIES = ['HOURLY', 'DAILY', 'WEEKLY'] as const
const VALID_CHANNELS = ['MESSAGE', 'AGENT_INBOX'] as const

// ─── 工具 ─────────────────────────────────────────────────────────────────

function requireUser(req: Request, res: Response): string | null {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ code: 401, message: '未登录' })
    return null
  }
  return userId
}

function badRequest(res: Response, message: string): void {
  res.status(400).json({ code: 400, message, timestamp: Date.now() })
}

// ─── 路由 ─────────────────────────────────────────────────────────────────

/** GET / — 任务列表（仅当前用户） */
agentTasksRouter.get('/', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const tasks = await prisma.agentTask.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ tasks })
})

/** POST /build — 自然语言构建任务（多轮，不写库） */
agentTasksRouter.post('/build', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const body = req.body as {
    description?: unknown
    feedback?: unknown
    previousSummary?: unknown
    round?: unknown
  }

  if (typeof body.description !== 'string' || !body.description.trim()) {
    return badRequest(res, 'description 必须为非空字符串')
  }

  try {
    const build = await buildAgentTaskFromDescription({
      description: body.description,
      feedback: typeof body.feedback === 'string' ? body.feedback : undefined,
      previousSummary:
        typeof body.previousSummary === 'string' ? body.previousSummary : undefined,
      round: typeof body.round === 'number' ? body.round : undefined,
    })
    res.json({ build })
  } catch (err) {
    if (err instanceof TaskBuildError) {
      return badRequest(res, err.message)
    }
    throw err
  }
})

/** GET /inbox — 结果箱分页（必须在 /:id 之前注册，否则会被 :id 吞掉） */
agentTasksRouter.get('/inbox', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const limit = Math.min(Number(req.query.limit ?? 20), 100)
  const offset = Math.max(Number(req.query.offset ?? 0), 0)

  // 通过 task.userId 限定；join task
  const where = { task: { userId } }
  const [runs, total] = await Promise.all([
    prisma.agentTaskRun.findMany({
      where,
      orderBy: { runAt: 'desc' },
      take: limit,
      skip: offset,
      include: { task: { select: { id: true, name: true, type: true } } },
    }),
    prisma.agentTaskRun.count({ where }),
  ])

  res.json({ runs, total })
})

/** GET /inbox/unread-count（必须在 /:id 之前） */
agentTasksRouter.get('/inbox/unread-count', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const count = await prisma.agentTaskRun.count({
    where: { task: { userId }, readAt: null },
  })
  res.json({ count })
})

/** POST /inbox/:runId/read（必须在 /:id 之前） */
agentTasksRouter.post('/inbox/:runId/read', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  // 通过 task.userId 防越权
  const run = await prisma.agentTaskRun.findFirst({
    where: { id: req.params.runId, task: { userId } },
  })
  if (!run) {
    return res.status(404).json({ code: 404, message: '结果不存在', timestamp: Date.now() })
  }
  if (!run.readAt) {
    await prisma.agentTaskRun.update({ where: { id: run.id }, data: { readAt: new Date() } })
  }
  res.status(204).end()
})

/** POST / — 创建任务 */
agentTasksRouter.post('/', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const body = req.body as {
    name?: unknown
    type?: unknown
    frequency?: unknown
    atHour?: unknown
    atMinute?: unknown
    weekday?: unknown
    filters?: unknown
    deliveryChannels?: unknown
  }

  if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 50) {
    return badRequest(res, 'name 必须为 1-50 字符串')
  }

  if (body.type !== DEMAND_DIGEST_ID) {
    return badRequest(res, `type 必须是 ${DEMAND_DIGEST_ID}`)
  }

  if (!VALID_FREQUENCIES.includes(body.frequency as 'HOURLY')) {
    return badRequest(res, 'frequency 必须是 HOURLY/DAILY/WEEKLY')
  }
  const frequency = body.frequency as 'HOURLY' | 'DAILY' | 'WEEKLY'

  // schedule 字段合法性
  let atHour: number | null = null
  let atMinute = 0
  let weekday: number | null = null
  try {
    if (frequency === 'DAILY' || frequency === 'WEEKLY') {
      if (typeof body.atHour !== 'number') return badRequest(res, 'DAILY/WEEKLY 必须传 atHour')
      atHour = body.atHour
    }
    if (frequency === 'WEEKLY') {
      if (typeof body.weekday !== 'number') return badRequest(res, 'WEEKLY 必须传 weekday (1-7)')
      weekday = body.weekday
    }
    if (typeof body.atMinute === 'number') {
      atMinute = body.atMinute
    }
    // 触发一次校验（throw 即非法）
    computeNextRunAt({ frequency, atHour, atMinute, weekday })
  } catch (err) {
    if (err instanceof ScheduleValidationError) return badRequest(res, err.message)
    throw err
  }

  // filters 通过注册表 validate
  const type = getTaskType(body.type)
  if (!type) return badRequest(res, `未知任务类型: ${body.type}`)
  const v = type.validateFilters(body.filters)
  if (!v.ok) return badRequest(res, `filters 不合法: ${v.error}`)
  const filters = v.normalized!

  // deliveryChannels：默认两者
  let channels: ('MESSAGE' | 'AGENT_INBOX')[]
  if (body.deliveryChannels === undefined) {
    channels = ['MESSAGE', 'AGENT_INBOX']
  } else if (!Array.isArray(body.deliveryChannels)) {
    return badRequest(res, 'deliveryChannels 必须为数组')
  } else {
    channels = []
    for (const c of body.deliveryChannels) {
      if (!VALID_CHANNELS.includes(c as 'MESSAGE')) {
        return badRequest(res, `deliveryChannels 含未知通道: ${c as string}`)
      }
      channels.push(c as 'MESSAGE' | 'AGENT_INBOX')
    }
    if (channels.length === 0) channels = ['MESSAGE', 'AGENT_INBOX']
  }

  // 配额
  const existingCount = await prisma.agentTask.count({ where: { userId } })
  if (existingCount >= MAX_ACTIVE_TASKS) {
    return res.status(400).json({
      code: 400,
      message: `已达任务上限 ${MAX_ACTIVE_TASKS} 个，请先删除或暂停其他任务`,
      timestamp: Date.now(),
    })
  }

  const now = new Date()
  const nextRunAt = computeNextRunAt({ frequency, atHour, atMinute, weekday }, now)

  const task = await prisma.agentTask.create({
    data: {
      userId,
      name: body.name.trim(),
      type: body.type,
      enabled: true,
      frequency,
      atHour,
      atMinute,
      weekday,
      filters: filters as object,
      deliveryChannels: channels as unknown as object,
      nextRunAt,
    },
  })

  await syncAgentTaskResultSubscription(task)

  res.status(201).json({ task })
})

/** GET /:id — 详情 + recentRuns */
agentTasksRouter.get('/:id', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const task = await prisma.agentTask.findFirst({ where: { id: req.params.id, userId } })
  if (!task) {
    return res.status(404).json({ code: 404, message: '任务不存在', timestamp: Date.now() })
  }

  const recentRuns = await prisma.agentTaskRun.findMany({
    where: { taskId: task.id },
    orderBy: { runAt: 'desc' },
    take: 20,
  })

  res.json({ task, recentRuns })
})

/** PATCH /:id — 修改 */
agentTasksRouter.patch('/:id', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const existing = await prisma.agentTask.findFirst({ where: { id: req.params.id, userId } })
  if (!existing) {
    return res.status(404).json({ code: 404, message: '任务不存在', timestamp: Date.now() })
  }

  const body = req.body as {
    name?: unknown
    enabled?: unknown
    frequency?: unknown
    atHour?: unknown
    atMinute?: unknown
    weekday?: unknown
    filters?: unknown
    deliveryChannels?: unknown
  }

  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 50) {
      return badRequest(res, 'name 必须为 1-50 字符串')
    }
    data.name = body.name.trim()
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') return badRequest(res, 'enabled 必须为 boolean')
    data.enabled = body.enabled
  }

  const next: { frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'; atHour: number | null; atMinute: number; weekday: number | null } = {
    frequency: (body.frequency as 'HOURLY' | 'DAILY' | 'WEEKLY') ?? existing.frequency as 'HOURLY',
    atHour: (body.atHour as number | null | undefined) ?? existing.atHour,
    atMinute: (body.atMinute as number | undefined) ?? existing.atMinute,
    weekday: (body.weekday as number | null | undefined) ?? existing.weekday,
  }

  if (body.frequency !== undefined && !VALID_FREQUENCIES.includes(body.frequency as 'HOURLY')) {
    return badRequest(res, 'frequency 必须是 HOURLY/DAILY/WEEKLY')
  }
  if (body.atHour !== undefined && next.frequency !== 'HOURLY' && typeof body.atHour !== 'number') {
    return badRequest(res, 'atHour 必须为 number')
  }
  if (body.weekday !== undefined && next.frequency === 'WEEKLY' && typeof body.weekday !== 'number') {
    return badRequest(res, 'weekday 必须为 number')
  }

  try {
    data.nextRunAt = computeNextRunAt(next, new Date())
  } catch (err) {
    if (err instanceof ScheduleValidationError) return badRequest(res, err.message)
    throw err
  }
  data.frequency = next.frequency
  data.atHour = next.atHour
  data.atMinute = next.atMinute
  data.weekday = next.weekday

  if (body.filters !== undefined) {
    const type = getTaskType(existing.type)
    if (!type) return badRequest(res, `未知任务类型: ${existing.type}`)
    const v = type.validateFilters(body.filters)
    if (!v.ok) return badRequest(res, `filters 不合法: ${v.error}`)
    data.filters = v.normalized as object
  }

  if (body.deliveryChannels !== undefined) {
    if (!Array.isArray(body.deliveryChannels)) return badRequest(res, 'deliveryChannels 必须为数组')
    const channels: ('MESSAGE' | 'AGENT_INBOX')[] = []
    for (const c of body.deliveryChannels) {
      if (!VALID_CHANNELS.includes(c as 'MESSAGE')) {
        return badRequest(res, `deliveryChannels 含未知通道: ${c as string}`)
      }
      channels.push(c as 'MESSAGE' | 'AGENT_INBOX')
    }
    data.deliveryChannels = channels as unknown as object
  }

  const task = await prisma.agentTask.update({ where: { id: existing.id }, data })
  await syncAgentTaskResultSubscription(task)

  // Phase 2：停用时 Quiet
  if (data.enabled === false) {
    const { quietTaskSafe } = await import('../services/task-quiet.service.js')
    quietTaskSafe({
      resourceType: 'AGENT_TASK',
      resourceId: task.id,
      outcomeStatus: 'CANCELLED',
      outcomeSummary: 'Agent 任务已停用',
      userId,
      nextRequiredAction: null,
    })
  }

  res.json({ task })
})

/** DELETE /:id */
agentTasksRouter.delete('/:id', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const existing = await prisma.agentTask.findFirst({ where: { id: req.params.id, userId } })
  if (!existing) {
    return res.status(404).json({ code: 404, message: '任务不存在', timestamp: Date.now() })
  }

  await deleteAgentTaskResultSubscription(userId, existing.id)

  const { quietTaskSafe } = await import('../services/task-quiet.service.js')
  quietTaskSafe({
    resourceType: 'AGENT_TASK',
    resourceId: existing.id,
    outcomeStatus: 'CANCELLED',
    outcomeSummary: 'Agent 任务已删除',
    userId,
    nextRequiredAction: null,
  })

  await prisma.agentTask.delete({ where: { id: existing.id } })
  res.status(204).end()
})

/** POST /:id/run-now — 立即执行 */
agentTasksRouter.post('/:id/run-now', authMiddleware, async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const task = await prisma.agentTask.findFirst({ where: { id: req.params.id, userId } })
  if (!task) {
    return res.status(404).json({ code: 404, message: '任务不存在', timestamp: Date.now() })
  }

  const type = getTaskType(task.type)
  if (!type) return badRequest(res, `未知任务类型: ${task.type}`)

  const now = new Date()
  let run: { id: string; status: string; resultCount: number; summary: string; payload: unknown; runAt: Date; taskId: string; readAt: Date | null; createdAt: Date }

  try {
    const filters = (task.filters ?? {}) as Record<string, unknown>
    const result = await type.run(task.userId, filters)
    const status = result.count > 0 ? 'SUCCESS' : 'EMPTY'

    run = await prisma.agentTaskRun.create({
      data: {
        taskId: task.id,
        runAt: now,
        status,
        resultCount: result.count,
        summary: result.summary,
        payload: (result.payload ?? []) as unknown as object,
      },
    })

    const channels = parseChannels(task.deliveryChannels)
    if (channels.includes('MESSAGE') && status === 'SUCCESS') {
      await maybeDeliverAgentTaskMessage({
        userId: task.userId,
        taskId: task.id,
        taskName: task.name,
        summary: result.summary,
        runId: run.id,
      })
    }

    await prisma.agentTask.update({
      where: { id: task.id },
      data: { lastRunAt: now, lastSummary: run.summary },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    run = await prisma.agentTaskRun.create({
      data: {
        taskId: task.id,
        runAt: now,
        status: 'ERROR',
        resultCount: 0,
        summary: `执行失败：${msg}`,
        payload: [],
      },
    })

    await prisma.agentTask.update({
      where: { id: task.id },
      data: { lastRunAt: now, lastSummary: run.summary },
    })
  }

  res.json({ run })
})

// ─── helpers ──────────────────────────────────────────────────────────────

function parseChannels(raw: unknown): Array<'MESSAGE' | 'AGENT_INBOX'> {
  if (!Array.isArray(raw)) return ['MESSAGE', 'AGENT_INBOX']
  const allowed = new Set(['MESSAGE', 'AGENT_INBOX'])
  return raw.filter((v): v is 'MESSAGE' | 'AGENT_INBOX' => typeof v === 'string' && allowed.has(v))
}

// 暴露给测试的常量
export const __TEST_MAX_ACTIVE_TASKS = MAX_ACTIVE_TASKS
export const __TEST_VALID_FREQUENCIES = VALID_FREQUENCIES

// suppress unused import linter（describeSchedule 仅用于文档化/调试接口保留）
void describeSchedule