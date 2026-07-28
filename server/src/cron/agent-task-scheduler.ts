/**
 * Task 10 · Agent 自动化任务调度器 + Phase 1B 通知主权
 *
 * 平台宪法（不可违反，spec §0.1）：
 *   - 只读 + 只推送：registry[type].run() 内禁止任何写工具
 *   - 调度器自己不调 LLM
 *
 * 通知（Phase 1B）：
 *   - 任务执行与 AgentTaskRun 写入不受通知抑制影响
 *   - NOTIFICATION_SOVEREIGNTY_ENABLED=1 时 MESSAGE 须经 AGENT_TASK_RESULT 决策
 *   - 抑制不得把运行改成失败；重试不得重复 Delivery/Message
 */

import { prisma } from '../lib/prisma.js'
import { withSchedulerLease } from '../services/scheduler-lease.service.js'
import { computeNextRunAt } from '../services/agent/task-schedule.js'
import { getTaskType } from '../services/agent/task-types/index.js'
import { canTakeOverNotificationTraffic } from '../config/notification-sovereignty.js'
import { evaluateAndRecord } from '../services/notification-delivery.service.js'
import { agentTaskSourceRef } from '../services/notification-legacy-migration.js'

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
    if (
      task.lastRunAt &&
      Math.abs(task.lastRunAt.getTime() - task.nextRunAt.getTime()) < SAME_SLOT_THRESHOLD_MS
    ) {
      skipped += 1
      continue
    }

    const type = getTaskType(task.type)
    if (!type) {
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

      const run = await prisma.agentTaskRun.create({
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
        await maybeDeliverAgentTaskMessage({
          userId: task.userId,
          taskId: task.id,
          taskName: task.name,
          summary: result.summary,
          runId: run.id,
        })
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

async function alreadyDeliveredAgentRun(userId: string, runId: string): Promise<boolean> {
  const n = await prisma.notificationDelivery.count({
    where: {
      userId,
      eventType: 'AGENT_TASK_RESULT',
      resourceType: 'AgentTaskRun',
      resourceId: runId,
      status: { in: ['SENT', 'QUEUED'] },
    },
  })
  return n > 0
}

async function maybeDeliverAgentTaskMessage(input: {
  userId: string
  taskId: string
  taskName: string
  summary: string
  runId: string
}): Promise<void> {
  if (!canTakeOverNotificationTraffic('AGENT_TASK_RESULT')) {
    await prisma.message.create({
      data: {
        fromUserId: input.userId,
        toUserId: input.userId,
        type: 'SYSTEM',
        content: `${AGENT_TASK_TAG} ${input.taskName}\n\n${input.summary}`,
      },
    })
    return
  }

  if (await alreadyDeliveredAgentRun(input.userId, input.runId)) {
    return
  }

  const { decision } = await evaluateAndRecord(prisma, {
    userId: input.userId,
    eventType: 'AGENT_TASK_RESULT',
    sourceRef: agentTaskSourceRef(input.taskId),
    resourceType: 'AgentTaskRun',
    resourceId: input.runId,
    filterContext: { taskId: input.taskId },
  })

  if (!decision.deliver || !decision.channels.includes('IN_APP')) {
    // 抑制：不发 Message；运行已成功记录
    return
  }

  await prisma.message.create({
    data: {
      fromUserId: input.userId,
      toUserId: input.userId,
      type: 'SYSTEM',
      content: [
        `${AGENT_TASK_TAG} ${input.taskName}`,
        '',
        input.summary,
        '',
        `原因：${decision.reasonText}`,
        `reasonCode=${decision.reasonCode}`,
        `sourceRef=${agentTaskSourceRef(input.taskId)}`,
        '管理订阅：设置 → 推送设置',
      ].join('\n'),
    },
  })
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
  task: {
    id: string
    frequency: string
    atHour: number | null
    atMinute: number | null
    weekday: number | null
  },
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

function parseDeliveryChannels(raw: unknown): Array<'MESSAGE' | 'AGENT_INBOX'> {
  if (!Array.isArray(raw)) return ['MESSAGE', 'AGENT_INBOX']
  const allowed = new Set(['MESSAGE', 'AGENT_INBOX'])
  return raw.filter((v): v is 'MESSAGE' | 'AGENT_INBOX' => typeof v === 'string' && allowed.has(v))
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startAgentTaskScheduler(intervalMs = SCHEDULER_INTERVAL_MS): void {
  if (intervalId) return
  intervalId = setInterval(() => {
    withSchedulerLease('agent-task-scheduler', Math.max(intervalMs, 60_000), runAgentTaskScheduler).catch((err) =>
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

/** 供手动 run-now 复用 */
export { maybeDeliverAgentTaskMessage }
