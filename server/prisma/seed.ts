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
  { title: '家电清洗服务', desc: '需要深度清洗空调和洗衣机各一台，需自备工具和清洗剂', price: 8, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.91, lng: 116.40 },
  { title: 'Logo设计', desc: '科技创业公司需要设计简洁现代的Logo，包含名片和信封设计', price: 88, cat: '设计', type: 'ONLINE' as const },
  { title: '高中数学辅导', desc: '高二学生需要数学一对一辅导，函数和几何薄弱，每周一次', price: 200, cat: '教育培训', type: 'OFFLINE' as const, lat: 39.92, lng: 116.38 },
  { title: '搬家搬运', desc: '一居室搬家，从朝阳区搬到海淀区，需要一辆面包车和搬運工', price: 980, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.95, lng: 116.32 },
  { title: '英语翻译需求', desc: '需要翻译一份商务合同（中译英），约3000字，要求专业术语准确', price: 300, cat: '咨询服务', type: 'ONLINE' as const },
  { title: '家庭私厨上门', desc: '周末家庭聚餐6人，需要上门做一桌川菜，食材可自行准备', price: 2800, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.93, lng: 116.36 },
  { title: '手机屏幕维修', desc: 'iPhone 15 Pro屏幕碎裂需要更换，要求原装屏', price: 250, cat: '维修服务', type: 'OFFLINE' as const, lat: 39.90, lng: 116.41 },
  { title: '健身私教课', desc: '需要一位健身教练指导减脂，每周3次，每次1小时', price: 180, cat: '教育培训', type: 'OFFLINE' as const, lat: 39.94, lng: 116.33 },
  { title: '小程序前端开发', desc: '需要一个微信小程序的前端页面，包含用户登录和商品列表', price: 8800, cat: '技术开发', type: 'ONLINE' as const },
  { title: '证件照拍摄', desc: '需要专业证件照拍摄，白底和蓝底各一组，精修出片', price: 100, cat: '设计', type: 'OFFLINE' as const, lat: 39.91, lng: 116.39 },
  { title: '宠物代遛', desc: '工作日白天金毛一条，需要附近靠谱人士代遛一小时，自备牵引绳', price: 45, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.88, lng: 116.42 },
  { title: '婚礼跟妆', desc: '户外草坪婚礼，需要跟妆师跟全程，含补妆和换造型', price: 1200, cat: '设计', type: 'OFFLINE' as const, lat: 31.23, lng: 121.47 },
  { title: '吉他上门教学', desc: '零基础想学弹唱，每周一次，每次45分钟，家里有吉他', price: 160, cat: '教育培训', type: 'OFFLINE' as const, lat: 39.92, lng: 116.35 },
  { title: '旧衣改裁', desc: '两条牛仔裤改短改瘦，希望当天可取，可送到你工作室', price: 80, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.89, lng: 116.37 },
  { title: '雅思口语陪练', desc: '目标6.5，需要母语级陪练每周两次，线上视频即可', price: 220, cat: '教育培训', type: 'ONLINE' as const },
  { title: '办公室开荒保洁', desc: '新租写字楼约200㎡，玻璃地毯深度清洁，周末作业', price: 900, cat: '家政服务', type: 'OFFLINE' as const, lat: 39.96, lng: 116.30 },
  { title: '短视频剪辑', desc: '探店素材约15条，需要快节奏字幕+配乐，交付1080p', price: 600, cat: '设计', type: 'ONLINE' as const },
  { title: '甲醛检测', desc: '新房入住前做一次甲醛与TVOC检测，需要出具简易报告', price: 280, cat: '咨询服务', type: 'OFFLINE' as const, lat: 40.00, lng: 116.28 },
  { title: '闲置手机回收估价', desc: 'iPhone 13 128G 无拆修，希望上门验机当面打款', price: 1800, cat: '维修服务', type: 'OFFLINE' as const, lat: 39.91, lng: 116.40 },
  { title: '多肉组盆造景', desc: '阳台花架需要一组北欧风多肉拼盘，含盆与土', price: 320, cat: '家政服务', type: 'OFFLINE' as const, lat: 24.99, lng: 102.72 },
  { title: '民宿空间摄影', desc: '共8间房，需要自然光+补光各一套图，用于平台头图', price: 12800, cat: '设计', type: 'OFFLINE' as const, lat: 30.25, lng: 120.17 },
  { title: '城市骑行向导', desc: '周末半天带骑友走长安街沿线经典路线，需熟悉路况与补给点', price: 200, cat: '咨询服务', type: 'OFFLINE' as const, lat: 39.90, lng: 116.39 },
];

/** 13800000001 起，idx 为 0-based */
function phoneFromUserIndex(idx: number) {
  return `138000000${String(idx + 1).padStart(2, '0')}`;
}

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
    // 前 14 个用户配完整个人中心背景图（与 avatar_xx / cover_xx 资源一一对应）
    const coverNum = i < 14 ? String(i + 1).padStart(2, '0') : null;
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

  /* 发现页展示 PENDING；前几条 COMPLETED 保留订单演示；其余批量在架需求 */
  const TOTAL_DEMANDS = 1000;
  const COMPLETED_WITH_ORDER = 4;
  const PENDING_TOTAL = TOTAL_DEMANDS - COMPLETED_WITH_ORDER;

  /** 低价多、高价少：各档数量之和须等于 PENDING_TOTAL */
  const PRICE_PYRAMID = [
    { count: 420, min: 38, max: 188 },
    { count: 280, min: 188, max: 880 },
    { count: 150, min: 880, max: 4200 },
    { count: 90, min: 4200, max: 16500 },
    { count: 40, min: 16500, max: 58000 },
    { count: 15, min: 58000, max: 195000 },
    { count: 1, min: 198000, max: 360000 },
  ] as const;

  const pyramidSum = PRICE_PYRAMID.reduce((a, r) => a + r.count, 0);
  if (pyramidSum !== PENDING_TOTAL) {
    throw new Error(`PRICE_PYRAMID counts sum ${pyramidSum} !== PENDING_TOTAL ${PENDING_TOTAL}`);
  }

  function pyramidBand(slot: number) {
    let start = 0;
    for (let ti = 0; ti < PRICE_PYRAMID.length; ti++) {
      const row = PRICE_PYRAMID[ti]!;
      if (slot < start + row.count) {
        return { tier: ti, min: row.min, max: row.max, local: slot - start };
      }
      start += row.count;
    }
    const last = PRICE_PYRAMID[PRICE_PYRAMID.length - 1]!;
    return { tier: PRICE_PYRAMID.length - 1, min: last.min, max: last.max, local: 0 };
  }

  /** 可复现的 [0,1) 伪随机，避免 seed 每次跑数据飘太多 */
  function det01(salt: number) {
    let x = (salt >>> 0) ^ 0xdeadbeef;
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return (x >>> 0) / 4294967296;
  }

  function priceInPyramidSlot(slot: number) {
    const { min, max } = pyramidBand(slot);
    return Math.round(min + det01(slot * 977 + 13331) * (max - min));
  }

  const PREFIX = ['', '同城', '上门', '企业', '加急', '周末', '远程', '专线'] as const;
  const CORE: [string, string][] = [
    ['深度保洁', '家政服务'],
    ['开荒保洁', '家政服务'],
    ['月嫂陪护', '家政服务'],
    ['搬家搬运', '家政服务'],
    ['油烟机清洗', '家政服务'],
    ['空调清洗', '家政服务'],
    ['收纳整理', '家政服务'],
    ['钟点工', '家政服务'],
    ['手机换屏', '维修服务'],
    ['电脑清灰', '维修服务'],
    ['数据恢复', '维修服务'],
    ['网络布线', '维修服务'],
    ['打印机维修', '维修服务'],
    ['家电维修', '维修服务'],
    ['监控安装', '技术开发'],
    ['NAS组网', '技术开发'],
    ['小程序开发', '技术开发'],
    ['企业官网', '技术开发'],
    ['后台接口', '技术开发'],
    ['UI设计', '设计'],
    ['电商主图', '设计'],
    ['短视频剪辑', '设计'],
    ['平面物料', '设计'],
    ['LOGO升级', '设计'],
    ['活动策划', '咨询服务'],
    ['品牌定位', '咨询服务'],
    ['合同审查', '法律法务'],
    ['劳动仲裁', '法律法务'],
    ['商标注册', '法律法务'],
    ['代账报税', '财务税务'],
    ['审计配合', '财务税务'],
    ['雅思口语', '教育培训'],
    ['考研数学', '教育培训'],
    ['公考面试', '教育培训'],
    ['钢琴陪练', '教育培训'],
    ['健身私教', '健身运动'],
    ['瑜伽上门', '健身运动'],
    ['婚礼跟拍', '婚庆摄影'],
    ['证件照精修', '婚庆摄影'],
    ['宠物寄养', '宠物服务'],
    ['训犬指导', '宠物服务'],
    ['同城跑腿', '同城跑腿'],
    ['代驾', '汽车服务'],
    ['年检代办', '汽车服务'],
    ['验房', '房产相关'],
    ['租房保洁', '房产相关'],
    ['除甲醛检测', '环保检测'],
    ['开锁换锁', '维修服务'],
    ['管道疏通', '维修服务'],
    ['心理咨询', '心理咨询'],
    ['留学文书', '留学出国'],
    ['同声翻译', '翻译语言'],
    ['年会布置', '企业服务'],
    ['仓储分拣', '仓储物流'],
    ['跨境拍摄', '电商运营'],
    ['直播代运营', '电商运营'],
    ['私域搭建', '电商运营'],
    ['农机检修', '三农服务'],
    ['茶艺体验', '茶艺文化'],
    ['潜水体验', '旅游出行'],
    ['陪诊取药', '医疗健康'],
    ['慢病饮食指导', '医疗健康'],
    ['小儿推拿', '医疗健康'],
    ['针灸推拿', '医疗健康'],
    ['主持司仪', '婚庆摄影'],
    ['化妆跟妆', '婚庆摄影'],
    ['家庭私厨', '美食餐饮'],
    ['团建拓展', '企业服务'],
    ['猎头寻访', '企业服务'],
    ['社保代缴', '企业服务'],
    ['ISO体系辅导', '咨询服务'],
    ['高企材料', '咨询服务'],
    ['专利撰写', '法律法务'],
    ['软著加急', '法律法务'],
    ['配音配乐', '设计'],
    ['三维建模', '设计'],
    ['室内效果图', '设计'],
    ['工装施工图', '设计'],
    ['弱电智能化', '技术开发'],
    ['服务器上架', '技术开发'],
    ['渗透测试', '技术开发'],
    ['等保整改', '技术开发'],
    ['跨境电商申诉', '电商运营'],
    ['独立站搭建', '电商运营'],
    ['Shopify装修', '电商运营'],
    ['红酒侍酒', '美食餐饮'],
    ['法餐家宴', '美食餐饮'],
    ['烘焙私教', '教育培训'],
    ['游泳私教', '健身运动'],
    ['羽毛球陪练', '健身运动'],
    ['网球陪练', '健身运动'],
    ['吉他入门', '教育培训'],
    ['古筝陪练', '教育培训'],
    ['日语口语', '教育培训'],
    ['韩语入门', '教育培训'],
    ['西语翻译', '翻译语言'],
    ['同传设备租', '翻译语言'],
    ['展会搭建', '企业服务'],
    ['灯光音响', '婚庆摄影'],
    ['航拍测绘', '设计'],
    ['企业宣传片', '设计'],
    ['绿植租摆', '家政服务'],
    ['大理石结晶', '家政服务'],
    ['外墙清洗', '家政服务'],
    ['地毯清洗', '家政服务'],
    ['沙发护理', '家政服务'],
    ['床垫除螨', '家政服务'],
    ['净水换芯', '维修服务'],
    ['地暖清洗', '维修服务'],
    ['智能门锁安装', '维修服务'],
    ['充电桩报装', '汽车服务'],
    ['汽车美容', '汽车服务'],
    ['四轮定位', '汽车服务'],
    ['钣金喷漆', '汽车服务'],
    ['道路救援', '汽车服务'],
    ['新车装潢', '汽车服务'],
    ['法拍尽调', '房产相关'],
    ['民宿代运营', '房产相关'],
    ['商铺转让', '房产相关'],
    ['商标注册驳回', '法律法务'],
    ['专利申请加快', '法律法务'],
    ['离婚财产分割', '法律法务'],
    ['交通事故理赔', '法律法务'],
    ['遗嘱公证咨询', '法律法务'],
    ['股权设计', '财务税务'],
    ['投融资对接', '财务税务'],
    ['跨境收款合规', '财务税务'],
    ['亚马逊申诉', '电商运营'],
    ['TikTok起号', '电商运营'],
    ['小红书运营', '电商运营'],
    ['信息流投放', '电商运营'],
    ['SEO优化', '电商运营'],
    ['SEM托管', '电商运营'],
    ['客服外包', '企业服务'],
    ['仓拣打包', '仓储物流'],
    ['冷链城配', '仓储物流'],
    ['报关清关', '仓储物流'],
    ['研学导师', '教育培训'],
    ['夏令营带队', '教育培训'],
    ['围棋象棋陪练', '教育培训'],
    ['马术体验', '旅游出行'],
    ['滑雪教练', '旅游出行'],
    ['潜水考证', '旅游出行'],
    ['剧本杀主持', '影音娱乐'],
    ['电竞陪练', '影音娱乐'],
    ['游戏代练', '影音娱乐'],
    ['汉服妆造', '婚庆摄影'],
    ['宝宝百天照', '婚庆摄影'],
    ['形象照拍摄', '婚庆摄影'],
    ['企业团险', '咨询服务'],
    ['个人养老金规划', '咨询服务'],
    ['港股打新指导', '咨询服务'],
    ['房贷降息置换', '咨询服务'],
    ['公积金提取咨询', '咨询服务'],
    ['落户积分规划', '咨询服务'],
    ['学区政策解读', '咨询服务'],
    ['白蚁防治', '家政服务'],
    ['四害消杀', '家政服务'],
    ['石材打蜡', '家政服务'],
    ['泳池水质维护', '家政服务'],
    ['有机蔬菜配送', '三农服务'],
    ['大棚温控改造', '三农服务'],
    ['冷库维保', '维修服务'],
    ['叉车考证培训', '教育培训'],
    ['电工证复审', '教育培训'],
    ['食品安全体系', '咨询服务'],
    ['人力资源外包', '企业服务'],
    ['劳务派遣对接', '企业服务'],
    ['无形资产评估', '财务税务'],
    ['软著加急办理', '法律法务'],
    ['ICP备案咨询', '技术开发'],
    ['等保测评陪同', '技术开发'],
    ['大模型私有化部署', '技术开发'],
    ['智能家居场景', '技术开发'],
    ['家庭影院调校', '设计'],
    ['钢琴搬运上楼', '家政服务'],
    ['古董包装运输', '家政服务'],
    ['艺术品装裱', '设计'],
    ['老人手机教学', '教育培训'],
    ['电脑病毒查杀', '维修服务'],
    ['硬盘开盘恢复', '维修服务'],
    ['K8s故障排查', '技术开发'],
    ['CI/CD搭建', '技术开发'],
    ['APP上架辅导', '技术开发'],
    ['Flutter维护', '技术开发'],
    ['钉钉流程配置', '企业服务'],
    ['飞书审批流', '企业服务'],
    ['企业微信存档', '企业服务'],
    ['SQLServer迁移', '技术开发'],
    ['Oracle调优', '技术开发'],
    ['MongoDB分片', '技术开发'],
    ['Redis哨兵', '技术开发'],
    ['Kafka排查', '技术开发'],
    ['ES检索优化', '技术开发'],
    ['BI看板定制', '技术开发'],
    ['PowerBI培训', '教育培训'],
    ['SAP顾问驻场', '企业服务'],
    ['用友实施', '企业服务'],
    ['WMS上线', '技术开发'],
    ['TMS对接', '技术开发'],
    ['餐饮扫码点餐', '技术开发'],
    ['美业预约系统', '技术开发'],
    ['洗车会员系统', '技术开发'],
    ['停车场道闸', '技术开发'],
    ['光伏清洗', '环保检测'],
    ['储能电站运维', '维修服务'],
    ['电梯年检代办', '咨询服务'],
    ['锅炉工证复审', '教育培训'],
    ['无损检测UT', '维修服务'],
    ['3D打印手板', '设计'],
    ['CNC加工制图', '技术开发'],
    ['机械装配指导', '维修服务'],
    ['液压系统检修', '维修服务'],
    ['空压机维保', '维修服务'],
    ['冷水机组清洗', '维修服务'],
    ['中央空调水处理', '维修服务'],
    ['洁净室检测', '环保检测'],
    ['实验室搬迁', '家政服务'],
    ['环评验收陪同', '环保检测'],
    ['排污许可证', '咨询服务'],
    ['水土保持方案', '咨询服务'],
    ['林地使用手续', '咨询服务'],
    ['渔船检验代办', '咨询服务'],
    ['游艇驾照培训', '教育培训'],
    ['潜水OW考证', '教育培训'],
    ['水肺装备保养', '维修服务'],
    ['鱼缸造景维护', '家政服务'],
    ['锦鲤病诊治', '宠物服务'],
    ['猫疫苗驱虫', '宠物服务'],
    ['犬行为纠正', '宠物服务'],
    ['马房清理', '宠物服务'],
    ['沙漠越野向导', '旅游出行'],
    ['高原徒步保障', '旅游出行'],
    ['雪山攀登协作', '旅游出行'],
    ['攀岩保护员', '健身运动'],
    ['蹦极地陪', '旅游出行'],
    ['跳伞教练陪同', '旅游出行'],
    ['滑翔伞旅飞', '旅游出行'],
  ];

  const syntheticCatalog = PREFIX.flatMap((p) =>
    CORE.map(([name, cat]) => ({
      title: `${p}${name}`,
      cat,
      desc: `${name}相关需求；时间与报价可商议。`,
    })),
  );

  type DemandSeedRow = {
    title: string;
    desc: string;
    price: number;
    cat: string;
  taxonomyLeafId: string;
    type: 'ONLINE' | 'OFFLINE';
    lat?: number;
    lng?: number;
  };

const CATEGORY_TO_LEAVES: Record<string, readonly string[]> = {
  '设计': ['on-d-logo', 'on-d-ui', 'on-d-pack', 'on-d-video', 'on-d-3d', 'on-d-photo', 'on-m-voice'],
  '技术开发': ['on-t-web', 'on-t-mini', 'on-t-app', 'on-t-api', 'on-t-data', 'on-t-cloud', 'on-t-sec', 'off-r-net'],
  '教育培训': ['on-e-lang', 'on-e-k12', 'on-e-cert', 'on-e-it', 'on-e-art', 'on-e-sport', 'off-b-train', 'off-s-interview'],
  '咨询服务': ['on-p-strat', 'on-p-comp', 'on-m-copy', 'off-b-iso', 'off-f-org'],
  '家政服务': ['off-l-daily', 'off-l-deep', 'off-l-acs', 'off-l-move', 'off-l-baby', 'off-he-pest', 'off-w-nail', 'off-w-skin', 'off-p-plant'],
  '维修服务': ['off-r-phone', 'off-r-pc', 'off-r-appliance', 'off-r-plumb', 'off-r-lock', 'off-f-cold'],
  '法律法务': ['on-p-law', 'on-p-ip'],
  '财务税务': ['on-p-tax'],
  '电商运营': ['on-ec-shop', 'on-ec-live', 'on-ec-seo', 'on-ec-pr', 'on-ec-cross'],
  '健身运动': ['off-t-climb'],
  '婚庆摄影': ['off-b-photo', 'off-w-photo', 'off-w-makeup', 'off-w-host', 'off-w-dress'],
  '宠物服务': ['off-p-board', 'off-p-walk', 'off-p-train', 'off-p-vet', 'off-p-fish'],
  '汽车服务': ['off-c-wash', 'off-c-beauty', 'off-c-repair', 'off-c-rescue', 'off-c-pile', 'off-c-driver', 'off-t-driver'],
  '房产相关': ['off-he-check', 'off-he-rent', 'off-he-bnb', 'off-he-law'],
  '环保检测': ['off-he-air'],
  '心理咨询': ['off-h-psy'],
  '留学出国': ['off-s-paper', 'off-s-visa'],
  '翻译语言': ['off-lang-doc', 'off-lang-escort', 'off-lang-sim'],
  '企业服务': ['on-p-hr', 'off-b-event', 'off-b-hr'],
  '仓储物流': ['off-b-logi'],
  '三农服务': ['off-f-machine', 'off-f-greenhouse'],
  '茶艺文化': ['off-l-tea', 'off-tea-class', 'off-tea-party'],
  '旅游出行': ['off-t-guide', 'off-t-ski', 'off-t-dive', 'off-t-camp'],
  '医疗健康': ['off-h-clinic', 'off-h-massage', 'off-h-tcm', 'off-h-diet'],
  '美食餐饮': ['off-l-chef', 'off-coffee'],
};

const ONLINE_LEAF_FALLBACK = ['on-d-logo', 'on-t-web', 'on-e-lang', 'on-p-law', 'on-ec-shop', 'on-m-game'] as const;
const OFFLINE_LEAF_FALLBACK = ['off-l-daily', 'off-r-phone', 'off-h-clinic', 'off-c-wash', 'off-he-check', 'off-b-event', 'off-w-photo', 'off-p-board'] as const;

function pickTaxonomyLeaf(cat: string, type: 'ONLINE' | 'OFFLINE', salt: number): string {
  const leaves = CATEGORY_TO_LEAVES[cat];
  if (leaves && leaves.length > 0) return leaves[salt % leaves.length]!;
  const fallback = type === 'ONLINE' ? ONLINE_LEAF_FALLBACK : OFFLINE_LEAF_FALLBACK;
  return fallback[salt % fallback.length]!;
}

  function demandRowForIndex(i: number): DemandSeedRow {
    const base = demandTemplates[i % demandTemplates.length];
    const isCompleted = i < COMPLETED_WITH_ORDER;
    if (isCompleted) {
      return {
        title: base.title,
        desc: base.desc,
        price: base.price,
        cat: base.cat,
        taxonomyLeafId: pickTaxonomyLeaf(base.cat, base.type, i),
        type: base.type,
        lat: base.lat,
        lng: base.lng,
      };
    }
    const j = i - COMPLETED_WITH_ORDER;
    const online = j % 2 === 0;
    const band = pyramidBand(j);
    const catIdx = (j * 13 + band.tier * 41) % syntheticCatalog.length;
    const entry = syntheticCatalog[catIdx]!;
    const price = priceInPyramidSlot(j);
    const desc = `${entry.desc} 起标价 ¥${price}。`;
    if (online) {
      return {
        title: entry.title,
        desc,
        price,
        cat: entry.cat,
        taxonomyLeafId: pickTaxonomyLeaf(entry.cat, 'ONLINE', j),
        type: 'ONLINE',
      };
    }
    const lat = 39.88 + (j % 14) * 0.015;
    const lng = 116.32 + (j % 14) * 0.018;
    return {
      title: entry.title,
      desc,
      price,
      cat: entry.cat,
      taxonomyLeafId: pickTaxonomyLeaf(entry.cat, 'OFFLINE', j),
      type: 'OFFLINE',
      lat,
      lng,
    };
  }

  for (let i = 0; i < COMPLETED_WITH_ORDER; i++) {
    const t = demandRowForIndex(i);
    const posterIdx = i % 14;
    const posterPhone = phoneFromUserIndex(posterIdx);
    const posterId = users[posterPhone];
    if (!posterId) continue;

    const d = await prisma.demand.create({
      data: {
        userId: posterId,
        title: t.title,
        description: t.desc,
        minPrice: t.price,
        category: t.cat,
        taxonomyLeafId: t.taxonomyLeafId,
        serviceType: t.type,
        locationLat: t.lat ?? null,
        locationLng: t.lng ?? null,
        cityCode: testUsers[posterIdx].cityCode,
        expireAt: future,
        status: 'COMPLETED',
        applicantCount: 1,
      },
    });

    let providerIdx = (posterIdx + 10) % testUsers.length;
    if (providerIdx === posterIdx) providerIdx = (providerIdx + 1) % testUsers.length;
    const providerPhone = phoneFromUserIndex(providerIdx);
    const providerId = users[providerPhone];
    if (!providerId) continue;

    await prisma.demandApplication.create({
      data: {
        demandId: d.id,
        userId: providerId,
        offerPrice: t.price * 0.9,
        message: `我做过类似的项目，可以高质量完成`,
        isSnatched: i % 2 === 0,
        status: 'ACCEPTED',
      },
    });

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

    await prisma.message.create({
      data: {
        fromUserId: posterId,
        toUserId: providerId,
        content: `订单完成：${t.title}，成交价 ¥${t.price * 0.9}`,
        type: 'SYSTEM',
      },
    });
  }

  const BATCH = 200;
  for (let start = COMPLETED_WITH_ORDER; start < TOTAL_DEMANDS; start += BATCH) {
    const end = Math.min(TOTAL_DEMANDS, start + BATCH);
    const rows: import('@prisma/client').Prisma.DemandCreateManyInput[] = [];
    for (let i = start; i < end; i++) {
      const t = demandRowForIndex(i);
      const posterIdx = i % 14;
      const posterPhone = phoneFromUserIndex(posterIdx);
      const posterId = users[posterPhone];
      if (!posterId) continue;
      rows.push({
        userId: posterId,
        title: t.title,
        description: t.desc,
        minPrice: t.price,
        category: t.cat,
        taxonomyLeafId: t.taxonomyLeafId,
        serviceType: t.type,
        locationLat: t.lat ?? null,
        locationLng: t.lng ?? null,
        cityCode: testUsers[posterIdx].cityCode,
        expireAt: future,
        status: 'PENDING',
        applicantCount: 0,
        isPublic: true,
        mediaUrls: [],
      });
    }
    if (rows.length) await prisma.demand.createMany({ data: rows });
  }

  const pendingAfter = await prisma.demand.count({ where: { status: 'PENDING' } });
  const completedAfter = await prisma.demand.count({ where: { status: 'COMPLETED' } });
  if (pendingAfter !== PENDING_TOTAL) {
    throw new Error(
      `Seed 校验失败：PENDING 应为 ${PENDING_TOTAL} 条，实际 ${pendingAfter} 条（COMPLETED=${completedAfter}）。请检查数据库连接或 createMany 报错。`,
    );
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
  console.log(`20 test users (phone 13800000001-13800000020, password 1); 前14位有个人中心 coverUrl`);
  console.log(
    `${TOTAL_DEMANDS} demands (${COMPLETED_WITH_ORDER} COMPLETED with orders, ${TOTAL_DEMANDS - COMPLETED_WITH_ORDER} PENDING)；库内复查 PENDING=${pendingAfter}`,
  );
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
