/**
 * 补充汽车租赁类需求（租车/出租车）— 覆盖常见检索词「南京 租车」等
 *
 * 用法: npx tsx scripts/seed-car-rental-supplement.ts
 */
import { PrismaClient, type DemandStage } from '@prisma/client'
import { resolveDemandPaths } from '../src/services/path-search.js'
import { regionIdFromCityCode } from '../src/services/region-aliases.js'
import { assignDemandCoverImage, loadManifestForAssign } from '../src/services/asset-assign.js'

const prisma = new PrismaClient()

/** 城市分布（南京加权） */
const CITIES: { code: string; name: string; count: number }[] = [
  { code: '320100', name: '南京', count: 20 },
  { code: '110000', name: '北京', count: 12 },
  { code: '310000', name: '上海', count: 12 },
  { code: '440100', name: '广州', count: 10 },
  { code: '440300', name: '深圳', count: 10 },
  { code: '330100', name: '杭州', count: 8 },
  { code: '510100', name: '成都', count: 8 },
  { code: '420100', name: '武汉', count: 6 },
  { code: '610100', name: '西安', count: 6 },
  { code: '500000', name: '重庆', count: 6 },
  { code: '320500', name: '苏州', count: 5 },
  { code: '370200', name: '青岛', count: 4 },
]

const TEMPLATES = [
  {
    title: '{city}租车自驾·日租/周租',
    desc: '{city}本地租车，轿车/SUV可选，送车上门，含基础险，驾照满1年即可',
    tags: ['租车', '自驾租车', '日租'],
    price: [120, 450],
  },
  {
    title: '{city}商务用车带司机',
    desc: '商务接待、机场接送、会议用车，{city}城区及城际，司机{n}年驾龄',
    tags: ['商务用车', '包车', '机场接送'],
    price: [300, 1200],
  },
  {
    title: '{city}出租车包车半天',
    desc: '{city}出租车包车4小时/8小时，熟悉路况，可开发票，适合市内巡检',
    tags: ['出租车', '包车'],
    price: [200, 600],
  },
  {
    title: '{city}婚庆用车车队',
    desc: '婚车租赁奥迪/宝马等，{city}及周边，含装饰花艺，可协调车队',
    tags: ['租车', '婚庆用车', '汽车服务'],
    price: [800, 3500],
  },
  {
    title: '{city}新能源租车',
    desc: '特斯拉/比亚迪等新能源日租，{city}取还，续航充足，支持芝麻免押',
    tags: ['租车', '新能源', '电动车'],
    price: [150, 500],
  },
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

async function main() {
  const publishers = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { id: true },
    take: 500,
  })
  if (publishers.length === 0) {
    throw new Error('无可用发布者，请先导入用户种子')
  }

  const manifest = loadManifestForAssign()
  const expireAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  const rows: Parameters<typeof prisma.demand.createMany>[0]['data'] = []

  let demandIndex = 100_000
  for (const city of CITIES) {
    for (let i = 0; i < city.count; i++) {
      const tpl = pick(TEMPLATES)
      const publisher = pick(publishers)
      const years = randInt(3, 15)
      const title = tpl.title.replace(/\{city\}/g, city.name)
      const desc = tpl.desc.replace(/\{city\}/g, city.name).replace(/\{n\}/g, String(years))
      const minPrice = randInt(tpl.price[0], tpl.price[1])
      const regionId = regionIdFromCityCode(city.code)
      const paths = resolveDemandPaths({
        category: '汽车服务',
        taxonomyLeafId: 'ofac-drunk',
        serviceType: 'OFFLINE',
        minPrice,
        regionId,
        isCertifiedOnly: false,
        tags: [...tpl.tags],
        tagsConfirmed: true,
        title,
        description: desc,
      })
      const { coverImage } = assignDemandCoverImage(demandIndex++, publisher.id, manifest)

      rows.push({
        userId: publisher.id,
        title: title.slice(0, 200),
        description: desc.slice(0, 2000),
        minPrice,
        category: '汽车服务',
        taxonomyLeafId: 'ofac-drunk',
        serviceType: 'OFFLINE',
        cityCode: city.code,
        regionId,
        tags: [...tpl.tags],
        tagsConfirmed: true,
        paths,
        status: 'ACTIVE',
        isPublic: true,
        stage: 'active' as DemandStage,
        applicantCount: randInt(0, 5),
        maxApplicants: 10,
        expireAt,
        visibilityWindow: 15,
        visibleUntil: expireAt,
        lifecycleStage: 'ACTIVE',
        mediaUrls: [],
        coverImage,
      })
    }
  }

  await prisma.demand.createMany({ data: rows })
  console.log(`✅ 已补充 ${rows.length} 条汽车出行类需求（自驾租车 tag:租车 · 出租车/包车 tag:出租车）`)
  console.log(`   南京 ${CITIES[0]!.count} 条 · 合计覆盖 ${CITIES.length} 个城市`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
