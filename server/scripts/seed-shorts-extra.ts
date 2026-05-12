import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. 让 admin (张师傅) 关注用户 2-8 (李设计~吴摄影)
  const admin = await prisma.user.findUnique({ where: { phone: '13800000001' } })
  if (!admin) { console.log('admin not found'); return }
  
  const toFollow = await prisma.user.findMany({
    where: { phone: { in: ['13800000002','13800000003','13800000004','13800000005','13800000006','13800000007','13800000008'] } },
    select: { id: true, nickname: true }
  })
  
  for (const u of toFollow) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: admin.id, followingId: u.id } },
      create: { followerId: admin.id, followingId: u.id },
      update: {},
    })
    console.log(`  ${admin.id.slice(0,6)} → follows → ${u.nickname}`)
  }

  // 2. 创建更多短视频 (来自不同用户)
  const newShorts = [
    { phone: '13800000002', desc: '今天的设计稿终于过了，分享一波工作日常 ✨', tags: ['设计', 'UI', '日常'] },
    { phone: '13800000003', desc: '在图书馆肝了一下午，终于把算法作业交了 📚', tags: ['学习', '编程', '校园'] },
    { phone: '13800000004', desc: '客户家深度保洁完成，焕然一新！看着好舒服 🧹', tags: ['家政', '保洁', '工作'] },
    { phone: '13800000005', desc: '工地巡检，这家的水电走得真漂亮 👷', tags: ['装修', '水电', '工地'] },
    { phone: '13800000006', desc: '中考数学压轴题精讲，需要的同学码住 📝', tags: ['教育', '数学', '中考'] },
    { phone: '13800000007', desc: '成都今天下雨，但跑腿不能停 🌧️ 已送8单', tags: ['跑腿', '成都', '日常'] },
    { phone: '13800000008', desc: '周末外拍，银杏林的光影太绝了 📸', tags: ['摄影', '外拍', '银杏'] },
    { phone: '13800000001', desc: '修了一台30年的老彩电，满满的情怀 🔧', tags: ['维修', '情怀', '手艺'] },
  ]

  const mediaPool = [
    '/uploads/sample_demand_1.jpg',
    '/uploads/sample_demand_2.jpg',
    '/uploads/sample_demand_3.jpg',
    '/uploads/sample_demand_4.jpg',
    '/uploads/sample_demand_5.jpg',
  ]

  for (let i = 0; i < newShorts.length; i++) {
    const s = newShorts[i]
    const user = await prisma.user.findUnique({ where: { phone: s.phone } })
    if (!user) continue
    await prisma.short.create({
      data: {
        userId: user.id,
        mediaUrl: mediaPool[i % mediaPool.length],
        description: s.desc,
        tags: s.tags,
        likeCount: Math.floor(Math.random() * 300),
        viewCount: Math.floor(Math.random() * 8000),
      },
    })
    console.log(`  short: ${user.nickname} — ${s.desc.slice(0,20)}...`)
  }

  console.log('\nDone!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
