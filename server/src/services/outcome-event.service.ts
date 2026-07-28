import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

const ALLOWED_METADATA = new Set(['outcomeStatus', 'notificationsStoppedCount', 'hasNextAction'])

export function isOutcomeMetricsEnabled() {
  return process.env.OUTCOME_METRICS_ENABLED === '1'
}

export async function recordOutcomeEvent(input: {
  userId?: string | null
  correlationId: string
  resourceType: string
  resourceId: string
  eventType: string
  activeMs?: number | null
  metadata?: Record<string, unknown>
}) {
  if (!isOutcomeMetricsEnabled()) return null
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).filter(([key]) => ALLOWED_METADATA.has(key)),
  )
  const activeMs = input.activeMs == null ? null : Math.max(0, Math.min(Math.trunc(input.activeMs), 4 * 60 * 60 * 1000))
  return prisma.outcomeEvent.create({ data: { ...input, activeMs, metadata: metadata as Prisma.InputJsonValue } })
}

export function recordOutcomeEventSafe(input: Parameters<typeof recordOutcomeEvent>[0]) {
  void recordOutcomeEvent(input).catch((error) => {
    console.error('[outcome-event] write failed', input.resourceType, input.resourceId, error)
  })
}
