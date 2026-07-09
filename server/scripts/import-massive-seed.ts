/**
 * 导入 seed-data/ 大规模种子 JSON → PostgreSQL
 *
 * 用法（在 server 目录）:
 *   npx tsx scripts/import-massive-seed.ts
 *   npx tsx scripts/import-massive-seed.ts --replace-demands   # 清空旧需求后导入
 *   npx tsx scripts/import-massive-seed.ts --demands-only      # 仅导入需求（用户已存在）
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import {
  PrismaClient,
  type CertLevel,
  type DemandStatus,
  type DemandStage,
  type ServiceType,
  type TagCategory,
} from '@prisma/client'
import { parsePath } from '../src/services/path-codec.js'
import { resolveDemandPaths } from '../src/services/path-search.js'
import { regionIdFromCityCode } from '../src/services/region-aliases.js'
import { allocateNextAccountNo } from '../src/services/account-no.js'
import {
  assignDemandCoverImage,
  assignUserImages,
  loadManifestForAssign,
} from '../src/services/asset-assign.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.resolve(__dir, '../../seed-data')
const prisma = new PrismaClient()
const PWD = bcrypt.hashSync('1', 10)

const REPLACE_DEMANDS = process.argv.includes('--replace-demands')
const DEMANDS_ONLY = process.argv.includes('--demands-only')
const CHUNK = 150

type TagRow = { name: string; category?: string }
type UserRow = {
  phone: string
  nickname: string
  cityCode: string
  certificationLevel: CertLevel
  creditScore: number
  completedOrders: number
  bio: string
  role: string
  serviceTags: string[]
}
type DemandRow = {
  title: string
  description: string
  minPrice: number
  category: string
  serviceType: ServiceType
  taxonomyLeafId: string
  tags: string[]
  tagsConfirmed: boolean
  cityCode: string
  status: DemandStatus
  isPublic: boolean
  stage: DemandStage
  applicantCount: number
  maxApplicants: number
  expireAt: string
  visibilityWindow: number
  visibleUntil: string
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(SEED_DIR, file), 'utf-8')) as T
}

function validTagName(name: string): string | null {
  const t = name.trim().slice(0, 50)
  if (!t) return null
  return parsePath(`tag:${t}`) ? t : null
}

function sanitizeTags(tags: string[]): string[] {
  const out: string[] = []
  for (const raw of tags) {
    const t = validTagName(raw)
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= 6) break
  }
  return out
}

async function importTags() {
  const file = path.join(SEED_DIR, 'tags-vocabulary.json')
  if (!existsSync(file)) {
    console.log('跳过标签：tags-vocabulary.json 不存在')
    return
  }
  const { tags } = readJson<{ tags: TagRow[] }>('tags-vocabulary.json')
  let n = 0
  for (const tag of tags) {
    const name = validTagName(tag.name)
    if (!name) continue
    const category = (tag.category === 'demand' ? 'demand' : 'service') as TagCategory
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, category, totalCompleted: 0, totalEstimatedAmount: 0, colorHistogram: [] },
    })
    n++
  }
  console.log(`✅ 标签: ${n} 条`)
}

async function importUsers(): Promise<string[]> {
  const { users } = readJson<{ users: UserRow[] }>('users-001.json')
  const manifest = loadManifestForAssign()
  const userIds: string[] = []
  let created = 0
  let skipped = 0
  let assetPatched = 0

  for (let i = 0; i < users.length; i++) {
    const u = users[i]!
    const existing = await prisma.user.findUnique({ where: { phone: u.phone } })
    if (existing) {
      userIds.push(existing.id)
      skipped++
      if (!existing.avatarUrl || !existing.coverUrl || !existing.demandCardCoverUrl) {
        const images = assignUserImages(i, existing.id, manifest)
        await prisma.user.update({ where: { id: existing.id }, data: images })
        assetPatched++
      }
      continue
    }

    const serviceTags = u.serviceTags
      .map(validTagName)
      .filter((t): t is string => !!t)
      .slice(0, 8)

    const accountNo = await allocateNextAccountNo()
    const images = assignUserImages(i, u.phone, manifest)
    const user = await prisma.user.create({
      data: {
        phone: u.phone,
        accountNo,
        nickname: u.nickname.slice(0, 50),
        passwordHash: PWD,
        cityCode: u.cityCode,
        certificationLevel: u.certificationLevel,
        creditScore: u.creditScore,
        completedOrders: u.completedOrders,
        bio: u.bio?.slice(0, 500) ?? '',
        role: u.role === 'ADMIN' ? 'ADMIN' : 'USER',
        serviceTags,
        avatarUrl: images.avatarUrl,
        coverUrl: images.coverUrl,
        demandCardCoverUrl: images.demandCardCoverUrl,
      },
    })
    userIds.push(user.id)
    created++

    for (const tagName of serviceTags) {
      await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName, category: 'service' },
      })
      await prisma.userTag.upsert({
        where: { userId_tagName: { userId: user.id, tagName } },
        update: {},
        create: {
          userId: user.id,
          tagName,
          status: 'IDLE',
          rating: 4.5,
          orderCount: u.completedOrders,
        },
      })
    }
  }

  console.log(`✅ 用户: 新建 ${created}，跳过 ${skipped}，补图 ${assetPatched}，池内 ${userIds.length} 个 ID`)
  return userIds
}

async function importDemands(userIds: string[]) {
  const manifest = loadManifestForAssign()
  const files = readdirSync(SEED_DIR)
    .filter((f) => /^demands-\d+\.json$/.test(f))
    .sort()

  if (files.length === 0) {
    console.log('未找到 demands-*.json')
    return
  }

  const publisherIds = userIds.filter(Boolean)
  if (publisherIds.length === 0) {
    throw new Error('无可用发布者 userId')
  }

  let total = 0
  let roundRobin = 0
  let demandIndex = 0

  for (const file of files) {
    const { demands } = readJson<{ demands: DemandRow[] }>(file)
    console.log(`\n📋 导入 ${file}（${demands.length} 条）…`)

    for (let i = 0; i < demands.length; i += CHUNK) {
      const slice = demands.slice(i, i + CHUNK)
      const rows = slice.map((d) => {
        const tags = sanitizeTags(d.tags)
        const userId = publisherIds[roundRobin++ % publisherIds.length]!
        const { coverImage } = assignDemandCoverImage(demandIndex++, userId, manifest)
        const regionId = regionIdFromCityCode(d.cityCode)
        const paths = resolveDemandPaths(
          {
            category: d.category,
            taxonomyLeafId: d.taxonomyLeafId,
            serviceType: d.serviceType,
            minPrice: Number(d.minPrice),
            regionId,
            isCertifiedOnly: false,
            tags,
            tagsConfirmed: d.tagsConfirmed ?? true,
            title: d.title,
            description: d.description,
          },
        )

        return {
          userId,
          title: d.title.slice(0, 200),
          description: d.description.slice(0, 2000),
          minPrice: d.minPrice,
          category: d.category,
          taxonomyLeafId: d.taxonomyLeafId,
          serviceType: d.serviceType,
          cityCode: d.cityCode,
          regionId,
          tags,
          tagsConfirmed: true,
          paths,
          status: d.status,
          isPublic: d.isPublic ?? true,
          stage: (d.stage ?? 'active') as DemandStage,
          applicantCount: d.applicantCount ?? 0,
          maxApplicants: d.maxApplicants ?? 10,
          expireAt: new Date(d.expireAt),
          visibilityWindow: d.visibilityWindow ?? 15,
          visibleUntil: d.visibleUntil ? new Date(d.visibleUntil) : new Date(d.expireAt),
          lifecycleStage: 'ACTIVE' as const,
          mediaUrls: [],
          coverImage,
        }
      })

      await prisma.demand.createMany({ data: rows })
      total += rows.length
      process.stdout.write(`  … ${total}\r`)
    }
    console.log(`  ✓ ${file} 完成`)
  }

  console.log(`\n✅ 需求合计导入: ${total} 条`)
  console.log('💡 若卡面仍异常，请执行: npm run assets:sync && npm run assets:thumbs && npm run assets:backfill')
}

async function main() {
  if (!existsSync(SEED_DIR)) {
    throw new Error(`seed-data 目录不存在: ${SEED_DIR}`)
  }

  console.log(`🚀 从 ${SEED_DIR} 导入大规模种子…`)
  console.log(`   replace-demands=${REPLACE_DEMANDS}  demands-only=${DEMANDS_ONLY}\n`)

  if (REPLACE_DEMANDS) {
    console.log('🗑  清空旧需求…')
    await prisma.demandApplication.deleteMany()
    await prisma.demandApplicantV2.deleteMany()
    await prisma.demandFavorite.deleteMany()
    await prisma.depositDemand.deleteMany()
    await prisma.order.deleteMany()
    await prisma.demand.deleteMany()
    console.log('   已清空 Demand 及相关表')
  }

  if (!DEMANDS_ONLY) {
    await importTags()
  }

  let userIds: string[]
  if (DEMANDS_ONLY) {
    const users = await prisma.user.findMany({ select: { id: true } })
    userIds = users.map((u) => u.id)
    console.log(`ℹ️  demands-only：使用现有 ${userIds.length} 个用户`)
  } else {
    userIds = await importUsers()
  }

  await importDemands(userIds)

  const [demandCount, tagCount, pathRows] = await Promise.all([
    prisma.demand.count(),
    prisma.tag.count(),
    prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(DISTINCT p)::int AS cnt
      FROM "Demand" d, unnest(d."paths") p
    `,
  ])

  console.log('\n📊 导入后统计:')
  console.log(`   需求总数: ${demandCount}`)
  console.log(`   标签总数: ${tagCount}`)
  console.log(`   池内不重复路径: ${pathRows[0]?.cnt ?? 0}`)
  console.log('\n💡 可执行 npx tsx scripts/backfill-demand-paths.ts 校验 paths')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
