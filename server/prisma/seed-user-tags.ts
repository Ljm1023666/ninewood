/**
 * 为用户关联服务标签（UserTag），用于 tag-stats 测试
 * 根据 seed.ts 中 14 个用户的 bio 匹配对应标签
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_TAG_MAP: Record<string, string[]> = {
  '13800000001': ['水电维修', '家电维修', '装修'],
  '13800000002': ['设计', 'UI设计', '摄影'],
  '13800000003': ['前端开发', '后端开发', 'Python', 'React'],
  '13800000004': ['家政保洁', '月嫂'],
  '13800000005': ['装修', '水电维修', '搬家'],
  '13800000006': ['家教', '英语'],
  '13800000007': ['跑腿', '外卖配送', '快递代取'],
  '13800000008': ['摄影', '摄像', '化妆'],
  '13800000009': ['法律咨询'],
  '13800000010': ['健身教练', '瑜伽教练'],
  '13800000011': ['搬家', '货运', '代驾'],
  '13800000012': ['翻译', '英语', '日语'],
  '13800000013': ['会计', '代账'],
  '13800000014': ['健身教练'],
}

async function main() {
  console.log('📦 为用户关联标签…')

  const users = await prisma.user.findMany({
    where: { phone: { in: Object.keys(USER_TAG_MAP) } },
    select: { id: true, phone: true },
  })

  for (const user of users) {
    const tags = USER_TAG_MAP[user.phone] || []
    for (const tagName of tags) {
      const tag = await prisma.tag.findUnique({ where: { name: tagName } })
      if (!tag) {
        console.log(`  ⚠️ 标签 "${tagName}" 不存在，跳过`)
        continue
      }
      await prisma.userTag.upsert({
        where: { userId_tagName: { userId: user.id, tagName } },
        update: { status: 'IDLE' },
        create: { userId: user.id, tagName, regionId: null, status: 'IDLE', rating: Math.floor(Math.random() * 30) + 70 },
      })
    }
    console.log(`  ✅ ${user.phone} → ${tags.join(', ')}`)
  }

  console.log('\n✅ 标签关联完成，请运行: curl -X POST http://localhost:3001/api/tag-stats/refresh')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
