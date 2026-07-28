/**
 * 业务实体 ↔ NotificationSubscription 同步（Phase 1B）。
 * 幂等；不修改 UserTag / AgentTask / PushPreference 本体。
 */

import { prisma } from '../lib/prisma.js'
import {
  agentTaskSourceRef,
  channelsIncludeMessage,
  planFromUserTag,
  userTagSourceRef,
} from './notification-legacy-migration.js'

export async function syncDemandMatchedSubscriptionForUserTag(tag: {
  id: string
  userId: string
  tagName: string
  autoReceive: boolean
  regionId?: number | null
}): Promise<void> {
  const sourceRef = userTagSourceRef(tag.id)
  const plan = planFromUserTag(tag)
  if (plan.kind !== 'CREATE_SUBSCRIPTION') {
    await prisma.notificationSubscription.deleteMany({
      where: {
        userId: tag.userId,
        eventType: 'DEMAND_MATCHED',
        sourceRef,
      },
    })
    return
  }
  await prisma.notificationSubscription.upsert({
    where: {
      userId_eventType_sourceRef: {
        userId: tag.userId,
        eventType: 'DEMAND_MATCHED',
        sourceRef,
      },
    },
    create: {
      userId: tag.userId,
      category: 'USER_REQUESTED',
      eventType: 'DEMAND_MATCHED',
      mode: plan.mode,
      channels: plan.channels,
      filters: plan.filters as object,
      sourceRef,
    },
    update: {
      mode: plan.mode,
      channels: plan.channels,
      filters: plan.filters as object,
      category: 'USER_REQUESTED',
    },
  })
}

export async function syncAgentTaskResultSubscription(task: {
  id: string
  userId: string
  enabled: boolean
  deliveryChannels: unknown
}): Promise<void> {
  const sourceRef = agentTaskSourceRef(task.id)
  const wantsMessage = task.enabled && channelsIncludeMessage(task.deliveryChannels)
  if (!wantsMessage) {
    await prisma.notificationSubscription.deleteMany({
      where: {
        userId: task.userId,
        eventType: 'AGENT_TASK_RESULT',
        sourceRef,
      },
    })
    return
  }
  await prisma.notificationSubscription.upsert({
    where: {
      userId_eventType_sourceRef: {
        userId: task.userId,
        eventType: 'AGENT_TASK_RESULT',
        sourceRef,
      },
    },
    create: {
      userId: task.userId,
      category: 'USER_REQUESTED',
      eventType: 'AGENT_TASK_RESULT',
      mode: 'IMMEDIATE',
      channels: ['IN_APP'],
      filters: { taskId: task.id },
      sourceRef,
    },
    update: {
      mode: 'IMMEDIATE',
      channels: ['IN_APP'],
      filters: { taskId: task.id },
      category: 'USER_REQUESTED',
    },
  })
}

export async function deleteAgentTaskResultSubscription(
  userId: string,
  taskId: string,
): Promise<void> {
  await prisma.notificationSubscription.deleteMany({
    where: {
      userId,
      eventType: 'AGENT_TASK_RESULT',
      sourceRef: agentTaskSourceRef(taskId),
    },
  })
}
