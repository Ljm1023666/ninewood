/**
 * 为用户和需求分配头像 / 个人主页背景 / 需求卡封面
 *
 * 先运行: node scripts/sync-picture-assets.mjs  （从 D:\picture 同步）
 * 再运行: npx tsx prisma/seed-assets.ts
 *
 * 强制覆盖已有 URL: FORCE_ASSET_ASSIGN=1 npx tsx prisma/seed-assets.ts
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = path.join(__dirname, '..', 'uploads', '.asset-manifest.json')
const FORCE = process.env.FORCE_ASSET_ASSIGN === '1'

type Manifest = {
  avatars?: string[]
  covers?: string[]
  cardCovers?: string[]
}

function loadLists() {
  if (fs.existsSync(MANIFEST_PATH)) {
    const m = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
    const avatars = m.avatars?.length ? m.avatars : null
    const covers = m.covers?.length ? m.covers : null
    const cardCovers = m.cardCovers?.length ? m.cardCovers : null
    if (avatars && covers && cardCovers) {
      return { avatars, covers, cardCovers, fromManifest: true }
    }
  }

  // 兜底：旧占位命名（需 uploads 内已有对应文件）
  return {
    avatars: Array.from(
      { length: 20 },
      (_, i) => `/uploads/avatars/avatar_${String(i + 1).padStart(2, '0')}.png`,
    ),
    covers: Array.from(
      { length: 14 },
      (_, i) => `/uploads/covers/cover_${String(i + 1).padStart(2, '0')}.png`,
    ),
    cardCovers: Array.from(
      { length: 14 },
      (_, i) => `/uploads/card-covers/100${String(i + 1).padStart(2, '0')}.jpg`,
    ),
    fromManifest: false,
  }
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickByIndex<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length]
}

async function main() {
  const { avatars, covers, cardCovers, fromManifest } = loadLists()
  console.log(
    fromManifest
      ? `🎨 使用 D:\\picture 同步清单（${avatars.length} 头像 / ${covers.length} 背景 / ${cardCovers.length} 卡面）`
      : '⚠️ 未找到 .asset-manifest.json，使用默认占位路径（请先 node scripts/sync-picture-assets.mjs）',
  )

  const users = await prisma.user.findMany({
    where: FORCE ? {} : { avatarUrl: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`  ${users.length} 个用户待分配头像/背景`)

  let uDone = 0
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: pickByIndex(avatars, i),
        coverUrl: pickByIndex(covers, i + 3),
        demandCardCoverUrl: pickByIndex(cardCovers, i + 7),
      },
    })
    uDone++
    if (uDone % 50 === 0) console.log(`  ... ${uDone}/${users.length} 用户`)
  }
  console.log(`✅ 用户头像/封面: ${uDone}`)

  const demands = await prisma.demand.findMany({
    where: FORCE ? {} : { coverImage: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`  ${demands.length} 个需求待分配卡面`)

  let dDone = 0
  for (let i = 0; i < demands.length; i++) {
    const demand = demands[i]
    await prisma.demand.update({
      where: { id: demand.id },
      data: {
        coverImage: pickByIndex(cardCovers, i),
        completedCoverImage:
          Math.random() > 0.65 ? pickByIndex(cardCovers, i + 5) : null,
      },
    })
    dDone++
    if (dDone % 100 === 0) console.log(`  ... ${dDone}/${demands.length} 需求`)
  }
  console.log(`✅ 需求封面: ${dDone}`)

  const [withAvatar, withCover, withDemandCover] = await Promise.all([
    prisma.user.count({ where: { avatarUrl: { not: null } } }),
    prisma.user.count({ where: { coverUrl: { not: null } } }),
    prisma.demand.count({ where: { coverImage: { not: null } } }),
  ])
  console.log('\n📊 统计:')
  console.log(`  有头像用户: ${withAvatar}`)
  console.log(`  有个人封面用户: ${withCover}`)
  console.log(`  有封面需求: ${withDemandCover}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
