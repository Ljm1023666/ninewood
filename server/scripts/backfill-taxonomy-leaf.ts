import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORY_TO_LEAVES: Record<string, readonly string[]> = {
  设计: ['on-d-logo', 'on-d-ui', 'on-d-pack', 'on-d-video', 'on-d-3d', 'on-d-photo', 'on-m-voice'],
  技术开发: ['on-t-web', 'on-t-mini', 'on-t-app', 'on-t-api', 'on-t-data', 'on-t-cloud', 'on-t-sec', 'off-r-net'],
  教育培训: ['on-e-lang', 'on-e-k12', 'on-e-cert', 'on-e-it', 'on-e-art', 'on-e-sport', 'off-b-train', 'off-s-interview'],
  咨询服务: ['on-p-strat', 'on-p-comp', 'on-m-copy', 'off-b-iso', 'off-f-org'],
  家政服务: ['off-l-daily', 'off-l-deep', 'off-l-acs', 'off-l-move', 'off-l-baby', 'off-he-pest', 'off-w-nail', 'off-w-skin', 'off-p-plant'],
  维修服务: ['off-r-phone', 'off-r-pc', 'off-r-appliance', 'off-r-plumb', 'off-r-lock', 'off-f-cold'],
  法律法务: ['on-p-law', 'on-p-ip'],
  财务税务: ['on-p-tax'],
  电商运营: ['on-ec-shop', 'on-ec-live', 'on-ec-seo', 'on-ec-pr', 'on-ec-cross'],
  健身运动: ['off-t-climb'],
  婚庆摄影: ['off-b-photo', 'off-w-photo', 'off-w-makeup', 'off-w-host', 'off-w-dress'],
  宠物服务: ['off-p-board', 'off-p-walk', 'off-p-train', 'off-p-vet', 'off-p-fish'],
  汽车服务: ['off-c-wash', 'off-c-beauty', 'off-c-repair', 'off-c-rescue', 'off-c-pile', 'off-c-driver', 'off-t-driver'],
  房产相关: ['off-he-check', 'off-he-rent', 'off-he-bnb', 'off-he-law'],
  环保检测: ['off-he-air'],
  心理咨询: ['off-h-psy'],
  留学出国: ['off-s-paper', 'off-s-visa'],
  翻译语言: ['off-lang-doc', 'off-lang-escort', 'off-lang-sim'],
  企业服务: ['on-p-hr', 'off-b-event', 'off-b-hr'],
  仓储物流: ['off-b-logi'],
  三农服务: ['off-f-machine', 'off-f-greenhouse'],
  茶艺文化: ['off-l-tea', 'off-tea-class', 'off-tea-party'],
  旅游出行: ['off-t-guide', 'off-t-ski', 'off-t-dive', 'off-t-camp'],
  医疗健康: ['off-h-clinic', 'off-h-massage', 'off-h-tcm', 'off-h-diet'],
  美食餐饮: ['off-l-chef', 'off-coffee'],
}

const ONLINE_FALLBACK = ['on-d-logo', 'on-t-web', 'on-e-lang', 'on-p-law', 'on-ec-shop', 'on-m-game'] as const
const OFFLINE_FALLBACK = ['off-l-daily', 'off-r-phone', 'off-h-clinic', 'off-c-wash', 'off-he-check', 'off-b-event', 'off-w-photo', 'off-p-board'] as const

function hashStr(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickLeaf(category: string, serviceType: 'ONLINE' | 'OFFLINE', seed: string): string {
  const mapped = CATEGORY_TO_LEAVES[category] ?? []
  const branchLeaves = mapped.filter((id) =>
    serviceType === 'ONLINE' ? id.startsWith('on-') : id.startsWith('off-'),
  )
  if (branchLeaves.length > 0) return branchLeaves[hashStr(seed) % branchLeaves.length]!
  const fallback = serviceType === 'ONLINE' ? ONLINE_FALLBACK : OFFLINE_FALLBACK
  return fallback[hashStr(seed) % fallback.length]!
}

async function main() {
  const demands = await prisma.demand.findMany({
    where: { taxonomyLeafId: null },
    select: { id: true, category: true, serviceType: true },
  })
  if (demands.length === 0) {
    console.log('No records need backfill.')
    return
  }

  const batches: Array<Promise<unknown>> = []
  for (const d of demands) {
    const taxonomyLeafId = pickLeaf(d.category, d.serviceType, d.id)
    batches.push(
      prisma.demand.update({
        where: { id: d.id },
        data: { taxonomyLeafId },
      }),
    )
  }
  const CHUNK = 200
  for (let i = 0; i < batches.length; i += CHUNK) {
    await Promise.all(batches.slice(i, i + CHUNK))
  }
  console.log(`Backfilled taxonomyLeafId for ${demands.length} demands.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
