/**
 * 活池/死池种子数据生成器
 * 使用 seed.ts 中已有的 14 个用户，生成 30 条活池 + 30 条死池需求
 *
 * 运行: npx tsx prisma/seed-pool.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 从 seed.ts 复制的用户手机号（前 14 个有覆盖图的用户）
const USER_PHONES = [
  '13800000001', '13800000002', '13800000003', '13800000004',
  '13800000005', '13800000006', '13800000007', '13800000008',
  '13800000009', '13800000010', '13800000011', '13800000012',
  '13800000013', '13800000014',
]

// 需求模板（覆盖常见服务类目）
const DEMAND_TEMPLATES = [
  { title: '王者荣耀代练 钻石→星耀', desc: 'V区钻石2，代到星耀5，要求胜率65%以上', category: '游戏代练', price: 120, tags: ['王者', '代练'] },
  { title: '和平精英上分 王牌', desc: '当前皇冠3，打到王牌，每局带老板', category: '游戏代练', price: 200, tags: ['吃鸡', '代练'] },
  { title: 'LOL定位赛代打', desc: '新号定位赛10把，要求胜场8以上', category: '游戏代练', price: 150, tags: ['LOL', '代练'] },
  { title: '原神每日委托代肝', desc: '每日委托+体力清空，长期合作', category: '游戏代练', price: 30, tags: ['原神', '代肝'] },
  { title: '家庭电路检修', desc: '老房子跳闸频繁，需要全面排查更换空开', category: '维修服务', price: 280, tags: ['电工', '维修'] },
  { title: '卫生间防水重做', desc: '3平米卫生间漏水到楼下，需要砸开重做防水', category: '装修维修', price: 2500, tags: ['防水', '装修'] },
  { title: '全屋墙面翻新', desc: '80平米两居室，铲墙刮腻子刷乳胶漆', category: '装修维修', price: 4800, tags: ['墙面', '翻新'] },
  { title: '台式电脑组装', desc: '预算6000，主要用来视频剪辑，帮忙出配置单并组装', category: '维修服务', price: 200, tags: ['电脑', '组装'] },
  { title: '数据恢复 硬盘摔坏', desc: '2.5寸移动硬盘摔了一下不识别，里面有重要照片', category: '维修服务', price: 500, tags: ['数据恢复', '硬盘'] },
  { title: '上门除蟑螂', desc: '厨房和卫生间蟑螂较多，需要专业消杀', category: '家政服务', price: 180, tags: ['除蟑', '消杀'] },
  { title: '空调加氟', desc: '两台挂机不制冷，需要上门检测加氟', category: '维修服务', price: 150, tags: ['空调', '加氟'] },
  { title: '地漏疏通', desc: '卫生间地漏排水慢，需要专业疏通', category: '维修服务', price: 80, tags: ['疏通', '地漏'] },
  { title: '商标注册代理', desc: '餐饮类商标注册，需要查询能否注册', category: '咨询服务', price: 800, tags: ['商标', '注册'] },
  { title: '公司注册代办', desc: '注册一家科技有限公司，全流程代办', category: '咨询服务', price: 1200, tags: ['公司注册', '代办'] },
  { title: '软件开发 进销存系统', desc: '小型商贸公司需要一个进销存管理系统，Web端', category: '技术开发', price: 15000, tags: ['开发', '进销存'] },
  { title: '企业官网设计开发', desc: '展示型官网，5个页面，适配移动端', category: '技术开发', price: 6800, tags: ['网站', '开发'] },
  { title: '产品包装设计', desc: '食品包装设计，含效果图，需要3个方案', category: '设计', price: 2500, tags: ['包装', '设计'] },
  { title: 'VI视觉设计', desc: '品牌视觉识别系统，含Logo+名片+信封+工牌', category: '设计', price: 4800, tags: ['VI', '品牌'] },
  { title: '考研数学一对一', desc: '数三，线代和概率薄弱，需要暑假集中辅导', category: '教育培训', price: 200, tags: ['考研', '数学'] },
  { title: '日语N2考前冲刺', desc: '12月考试，需要每周三次线上陪练', category: '教育培训', price: 160, tags: ['日语', 'N2'] },
  { title: '驾驶证期满换证', desc: '驾照快到期了，需要代办体检和换证', category: '咨询服务', price: 80, tags: ['驾照', '换证'] },
  { title: '宠物上门喂养', desc: '出差一周，每天上门喂猫一次铲屎加水', category: '宠物服务', price: 35, tags: ['宠物', '喂养'] },
  { title: '同城代取快递', desc: '菜鸟驿站有3个大件快递，帮忙送到家', category: '同城跑腿', price: 25, tags: ['跑腿', '代取'] },
  { title: '活动跟拍 半天', desc: '公司团建活动半天跟拍，精修30张', category: '婚庆摄影', price: 1200, tags: ['跟拍', '活动'] },
  { title: '职业规划咨询', desc: '工作3年程序员，想转产品经理，寻求建议', category: '咨询服务', price: 300, tags: ['职业', '规划'] },
  { title: '法律顾问 月包', desc: '小型创业公司需要常年法律顾问，每月4小时咨询', category: '法律法务', price: 2000, tags: ['法律', '顾问'] },
  { title: '全屋深度保洁', desc: '120平米，需要油烟机+空调+窗户深度清洁', category: '家政服务', price: 600, tags: ['保洁', '深度'] },
  { title: '钢琴调律', desc: '立式钢琴一年没调了，需要上门调律', category: '维修服务', price: 350, tags: ['钢琴', '调律'] },
  { title: '健身私教 月卡', desc: '每周4次，增肌塑形，需要定制饮食计划', category: '健身运动', price: 1500, tags: ['健身', '私教'] },
  { title: '英语论文润色', desc: 'SCI论文润色，约5000词，生物医学方向', category: '翻译语言', price: 1200, tags: ['论文', '润色'] },
]

// 死池需求模板（已过期/无人接）
const DEAD_TEMPLATES = [
  { title: 'LOL陪玩 白银段位', desc: '找个陪玩一起打，要开麦交流', category: '游戏陪玩', price: 30, tags: ['LOL', '陪玩'] },
  { title: '王者荣耀 情侣标', desc: '刷情侣亲密度等级，需要长期在线', category: '游戏陪玩', price: 20, tags: ['王者', '情侣'] },
  { title: '代写暑期作业', desc: '初二数学和英语暑假作业，字迹要像学生', category: '教育培训', price: 200, tags: ['作业', '代写'] },
  { title: '代跑800米体测', desc: '下周体测，找人代跑800米', category: '健身运动', price: 100, tags: ['体测', '代跑'] },
  { title: '代开会 线上参会', desc: '公司线上周会需要有人代替参加并做笔记', category: '企业服务', price: 50, tags: ['代开会'] },
  { title: '淘宝刷单', desc: '需要20单真实物流的刷单，每单佣金5元', category: '电商运营', price: 5, tags: ['刷单'] },
  { title: '抖音点赞评论', desc: '新号需要100个点赞和20条评论', category: '电商运营', price: 30, tags: ['抖音', '点赞'] },
  { title: '代写情书', desc: '手写情书一封，字迹工整，内容感人', category: '设计', price: 50, tags: ['代写', '情书'] },
  { title: '游戏账号出租', desc: '王者全皮肤账号，按天出租', category: '游戏服务', price: 15, tags: ['账号', '出租'] },
  { title: '代课 大学选修', desc: '周三下午公选课，需要代课签到', category: '教育培训', price: 40, tags: ['代课'] },
  { title: '闲置cos服出租', desc: '一套初音cos服，S码，按天出租', category: '影音娱乐', price: 60, tags: ['cos', '出租'] },
  { title: '二手手机验机', desc: '买了个二手iPhone，需要帮忙验机检测', category: '维修服务', price: 30, tags: ['验机', '二手'] },
  { title: '帮抢茅台', desc: '需要帮忙在i茅台APP上抢购兔茅', category: '同城跑腿', price: 100, tags: ['茅台', '抢购'] },
  { title: '医院挂号代办', desc: '挂一个三甲医院的专家号，科室不限', category: '同城跑腿', price: 80, tags: ['挂号', '医院'] },
  { title: '代取报告单', desc: '体检报告出来了帮忙去医院取一下', category: '同城跑腿', price: 20, tags: ['取报告'] },
  { title: '小狗洗澡', desc: '泰迪一只，需要专业洗澡剪指甲', category: '宠物服务', price: 60, tags: ['宠物', '洗澡'] },
  { title: '绿植浇水', desc: '出差两周，家里绿植需要隔天浇水', category: '家政服务', price: 20, tags: ['绿植', '浇水'] },
  { title: '旧书回收', desc: '一批大学教材和文学书，约30本，需要上门收', category: '家政服务', price: 10, tags: ['旧书', '回收'] },
  { title: '帮做PPT', desc: '期末展示PPT，10页左右，内容已提供', category: '教育培训', price: 120, tags: ['PPT', '代做'] },
  { title: '视频字幕打轴', desc: '30分钟访谈视频，需要打轴+导出SRT', category: '设计', price: 80, tags: ['字幕', '打轴'] },
  { title: '照片修图调色', desc: '50张旅行照片需要统一调色，Lightroom', category: '设计', price: 150, tags: ['修图', '调色'] },
  { title: '代购 日本药妆', desc: '列了清单需要从日本代购邮寄回国', category: '同城跑腿', price: 200, tags: ['代购', '药妆'] },
  { title: '帮忙投票', desc: '需要每天投一票，持续一周，有链接', category: '企业服务', price: 10, tags: ['投票'] },
  { title: '拼多多砍价', desc: '最后差几个人砍价成功，帮忙点一下', category: '企业服务', price: 5, tags: ['砍价'] },
  { title: '小程序提交审核', desc: '不会操作小程序后台，帮忙提交审核', category: '技术开发', price: 50, tags: ['小程序', '审核'] },
  { title: '域名备案代办', desc: '买了域名不会备案，需要代办', category: '技术开发', price: 150, tags: ['域名', '备案'] },
  { title: 'WiFi密码破解', desc: '隔壁WiFi信号好但不知道密码', category: '维修服务', price: 30, tags: ['WiFi', '破解'] },
  { title: '游戏陪睡 语音', desc: '晚上失眠需要连麦语音陪睡', category: '影音娱乐', price: 40, tags: ['陪睡', '语音'] },
  { title: '叫醒服务', desc: '每天早上7点打电话叫醒，持续一个月', category: '咨询服务', price: 30, tags: ['叫醒'] },
  { title: '代骂服务', desc: '游戏里遇到喷子帮我骂回去（文明用语）', category: '咨询服务', price: 15, tags: ['代骂'] },
]

const now = new Date()

async function main() {
  console.log('📦 正在查找已有用户…')

  // 获取前 14 个用户的 ID
  const users = await prisma.user.findMany({
    where: { phone: { in: USER_PHONES } },
    select: { id: true, phone: true },
  })

  if (users.length < 14) {
    console.error(`❌ 只找到 ${users.length} 个用户，请先运行 seed.ts`)
    process.exit(1)
  }

  const phoneToId = Object.fromEntries(users.map((u) => [u.phone, u.id]))

  // ========== 活池需求（30条，stage: active，expireAt 在未来） ==========
  console.log('🌊 生成活池需求 30 条…')

  for (let i = 0; i < 30; i++) {
    const tpl = DEMAND_TEMPLATES[i % DEMAND_TEMPLATES.length]
    const userId = phoneToId[USER_PHONES[i % 14]]
    const isOnline = i % 3 !== 0 // 2/3 线上
    const expireAt = new Date(now.getTime() + (7 + i) * 24 * 60 * 60 * 1000)

    await prisma.demand.create({
      data: {
        userId,
        title: tpl.title,
        description: tpl.desc,
        minPrice: tpl.price,
        category: tpl.category,
        serviceType: isOnline ? 'ONLINE' : 'OFFLINE',
        status: 'PENDING',
        stage: 'active',
        tags: tpl.tags,
        expireAt,
        applicantCount: Math.floor(Math.random() * 5),
      },
    })

    if ((i + 1) % 10 === 0) console.log(`  ✅ 已创建 ${i + 1} 条活池需求`)
  }

  // ========== 死池需求（30条，stage: completed，已过期，无人接） ==========
  console.log('💀 生成死池需求 30 条…')

  for (let i = 0; i < 30; i++) {
    const tpl = DEAD_TEMPLATES[i % DEAD_TEMPLATES.length]
    const userId = phoneToId[USER_PHONES[i % 14]]
    const isOnline = i % 2 === 0
    // 死池需求：过期时间在过去，且无人接单
    const expiredAt = new Date(now.getTime() - (1 + i % 30) * 24 * 60 * 60 * 1000)

    await prisma.demand.create({
      data: {
        userId,
        title: tpl.title,
        description: tpl.desc,
        minPrice: tpl.price,
        category: tpl.category,
        serviceType: isOnline ? 'ONLINE' : 'OFFLINE',
        status: 'CLOSED',
        stage: 'completed',
        tags: tpl.tags,
        expireAt: expiredAt,
        applicantCount: 0,
      },
    })

    if ((i + 1) % 10 === 0) console.log(`  ✅ 已创建 ${i + 1} 条死池需求`)
  }

  console.log('\n🎉 完成！')
  console.log(`  🌊 活池需求: 30 条（stage: active, 将来过期）`)
  console.log(`  💀 死池需求: 30 条（stage: completed, 已过期无人接）`)
}

main()
  .catch((e) => {
    console.error('❌ 失败:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
