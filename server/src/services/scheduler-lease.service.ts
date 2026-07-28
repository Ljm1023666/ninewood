import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma.js'

const owner = `${process.pid}:${randomUUID()}`

/** 多实例调度租约；未抢到租约的实例直接跳过本轮。 */
export async function withSchedulerLease<T>(name: string, leaseMs: number, run: () => Promise<T>): Promise<T | undefined> {
  const rows = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
    INSERT INTO "SchedulerLease" ("name", "owner", "leaseUntil", "updatedAt")
    VALUES (${name}, ${owner}, NOW() + (${leaseMs} * INTERVAL '1 millisecond'), NOW())
    ON CONFLICT ("name") DO UPDATE SET
      "owner" = EXCLUDED."owner",
      "leaseUntil" = EXCLUDED."leaseUntil",
      "updatedAt" = NOW()
    WHERE "SchedulerLease"."leaseUntil" <= NOW() OR "SchedulerLease"."owner" = ${owner}
    RETURNING TRUE AS acquired
  `
  if (!rows[0]?.acquired) return undefined
  return run()
}
