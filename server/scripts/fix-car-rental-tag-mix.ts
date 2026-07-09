/**
 * 修正 DB 中「租车」(自驾) 与「出租车」(打车/包车) 混标
 *
 * 用法: npx tsx scripts/fix-car-rental-tag-mix.ts
 */
import { PrismaClient } from '@prisma/client'
import { resolveDemandPaths } from '../src/services/path-search.js'

const prisma = new PrismaClient()

const TAXI_HINTS = /出租车|打车|包车半天|带司机|代驾/
const RENTAL_HINTS = /租车自驾|日租|周租|新能源租车|自驾租车|芝麻免押/

function stripTags(tags: string[], remove: Set<string>): string[] {
  return tags.filter((t) => !remove.has(t))
}

async function main() {
  const rows = await prisma.demand.findMany({
    where: {
      OR: [
        { tags: { has: '租车' } },
        { tags: { has: '出租车' } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      category: true,
      taxonomyLeafId: true,
      serviceType: true,
      minPrice: true,
      regionId: true,
      isCertifiedOnly: true,
      tagsConfirmed: true,
    },
  })

  let updated = 0
  for (const d of rows) {
    const text = `${d.title} ${d.description ?? ''}`
    let tags = [...d.tags]
    const hadRental = tags.includes('租车')
    const hadTaxi = tags.includes('出租车')

    if (TAXI_HINTS.test(text) && !RENTAL_HINTS.test(text)) {
      tags = stripTags(tags, new Set(['租车', '自驾租车', '日租']))
    } else if (RENTAL_HINTS.test(text) && !TAXI_HINTS.test(text)) {
      tags = stripTags(tags, new Set(['出租车', '包车']))
    } else if (hadRental && hadTaxi) {
      // 双标且文案含糊：按标题倾向拆分
      if (/出租车|包车/.test(d.title) && !/租车|自驾|日租/.test(d.title)) {
        tags = stripTags(tags, new Set(['租车', '自驾租车', '日租']))
      } else if (/租车|自驾|日租|新能源/.test(d.title)) {
        tags = stripTags(tags, new Set(['出租车']))
      }
    }

    if (tags.length === d.tags.length && tags.every((t, i) => t === d.tags[i])) continue

    const paths = resolveDemandPaths({
      category: d.category,
      taxonomyLeafId: d.taxonomyLeafId,
      serviceType: d.serviceType,
      minPrice: d.minPrice,
      regionId: d.regionId,
      isCertifiedOnly: d.isCertifiedOnly ?? false,
      tags,
      tagsConfirmed: d.tagsConfirmed,
      title: d.title,
      description: d.description ?? '',
    })

    await prisma.demand.update({
      where: { id: d.id },
      data: { tags, paths },
    })
    updated++
  }

  console.log(`✅ 已修正 ${updated} / ${rows.length} 条需求的租车/出租车标签`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
