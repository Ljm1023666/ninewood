/**
 * Phase 0 只读 DB 聚合（不打印排除词/媒体/正文）。
 * 由 scripts/audit-time-sovereignty-baseline.mjs 调用。
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function bucket(n: number): string {
  if (n === 0) return '0'
  if (n <= 3) return '1-3'
  if (n <= 10) return '4-10'
  return '11+'
}

async function main() {
  const [
    shortCount,
    shortGroups,
    followCount,
    pushPrefCount,
    receiveOn,
    receiveOff,
    usersWithSnatchGt0,
    usersTotal,
    snatchAgg,
    freqRows,
    prefs,
  ] = await Promise.all([
    prisma.short.count(),
    prisma.short.groupBy({ by: ['userId'], _count: true }),
    prisma.follow.count(),
    prisma.pushPreference.count(),
    prisma.pushPreference.count({ where: { receivePushes: true } }),
    prisma.pushPreference.count({ where: { receivePushes: false } }),
    prisma.user.count({ where: { snatchCredits: { gt: 0 } } }),
    prisma.user.count(),
    prisma.user.aggregate({
      _sum: { snatchCredits: true },
      _avg: { snatchCredits: true },
    }),
    prisma.pushPreference.groupBy({ by: ['pushFrequency'], _count: true }),
    prisma.pushPreference.findMany({
      select: {
        excludeKeywords: true,
        excludeTags: true,
        excludeRegions: true,
      },
    }),
  ])

  const kwBuckets: Record<string, number> = {}
  const tagBuckets: Record<string, number> = {}
  const regionBuckets: Record<string, number> = {}
  for (const p of prefs) {
    const kb = bucket(p.excludeKeywords?.length || 0)
    const tb = bucket(p.excludeTags?.length || 0)
    const rb = bucket(p.excludeRegions?.length || 0)
    kwBuckets[kb] = (kwBuckets[kb] || 0) + 1
    tagBuckets[tb] = (tagBuckets[tb] || 0) + 1
    regionBuckets[rb] = (regionBuckets[rb] || 0) + 1
  }

  const payload = {
    available: true,
    shortCount,
    shortDistinctAuthors: shortGroups.length,
    followCount,
    pushPrefCount,
    receivePushesTrue: receiveOn,
    receivePushesFalse: receiveOff,
    usersTotal,
    usersWithSnatchCreditsGt0: usersWithSnatchGt0,
    snatchCreditsSum: snatchAgg._sum.snatchCredits ?? 0,
    snatchCreditsAvg: snatchAgg._avg.snatchCredits ?? null,
    pushFrequency: Object.fromEntries(freqRows.map((r) => [r.pushFrequency, r._count])),
    excludeKeywordLenBuckets: kwBuckets,
    excludeTagLenBuckets: tagBuckets,
    excludeRegionLenBuckets: regionBuckets,
  }
  process.stdout.write(JSON.stringify(payload))
}

main()
  .catch((e) => {
    process.stdout.write(
      JSON.stringify({ available: false, reason: String(e?.message || e) }),
    )
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
