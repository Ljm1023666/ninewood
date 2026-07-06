import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Wave C · Agent 自动化任务调度器单测
 *
 * 覆盖：
 *   - 扫描 + 写 AgentTaskRun（SUCCESS / EMPTY / ERROR）
 *   - deliveryChannels 包含 MESSAGE 时发 SYSTEM 消息（[AGENT_TASK] 前缀）
 *   - 错误捕获：ERROR 不 disable 任务
 *   - 幂等：lastRunAt 与 nextRunAt 同槽（±30s）跳过
 *   - lastRunAt 推进 + nextRunAt = computeNextRunAt
 *   - 未知 task.type → ERROR run + 推进 schedule
 */

const m = vi.hoisted(() => ({
  agentTaskFindMany: vi.fn(),
  agentTaskRunCreate: vi.fn(),
  agentTaskUpdate: vi.fn(),
  messageCreate: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    agentTask: { findMany: m.agentTaskFindMany, update: m.agentTaskUpdate },
    agentTaskRun: { create: m.agentTaskRunCreate },
    message: { create: m.messageCreate },
  },
}))

// 用 spy 替换 task-types 注册表里的 DEMAND_DIGEST.run；schedule 保留真实逻辑
const runSpy = vi.fn()
vi.mock('../services/agent/task-types/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/agent/task-types/index.js')>()
  const real = actual.getTaskType(actual.DEMAND_DIGEST_ID)!
  return {
    ...actual,
    getTaskType: (id: string) => {
      if (id === 'DEMAND_DIGEST') {
        return { ...real, run: runSpy }
      }
      return actual.getTaskType(id)
    },
  }
})

import { runAgentTaskScheduler, AGENT_TASK_TAG } from '../cron/agent-task-scheduler.js'

beforeEach(() => {
  m.agentTaskFindMany.mockReset()
  m.agentTaskRunCreate.mockReset()
  m.agentTaskUpdate.mockReset()
  m.messageCreate.mockReset()
  runSpy.mockReset()
})

const now = new Date('2026-06-22T10:30:00.000Z')

function mockTask(over: Partial<{
  id: string
  userId: string
  name: string
  type: string
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'
  atHour: number | null
  atMinute: number
  weekday: number | null
  filters: Record<string, unknown>
  deliveryChannels: unknown
  nextRunAt: Date
  lastRunAt: Date | null
  enabled: boolean
}> = {}) {
  return {
    id: over.id ?? 'task-1',
    userId: over.userId ?? 'user-1',
    name: over.name ?? '王者需求推送',
    type: over.type ?? 'DEMAND_DIGEST',
    frequency: over.frequency ?? 'HOURLY',
    atHour: over.atHour ?? null,
    atMinute: over.atMinute ?? 0,
    weekday: over.weekday ?? null,
    filters: over.filters ?? { keyword: '王者' },
    deliveryChannels: over.deliveryChannels ?? ['MESSAGE', 'AGENT_INBOX'],
    nextRunAt: over.nextRunAt ?? now,
    lastRunAt: over.lastRunAt ?? null,
    enabled: over.enabled ?? true,
  }
}

describe('runAgentTaskScheduler · happy path', () => {
  it('runs DEMAND_DIGEST, writes SUCCESS run, sends SYSTEM message, advances schedule', async () => {
    const task = mockTask()
    m.agentTaskFindMany.mockResolvedValueOnce([task])
    runSpy.mockResolvedValueOnce({
      count: 3,
      summary: '共找到 3 条匹配需求',
      payload: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
    })

    const r = await runAgentTaskScheduler(now)

    expect(r).toEqual({ scanned: 1, succeeded: 1, empty: 0, errored: 0, skipped: 0 })
    expect(runSpy).toHaveBeenCalledOnce()
    expect(runSpy.mock.calls[0]).toEqual([task.userId, task.filters])

    // 写 AgentTaskRun (SUCCESS)
    expect(m.agentTaskRunCreate).toHaveBeenCalledOnce()
    const runArgs = m.agentTaskRunCreate.mock.calls[0][0]
    expect(runArgs.data.taskId).toBe('task-1')
    expect(runArgs.data.status).toBe('SUCCESS')
    expect(runArgs.data.resultCount).toBe(3)
    expect(runArgs.data.summary).toBe('共找到 3 条匹配需求')

    // 发 SYSTEM 消息（[AGENT_TASK] 前缀）
    expect(m.messageCreate).toHaveBeenCalledOnce()
    const msgArgs = m.messageCreate.mock.calls[0][0]
    expect(msgArgs.data.type).toBe('SYSTEM')
    expect(msgArgs.data.fromUserId).toBe(task.userId)
    expect(msgArgs.data.toUserId).toBe(task.userId)
    expect(msgArgs.data.content.startsWith(AGENT_TASK_TAG)).toBe(true)
    expect(msgArgs.data.content).toContain(task.name)
    expect(msgArgs.data.content).toContain('共找到 3 条匹配需求')

    // 推进 schedule（HOURLY：next 是下一整点 11:30，hour=10:30 已过 → 11:30）
    expect(m.agentTaskUpdate).toHaveBeenCalledOnce()
    const upArgs = m.agentTaskUpdate.mock.calls[0][0]
    expect(upArgs.where.id).toBe('task-1')
    expect(upArgs.data.lastRunAt).toEqual(now)
    expect(upArgs.data.lastSummary).toBe('共找到 3 条匹配需求')
    expect(upArgs.data.nextRunAt).toBeInstanceOf(Date)
    expect(upArgs.data.nextRunAt.getTime()).toBeGreaterThan(now.getTime())
  })

  it('writes EMPTY run when count=0; no MESSAGE sent for EMPTY (per spec §5.1)', async () => {
    m.agentTaskFindMany.mockResolvedValueOnce([mockTask()])
    runSpy.mockResolvedValueOnce({ count: 0, summary: '本次未找到匹配需求', payload: [] })

    const r = await runAgentTaskScheduler(now)

    expect(r.empty).toBe(1)
    expect(m.agentTaskRunCreate.mock.calls[0][0].data.status).toBe('EMPTY')
    expect(m.messageCreate).not.toHaveBeenCalled()
  })

  it('does not send MESSAGE when deliveryChannels excludes it', async () => {
    m.agentTaskFindMany.mockResolvedValueOnce([
      mockTask({ deliveryChannels: ['AGENT_INBOX'] }),
    ])
    runSpy.mockResolvedValueOnce({ count: 2, summary: '共找到 2 条匹配需求', payload: [{}, {}] })

    await runAgentTaskScheduler(now)

    expect(m.messageCreate).not.toHaveBeenCalled()
    expect(m.agentTaskRunCreate).toHaveBeenCalledOnce()
  })
})

describe('runAgentTaskScheduler · error handling', () => {
  it('writes ERROR run when registry run() throws; task stays enabled', async () => {
    m.agentTaskFindMany.mockResolvedValueOnce([mockTask()])
    runSpy.mockRejectedValueOnce(new Error('database exploded'))

    const r = await runAgentTaskScheduler(now)

    expect(r.errored).toBe(1)
    expect(m.agentTaskRunCreate).toHaveBeenCalledOnce()
    const runArgs = m.agentTaskRunCreate.mock.calls[0][0]
    expect(runArgs.data.status).toBe('ERROR')
    expect(runArgs.data.summary).toContain('database exploded')

    // schedule 仍然推进（不 disable）
    expect(m.agentTaskUpdate).toHaveBeenCalledOnce()
    expect(m.agentTaskUpdate.mock.calls[0][0].data.enabled).toBeUndefined()
    expect(m.messageCreate).not.toHaveBeenCalled()
  })

  it('writes ERROR run when task.type is unknown; still advances schedule', async () => {
    m.agentTaskFindMany.mockResolvedValueOnce([mockTask({ type: 'GHOST_TYPE' })])

    const r = await runAgentTaskScheduler(now)

    expect(r.errored).toBe(1)
    expect(m.agentTaskRunCreate.mock.calls[0][0].data.summary).toContain('未知任务类型: GHOST_TYPE')
    expect(m.agentTaskUpdate).toHaveBeenCalledOnce()
  })
})

describe('runAgentTaskScheduler · idempotency', () => {
  it('skips task when lastRunAt is within 30s of nextRunAt (same slot)', async () => {
    const slotStart = new Date('2026-06-22T10:00:00.000Z')
    m.agentTaskFindMany.mockResolvedValueOnce([
      mockTask({
        nextRunAt: slotStart,
        lastRunAt: new Date(slotStart.getTime() + 5_000), // 同槽 +5s
      }),
    ])

    const r = await runAgentTaskScheduler(now)

    expect(r.skipped).toBe(1)
    expect(runSpy).not.toHaveBeenCalled()
    expect(m.agentTaskRunCreate).not.toHaveBeenCalled()
    expect(m.agentTaskUpdate).not.toHaveBeenCalled()
  })

  it('processes task when lastRunAt is far from nextRunAt (different slot)', async () => {
    const oldSlot = new Date('2026-06-22T08:00:00.000Z')
    m.agentTaskFindMany.mockResolvedValueOnce([
      mockTask({
        nextRunAt: now,
        lastRunAt: oldSlot, // 远早于 nextRunAt
      }),
    ])
    runSpy.mockResolvedValueOnce({ count: 1, summary: 's', payload: [{}] })

    const r = await runAgentTaskScheduler(now)

    expect(r.skipped).toBe(0)
    expect(r.succeeded).toBe(1)
  })
})

describe('runAgentTaskScheduler · empty queue', () => {
  it('returns zeros when no tasks are due', async () => {
    m.agentTaskFindMany.mockResolvedValueOnce([])
    const r = await runAgentTaskScheduler(now)
    expect(r).toEqual({ scanned: 0, succeeded: 0, empty: 0, errored: 0, skipped: 0 })
    expect(m.agentTaskRunCreate).not.toHaveBeenCalled()
  })
})

describe('runAgentTaskScheduler · batch of multiple', () => {
  it('handles mix: SUCCESS, EMPTY, ERROR in one batch', async () => {
    m.agentTaskFindMany.mockResolvedValueOnce([
      mockTask({ id: 't1' }),
      mockTask({ id: 't2' }),
      mockTask({ id: 't3' }),
    ])
    runSpy
      .mockResolvedValueOnce({ count: 2, summary: 's1', payload: [{}, {}] })
      .mockResolvedValueOnce({ count: 0, summary: 's2', payload: [] })
      .mockRejectedValueOnce(new Error('boom'))

    const r = await runAgentTaskScheduler(now)

    expect(r.scanned).toBe(3)
    expect(r.succeeded).toBe(1)
    expect(r.empty).toBe(1)
    expect(r.errored).toBe(1)
    expect(m.agentTaskRunCreate).toHaveBeenCalledTimes(3)
    expect(m.agentTaskUpdate).toHaveBeenCalledTimes(3)
    // 仅 t1 (SUCCESS) 触发 MESSAGE
    expect(m.messageCreate).toHaveBeenCalledTimes(1)
  })
})