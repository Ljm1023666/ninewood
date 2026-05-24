import { prisma } from '../src/lib/prisma.js';

const SERVICE_TAGS = [
  '出租车', '代驾', '搬家', '货运', '跑腿',
  '家政保洁', '月嫂', '家电维修', '水电维修',
  '装修', '空调维修', '手机维修', '电脑维修',
  '摄影', '摄像', '化妆', '美甲', '美容',
  '理发', '健身教练', '瑜伽教练',
  '家教', '钢琴', '吉他', '英语', '日语', '韩语',
  '法律咨询', '会计', '代账', '翻译',
  '设计', 'UI设计', '前端开发', '后端开发',
  'Python', 'Java', 'Go', 'React', 'Vue',
  '外卖配送', '快递代取',
  '宠物寄养', '遛狗', '宠物美容',
  '园艺', '绿植',
  '厨艺', '上门做饭', '私房菜', '烘焙',
];

export async function seedTags() {
  for (const name of SERVICE_TAGS) {
    await prisma.tag.upsert({
      where: { name },
      update: { category: 'service' },
      create: { name, category: 'service' },
    });
  }
  console.log(`[Seed] 已写入 ${SERVICE_TAGS.length} 条服务标签数据`);
}

seedTags();
