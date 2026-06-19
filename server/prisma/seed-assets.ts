/**
 * 为用户和需求分配头像/封面/卡面图片
 * 用法: npx tsx prisma/seed-assets.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AVATARS = Array.from({ length: 20 }, (_, i) => `/uploads/avatars/avatar_${String(i + 1).padStart(2, '0')}.png`)
const CARD_COVERS = Array.from({ length: 14 }, (_, i) => `/uploads/card-covers/100${String(i + 1).padStart(2, '0')}.jpg`)
const COVERS = Array.from({ length: 14 }, (_, i) => `/uploads/covers/cover_${String(i + 1).padStart(2, '0')}.png`)

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

async function main() {
  console.log('🎨 分配头像和封面…')

  // ── 用户: 分配头像 + 封面 ──
  const users = await prisma.user.findMany({
    where: { avatarUrl: null },
    select: { id: true },
  })
  console.log(`  ${users.length} 个用户需要头像/封面`)

  let uDone = 0
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: pick(AVATARS),
        coverUrl: Math.random() > 0.3 ? pick(COVERS) : null,
        demandCardCoverUrl: Math.random() > 0.5 ? pick(CARD_COVERS) : null,
      },
    })
    uDone++
    if (uDone % 50 === 0) console.log(`  ... ${uDone}/${users.length} 用户`)
  }
  console.log(`✅ 用户头像/封面: ${uDone}`)

  // ── 需求: 分配封面 ──
  const demands = await prisma.demand.findMany({
    where: { coverImage: null },
    select: { id: true },
  })
  console.log(`  ${demands.length} 个需求需要封面`)

  let dDone = 0
  for (const demand of demands) {
    await prisma.demand.update({
      where: { id: demand.id },
      data: {
        coverImage: Math.random() > 0.2 ? pick(CARD_COVERS) : null,
        completedCoverImage: Math.random() > 0.7 ? pick(CARD_COVERS) : null,
      },
    })
    dDone++
    if (dDone % 100 === 0) console.log(`  ... ${dDone}/${demands.length} 需求`)
  }
  console.log(`✅ 需求封面: ${dDone}`)

  // ── 统计 ──
  const [withAvatar, withCover, withDemandCover] = await Promise.all([
    prisma.user.count({ where: { avatarUrl: { not: null } } }),
    prisma.user.count({ where: { coverUrl: { not: null } } }),
    prisma.demand.count({ where: { coverImage: { not: null } } }),
  ])
  console.log(`\n📊 统计:`)
  console.log(`  有头像用户: ${withAvatar}`)
  console.log(`  有个人封面用户: ${withCover}`)
  console.log(`  有封面需求: ${withDemandCover}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
