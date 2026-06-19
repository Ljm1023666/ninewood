import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '1';

// ====================================================================
// 50 真实用户 — 涵盖各城市、职业、认证等级
// ====================================================================
const realUsers = [
  // 北京 (110000)
  { phone: '13901001001', nickname: '张师傅水电', cityCode: '110000', cert: 'ADVANCED' as const, credit: 92, orders: 68, role: 'ADMIN' as const, bio: '20年水电维修经验，持电工证，朝阳区随叫随到，擅长老旧线路改造和智能家居安装' },
  { phone: '13901001002', nickname: '李设计师', cityCode: '110000', cert: 'INTERMEDIATE' as const, credit: 78, orders: 25, bio: 'UI/UX设计师，5年互联网大厂经验，擅长B端SaaS产品和企业品牌视觉' },
  { phone: '13901001003', nickname: '王同学接单', cityCode: '110000', cert: 'BASIC' as const, credit: 62, orders: 6, bio: '北邮计算机大三，课余接前端/爬虫/自动化脚本，性价比高，沟通响应快' },
  { phone: '13901001004', nickname: '赵律师说法', cityCode: '110000', cert: 'ADVANCED' as const, credit: 90, orders: 55, bio: '执业律师12年，律所合伙人，擅长公司法、合同纠纷、知识产权' },
  { phone: '13901001005', nickname: '陈摄影光影', cityCode: '110000', cert: 'INTERMEDIATE' as const, credit: 80, orders: 19, bio: '自由摄影师，Sony A7M4+大三元，擅长商业人像、活动跟拍、产品静物' },
  { phone: '13901001006', nickname: '刘工头装修', cityCode: '110000', cert: 'ADVANCED' as const, credit: 85, orders: 42, bio: '装修队长18年，带领8人团队，旧房翻新、水电改造、全屋定制一条龙' },
  { phone: '13901001007', nickname: '孙会计代账', cityCode: '110000', cert: 'ADVANCED' as const, credit: 93, orders: 60, bio: '注册会计师/税务师，代账报税、财务顾问，已服务中小企业200+家' },
  { phone: '13901001008', nickname: '周跑腿团队', cityCode: '110000', cert: 'BASIC' as const, credit: 66, orders: 11, bio: '北京同城跑腿团队，5台电动车覆盖朝阳海淀丰台，代买代送代排队代办' },
  // 上海 (310000)
  { phone: '13902101001', nickname: '吴翻译中英', cityCode: '310000', cert: 'INTERMEDIATE' as const, credit: 76, orders: 22, bio: '英日双语翻译，CATTI二级，曾为多家外企提供同传和商务谈判翻译' },
  { phone: '13902101002', nickname: '郑监理验房', cityCode: '310000', cert: 'ADVANCED' as const, credit: 88, orders: 38, bio: '国家注册监理工程师，15年验房经验，精装/毛坯/二手房全面检测' },
  { phone: '13902101003', nickname: '冯教练健身', cityCode: '310000', cert: 'INTERMEDIATE' as const, credit: 72, orders: 28, bio: 'NSCA-CPT认证教练，擅长减脂塑形、运动康复，上海浦东浦西均可上门' },
  { phone: '13902101004', nickname: '褚花艺师', cityCode: '310000', cert: 'BASIC' as const, credit: 64, orders: 8, bio: '荷兰DFA花艺师认证，承接婚礼花艺、开业花篮、日常花礼定制' },
  { phone: '13902101005', nickname: '卫老师钢琴', cityCode: '310000', cert: 'ADVANCED' as const, credit: 87, orders: 45, bio: '上海音乐学院硕士，钢琴教学15年，英皇考级/艺考生辅导/成人零基础' },
  // 广州 (440100)
  { phone: '13902001001', nickname: '赵阿姨家政', cityCode: '440100', cert: 'ADVANCED' as const, credit: 95, orders: 82, bio: '10年家政经验，擅长深度保洁、收纳整理、月子餐，天河越秀海珠全境' },
  { phone: '13902001002', nickname: '钱医生问诊', cityCode: '440100', cert: 'ADVANCED' as const, credit: 86, orders: 41, bio: '三甲医院内科副主任医师，提供常见病在线问诊、体检报告解读、慢病管理' },
  { phone: '13902001003', nickname: '孙司机搬家', cityCode: '440100', cert: 'BASIC' as const, credit: 58, orders: 14, bio: '搬家货运6年，4.2米厢式货车+2名搬运工，广州佛山中山全境，价格透明' },
  { phone: '13902001004', nickname: '李剪辑后期', cityCode: '440100', cert: 'INTERMEDIATE' as const, credit: 70, orders: 16, bio: '达芬奇调色师+PR剪辑，服务过MCN机构和品牌客户，短视频/宣传片/Vlog' },
  // 深圳 (440300)
  { phone: '13907551001', nickname: '马程序猿', cityCode: '440300', cert: 'ADVANCED' as const, credit: 91, orders: 48, bio: '全栈开发12年，Go/React/Vue/Python技术栈，可接Web/小程序/API开发' },
  { phone: '13907551002', nickname: '朱设计师Ui', cityCode: '440300', cert: 'INTERMEDIATE' as const, credit: 77, orders: 23, bio: '资深UI设计师，6年产品设计经验，擅长移动端App和企业管理系统界面' },
  { phone: '13907551003', nickname: '胡产品经理', cityCode: '440300', cert: 'BASIC' as const, credit: 68, orders: 10, bio: '5年B端产品经理，可提供需求分析、PRD撰写、产品原型设计咨询' },
  // 杭州 (330100)
  { phone: '13905711001', nickname: '陈老师数学', cityCode: '330100', cert: 'ADVANCED' as const, credit: 88, orders: 45, bio: '重点中学数学高级教师，辅导中高考数学12年，擅长几何导数压轴题突破' },
  { phone: '13905711002', nickname: '林摄影师', cityCode: '330100', cert: 'INTERMEDIATE' as const, credit: 74, orders: 17, bio: '婚礼/旅拍摄影师，自然光+纪实风格，西湖/灵隐/龙井外景拍摄专家' },
  { phone: '13905711003', nickname: '黄园艺绿植', cityCode: '330100', cert: 'BASIC' as const, credit: 60, orders: 7, bio: '园艺师，擅长阳台花园设计、室内绿植养护、多肉组盆，杭城可上门' },
  // 成都 (510100)
  { phone: '13902801001', nickname: '胡教练减肥', cityCode: '510100', cert: 'INTERMEDIATE' as const, credit: 72, orders: 28, bio: 'ACE认证健身教练，擅长减脂增肌和产后恢复，成华区自营工作室' },
  { phone: '13902801002', nickname: '周跑腿成都', cityCode: '510100', cert: 'BASIC' as const, credit: 66, orders: 11, bio: '成都三环内跑腿代办，电动车快送，火锅排队/医院挂号/文件递送' },
  { phone: '13902801003', nickname: '何大厨上门', cityCode: '510100', cert: 'INTERMEDIATE' as const, credit: 82, orders: 35, bio: '持证厨师，18年川菜功底，可上门做家宴/私宴/团建餐，食材可代购' },
  { phone: '13902801004', nickname: '吕导游成都', cityCode: '510100', cert: 'BASIC' as const, credit: 61, orders: 9, bio: '成都本地导游，可定制熊猫基地/都江堰/青城山一日游，包车+讲解' },
  // 重庆 (500000)
  { phone: '13902301001', nickname: '施大厨火锅', cityCode: '500000', cert: 'INTERMEDIATE' as const, credit: 78, orders: 32, bio: '重庆火锅底料炒制师傅，可上门做正宗老火锅/江湖菜，自带锅具底料' },
  { phone: '13902301002', nickname: '张房产中介', cityCode: '500000', cert: 'BASIC' as const, credit: 65, orders: 13, bio: '链家金牌经纪人，渝北/江北/渝中三区房源熟悉，二手房买卖租赁代办' },
  { phone: '13902301003', nickname: '孔瑜伽教练', cityCode: '500000', cert: 'INTERMEDIATE' as const, credit: 71, orders: 21, bio: '全美瑜伽联盟RYT-500认证，擅长哈他瑜伽/流瑜伽/孕产瑜伽，可上门授课' },
  // 武汉 (420100)
  { phone: '13902701001', nickname: '罗师傅修机', cityCode: '420100', cert: 'INTERMEDIATE' as const, credit: 77, orders: 24, bio: '手机/电脑维修8年，芯片级维修，换屏换电池换主板，武昌汉口均可上门' },
  { phone: '13902701002', nickname: '蔡老师英语', cityCode: '420100', cert: 'ADVANCED' as const, credit: 84, orders: 39, bio: '英语专业八级/雅思8.0，10年教龄，擅长中高考冲刺和成人商务英语' },
  { phone: '13902701003', nickname: '彭教练驾校', cityCode: '420100', cert: 'BASIC' as const, credit: 63, orders: 15, bio: '驾校教练/陪练，自带教练车（副刹），洪山/光谷/江夏区域，科二科三陪练' },
  // 南京 (320100)
  { phone: '13902501001', nickname: '钱医生内科', cityCode: '320100', cert: 'ADVANCED' as const, credit: 86, orders: 41, bio: '三甲医院内科主治医师，提供常见病在线问诊、体检报告解读、慢病管理方案' },
  { phone: '13902501002', nickname: '孟设计师品牌', cityCode: '320100', cert: 'INTERMEDIATE' as const, credit: 73, orders: 18, bio: '品牌设计师，服务过30+初创企业，擅长LOGO/VI/包装/画册全套品牌设计' },
  { phone: '13902501003', nickname: '萧琴师调律', cityCode: '320100', cert: 'BASIC' as const, credit: 59, orders: 5, bio: '钢琴调律师，持国家职业资格证，南京及周边上门调律，每年服务200+台琴' },
  // 西安 (610100)
  { phone: '13902901001', nickname: '郭厨师私宴', cityCode: '610100', cert: 'INTERMEDIATE' as const, credit: 82, orders: 35, bio: '持证厨师14年，擅长陕菜和粤菜，可上门做家宴/年会/团建餐，可选清真' },
  { phone: '13902901002', nickname: '董导游西安', cityCode: '610100', cert: 'BASIC' as const, credit: 62, orders: 12, bio: '西安持证导游，兵马俑/华清池/城墙/陕历博深度讲解，可定制美食探店路线' },
  { phone: '13902901003', nickname: '梁书法老师', cityCode: '610100', cert: 'INTERMEDIATE' as const, credit: 75, orders: 20, bio: '陕西省书协会员，楷行草皆能，成人/少儿书法教学，碑林区可上门授课' },
  // 昆明 (530100)
  { phone: '13908711001', nickname: '杨花艺园艺', cityCode: '530100', cert: 'BASIC' as const, credit: 60, orders: 9, bio: '园艺师8年，擅长多肉组盆、阳台花园、庭院设计，昆明的花材从不让人失望' },
  { phone: '13908711002', nickname: '段师傅白族菜', cityCode: '530100', cert: 'INTERMEDIATE' as const, credit: 70, orders: 17, bio: '大理白族菜传人，擅长乳扇/酸辣鱼/生皮等大理特色，可上门做白族风情家宴' },
  // 天津 (120000)
  { phone: '13902201001', nickname: '梁新人入驻', cityCode: '120000', cert: 'NONE' as const, credit: 60, orders: 0, bio: '刚来平台，擅长视频剪辑和文案策划，希望能接到合适的单，欢迎沟通' },
  { phone: '13902201002', nickname: '石老师围棋', cityCode: '120000', cert: 'ADVANCED' as const, credit: 89, orders: 44, bio: '业余5段，围棋教学20年，培养省冠军多人，南开/和平/河西可上门' },
  // 长沙 (430100)
  { phone: '13907311001', nickname: '谭师傅装修', cityCode: '430100', cert: 'INTERMEDIATE' as const, credit: 76, orders: 26, bio: '装修包工头10年，水电木瓦油全活儿，长沙市内可免费量房出报价方案' },
  { phone: '13907311002', nickname: '廖教练游泳', cityCode: '430100', cert: 'BASIC' as const, credit: 63, orders: 11, bio: '国家二级游泳运动员退役，持救生员证+教练证，湘江世纪城/梅溪湖可约' },
  // 郑州 (410100)
  { phone: '13903711001', nickname: '冯师傅家电', cityCode: '410100', cert: 'INTERMEDIATE' as const, credit: 79, orders: 30, bio: '家电维修15年，冰箱/空调/洗衣机/热水器全品牌维修，郑州四环内上门' },
  { phone: '13903711002', nickname: '曹老师书法', cityCode: '410100', cert: 'ADVANCED' as const, credit: 83, orders: 36, bio: '中国书协会员，毛笔/硬笔教学20年，艺考生辅导/成人书法/少儿启蒙' },
  // 青岛 (370200)
  { phone: '13905321001', nickname: '姜船长出海', cityCode: '370200', cert: 'BASIC' as const, credit: 67, orders: 14, bio: '持游艇驾照，青岛近海海钓/帆船体验/海上团建，含渔具和安全装备' },
  { phone: '13905321002', nickname: '田摄影师海景', cityCode: '370200', cert: 'INTERMEDIATE' as const, credit: 74, orders: 19, bio: '旅拍摄影师，青岛婚纱旅拍专家，八大关/栈桥/小麦岛/崂山经典机位' },
];

// ====================================================================
// 200+ 真实需求
// ====================================================================
const demandTemplates = [
  // ── 家政服务 (ONLINE通用) ──
  { title: '空调深度清洗', desc: '家用空调挂机2台+柜机1台，需拆机清洗滤网蒸发器，自备清洁剂和防护布', price: 168, cat: '家政服务', type: 'ONLINE' },
  { title: '日常保洁三小时', desc: '60㎡一居室定期保洁，擦灰拖地擦窗，自备工具清洁剂', price: 120, cat: '家政服务', type: 'ONLINE' },
  { title: '油烟机拆洗', desc: '侧吸式油烟机深度拆洗，油污重需浸泡处理，请自带清洗剂和防护垫', price: 150, cat: '家政服务', type: 'ONLINE' },
  { title: '新家开荒保洁', desc: '120㎡三室两厅新装修完工，全屋开荒保洁含玻璃地面厨卫，有装修残留需清理', price: 680, cat: '家政服务', type: 'ONLINE' },
  { title: '收纳整理全屋', desc: '两室一厅全屋收纳整理，含衣柜/厨房/书柜，需自带收纳工具和标签机', price: 380, cat: '家政服务', type: 'ONLINE' },
  { title: '地毯沙发清洗', desc: '客厅3m×2m羊毛地毯+布艺沙发3人位，需自带抽取式清洗机和洗涤剂', price: 280, cat: '家政服务', type: 'ONLINE' },
  { title: '擦窗服务全屋', desc: '18楼全屋玻璃清洁，含窗框和纱窗，需专业擦窗器和安全绳索', price: 200, cat: '家政服务', type: 'ONLINE' },
  { title: '宠物上门喂养一周', desc: '出差一周需要每天上门喂猫铲屎换水，英短一只，猫粮猫砂已备好，需发视频确认', price: 210, cat: '家政服务', type: 'ONLINE' },
  { title: '老人陪诊半天', desc: '带70岁老人去三甲医院看心内科，帮忙挂号排队取药，需有耐心和陪诊经验', price: 180, cat: '家政服务', type: 'ONLINE' },
  { title: '月子餐制作', desc: '产妇产后第二周，需要每日上门制作两餐月子餐，食材自备，会煲汤优先', price: 350, cat: '家政服务', type: 'ONLINE' },
  { title: '花园除草修剪', desc: '50㎡小院草坪修剪+月季修剪+杂草清除，请自带割草机和园艺工具', price: 250, cat: '家政服务', type: 'ONLINE' },
  { title: '家具组装宜家', desc: '宜家PAX衣柜2米款+配套抽屉/隔板，附带MALM书桌一张，需自带电钻工具', price: 180, cat: '家政服务', type: 'ONLINE' },
  { title: '搬家打包协助', desc: '协助打包一居室物品，需要自带打包材料（纸箱/气泡膜/胶带），8小时内完成', price: 320, cat: '家政服务', type: 'ONLINE' },
  { title: '墙面修补刷漆', desc: '客厅一面墙（约12㎡）墙面裂缝修补+刷乳胶漆，有轻微起皮和钉眼，需自带工具材料', price: 350, cat: '家政服务', type: 'ONLINE' },
  { title: '水管疏通', desc: '厨房水槽下水堵塞，可能油污堆积，需自带管道疏通机，老小区管径较窄', price: 150, cat: '家政服务', type: 'ONLINE' },
  { title: '电路排查检修', desc: '老房子频繁跳闸，需全屋电路检测找到漏电点并修复，有电工证优先', price: 280, cat: '家政服务', type: 'ONLINE' },
  { title: '窗帘安装', desc: '三扇窗户罗马杆+窗帘安装，已有电钻，需自带水平仪和膨胀螺丝', price: 160, cat: '家政服务', type: 'ONLINE' },
  { title: '马桶更换安装', desc: '旧马桶拆除+新马桶安装，包括法兰圈更换和打胶密封，需自带安装工具', price: 300, cat: '家政服务', type: 'ONLINE' },
  { title: '热水器安装', desc: '燃气热水器新机安装，需预留燃气管道接口，需持有燃气具安装资质证', price: 350, cat: '家政服务', type: 'ONLINE' },
  { title: '除甲醛服务', desc: '新房120㎡全屋甲醛治理，需喷涂光触媒或生物酶，出具CMA检测报告', price: 1800, cat: '家政服务', type: 'ONLINE' },

  // ── 技术开发 ──
  { title: '微信小程序开发商城', desc: '需要做一个社区团购小程序，包含用户登录、商品列表、购物车、下单支付、团长管理后台', price: 18000, cat: '技术开发', type: 'ONLINE' },
  { title: '企业官网搭建', desc: '科技公司需要搭建responsive官网，5个页面（首页/产品/关于/新闻/联系），含管理后台CMS', price: 8000, cat: '技术开发', type: 'ONLINE' },
  { title: 'API接口对接开发', desc: '需要对接微信支付/支付宝/银联三个支付渠道的API，统一封装成内部接口，含沙箱测试', price: 5000, cat: '技术开发', type: 'ONLINE' },
  { title: 'React后台管理系统', desc: '内部ERP系统的前端重构，从jQuery迁移到React+Ant Design，约30个页面', price: 25000, cat: '技术开发', type: 'ONLINE' },
  { title: 'Python爬虫脚本', desc: '爬取某电商平台特定品类商品数据（价格/销量/评价），每日定时更新存入MySQL数据库', price: 3000, cat: '技术开发', type: 'ONLINE' },
  { title: 'Flutter App开发', desc: '做一个健身打卡App，含日历打卡、训练视频库、数据统计图表、社区分享功能', price: 35000, cat: '技术开发', type: 'ONLINE' },
  { title: 'DevOps部署维护', desc: '帮现有的Node.js项目配置Docker+K8s+CI/CD流水线（GitHub Actions），含监控告警', price: 6000, cat: '技术开发', type: 'ONLINE' },
  { title: '数据库优化咨询', desc: '现有MySQL数据库查询缓慢（百万级数据），需要索引优化、SQL改写和分库分表方案', price: 4000, cat: '技术开发', type: 'ONLINE' },
  { title: 'IoT固件开发', desc: 'ESP32智能开关的固件开发，需支持WiFi配网和MQTT通信，提供完整源码和文档', price: 8000, cat: '技术开发', type: 'ONLINE' },
  { title: '区块链DApp开发', desc: '基于以太坊的NFT铸造和交易市场DApp，含智能合约（Solidity）和前端页面', price: 45000, cat: '技术开发', type: 'ONLINE' },
  { title: '自动化测试脚本', desc: 'Web端E2E自动化测试（Playwright），覆盖登录/注册/下单/支付核心流程约30个用例', price: 5000, cat: '技术开发', type: 'ONLINE' },
  { title: 'WordPress主题定制', desc: '企业博客需要定制WordPress主题，含响应式设计、SEO优化、多语言支持（中英文）', price: 4500, cat: '技术开发', type: 'ONLINE' },

  // ── 设计 ──
  { title: '品牌VI设计全套', desc: '初创科技公司需要Logo+名片+信纸+PPT模板+品牌色板+VI手册，极简科技风', price: 5000, cat: '设计', type: 'ONLINE' },
  { title: 'App UI界面设计', desc: '社交App的UI设计（iOS+Android），约40个页面，含交互原型和设计规范文档', price: 12000, cat: '设计', type: 'ONLINE' },
  { title: '产品包装设计', desc: '高端茶叶礼盒包装设计，需要三个系列的设计稿（经典/新式/伴手礼），含刀版图和效果图', price: 3000, cat: '设计', type: 'ONLINE' },
  { title: '电商详情页设计', desc: '家居类目产品详情页10张，含主图/细节图/场景图/尺码表，淘宝天猫风格', price: 1500, cat: '设计', type: 'ONLINE' },
  { title: '海报设计活动', desc: '618大促活动海报5张+朋友圈推广图10张+banner广告图8张，统一视觉风格', price: 1200, cat: '设计', type: 'ONLINE' },
  { title: 'PPT设计美化', desc: '融资路演PPT美化（约30页），科技/数据可视化风格，含动态图表制作', price: 1800, cat: '设计', type: 'ONLINE' },
  { title: '3D产品建模渲染', desc: '消费电子产品（蓝牙耳机）3D建模+白底渲染图8张+场景渲染图4张，Keyshot/C4D', price: 2500, cat: '设计', type: 'ONLINE' },
  { title: '插画定制', desc: '儿童绘本内页插画20张，水彩/手绘风格，需要充满童趣和想象力，A4尺寸', price: 4000, cat: '设计', type: 'ONLINE' },
  { title: '店铺装修设计', desc: '天猫旗舰店全店装修设计，含首页/详情页模板/活动页/分类页，品牌统一视觉', price: 6000, cat: '设计', type: 'ONLINE' },
  { title: '字体设计定制', desc: '品牌专用中文字体设计（约2000个常用字），现代简约风，提供TTF/OTF文件', price: 20000, cat: '设计', type: 'ONLINE' },
  { title: '信息图表设计', desc: '年度数据报告信息图设计（约15页），把复杂数据转化为直观可视化图表', price: 2200, cat: '设计', type: 'ONLINE' },
  { title: '名片设计印刷', desc: '创意名片设计+印刷200张，特种纸/烫金工艺，需要多个方案备选', price: 800, cat: '设计', type: 'ONLINE' },

  // ── 教育培训 ──
  { title: '高一数学一对一', desc: '高一女生数学薄弱（函数/立体几何），每周六上午两小时，需有高中教学经验', price: 200, cat: '教育培训', type: 'ONLINE' },
  { title: '雅思口语陪练', desc: '目标7.0分，需要母语级陪练每周三次每次一小时，线上视频，重点Part2&3练习', price: 180, cat: '教育培训', type: 'ONLINE' },
  { title: '钢琴启蒙教学', desc: '6岁零基础琴童，每周一次课45分钟，家里有雅马哈电钢琴，需要耐心有儿童教学经验的老师', price: 160, cat: '教育培训', type: 'ONLINE' },
  { title: '高考物理冲刺', desc: '高三物理冲刺，力学和电磁学综合题，每周两次每次1.5小时，需有高三带班经验', price: 250, cat: '教育培训', type: 'ONLINE' },
  { title: 'Python编程入门', desc: '文科生零基础学Python，希望用三个月达到能写简单爬虫和数据分析脚本的水平', price: 3000, cat: '教育培训', type: 'ONLINE' },
  { title: '书法课成人入门', desc: '零基础成人学毛笔楷书，每周日下午一次课，笔墨纸砚自备，希望有耐心和系统的教学计划', price: 150, cat: '教育培训', type: 'ONLINE' },
  { title: '日语N2备考', desc: '已有N3基础想冲刺N2，需要系统语法梳理和真题训练，每周两次每次两小时', price: 200, cat: '教育培训', type: 'ONLINE' },
  { title: '游泳私教成人', desc: '成人零基础学蛙泳，克服怕水心理，每周两次，希望在夏天前学会', price: 220, cat: '教育培训', type: 'ONLINE' },
  { title: '考研英语辅导', desc: '英语二备考，阅读理解和新题型薄弱，需要系统讲解答题技巧和真题精析', price: 200, cat: '教育培训', type: 'ONLINE' },
  { title: '素描基础班', desc: '零基础学素描，每周一次课，从几何体到静物组合，希望老师能提供教学大纲', price: 140, cat: '教育培训', type: 'ONLINE' },
  { title: '声乐培训流行', desc: '喜欢唱歌想在KTV不跑调，学气息控制和基础发声，每周一次课，有钢琴最好', price: 180, cat: '教育培训', type: 'ONLINE' },
  { title: '国际象棋入门', desc: '8岁男孩学国际象棋，零基础，希望有趣味教学方法激发兴趣，每周一次', price: 160, cat: '教育培训', type: 'ONLINE' },

  // ── 咨询服务 ──
  { title: '合同审核服务', desc: '一份股权转让协议（约20页）需要律师逐条审核并给出修改建议和风险提示', price: 1500, cat: '咨询服务', type: 'ONLINE' },
  { title: '税务筹划方案', desc: '年营收500万的小微企业需要税务筹划方案，合理降低增值税和所得税负担', price: 3000, cat: '咨询服务', type: 'ONLINE' },
  { title: '装修监理服务', desc: '新房128㎡整装，需要第三方监理全程跟踪（水电/木工/油漆/竣工四个节点验收）', price: 4000, cat: '咨询服务', type: 'ONLINE' },
  { title: '心理咨询在线', desc: '职场焦虑/压力管理咨询，希望每周一次线上视频咨询50分钟，有心理学背景', price: 250, cat: '咨询服务', type: 'ONLINE' },
  { title: '留学规划咨询', desc: '高二学生想去英国读本科，需要选校定位+文书指导+申请时间线规划', price: 2000, cat: '咨询服务', type: 'ONLINE' },
  { title: '职业规划辅导', desc: '工作3年想转行互联网，需要职业规划/简历优化/模拟面试辅导，一共3次', price: 900, cat: '咨询服务', type: 'ONLINE' },
  { title: '知识产权咨询', desc: '创业公司需要在商标注册（第9/42类）+软件著作权申请方面获得专业指导', price: 1200, cat: '咨询服务', type: 'ONLINE' },
  { title: '营养师饮食方案', desc: '糖尿病人个性化饮食方案制定，含一周食谱和营养分析表，定期复查调整', price: 500, cat: '咨询服务', type: 'ONLINE' },
  { title: '风水布局咨询', desc: '新房180㎡需要看风水布局，含户型分析+家具摆放建议+色彩搭配+化煞方案', price: 2800, cat: '咨询服务', type: 'ONLINE' },
  { title: '保险规划方案', desc: '一家三口（35岁夫妻+3岁孩子）需要全面保险规划，含重疾/医疗/意外/寿险配比分析', price: 600, cat: '咨询服务', type: 'ONLINE' },

  // ── 维修服务 ──
  { title: 'iPhone换屏幕', desc: 'iPhone 14 Pro Max屏幕碎裂（外屏），需要更换原装外屏玻璃，保留原内屏', price: 350, cat: '维修服务', type: 'ONLINE' },
  { title: '笔记本电脑清灰', desc: '联想拯救者Y9000P清灰换硅脂，风扇噪音大温度高，需带专业拆机工具', price: 100, cat: '维修服务', type: 'ONLINE' },
  { title: 'MacBook电池更换', desc: 'MacBook Pro 2019款电池鼓包需要更换，需要原厂电池或高品质第三方电池', price: 450, cat: '维修服务', type: 'ONLINE' },
  { title: '空调不制冷维修', desc: '格力柜机不制冷，可能是缺氟或压缩机故障，需要上门检测并报价', price: 200, cat: '维修服务', type: 'ONLINE' },
  { title: '洗衣机不排水', desc: '滚筒洗衣机不排水，可能是排水泵堵塞或电磁阀故障，需要检测维修', price: 150, cat: '维修服务', type: 'ONLINE' },
  { title: '汽车凹陷修复', desc: '车门被旁边车开门碰了一个小凹陷（未伤漆），需要无损凹陷修复不用喷漆', price: 300, cat: '维修服务', type: 'ONLINE' },
  { title: '手表换电池', desc: '天梭力洛克机械表不走，需要机芯清洗保养，非电池问题，需专业修表工具', price: 400, cat: '维修服务', type: 'ONLINE' },
  { title: '电瓶车更换控制器', desc: '雅迪电动车骑行中突然断电，可能是控制器故障，需要检测更换并匹配电机参数', price: 250, cat: '维修服务', type: 'ONLINE' },
  { title: '家具修复补漆', desc: '实木餐桌被烫了一个白圈印（直径8cm），需要修复补漆恢复原色', price: 200, cat: '维修服务', type: 'ONLINE' },
  { title: '密码锁安装', desc: '需要安装小米智能门锁Pro，原门为标准86型锁体，需自带开孔器和安装工具', price: 200, cat: '维修服务', type: 'ONLINE' },
  { title: '打印机维修', desc: 'HP LaserJet MFP M227fdw提示卡纸但实际没有纸，可能是传感器故障需拆机检测', price: 180, cat: '维修服务', type: 'ONLINE' },
  { title: '热水器打不着火', desc: '万和燃气热水器打不着火，有点火声但不着，可能是点火针或比例阀问题', price: 180, cat: '维修服务', type: 'ONLINE' },

  // ── 更多家政 ──
  { title: '保姆月嫂面试', desc: '需要一位有经验的育儿嫂，照顾8个月宝宝，白天8小时做五休二，要会早教互动', price: 5500, cat: '家政服务', type: 'ONLINE' },
  { title: '家庭私厨周套餐', desc: '工作日五天晚餐送餐，三菜一汤标准，清淡口味，食材要求新鲜有机', price: 1500, cat: '家政服务', type: 'ONLINE' },
  { title: '绿植租赁养护', desc: '办公室50盆绿植的每月定期养护（浇水/修剪/施肥/病虫害防治），含替换枯死植物', price: 800, cat: '家政服务', type: 'ONLINE' },
  { title: '上门染发服务', desc: '想在家里染发（遮盖白发），已有染发剂，需要专业人士操作确保均匀和不过敏', price: 100, cat: '家政服务', type: 'ONLINE' },
  { title: '产后修复指导', desc: '产后三个月需要腹直肌修复和盆底肌训练指导，有产后康复师资质优先', price: 280, cat: '家政服务', type: 'ONLINE' },
];

// ═══ 多城市映射 ═══
const cityLatLng: Record<string, { lat: number; lng: number }> = {
  '110000': { lat: 39.92, lng: 116.40 },  // 北京
  '310000': { lat: 31.23, lng: 121.47 },  // 上海
  '440100': { lat: 23.13, lng: 113.26 },  // 广州
  '440300': { lat: 22.54, lng: 114.06 },  // 深圳
  '330100': { lat: 30.25, lng: 120.17 },  // 杭州
  '510100': { lat: 30.57, lng: 104.07 },  // 成都
  '500000': { lat: 29.56, lng: 106.55 },  // 重庆
  '420100': { lat: 30.59, lng: 114.30 },  // 武汉
  '320100': { lat: 32.06, lng: 118.80 },  // 南京
  '610100': { lat: 34.26, lng: 108.94 },  // 西安
  '530100': { lat: 25.04, lng: 102.71 },  // 昆明
  '120000': { lat: 39.12, lng: 117.20 },  // 天津
  '430100': { lat: 28.23, lng: 112.94 },  // 长沙
  '410100': { lat: 34.75, lng: 113.62 },  // 郑州
  '370200': { lat: 36.07, lng: 120.38 },  // 青岛
};

// 标签列表
const tagNames = [
  '水电维修', '家电清洗', '保洁家政', '搬家搬运', '装修施工',
  '前端开发', '后端开发', '小程序开发', 'Python开发', 'UI设计',
  'Logo设计', '品牌VI', '3D建模', '插画设计', 'PPT设计',
  '英语辅导', '数学辅导', '物理辅导', '钢琴教学', '健身教练',
  '瑜伽教练', '游泳教学', '书法教学', '日语培训', '编程培训',
  '法律咨询', '财务税务', '心理咨询', '营养健康', '留学规划',
  '手机维修', '电脑维修', '家电维修', '汽车维修', '家具修复',
  '摄影摄像', '视频剪辑', '翻译服务', '宠物服务', '跑腿代办',
  '美容美发', '按摩理疗', '婚礼策划', '导游地陪', '驾校陪练',
];

async function main() {
  console.log('Clearing existing data...');
  await prisma.$transaction([
    prisma.short.deleteMany(),
    prisma.review.deleteMany(),
    prisma.message.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.depositDemand.deleteMany(),
    prisma.deposit.deleteMany(),
    prisma.circleDemand.deleteMany(),
    prisma.circleMember.deleteMany(),
    prisma.order.deleteMany(),
    prisma.demandApplicantV2.deleteMany(),
    prisma.demandApplication.deleteMany(),
    prisma.demandFavorite.deleteMany(),
    prisma.activeDemand.deleteMany(),
    prisma.demand.deleteMany(),
    prisma.circle.deleteMany(),
    prisma.welfareFundPool.deleteMany(),
    prisma.tagStats.deleteMany(),
    prisma.certifiedProvider.deleteMany(),
    prisma.userTag.deleteMany(),
    prisma.pushPreference.deleteMany(),
    prisma.agentMessage.deleteMany(),
    prisma.agentConversation.deleteMany(),
    prisma.conversationMergeMember.deleteMany(),
    prisma.conversationMerge.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log('Cleared.');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const now = new Date();
  const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // ── 创建标签 ──
  console.log('Creating tags...');
  for (const tag of tagNames) {
    await prisma.tag.upsert({
      where: { name: tag },
      update: {},
      create: { name: tag, category: 'both', totalCompleted: 0, totalEstimatedAmount: 0, colorHistogram: [] },
    });
  }

  // ── 创建用户 ──
  console.log(`Creating ${realUsers.length} users...`);
  const userMap: Record<string, { id: string; nickname: string; cityCode: string; cert: string }> = {};
  for (let i = 0; i < realUsers.length; i++) {
    const u = realUsers[i];
    const user = await prisma.user.create({
      data: {
        phone: u.phone,
        nickname: u.nickname,
        passwordHash,
        bio: u.bio,
        cityCode: u.cityCode,
        certificationLevel: u.cert,
        creditScore: u.credit,
        completedOrders: u.orders,
        role: u.role || 'USER',
        serviceTags: [],
      },
    });
    userMap[u.phone] = { id: user.id, nickname: u.nickname, cityCode: u.cityCode, cert: u.cert };
  }

  // ── 创建需求 ──
  console.log(`Creating ${demandTemplates.length} demands...`);
  const userIds = Object.values(userMap);
  const demandIds: string[] = [];
  for (let i = 0; i < demandTemplates.length; i++) {
    const dt = demandTemplates[i];
    const creator = userIds[i % userIds.length];
    const city = cityLatLng[creator.cityCode] || cityLatLng['110000'];
    // 线上需求不一定有坐标
    const isOnline = dt.type === 'ONLINE';
    const demand = await prisma.demand.create({
      data: {
        userId: creator.id,
        title: dt.title,
        description: dt.desc,
        minPrice: dt.price,
        category: dt.cat,
        serviceType: dt.type,
        cityCode: creator.cityCode,
        expireAt: new Date(now.getTime() + (7 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000),
        status: ['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 6)] as any,
        isExample: false,
        isPublic: true,
        fuzzyLat: isOnline ? undefined : city.lat + (Math.random() - 0.5) * 0.1,
        fuzzyLng: isOnline ? undefined : city.lng + (Math.random() - 0.5) * 0.1,
        tags: [dt.cat],
        aiTags: [],
        stage: 'active',
        lifecycleStage: 'ACTIVE',
        applicantCount: Math.floor(Math.random() * 8),
        visibilityWindow: 15,
        maxApplicants: 10,
      },
    });
    demandIds.push(demand.id);
  }

  // ── 创建圈子 ──
  console.log('Creating circles...');
  const circles = [
    { name: '北京装修互助圈', cityCode: '110000', type: 'PUBLIC' as const },
    { name: '上海设计交流圈', cityCode: '310000', type: 'PUBLIC' as const },
    { name: '广深程序员联盟', cityCode: '440300', type: 'PUBLIC' as const },
    { name: '成都美食爱好者', cityCode: '510100', type: 'PUBLIC' as const },
    { name: '杭州电商创业者', cityCode: '330100', type: 'PUBLIC' as const },
    { name: '武汉家教资源共享', cityCode: '420100', type: 'PUBLIC' as const },
    { name: '全国摄影交流圈', cityCode: '110000', type: 'PUBLIC' as const },
    { name: '九木官方公告圈', cityCode: '110000', type: 'PRIVATE' as const },
    { name: '重庆山城跑腿帮', cityCode: '500000', type: 'PUBLIC' as const },
    { name: '宁杭独立开发者', cityCode: '320100', type: 'PUBLIC' as const },
  ];
  for (const c of circles) {
    const owner = userIds.find(u => u.cityCode === c.cityCode) || userIds[0];
    await prisma.circle.create({
      data: {
        name: c.name,
        type: c.type,
        ownerId: owner.id,
        cityCode: c.cityCode,
        memberCount: 1 + Math.floor(Math.random() * 30),
        activeScore: Math.random() * 100,
        status: 'ACTIVE',
      },
    });
  }

  // ── 创建认证服务者 ──
  console.log('Creating certified providers...');
  const certUsers = userIds.filter(u => u.cert !== 'NONE');
  for (const cu of certUsers) {
    const randomTags = tagNames.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    await prisma.certifiedProvider.create({
      data: {
        userId: cu.id,
        tags: randomTags,
        regionId: undefined,
        avgRating: 4.0 + Math.random() * 1.0,
        totalCompleted: 5 + Math.floor(Math.random() * 80),
      },
    });
  }

  // ── 创建订单和评价 ──
  console.log('Creating sample orders & reviews...');
  for (let i = 0; i < 60; i++) {
    const provider = userIds[Math.floor(Math.random() * userIds.length)];
    const requester = userIds.filter(u => u.id !== provider.id)[Math.floor(Math.random() * (userIds.length - 1))];
    const demand = demandIds[i % demandIds.length];
    const statuses: any[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'WAITING_REVIEW', 'PENDING'];
    const status = statuses[i % statuses.length];
    const price = 50 + Math.floor(Math.random() * 5000);

    const order = await prisma.order.create({
      data: {
        demandId: demand,
        providerId: provider.id,
        requesterId: requester.id,
        agreedPrice: price,
        status,
        completedAt: status === 'COMPLETED' ? new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) : null,
      },
    });

    if (status === 'COMPLETED') {
      await prisma.review.create({
        data: {
          orderId: order.id,
          reviewerId: requester.id,
          revieweeId: provider.id,
          rating: 3 + Math.floor(Math.random() * 3),
          content: ['服务很专业，响应及时！', '非常满意，下次还找', '性价比高，沟通顺畅', '技术过硬，按时交付', '态度很好，超出预期'][i % 5],
        },
      });
    }
  }

  // ── 创建关注关系 ──
  console.log('Creating follow relationships...');
  for (let i = 0; i < 80; i++) {
    const follower = userIds[Math.floor(Math.random() * userIds.length)];
    const following = userIds.filter(u => u.id !== follower.id)[Math.floor(Math.random() * (userIds.length - 1))];
    try {
      await prisma.follow.create({
        data: { followerId: follower.id, followingId: following.id },
      });
    } catch { /* 重复跳过 */ }
  }

  // ── 创建示例消息 ──
  console.log('Creating sample messages...');
  const msgTexts = ['你好，我看到你的需求了，方便聊聊吗？', '请问这个大概什么时间需要？', '我这边可以做，价格可以谈', '好的没问题', '谢谢你，合作愉快！'];
  for (let i = 0; i < 50; i++) {
    const from = userIds[Math.floor(Math.random() * userIds.length)];
    const to = userIds.filter(u => u.id !== from.id)[Math.floor(Math.random() * (userIds.length - 1))];
    await prisma.message.create({
      data: {
        fromUserId: from.id,
        toUserId: to.id,
        content: msgTexts[i % msgTexts.length],
        type: 'TEXT',
        isRead: Math.random() > 0.3,
        createdAt: new Date(now.getTime() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ── 创建 UserTag ──
  console.log('Creating user tags...');
  for (const cu of certUsers) {
    const tag = tagNames[Math.floor(Math.random() * tagNames.length)];
    try {
      await prisma.userTag.create({
        data: {
          userId: cu.id,
          tagName: tag,
          status: Math.random() > 0.3 ? 'IDLE' : 'BUSY',
          certified: true,
          rating: 3.5 + Math.random() * 1.5,
          orderCount: Math.floor(Math.random() * 30),
          regionId: undefined,
        },
      });
    } catch { /* 重复跳过 */ }
  }

  // ── 创建需求申请（应标记录）──
  console.log('Creating demand applications...');
  for (let i = 0; i < 40; i++) {
    const applicant = userIds[Math.floor(Math.random() * userIds.length)];
    const demandId = demandIds[i % demandIds.length];
    try {
      await prisma.demandApplication.create({
        data: {
          demandId,
          userId: applicant.id,
          offerPrice: 50 + Math.floor(Math.random() * 3000),
          message: ['我能做这个，有经验', '我对这个很感兴趣', '之前做过类似的', '请联系我详谈', '周一就能开始'][i % 5],
          status: ['PENDING', 'ACCEPTED', 'REJECTED'][i % 3] as any,
        },
      });
    } catch { /* 跳过重复 */ }
  }

  // ── 创建一些冻结/死池需求 ──
  console.log('Creating frozen/dead demands...');
  const frozenUserIds = userIds.slice(0, 5);
  for (const fu of frozenUserIds) {
    await prisma.demand.create({
      data: {
        userId: fu.id,
        title: ['旧空调回收处理', '过期需求清理测试', '历史家教需求', '已完成的设计项目', '往期翻译任务'][Math.floor(Math.random() * 5)],
        description: '这是一条历史/冻结需求，用于测试死池和归档功能',
        minPrice: 50 + Math.floor(Math.random() * 500),
        category: '家政服务',
        serviceType: 'ONLINE',
        cityCode: fu.cityCode,
        expireAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        status: 'FROZEN',
        isExample: false,
        isPublic: true,
        tags: ['历史需求'],
        aiTags: [],
        stage: 'active',
        lifecycleStage: 'ACTIVE',
        visibilityWindow: 15,
        maxApplicants: 10,
        frozenAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ── 刷新标签统计 ──
  console.log('Refreshing tag stats...');
  const { refreshTagStats } = await import('../src/services/tag-stats.js');
  await refreshTagStats();

  console.log('Seed complete!');
  console.log(`  Users: ${realUsers.length}`);
  console.log(`  Demands: ${demandTemplates.length}`);
  console.log(`  Circles: ${circles.length}`);
  console.log(`  Certified Providers: ${certUsers.length}`);
  console.log(`  Orders: 60, Reviews, Messages: 50, Follows: 80`);
  console.log(`  Password for all users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
