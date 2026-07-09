/**
 * TASK-11 · 存量需求 paths 回填
 * 用法:
 *   npx tsx server/scripts/backfill-demand-paths.ts          # 仅未编辑过的需求
 *   npx tsx server/scripts/backfill-demand-paths.ts --force  # 全量重算（jieba 升级后）
 */
import { PrismaClient } from '@prisma/client'
import { resolveDemandPaths } from '../src/services/path-search.js'
import { buildRegionSeedRows, regionIdFromCityCode } from '../src/services/region-aliases.js'

const prisma = new PrismaClient()
const force = process.argv.includes('--force')

async function ensureRegions(): Promise<Set<number>> {
  const rows = buildRegionSeedRows()
  for (const row of rows) {
    await prisma.region.upsert({
      where: { id: row.id },
      create: row,
      update: { name: row.name, level: row.level, parentId: row.parentId },
    })
  }
  console.log(`Region 表已同步 ${rows.length} 条区划`)
  return new Set(rows.map((r) => r.id))
}

async function main() {
  const validRegionIds = await ensureRegions()

  const demands = await prisma.demand.findMany({
    where: force ? undefined : { pathsEditedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      taxonomyLeafId: true,
      serviceType: true,
      minPrice: true,
      regionId: true,
      cityCode: true,
      isCertifiedOnly: true,
      tags: true,
      tagsConfirmed: true,
    },
  })

  if (demands.length === 0) {
    console.log(force ? 'No demands found.' : 'No demands need path backfill.')
    return
  }

  console.log(`${force ? 'Force' : 'Selective'} backfill for ${demands.length} demands...`)

  const CHUNK = 200
  let updated = 0

  for (let i = 0; i < demands.length; i += CHUNK) {
    const slice = demands.slice(i, i + CHUNK)
    await Promise.all(
      slice.map((d) => {
        const regionIdRaw = d.regionId ?? regionIdFromCityCode(d.cityCode)
        const regionId =
          regionIdRaw != null && validRegionIds.has(regionIdRaw) ? regionIdRaw : null
        const paths = resolveDemandPaths({
          category: d.category,
          taxonomyLeafId: d.taxonomyLeafId,
          serviceType: d.serviceType,
          minPrice: Number(d.minPrice),
          regionId,
          isCertifiedOnly: d.isCertifiedOnly,
          tags: d.tags,
          tagsConfirmed: d.tagsConfirmed || d.tags.length > 0,
          title: d.title,
          description: d.description,
        })
        return prisma.demand.update({
          where: { id: d.id },
          data: {
            paths,
            ...(d.regionId == null && regionId != null ? { regionId } : {}),
          },
        })
      }),
    )
    updated += slice.length
    console.log(`Backfilled ${updated}/${demands.length}...`)
  }

  console.log(`Done. Backfilled paths for ${demands.length} demands.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
