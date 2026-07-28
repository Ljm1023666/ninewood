/**
 * Task Quiet 服务（Phase 2）
 * - 终态后停止对应非必要订阅与待发机会通知
 * - 幂等；失败不阻断交易主路径（调用方 catch）
 * - 由 TASK_QUIET_ENABLED 控制写入；关闭时仍可 buildCompletionSummary 只读
 */

import { prisma } from '../lib/prisma.js'
import { isTaskQuietEnabled } from '../config/task-quiet.js'
import { recordOutcomeEventSafe } from './outcome-event.service.js'
import {
  defaultSourceRefsFor,
  type CompletionSummary,
  type QuietInput,
  type QuietResourceType,
} from './task-quiet.types.js'

export async function buildCompletionSummary(
  resourceType: QuietResourceType,
  resourceId: string,
): Promise<CompletionSummary | null> {
  const row = await prisma.taskQuietRecord.findUnique({
    where: { resourceType_resourceId: { resourceType, resourceId } },
  })
  if (!row) return null
  return {
    resourceType: row.resourceType as QuietResourceType,
    resourceId: row.resourceId,
    outcomeStatus: row.outcomeStatus as CompletionSummary['outcomeStatus'],
    outcomeSummary: row.outcomeSummary,
    evidenceSummary: Array.isArray(row.evidenceSummary)
      ? (row.evidenceSummary as string[])
      : undefined,
    nextRequiredAction: (row.nextRequiredAction as CompletionSummary['nextRequiredAction']) ?? null,
    notificationsStopped: row.notificationsStopped,
    quietedAt: row.createdAt.toISOString(),
    alreadyQuiet: true,
  }
}

/**
 * 进入 Quiet：幂等。返回 CompletionSummary。
 */
export async function quietTask(input: QuietInput): Promise<CompletionSummary> {
  const sourceRefs = [
    ...new Set([
      ...(input.sourceRefs ?? []),
      ...defaultSourceRefsFor(input.resourceType, input.resourceId),
    ]),
  ]
  const nextRequiredAction = input.nextRequiredAction ?? null
  const notificationsStopped: string[] = []

  if (!isTaskQuietEnabled()) {
    return {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      outcomeStatus: input.outcomeStatus,
      outcomeSummary: input.outcomeSummary,
      evidenceSummary: input.evidenceSummary,
      nextRequiredAction,
      notificationsStopped: [],
      alreadyQuiet: false,
    }
  }

  const existing = await prisma.taskQuietRecord.findUnique({
    where: {
      resourceType_resourceId: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    },
  })
  if (existing) {
    return {
      resourceType: existing.resourceType as QuietResourceType,
      resourceId: existing.resourceId,
      outcomeStatus: existing.outcomeStatus as CompletionSummary['outcomeStatus'],
      outcomeSummary: existing.outcomeSummary,
      evidenceSummary: Array.isArray(existing.evidenceSummary)
        ? (existing.evidenceSummary as string[])
        : undefined,
      nextRequiredAction:
        (existing.nextRequiredAction as CompletionSummary['nextRequiredAction']) ?? null,
      notificationsStopped: existing.notificationsStopped,
      quietedAt: existing.createdAt.toISOString(),
      alreadyQuiet: true,
    }
  }

  // 停止匹配 sourceRef 的非必要订阅（mode→OFF，保留记录可追溯）
  if (sourceRefs.length > 0) {
    const subs = await prisma.notificationSubscription.findMany({
      where: {
        sourceRef: { in: sourceRefs },
        mode: { not: 'OFF' },
        category: { in: ['USER_REQUESTED', 'DIGEST', 'RELATIONSHIP'] },
      },
    })
    for (const s of subs) {
      await prisma.notificationSubscription.update({
        where: { id: s.id },
        data: { mode: 'OFF' },
      })
      notificationsStopped.push(`${s.eventType}:${s.sourceRef}`)
    }
  }

  // 取消该资源上待发送的非必要投递
  const queued = await prisma.notificationDelivery.updateMany({
    where: {
      resourceId: input.resourceId,
      status: 'QUEUED',
      category: { in: ['USER_REQUESTED', 'DIGEST', 'RELATIONSHIP'] },
    },
    data: {
      status: 'SUPPRESSED',
      suppressionCode: 'TASK_QUIET',
      reasonCode: 'TASK_QUIET',
      reasonText: '任务已进入 Quiet，取消待发送的非必要通知',
    },
  })
  if (queued.count > 0) {
    notificationsStopped.push(`queued_cancelled:${queued.count}`)
  }

  // Demand：额外抑制该 demand 上未投递的匹配机会
  if (input.resourceType === 'DEMAND') {
    const more = await prisma.notificationDelivery.updateMany({
      where: {
        eventType: 'DEMAND_MATCHED',
        resourceType: 'Demand',
        resourceId: input.resourceId,
        status: 'QUEUED',
      },
      data: {
        status: 'SUPPRESSED',
        suppressionCode: 'TASK_QUIET',
        reasonCode: 'TASK_QUIET',
        reasonText: '需求已结束，停止匹配机会通知',
      },
    })
    if (more.count > 0) {
      notificationsStopped.push(`demand_queued_cancelled:${more.count}`)
    }
  }

  const row = await prisma.taskQuietRecord.create({
    data: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      outcomeStatus: input.outcomeStatus,
      outcomeSummary: input.outcomeSummary,
      evidenceSummary: input.evidenceSummary ?? [],
      nextRequiredAction: nextRequiredAction ?? undefined,
      sourceRefsStopped: sourceRefs,
      notificationsStopped,
      userId: input.userId ?? null,
    },
  })

  recordOutcomeEventSafe({
    userId: input.userId,
    correlationId: `${input.resourceType}:${input.resourceId}`,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    eventType: 'TASK_QUIETED',
    metadata: {
      outcomeStatus: input.outcomeStatus,
      notificationsStoppedCount: notificationsStopped.length,
      hasNextAction: Boolean(nextRequiredAction),
    },
  })

  // 聚合审计事件（不建 OutcomeEvent 表；写入一条 Delivery 标记）
  if (input.userId) {
    await prisma.notificationDelivery.create({
      data: {
        userId: input.userId,
        eventType: 'TASK_QUIETED',
        category: 'TRANSACTIONAL_REQUIRED',
        reasonCode: 'TASK_QUIETED',
        reasonText: `任务已淡出：${input.outcomeSummary}`,
        channel: 'IN_APP',
        status: 'SENT',
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    }).catch(() => {
      /* 审计失败不阻断 Quiet */
    })
  }

  return {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    outcomeStatus: input.outcomeStatus,
    outcomeSummary: input.outcomeSummary,
    evidenceSummary: input.evidenceSummary,
    nextRequiredAction,
    notificationsStopped,
    quietedAt: row.createdAt.toISOString(),
    alreadyQuiet: false,
  }
}

/** 决策层：资源或 sourceRef 是否已 Quiet */
export async function isResourceQuieted(params: {
  resourceId?: string | null
  sourceRef?: string | null
}): Promise<boolean> {
  if (!isTaskQuietEnabled()) return false
  if (params.resourceId) {
    const byRes = await prisma.taskQuietRecord.findFirst({
      where: { resourceId: params.resourceId },
      select: { id: true },
    })
    if (byRes) return true
  }
  if (params.sourceRef) {
    const bySrc = await prisma.taskQuietRecord.findFirst({
      where: { sourceRefsStopped: { has: params.sourceRef } },
      select: { id: true },
    })
    if (bySrc) return true
  }
  return false
}

/** 安全调用：永不抛到交易路径 */
export function quietTaskSafe(input: QuietInput): void {
  quietTask(input).catch((err) => {
    console.error('[task-quiet] failed', input.resourceType, input.resourceId, err)
  })
}
