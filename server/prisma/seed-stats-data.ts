/**
 * 为 tag-stats 页面生成真实数据
 * 给 14 个用户补充有金额的需求数据，确保标签匹配 userTag
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_PHONES = [
  '13800000001','13800000002','13800000003','13800000004',
  '13800000005','13800000006','13800000007','13800000008',
  '13800000009','13800000010','13800000011','13800000012',
  '13800000013','13800000014',
]

// 每个用户的标签 → 多条需求的模板
const DEMANDS_BY_TAG: Record<string, { title: string; price: number; status: 'COMPLETED' | 'PENDING' }[]> = {
  '水电维修': [
    { title: '更换卫生间水龙头', price: 80, status: 'COMPLETED' },
    { title: '厨房下水管疏通', price: 120, status: 'COMPLETED' },
    { title: '全屋电路检修', price: 350, status: 'COMPLETED' },
    { title: '安装智能马桶', price: 200, status: 'PENDING' },
  ],
  '家政保洁': [
    { title: '全屋深度保洁 120平', price: 400, status: 'COMPLETED' },
    { title: '油烟机拆洗', price: 150, status: 'COMPLETED' },
    { title: '新房开荒保洁', price: 600, status: 'COMPLETED' },
    { title: '地毯清洗', price: 280, status: 'PENDING' },
  ],
  '摄影': [
    { title: '产品拍摄 20张', price: 500, status: 'COMPLETED' },
    { title: '婚礼跟拍全天', price: 2800, status: 'COMPLETED' },
    { title: '证件照精修', price: 80, status: 'COMPLETED' },
    { title: '淘宝详情页拍摄', price: 1200, status: 'PENDING' },
  ],
  '设计': [
    { title: 'Logo设计 3稿', price: 800, status: 'COMPLETED' },
    { title: '名片设计', price: 200, status: 'COMPLETED' },
    { title: '产品包装设计', price: 2500, status: 'PENDING' },
  ],
  'UI设计': [
    { title: 'APP界面设计 10页', price: 3000, status: 'COMPLETED' },
    { title: '后台管理面板设计', price: 4000, status: 'COMPLETED' },
    { title: '小程序UI整套', price: 5000, status: 'PENDING' },
  ],
  '前端开发': [
    { title: '企业官网前端切图', price: 2500, status: 'COMPLETED' },
    { title: 'Vue后台管理系统', price: 8000, status: 'PENDING' },
  ],
  '后端开发': [
    { title: 'RESTful API开发', price: 5000, status: 'COMPLETED' },
    { title: '数据库设计优化', price: 3000, status: 'PENDING' },
  ],
  'Python': [
    { title: 'Python数据爬虫', price: 2000, status: 'COMPLETED' },
    { title: '自动化脚本编写', price: 1500, status: 'COMPLETED' },
  ],
  '健身教练': [
    { title: '一对一私教 10节', price: 1500, status: 'COMPLETED' },
    { title: '减脂计划定制', price: 300, status: 'COMPLETED' },
    { title: '体态纠正 5节', price: 1000, status: 'PENDING' },
  ],
  '瑜伽教练': [
    { title: '瑜伽私教 5节', price: 800, status: 'COMPLETED' },
    { title: '孕期瑜伽指导', price: 1200, status: 'PENDING' },
  ],
  '家教': [
    { title: '小学数学辅导 10次', price: 1500, status: 'COMPLETED' },
    { title: '初中英语家教', price: 2000, status: 'COMPLETED' },
    { title: '高中物理辅导', price: 2500, status: 'PENDING' },
  ],
  '英语': [
    { title: '商务英语口语陪练', price: 200, status: 'COMPLETED' },
    { title: '雅思写作批改', price: 150, status: 'COMPLETED' },
  ],
  '翻译': [
    { title: '技术文档中译英 5000字', price: 1500, status: 'COMPLETED' },
    { title: '合同翻译 英译中', price: 800, status: 'PENDING' },
  ],
  '日语': [
    { title: '日语N1辅导', price: 3000, status: 'COMPLETED' },
    { title: '日文邮件代写', price: 100, status: 'PENDING' },
  ],
  '法律咨询': [
    { title: '合同审查服务', price: 1500, status: 'COMPLETED' },
    { title: '劳动仲裁咨询', price: 800, status: 'COMPLETED' },
    { title: '公司法务顾问月包', price: 5000, status: 'PENDING' },
  ],
  '会计': [
    { title: '月度代账服务', price: 500, status: 'COMPLETED' },
    { title: '年度企业所得税汇算', price: 2000, status: 'COMPLETED' },
  ],
  '代账': [
    { title: '小规模纳税人代账', price: 300, status: 'COMPLETED' },
    { title: '一般纳税人代账', price: 800, status: 'PENDING' },
  ],
  '搬家': [
    { title: '一居室搬家', price: 600, status: 'COMPLETED' },
    { title: '办公室搬迁', price: 3000, status: 'PENDING' },
  ],
  '货运': [
    { title: '同城货运 5吨', price: 800, status: 'COMPLETED' },
    { title: '长途运输 1000km', price: 5000, status: 'PENDING' },
  ],
  '装修': [
    { title: '卫生间翻新 3平', price: 5000, status: 'COMPLETED' },
    { title: '墙面刷漆 80平', price: 3000, status: 'PENDING' },
  ],
}

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { in: USER_PHONES } },
    select: { id: true, phone: true },
  })
  const phoneToId = Object.fromEntries(users.map(u => [u.phone, u.id]))

  // 为每个用户的每个标签创建需求
  for (const user of users) {
    const tags = await prisma.userTag.findMany({
      where: { userId: user.id },
      select: { tagName: true },
    })
    for (const { tagName } of tags) {
      const templates = DEMANDS_BY_TAG[tagName]
      if (!templates) continue
      for (const tpl of templates) {
        const expireAt = tpl.status === 'COMPLETED'
          ? new Date(Date.now() - Math.random() * 30 * 86400000)
          : new Date(Date.now() + 30 * 86400000)

        await prisma.demand.create({
          data: {
            userId: user.id,
            title: tpl.title,
            description: `${tpl.title}服务，价格可议`,
            minPrice: tpl.price,
            category: tagName,
            serviceType: 'ONLINE',
            tags: [tagName],
            status: tpl.status,
            stage: tpl.status === 'COMPLETED' ? 'completed' : 'active',
            expireAt,
            applicantCount: tpl.status === 'COMPLETED' ? 1 : Math.floor(Math.random() * 4),
          },
        })
      }
      console.log(`  ✅ ${user.phone} → ${tagName} (${templates.length} 条)`)
    }
  }

  console.log('\n📊 然后运行: curl -X POST http://localhost:3001/api/tag-stats/refresh')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
