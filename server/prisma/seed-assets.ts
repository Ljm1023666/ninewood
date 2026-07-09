/**
 * 为用户和需求分配头像 / 个人主页背景 / 需求卡封面
 *
 * 先运行: npm run assets:sync
 * 再运行: npm run assets:thumbs
 * 再运行: npm run assets:assign
 *
 * 强制覆盖已有 URL: FORCE=1 npm run assets:assign
 */
import { PrismaClient } from '@prisma/client'
import {
  assignDemandCoverImage,
  assignUserImages,
  loadManifestForAssign,
} from '../src/services/asset-assign.js'

const prisma = new PrismaClient()
const FORCE = process.env.FORCE_ASSET_ASSIGN === '1' || process.env.FORCE === '1'

async function main() {
  const manifest = loadManifestForAssign()
  console.log(
    manifest.fromManifest
      ? `🎨 使用素材清单（${manifest.avatars.length} 头像 / ${manifest.covers.length} 背景 / ${manifest.cardCovers.length} 卡面）`
      : '⚠️ 未找到 .asset-manifest.json，使用默认占位路径（请先 npm run assets:sync）',
  )

  const users = await prisma.user.findMany({
    where: FORCE ? {} : { avatarUrl: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`  ${users.length} 个用户待分配头像/背景/卡面`)

  let uDone = 0
  for (let i = 0; i < users.length; i++) {
    const images = assignUserImages(i, users[i]!.id, manifest)
    await prisma.user.update({
      where: { id: users[i]!.id },
      data: images,
    })
    uDone++
    if (uDone % 50 === 0) console.log(`  ... ${uDone}/${users.length} 用户`)
  }
  console.log(`✅ 用户头像/封面: ${uDone}`)

  const demands = await prisma.demand.findMany({
    where: FORCE ? {} : { coverImage: null },
    select: { id: true, userId: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`  ${demands.length} 个需求待分配卡面`)

  let dDone = 0
  for (let i = 0; i < demands.length; i++) {
    const { coverImage } = assignDemandCoverImage(i, demands[i]!.userId, manifest)
    await prisma.demand.update({
      where: { id: demands[i]!.id },
      data: { coverImage },
    })
    dDone++
    if (dDone % 100 === 0) console.log(`  ... ${dDone}/${demands.length} 需求`)
  }
  console.log(`✅ 需求封面: ${dDone}`)

  const [withAvatar, withCover, withDemandCard, withDemandCover] = await Promise.all([
    prisma.user.count({ where: { avatarUrl: { not: null } } }),
    prisma.user.count({ where: { coverUrl: { not: null } } }),
    prisma.user.count({ where: { demandCardCoverUrl: { not: null } } }),
    prisma.demand.count({ where: { coverImage: { not: null } } }),
  ])
  console.log('\n📊 统计:')
  console.log(`  有头像用户: ${withAvatar}`)
  console.log(`  有个人封面用户: ${withCover}`)
  console.log(`  有默认卡面用户: ${withDemandCard}`)
  console.log(`  有封面需求: ${withDemandCover}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
