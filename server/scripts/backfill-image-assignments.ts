/**
 * 按素材清单机械回填 User / Demand 图片字段（大规模种子导入后必跑）
 *
 * 用法（server 目录）:
 *   npx tsx scripts/backfill-image-assignments.ts
 *   FORCE=1 npx tsx scripts/backfill-image-assignments.ts   # 覆盖已有 URL
 *
 * 前置: npm run assets:sync && npm run assets:thumbs
 */
import { PrismaClient } from '@prisma/client'
import {
  assignDemandCoverImage,
  assignUserImages,
  loadManifestForAssign,
} from '../src/services/asset-assign.js'

const prisma = new PrismaClient()
const FORCE = process.env.FORCE === '1'

async function backfillUsers(manifest: ReturnType<typeof loadManifestForAssign>) {
  const users = await prisma.user.findMany({
    where: FORCE
      ? {}
      : {
          OR: [
            { avatarUrl: null },
            { coverUrl: null },
            { demandCardCoverUrl: null },
          ],
        },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  let done = 0
  for (let i = 0; i < users.length; i++) {
    const images = assignUserImages(i, users[i]!.id, manifest)
    await prisma.user.update({
      where: { id: users[i]!.id },
      data: images,
    })
    done++
    if (done % 100 === 0) console.log(`  用户 … ${done}/${users.length}`)
  }
  console.log(`✅ 用户图片: ${done}（force=${FORCE}）`)
}

async function backfillDemands(manifest: ReturnType<typeof loadManifestForAssign>) {
  const demands = await prisma.demand.findMany({
    where: FORCE ? {} : { coverImage: null },
    select: { id: true, userId: true },
    orderBy: { createdAt: 'asc' },
  })

  let done = 0
  for (let i = 0; i < demands.length; i++) {
    const d = demands[i]!
    const { coverImage } = assignDemandCoverImage(i, d.userId, manifest)
    await prisma.demand.update({
      where: { id: d.id },
      data: { coverImage },
    })
    done++
    if (done % 200 === 0) console.log(`  需求 … ${done}/${demands.length}`)
  }
  console.log(`✅ 需求卡面: ${done}（force=${FORCE}）`)
}

async function main() {
  const manifest = loadManifestForAssign()
  console.log(
    manifest.fromManifest
      ? `🎨 清单: ${manifest.avatars.length} 头像 / ${manifest.covers.length} 背景 / ${manifest.cardCovers.length} 卡面`
      : '⚠️ 未找到 .asset-manifest.json，使用内置占位路径（请先 npm run assets:sync）',
  )
  console.log(`   FORCE=${FORCE}\n`)

  await backfillUsers(manifest)
  await backfillDemands(manifest)

  const [uAvatar, uCover, uCard, dCover] = await Promise.all([
    prisma.user.count({ where: { avatarUrl: { not: null } } }),
    prisma.user.count({ where: { coverUrl: { not: null } } }),
    prisma.user.count({ where: { demandCardCoverUrl: { not: null } } }),
    prisma.demand.count({ where: { coverImage: { not: null } } }),
  ])
  console.log('\n📊 统计:')
  console.log(`  有头像用户: ${uAvatar}`)
  console.log(`  有主页背景用户: ${uCover}`)
  console.log(`  有默认卡面用户: ${uCard}`)
  console.log(`  有卡面需求: ${dCover}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
