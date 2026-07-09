/**
 * 为全部用户 / 需求分配图片（与 asset-assign 机械映射一致）
 *
 * 用法: npx tsx scripts/assign-images.ts
 * 覆盖: FORCE=1 npx tsx scripts/assign-images.ts
 */
import { PrismaClient } from '@prisma/client'
import {
  assignDemandCoverImage,
  assignUserImages,
  loadManifestForAssign,
} from '../src/services/asset-assign.js'

const p = new PrismaClient()
const FORCE = process.env.FORCE === '1'

async function main() {
  const manifest = loadManifestForAssign()

  const users = await p.user.findMany({
    where: FORCE
      ? {}
      : {
          OR: [
            { avatarUrl: null },
            { coverUrl: null },
            { demandCardCoverUrl: null },
          ],
        },
    select: { id: true, nickname: true },
    orderBy: { createdAt: 'asc' },
  })

  for (let i = 0; i < users.length; i++) {
    const images = assignUserImages(i, users[i]!.id, manifest)
    await p.user.update({ where: { id: users[i]!.id }, data: images })
    console.log(`${users[i]!.nickname} → avatar + cover + card-cover`)
  }

  const demands = await p.demand.findMany({
    where: FORCE ? {} : { coverImage: null },
    select: { id: true, title: true, userId: true },
    orderBy: { createdAt: 'asc' },
  })

  for (let i = 0; i < demands.length; i++) {
    const { coverImage } = assignDemandCoverImage(i, demands[i]!.userId, manifest)
    await p.demand.update({ where: { id: demands[i]!.id }, data: { coverImage } })
    console.log(`${demands[i]!.title.slice(0, 24)} → ${coverImage}`)
  }

  console.log(`Done: ${users.length} users, ${demands.length} demands`)
  await p.$disconnect()
}

main()
