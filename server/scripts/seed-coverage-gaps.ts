/**
 * TASK-11 · P0 止血：按 manifest 补检索池缺口（幂等）
 *
 * 读取 `seed-data/path-coverage-manifest.json`，对 requiredPaths 中每个 tag：
 *   - 若 active 数 < minActiveDemands → 按模板补种至达标
 *   - 已达标则跳过
 *
 * 新增 manifest 词条时：
 *   1. 在下方 TEMPLATES_BY_TAG 增加模板（或 genericTagTemplates）
 *   2. 同步 `seed-data/tags-vocabulary.json` + `generate_massive_seed.py`
 *   3. 跑本脚本 → `npx tsx scripts/backfill-demand-paths.ts --force`（可选，createMany 已写 paths）
 *   4. 跑 `npx tsx scripts/check-path-coverage.ts` 验证
 *
 * 用法: npx tsx scripts/seed-coverage-gaps.ts
 */
import { PrismaClient, type DemandStage } from '@prisma/client'
import { resolveDemandPaths } from '../src/services/path-search.js'
import { regionIdFromCityCode } from '../src/services/region-aliases.js'
import { assignDemandCoverImage, loadManifestForAssign } from '../src/services/asset-assign.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = path.join(__dirname, '../../seed-data/path-coverage-manifest.json')

const prisma = new PrismaClient()

/** 城市分布（南京加权，覆盖「南京 租车」类 facet 检索） */
const CITIES: { code: string; name: string; count: number }[] = [
  { code: '320100', name: '南京', count: 14 },
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

type Tpl = { title: string; desc: string; tags: string[]; category: string; leaf: string; serviceType: 'ONLINE' | 'OFFLINE' }

/** 外包类补种模板（含复合 tag，供「外包」短词子串挂上） */
const OUTSOURCING_TEMPLATES: Record<string, Tpl[]> = {
  财务外包: [
    { title: '{city}小微企业财务外包', desc: '{city}本地小微企业财务外包，代理记账+报税+社保代缴一站式，注册会计师把关', tags: ['财务外包', '代理记账', '报税'], category: '企业服务', leaf: 'olpf-book', serviceType: 'ONLINE' },
    { title: '{city}电商财务外包代账', desc: '{city}电商企业财务外包，月度记账、税务申报、发票管理，老板省心', tags: ['财务外包', '代理记账', '电商运营'], category: '企业服务', leaf: 'olpf-book', serviceType: 'ONLINE' },
  ],
  客服外包: [
    { title: '{city}电商客服外包坐席', desc: '{city}电商客服外包，售前售后在线接待、工单处理，7×12 小时轮班', tags: ['客服外包', '客服', '电商运营'], category: '电商运营', leaf: 'olecs-tb', serviceType: 'ONLINE' },
    { title: '{city}热线客服外包团队', desc: '{city}企业热线客服外包，呼入呼出、回访调研，话术培训上岗', tags: ['客服外包', '客服', '电话客服'], category: '电商运营', leaf: 'olecs-tb', serviceType: 'ONLINE' },
  ],
  人事外包: [
    { title: '{city}人事外包招聘代招', desc: '{city}人事外包，批量招聘、入离职办理、薪酬代发，HR 流程全托管', tags: ['人事外包', '招聘', '人力资源'], category: '企业服务', leaf: 'olpf-book', serviceType: 'ONLINE' },
    { title: '{city}岗位外包灵活用工', desc: '{city}岗位外包与灵活用工，季节性用工合规结算，降低用工风险', tags: ['人事外包', '灵活用工', '人力资源'], category: '企业服务', leaf: 'olpf-book', serviceType: 'ONLINE' },
  ],
}

/** 叫车 / 网约车类补种模板（即时单趟，区别于出租车包车） */
const RIDE_HAIL_TEMPLATES: Record<string, Tpl[]> = {
  网约车: [
    { title: '{city}网约车早晚高峰接送', desc: '{city}网约车早晚高峰通勤接送，平台接单准时，按次计费司机上门', tags: ['网约车', '叫车', '打车'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
    { title: '{city}机场网约车预约单趟', desc: '{city}机场网约车预约单趟，航班跟踪、商务车可选，即时叫车不包车', tags: ['网约车', '机场接送', '叫车'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
    { title: '{city}网约车同城即时单', desc: '{city}网约车同城即时单，市区短途出行，手机一键叫车，明码标价', tags: ['网约车', '叫车', '打车'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
  ],
  叫车: [
    { title: '{city}一键叫车即时出行', desc: '{city}一键叫车，司机就近接单，按里程计费，即时出行不包车', tags: ['叫车', '网约车', '打车'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
    { title: '{city}夜间网约车叫车', desc: '{city}夜间网约车叫车，安全送达，女乘客可选女司机，按次结算', tags: ['叫车', '网约车', '夜间出行'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
  ],
}

/** 自驾租车 / 出租车（与 seed-car-rental-supplement 标签规范一致，互不混标） */
const MOBILITY_TEMPLATES: Record<string, Tpl[]> = {
  租车: [
    { title: '{city}租车自驾日租周租', desc: '{city}轿车SUV自驾租车，送车上门含基础险，驾照满一年', tags: ['租车', '自驾租车', '日租'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
  ],
  自驾租车: [
    { title: '{city}新能源自驾租车', desc: '{city}新能源自驾租车，续航充足可芝麻免押，市区取还', tags: ['自驾租车', '租车', '新能源'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
  ],
  出租车: [
    { title: '{city}出租车包车半天', desc: '{city}出租车包车4小时，熟悉路况可开发票，带司机不自驾', tags: ['出租车', '包车'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
  ],
}

/** manifest 其余高频 tag 的通用补种模板（CI / 空库门禁用） */
const GENERIC_TAG_TEMPLATES: Record<string, Tpl[]> = {
  代驾: [
    { title: '{city}酒后代驾安全送达', desc: '{city}酒后代驾，熟悉车型，夜间随叫随到', tags: ['代驾', '酒后代驾'], category: '汽车服务', leaf: 'ofac-drunk', serviceType: 'OFFLINE' },
  ],
  保洁: [
    { title: '{city}日常保洁三小时', desc: '{city}日常保洁擦窗拖地，自备工具清洁剂', tags: ['保洁', '家政服务'], category: '家政服务', leaf: 'ofhk-clean', serviceType: 'OFFLINE' },
  ],
  代理记账: [
    { title: '{city}小微企业代理记账', desc: '{city}代理记账报税，月度账务整理', tags: ['代理记账', '报税'], category: '企业服务', leaf: 'olpf-book', serviceType: 'ONLINE' },
  ],
  平面设计: [
    { title: '{city}宣传册平面设计', desc: '{city}宣传册海报平面设计，源文件交付', tags: ['平面设计', '海报设计'], category: '设计创意', leaf: 'old-poster', serviceType: 'ONLINE' },
  ],
}

const TEMPLATES_BY_TAG: Record<string, Tpl[]> = {
  ...OUTSOURCING_TEMPLATES,
  ...RIDE_HAIL_TEMPLATES,
  ...MOBILITY_TEMPLATES,
  ...GENERIC_TAG_TEMPLATES,
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}
function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

async function activeCountForTag(tag: string): Promise<number> {
  return prisma.demand.count({
    where: { tags: { has: tag }, stage: 'active', status: { notIn: ['CLOSED', 'FROZEN', 'IN_PROGRESS'] } },
  })
}

async function ensureTag(tag: string, templates: Tpl[], targetMin: number): Promise<number> {
  const current = await activeCountForTag(tag)
  if (current >= targetMin) {
    console.log(`  ✓ ${tag} 已满足: active=${current} >= ${targetMin}，跳过`)
    return current
  }
  const need = targetMin - current
  const publishers = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { id: true },
    take: 500,
  })
  if (publishers.length === 0) throw new Error('无可用发布者，请先导入用户种子')
  const manifest = loadManifestForAssign()
  const expireAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  const rows: Parameters<typeof prisma.demand.createMany>[0]['data'] = []
  let idx = 200_000 + Math.floor(Math.random() * 1000)
  let created = 0
  for (let i = 0; i < need; i++) {
    const tpl = pick(templates)
    const city = CITIES[i % CITIES.length]!
    const publisher = pick(publishers)
    const title = tpl.title.replace(/\{city\}/g, city.name)
    const desc = tpl.desc.replace(/\{city\}/g, city.name)
    const minPrice = randInt(80, 600)
    const regionId = regionIdFromCityCode(city.code)
    const paths = resolveDemandPaths({
      category: tpl.category,
      taxonomyLeafId: tpl.leaf,
      serviceType: tpl.serviceType,
      minPrice,
      regionId,
      isCertifiedOnly: false,
      tags: [...tpl.tags],
      tagsConfirmed: true,
      title,
      description: desc,
    })
    const { coverImage } = assignDemandCoverImage(idx++, publisher.id, manifest)
    rows.push({
      userId: publisher.id,
      title: title.slice(0, 200),
      description: desc.slice(0, 2000),
      minPrice,
      category: tpl.category,
      taxonomyLeafId: tpl.leaf,
      serviceType: tpl.serviceType,
      cityCode: city.code,
      regionId,
      tags: [...tpl.tags],
      tagsConfirmed: true,
      paths,
      status: 'ACTIVE',
      isPublic: true,
      stage: 'active' as DemandStage,
      applicantCount: 0,
      maxApplicants: 10,
      expireAt,
      visibilityWindow: 15,
      visibleUntil: expireAt,
      lifecycleStage: 'ACTIVE',
      mediaUrls: [],
      coverImage,
    })
    created++
  }
  await prisma.demand.createMany({ data: rows })
  console.log(`  + ${tag} 补种 ${created} 条（目标 ${targetMin}，原 ${current}）`)
  return current + created
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
    entries: { query: string; requiredPaths: string[]; minActiveDemands: number; notes?: string }[]
  }
  console.log(`读取 manifest: ${manifest.entries.length} 条查询`)

  for (const entry of manifest.entries) {
    const tagPaths = entry.requiredPaths.filter((p) => p.startsWith('tag:'))
    if (tagPaths.length === 0) continue
    console.log(`\n[${entry.query}] minActive=${entry.minActiveDemands}`)
    for (const rp of tagPaths) {
      const tag = rp.slice('tag:'.length)
      const templates = TEMPLATES_BY_TAG[tag] ?? null
      if (!templates) {
        const c = await activeCountForTag(tag)
        console.log(`  · ${tag} 无补种模板，现状 active=${c}`)
        continue
      }
      await ensureTag(tag, templates, Math.max(1, entry.minActiveDemands))
    }
  }

  console.log('\n✅ 缺口补种完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
