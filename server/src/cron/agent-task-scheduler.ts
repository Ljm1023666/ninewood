/**
 * Task 10 · Agent 自动化任务调度器
 *
 * 平台宪法（不可违反，spec §0.1）：
 *   - 只读 + 只推送：registry[type].run() 内禁止任何写工具
 *   - 调度器自己不调 LLM
 *
 * 行为（spec §4.2）：
 *   - 每 60s 扫描一次 AgentTask (enabled=true, nextRunAt <= now)
 *   - 对每个 task：调用 registry[type].run(userId, filters)
 *   - 写 AgentTaskRun（status/count/summary/payload）
 *   - 若 deliveryChannels 含 MESSAGE → 发 SYSTEM 消息（前缀 [AGENT_TASK]）
 *   - 更新 lastRunAt / nextRunAt = computeNextRunAt(task)
 *   - 错误：catch 单条，写 status=ERROR，不 disable
 *
 * 幂等（spec §4.2）：
 *   - 若 lastRunAt 与 nextRunAt 同槽（±30s）已处理则 skip
 *   - 重复触发同一槽（比如重启/重叠）由 AgentTaskRun 落地，作为兜底审计
 */

import { prisma } from '../lib/prisma.js'
import { computeNextRunAt } from '../services/agent/task-schedule.js'
import { getTaskType } from '../services/agent/task-types/index.js'

const BATCH_SIZE = 20
const SAME_SLOT_THRESHOLD_MS = 30_000
export const AGENT_TASK_TAG = '[AGENT_TASK]'
export const SCHEDULER_INTERVAL_MS = 60_000

export interface SchedulerResult {
  scanned: number
  succeeded: number
  empty: number
  errored: number
  skipped: number
}

export async function runAgentTaskScheduler(now: Date = new Date()): Promise<SchedulerResult> {
  const tasks = await prisma.agentTask.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    take: BATCH_SIZE,
  })

  if (tasks.length === 0) {
    return { scanned: 0, succeeded: 0, empty: 0, errored: 0, skipped: 0 }
  }

  let succeeded = 0
  let empty = 0
  let errored = 0
  let skipped = 0

  for (const task of tasks) {
    // 幂等：同一槽位已处理过则跳过
    if (
      task.lastRunAt &&
      Math.abs(task.lastRunAt.getTime() - task.nextRunAt.getTime()) < SAME_SLOT_THRESHOLD_MS
    ) {
      skipped += 1
      continue
    }

    const type = getTaskType(task.type)
    if (!type) {
      // 注册表里找不到（不应发生，但保底）
      const unknownMsg = `未知任务类型: ${task.type}`
      await writeErrorRun(task, unknownMsg, now)
      errored += 1
      await advanceSchedule(task, now, `执行失败：${unknownMsg}`)
      continue
    }

    try {
      const filters = (task.filters ?? {}) as Record<string, unknown>
      const result = await type.run(task.userId, filters)

      const status = result.count > 0 ? 'SUCCESS' : 'EMPTY'

      await prisma.agentTaskRun.create({
        data: {
          taskId: task.id,
          runAt: now,
          status,
          resultCount: result.count,
          summary: result.summary,
          payload: (result.payload ?? []) as unknown as object,
        },
      })

      if (status === 'SUCCESS') succeeded += 1
      else empty += 1

      const channels = parseDeliveryChannels(task.deliveryChannels)
      if (channels.includes('MESSAGE') && status === 'SUCCESS') {
        await sendSystemMessage(task.userId, task.name, result.summary)
      }

      await advanceSchedule(task, now, result.summary)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[agent-task-scheduler] task ${task.id} failed:`, err)
      await writeErrorRun(task, msg, now)
      errored += 1
      await advanceSchedule(task, now, `执行失败：${msg}`)
    }
  }

  if (succeeded + empty + errored > 0) {
    console.log(
      `[agent-task-scheduler] scanned=${tasks.length} ok=${succeeded} empty=${empty} err=${errored} skipped=${skipped}`,
    )
  }

  return { scanned: tasks.length, succeeded, empty, errored, skipped }
}

async function writeErrorRun(task: { id: string }, message: string, now: Date): Promise<void> {
  await prisma.agentTaskRun.create({
    data: {
      taskId: task.id,
      runAt: now,
      status: 'ERROR',
      resultCount: 0,
      summary: `执行失败：${message}`,
      payload: [],
    },
  })
}

async function advanceSchedule(
  task: { id: string; frequency: string; atHour: number | null; atMinute: number | null; weekday: number | null },
  now: Date,
  lastSummary: string,
): Promise<void> {
  const next = computeNextRunAt(
    {
      frequency: task.frequency as 'HOURLY' | 'DAILY' | 'WEEKLY',
      atHour: task.atHour,
      atMinute: task.atMinute,
      weekday: task.weekday,
    },
    now,
  )
  await prisma.agentTask.update({
    where: { id: task.id },
    data: { lastRunAt: now, nextRunAt: next, lastSummary },
  })
}

async function sendSystemMessage(userId: string, taskName: string, summary: string): Promise<void> {
  await prisma.message.create({
    data: {
      fromUserId: userId,
      toUserId: userId,
      type: 'SYSTEM',
      content: `${AGENT_TASK_TAG} ${taskName}\n\n${summary}`,
    },
  })
}

function parseDeliveryChannels(raw: unknown): Array<'MESSAGE' | 'AGENT_INBOX'> {
  if (!Array.isArray(raw)) return ['MESSAGE', 'AGENT_INBOX']
  const allowed = new Set(['MESSAGE', 'AGENT_INBOX'])
  return raw.filter((v): v is 'MESSAGE' | 'AGENT_INBOX' => typeof v === 'string' && allowed.has(v))
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startAgentTaskScheduler(intervalMs = SCHEDULER_INTERVAL_MS): void {
  if (intervalId) return
  intervalId = setInterval(() => {
    runAgentTaskScheduler().catch((err) =>
      console.error('[agent-task-scheduler] cron error:', err),
    )
  }, intervalMs)
  console.log(`[agent-task-scheduler] started (interval: ${intervalMs}ms)`)
}

export function stopAgentTaskScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}