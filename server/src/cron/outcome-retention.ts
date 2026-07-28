import { prisma } from '../lib/prisma.js'
import { withSchedulerLease } from '../services/scheduler-lease.service.js'

export async function aggregateAndPurgeOutcomeEvents(now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  await prisma.$executeRaw`
    INSERT INTO "OutcomeDailyAggregate"
      ("day", "resourceType", "eventType", "eventCount", "activeMsSum", "sampleCount", "updatedAt")
    SELECT
      date_trunc('day', "occurredAt"),
      "resourceType",
      "eventType",
      COUNT(*)::integer,
      COALESCE(SUM("activeMs"), 0)::bigint,
      COUNT("activeMs")::integer,
      NOW()
    FROM "OutcomeEvent"
    WHERE "occurredAt" < ${cutoff}
    GROUP BY 1, 2, 3
    ON CONFLICT ("day", "resourceType", "eventType") DO UPDATE SET
      "eventCount" = EXCLUDED."eventCount",
      "activeMsSum" = EXCLUDED."activeMsSum",
      "sampleCount" = EXCLUDED."sampleCount",
      "updatedAt" = NOW()
  `
  return prisma.outcomeEvent.deleteMany({ where: { occurredAt: { lt: cutoff } } })
}

export function startOutcomeRetentionCron() {
  const intervalMs = 24 * 60 * 60 * 1000
  setInterval(() => {
    void withSchedulerLease('outcome-retention', intervalMs, () => aggregateAndPurgeOutcomeEvents()).catch((error) => {
      console.error('[outcome-retention] failed', error)
    })
  }, intervalMs)
}
