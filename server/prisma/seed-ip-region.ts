/**
 * 回填种子用户的 IP 属地 — 根据 cityCode 查 Region 表获取城市名
 * 用法: npx tsx prisma/seed-ip-region.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌍 回填 IP 属地…')

  const users = await prisma.user.findMany({
    where: { ipRegion: null, cityCode: { not: null } },
    select: { id: true, cityCode: true },
  })
  console.log(`  ${users.length} 个用户需要回填`)

  let done = 0
  for (const user of users) {
    try {
      const region = await prisma.region.findUnique({
        where: { id: parseInt(user.cityCode!) },
        select: { name: true },
      })
      const name = region?.name?.replace(/市$/, '') || '未知'
      await prisma.user.update({
        where: { id: user.id },
        data: { ipRegion: name },
      })
      done++
    } catch { /* skip */ }
  }

  // 随机给没有 cityCode 的用户分配属地
  const unassigned = await prisma.user.findMany({
    where: { ipRegion: null },
    select: { id: true },
  })
  const popularCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '南京', '西安', '长沙', '郑州', '天津', '青岛', '昆明', '苏州', '厦门', '沈阳', '哈尔滨', '福州']

  for (const user of unassigned) {
    const city = popularCities[Math.floor(Math.random() * popularCities.length)]
    await prisma.user.update({
      where: { id: user.id },
      data: { ipRegion: city },
    })
    done++
  }

  console.log(`✅ 回填完成: ${done} 个用户`)
  const total = await prisma.user.count({ where: { ipRegion: { not: null } } })
  console.log(`   有 IP 属地用户: ${total}/${await prisma.user.count()}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
