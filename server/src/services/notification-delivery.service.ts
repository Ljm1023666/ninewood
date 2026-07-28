/**
 * 通知投递审计（Phase 1A）。
 * preview=true 时不写库；不调用 Message / Socket / Windows。
 */

import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  PrismaClient,
} from '@prisma/client'
import type { NotificationDecision, NotificationIntent } from './notification-decision.service.js'
import { evaluateNotificationDecision } from './notification-decision.service.js'

export type RecordDeliveryInput = {
  intent: NotificationIntent
  decision: NotificationDecision
  /** 预览：不产生真实投递记录 */
  preview?: boolean
}

export async function recordNotificationDeliveries(
  prisma: PrismaClient,
  input: RecordDeliveryInput,
): Promise<{ recorded: number; deliveryIds: string[] }> {
  if (input.preview) {
    return { recorded: 0, deliveryIds: [] }
  }

  const { intent, decision } = input
  const ids: string[] = []

  if (!decision.deliver) {
    const row = await prisma.notificationDelivery.create({
      data: {
        userId: intent.userId,
        eventType: intent.eventType,
        category: decision.category,
        subscriptionId: decision.subscriptionId ?? null,
        reasonCode: decision.reasonCode,
        reasonText: decision.reasonText,
        channel: 'IN_APP',
        status: 'SUPPRESSED',
        suppressionCode: decision.suppressionCode ?? null,
        resourceType: intent.resourceType ?? null,
        resourceId: intent.resourceId ?? null,
      },
    })
    ids.push(row.id)
    return { recorded: 1, deliveryIds: ids }
  }

  const status: NotificationDeliveryStatus =
    decision.mode === 'DIGEST' ? 'QUEUED' : 'SENT'

  for (const ch of decision.channels) {
    // 安静时段延迟 Windows：记为 QUEUED，不假装已弹窗
    const chStatus: NotificationDeliveryStatus =
      ch === 'WINDOWS' && decision.deferWindows ? 'QUEUED' : status
    const row = await prisma.notificationDelivery.create({
      data: {
        userId: intent.userId,
        eventType: intent.eventType,
        category: decision.category,
        subscriptionId: decision.subscriptionId ?? null,
        reasonCode: decision.reasonCode,
        reasonText: decision.reasonText,
        channel: ch as NotificationChannel,
        status: chStatus,
        suppressionCode: decision.suppressionCode ?? null,
        resourceType: intent.resourceType ?? null,
        resourceId: intent.resourceId ?? null,
      },
    })
    ids.push(row.id)
  }

  return { recorded: ids.length, deliveryIds: ids }
}

export async function previewNotificationDecision(
  prisma: PrismaClient,
  intent: NotificationIntent,
) {
  const decision = await evaluateNotificationDecision({ prisma }, intent)
  // 明确无副作用
  await recordNotificationDeliveries(prisma, { intent, decision, preview: true })
  return decision
}

export async function evaluateAndRecord(
  prisma: PrismaClient,
  intent: NotificationIntent,
  opts?: { preview?: boolean },
) {
  const decision = await evaluateNotificationDecision({ prisma }, intent)
  const audit = await recordNotificationDeliveries(prisma, {
    intent,
    decision,
    preview: opts?.preview === true,
  })
  return { decision, audit }
}

export function createNotificationDeliveryService(prisma: PrismaClient) {
  return {
    record: (input: RecordDeliveryInput) => recordNotificationDeliveries(prisma, input),
    preview: (intent: NotificationIntent) => previewNotificationDecision(prisma, intent),
    evaluateAndRecord: (intent: NotificationIntent, opts?: { preview?: boolean }) =>
      evaluateAndRecord(prisma, intent, opts),
  }
}
