import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '1';

const testUsers = [
  { phone: '13800000001', nickname: '张师傅', bio: '20年水电维修经验，持电工证，北京朝阳区随叫随到', cityCode: '110000', cert: 'ADVANCED' as const, credit: 92, orders: 68, role: 'ADMIN' as const },
  { phone: '13800000002', nickname: '李设计', bio: 'UI/UX设计师，擅长品牌视觉和移动端界面', cityCode: '310000', cert: 'INTERMEDIATE' as const, credit: 78, orders: 25 },
  { phone: '13800000003', nickname: '王同学', bio: '计算机大三学生，课余接单，熟悉前端和Python', cityCode: '110000', cert: 'BASIC' as const, credit: 62, orders: 6 },
  { phone: '13800000004', nickname: '赵阿姨', bio: '10年家政经验，擅长深度保洁和收纳整理', cityCode: '440100', cert: 'ADVANCED' as const, credit: 95, orders: 82 },
  { phone: '13800000005', nickname: '刘工头', bio: '装修队长，带领5人团队，擅长旧房翻新和水电改造', cityCode: '440300', cert: 'INTERMEDIATE' as const, credit: 74, orders: 31 },
  { phone: '13800000006', nickname: '陈老师', bio: '重点中学数学教师，辅导中高考数学10年', cityCode: '330100', cert: 'ADVANCED' as const, credit: 88, orders: 45 },
  { phone: '13800000007', nickname: '周跑腿', bio: '成都同城跑腿，电动车全城可达，代买代送代排队', cityCode: '510100', cert: 'BASIC' as const, credit: 66, orders: 11 },
  { phone: '13800000008', nickname: '吴摄影', bio: '自由摄影师，擅长人像和活动跟拍，设备Sony A7M4', cityCode: '110000', cert: 'INTERMEDIATE' as const, credit: 80, orders: 19 },
  { phone: '13800000009', nickname: '郑律师', bio: '执业律师，擅长合同纠纷和劳动仲裁', cityCode: '310000', cert: 'ADVANCED' as const, credit: 90, orders: 55 },
  { phone: '13800000010', nickname: '钱医生', bio: '三甲医院内科主治医师，提供健康咨询', cityCode: '320100', cert: 'ADVANCED' as const, credit: 86, orders: 41 },
  { phone: '13800000011', nickname: '孙司机', bio: '搬家货运司机，4.2米厢式货车，广州佛山全境', cityCode: '440100', cert: 'BASIC' as const, credit: 58, orders: 14 },
  { phone: '13800000012', nickname: '马翻译', bio: '英日双语翻译，CATTI二级，曾为多家外企提供同传', cityCode: '440300', cert: 'INTERMEDIATE' as const, credit: 76, orders: 22 },
  { phone: '13800000013', nickname: '朱会计', bio: '注册会计师，代账报税、财务顾问，服务中小企业50+', cityCode: '110000', cert: 'ADVANCED' as const, credit: 93, orders: 60 },
  { phone: '13800000014', nickname: '胡教练', bio: '健身教练，ACE认证，擅长减脂增肌和体态矫正', cityCode: '510100', cert: 'INTERMEDIATE' as const, credit: 72, orders: 28 },
  { phone: '13800000015', nickname: '林美容', bio: '美容师，擅长韩式半永久和皮肤管理', cityCode: '500000', cert: 'BASIC' as const, credit: 64, orders: 8 },
  { phone: '13800000016', nickname: '何码农', bio: '全栈开发10年，Go/React/Python技术栈', cityCode: '330100', cert: 'ADVANCED' as const, credit: 91, orders: 48 },
  { phone: '13800000017', nickname: '郭厨师', bio: '持证厨师，擅长川菜和粤菜，可上门做家宴', cityCode: '610100', cert: 'INTERMEDIATE' as const, credit: 82, orders: 35 },
  { phone: '13800000018', nickname: '杨花匠', bio: '园艺师，擅长庭院设计、绿植养护和盆栽造型', cityCode: '530100', cert: 'BASIC' as const, credit: 60, orders: 9 },
  { phone: '13800000019', nickname: '罗维修', bio: '手机电脑维修，屏幕更换电池更换主板维修', cityCode: '420100', cert: 'INTERMEDIATE' as const, credit: 77, orders: 24 },
  { phone: '13800000020', nickname: '梁新人', bio: '刚来这个平台，什么都想试试，请大家多多关照', cityCode: '120000', cert: 'NONE' as const, credit: 60, orders: 0 },
];

const demandTemplates = [
  { title: '家电清洗服务', desc: '需要深度清洗空调和洗衣机各一台，需自备工具和清洗剂', price: 150, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.91, lng: 116.40 },
  { title: 'Logo设计', desc: '科技创业公司需要设计简洁现代的Logo，包含名片和信封设计', price: 500, cat: '设计', type: 'ONLINE' as const },
  { title: '高中数学辅导', desc: '高二学生需要数学一对一辅导，函数和几何薄弱，每周一次', price: 200, cat: '教育培训', type: 'OFFLINE' as const, lat: 39.92, lng: 116.38 },
  { title: '搬家搬运', desc: '一居室搬家，从朝阳区搬到海淀区，需要一辆面包车和搬運工', price: 400, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.95, lng: 116.32 },
  { title: '英语翻译需求', desc: '需要翻译一份商务合同（中译英），约3000字，要求专业术语准确', price: 300, cat: '咨询服务', type: 'ONLINE' as const },
  { title: '家庭私厨上门', desc: '周末家庭聚餐6人，需要上门做一桌川菜，食材可自行准备', price: 350, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.93, lng: 116.36 },
  { title: '手机屏幕维修', desc: 'iPhone 15 Pro屏幕碎裂需要更换，要求原装屏', price: 250, cat: '维修服务', type: 'OFFLINE' as const, lat: 39.90, lng: 116.41 },
  { title: '健身私教课', desc: '需要一位健身教练指导减脂，每周3次，每次1小时', price: 180, cat: '教育培训', type: 'OFFLINE' as const, lat: 39.94, lng: 116.33 },
  { title: '小程序前端开发', desc: '需要一个微信小程序的前端页面，包含用户登录和商品列表', price: 800, cat: '技术开发', type: 'ONLINE' as const },
  { title: '证件照拍摄', desc: '需要专业证件照拍摄，白底和蓝底各一组，精修出片', price: 100, cat: '设计', type: 'OFFLINE' as const, lat: 39.91, lng: 116.39 },
];

async function main() {
  // Clean existing data
  await prisma.short.deleteMany();
  await prisma.message.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.circleMember.deleteMany();
  await prisma.order.deleteMany();
  await prisma.demandApplication.deleteMany();
  await prisma.demand.deleteMany();
  await prisma.circle.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Create 20 test users
  const users: Record<string, string> = {};
  for (let i = 0; i < testUsers.length; i++) {
    const u = testUsers[i];
    const avatarNum = String(i + 1).padStart(2, '0');
    const coverNum = i < 5 ? String(i + 1).padStart(2, '0') : null;
    const user = await prisma.user.create({
      data: {
        phone: u.phone,
        nickname: u.nickname,
        avatarUrl: `/uploads/avatars/avatar_${avatarNum}.png`,
        coverUrl: coverNum ? `/uploads/covers/cover_${coverNum}.png` : null,
        cityCode: u.cityCode,
        certificationLevel: u.cert,
        snatchCredits: u.cert === 'ADVANCED' ? 3 : 0,
        creditScore: u.credit,
        completedOrders: u.orders,
        role: (u as any).role || 'USER',
        passwordHash,
      },
    });
    users[u.phone] = user.id;
  }

  // Create 10 real demands spread across users (some pending, some completed)
  const demandIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const t = demandTemplates[i];
    const posterPhone = `138000000${String((i % 10) + 1).padStart(2, '0')}`;
    const posterId = users[posterPhone];
    if (!posterId) continue;

    const d = await prisma.demand.create({
      data: {
        userId: posterId,
        title: t.title,
        description: t.desc,
        minPrice: t.price,
        category: t.cat,
        serviceType: t.type,
        locationLat: t.lat || null,
        locationLng: t.lng || null,
        cityCode: testUsers[i % 10].cityCode,
        expireAt: future,
        status: i < 5 ? 'COMPLETED' : 'PENDING',
        applicantCount: i < 5 ? 1 : 0,
      },
    });
    demandIds.push(d.id);

    // For completed demands (i < 5), create order with another user as provider
    if (i < 5) {
      const providerPhone = `138000000${String(((i + 5) % 10) + 11).padStart(2, '0')}`;
      const providerId = users[providerPhone];
      if (!providerId) continue;

      // Create accepted application
      const app = await prisma.demandApplication.create({
        data: {
          demandId: d.id,
          userId: providerId,
          offerPrice: t.price * 0.9,
          message: `我做过类似的项目，可以高质量完成`,
          isSnatched: i % 2 === 0,
          status: 'ACCEPTED',
        },
      });

      // Create completed order
      await prisma.order.create({
        data: {
          demandId: d.id,
          providerId,
          requesterId: posterId,
          agreedPrice: t.price * 0.9,
          status: 'COMPLETED',
          paidAt: new Date(now.getTime() - 3600000),
          completedAt: now,
        },
      });

      // System message
      await prisma.message.create({
        data: {
          fromUserId: posterId,
          toUserId: providerId,
          content: `订单完成：${t.title}，成交价 ¥${t.price * 0.9}`,
          type: 'SYSTEM',
        },
      });
    }
  }

  // Create a sample circle with some users
  const circle = await prisma.circle.create({
    data: {
      name: '北京生活服务圈',
      type: 'PUBLIC',
      ownerId: users['13800000001'],
      cityCode: '110000',
      memberCount: 4,
      inviteCode: 'BJLH0001',
      status: 'ACTIVE',
      members: {
        create: [
          { userId: users['13800000001'], role: 'OWNER' },
          { userId: users['13800000003'], role: 'MEMBER' },
          { userId: users['13800000008'], role: 'MEMBER' },
          { userId: users['13800000013'], role: 'MEMBER' },
        ],
      },
    },
  });

  // Seed Shorts — casual explore content (no deal data)
  const shortMedia = [
    { media: '/uploads/1778316022704-x30azgj0ylr.mp4', cover: null, desc: '周末城市漫步，发现这家隐藏的咖啡馆 ☕', tags: ['城市探索', '咖啡', 'vlog'] },
    { media: '/uploads/sample_demand_1.jpg', cover: null, desc: '今天的落日太美了，分享给你们 🌇', tags: ['日落', '摄影', '日常'] },
    { media: '/uploads/sample_demand_2.jpg', cover: null, desc: '新入手的手冲壶，冲一杯云南小粒', tags: ['手冲', '咖啡', '生活'] },
    { media: '/uploads/sample_demand_3.jpg', cover: null, desc: '胡同里的老北京，每一块砖都是故事', tags: ['北京', '胡同', '人文'] },
    { media: '/uploads/sample_demand_4.jpg', cover: null, desc: '尝试做了一道新菜，味道还不错 😋', tags: ['美食', '烹饪', '日常'] },
    { media: '/uploads/sample_demand_5.jpg', cover: null, desc: '书店里泡了一下午，推荐这本好书', tags: ['阅读', '书店', '推荐'] },
  ];
  const shortUserIds = Object.values(users);
  for (let i = 0; i < shortMedia.length; i++) {
    await prisma.short.create({
      data: {
        userId: shortUserIds[i % shortUserIds.length],
        mediaUrl: shortMedia[i].media,
        coverUrl: shortMedia[i].cover,
        description: shortMedia[i].desc,
        tags: shortMedia[i].tags,
        likeCount: Math.floor(Math.random() * 200),
        viewCount: Math.floor(Math.random() * 5000),
      },
    });
  }

  console.log('=== Seed Complete ===');
  console.log(`20 test users created (phone 13800000001-13800000020, password 1)`);
  console.log(`10 demands (5 COMPLETED with orders, 5 PENDING)`);
  console.log(`1 public circle with 4 members`);
  console.log(`6 shorts for casual explore feed`);
  console.log(`SMS code: 123456`);
  console.log('');
  console.log('User groups:');
  console.log('  高级认证(7): 张师傅/赵阿姨/陈老师/郑律师/钱医生/朱会计/何码农');
  console.log('  中级认证(8): 李设计/刘工头/吴摄影/马翻译/胡教练/郭厨师/罗维修');
  console.log('  初级认证(5): 王同学/周跑腿/孙司机/林美容/杨花匠');
  console.log('  无认证(1):   梁新人');
  console.log('  ADMIN: 张师傅 (phone: 13800000001)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
