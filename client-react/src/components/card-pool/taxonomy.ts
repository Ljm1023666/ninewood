/** 卡池分类树：多级细分；叶子 id 在 NODE_SEARCH_CATEGORY 中映射到 Prisma Demand.category（与 seed / 发布一致） */

export type TaxonomyMeta = {
  label: string
  parent: string | null
  childIds: string[]
}

export const TAXONOMY: Record<string, TaxonomyMeta> = {
  root: { label: '全部', parent: null, childIds: ['online', 'offline'] },

  online: {
    label: '线上服务',
    parent: 'root',
    childIds: [
      'on-design',
      'on-tech',
      'on-edu',
      'on-pro',
      'on-ecom',
      'on-media',
    ],
  },
  offline: {
    label: '线下到场',
    parent: 'root',
    childIds: [
      'off-life',
      'off-repair',
      'off-health',
      'off-auto',
      'off-estate',
      'off-biz',
      'off-wed',
      'off-pet',
      'off-farm',
      'off-travel',
      'off-lang',
      'off-study',
      'off-tea',
    ],
  },

  /* ── 线上：视觉与内容 ── */
  'on-design': {
    label: '视觉与品牌',
    parent: 'online',
    childIds: [
      'on-d-logo',
      'on-d-ui',
      'on-d-pack',
      'on-d-video',
      'on-d-3d',
      'on-d-photo',
    ],
  },
  'on-d-logo': { label: 'Logo / VI / 画册', parent: 'on-design', childIds: [] },
  'on-d-ui': {
    label: 'UI · 交互 · 小程序界面',
    parent: 'on-design',
    childIds: [],
  },
  'on-d-pack': {
    label: '包装 · 主图 · 物料',
    parent: 'on-design',
    childIds: [],
  },
  'on-d-video': {
    label: '短视频 · 剪辑 · 调色',
    parent: 'on-design',
    childIds: [],
  },
  'on-d-3d': {
    label: '三维 · 效果图 · 动画',
    parent: 'on-design',
    childIds: [],
  },
  'on-d-photo': { label: '产品摄影 · 精修', parent: 'on-design', childIds: [] },

  /* ── 线上：技术开发 ── */
  'on-tech': {
    label: '技术开发',
    parent: 'online',
    childIds: [
      'on-t-web',
      'on-t-mini',
      'on-t-app',
      'on-t-api',
      'on-t-data',
      'on-t-cloud',
      'on-t-sec',
    ],
  },
  'on-t-web': { label: '官网 · H5 · 活动页', parent: 'on-tech', childIds: [] },
  'on-t-mini': {
    label: '微信小程序 · 公众号',
    parent: 'on-tech',
    childIds: [],
  },
  'on-t-app': {
    label: 'App · 跨端 · Flutter',
    parent: 'on-tech',
    childIds: [],
  },
  'on-t-api': {
    label: '接口 · 后台 · 中间件',
    parent: 'on-tech',
    childIds: [],
  },
  'on-t-data': { label: '数据 · BI · 报表', parent: 'on-tech', childIds: [] },
  'on-t-cloud': {
    label: '云运维 · DevOps · 上架',
    parent: 'on-tech',
    childIds: [],
  },
  'on-t-sec': {
    label: '等保 · 渗透 · 安全加固',
    parent: 'on-tech',
    childIds: [],
  },

  /* ── 线上：教育培训 ── */
  'on-edu': {
    label: '在线教育',
    parent: 'online',
    childIds: [
      'on-e-lang',
      'on-e-k12',
      'on-e-cert',
      'on-e-it',
      'on-e-art',
      'on-e-sport',
    ],
  },
  'on-e-lang': { label: '外语 · 雅思托福口语', parent: 'on-edu', childIds: [] },
  'on-e-k12': { label: 'K12 · 考研公考', parent: 'on-edu', childIds: [] },
  'on-e-cert': { label: '职业考证 · 资格辅导', parent: 'on-edu', childIds: [] },
  'on-e-it': { label: 'IT 编程 · 运维入门', parent: 'on-edu', childIds: [] },
  'on-e-art': { label: '乐器 · 美术 · 艺考', parent: 'on-edu', childIds: [] },
  'on-e-sport': {
    label: '健身理论 · 线上私教计划',
    parent: 'on-edu',
    childIds: [],
  },

  /* ── 线上：专业顾问 ── */
  'on-pro': {
    label: '法务 · 财税 · 管理顾问',
    parent: 'online',
    childIds: [
      'on-p-law',
      'on-p-tax',
      'on-p-hr',
      'on-p-strat',
      'on-p-ip',
      'on-p-comp',
    ],
  },
  'on-p-law': { label: '合同 · 劳动 · 股权', parent: 'on-pro', childIds: [] },
  'on-p-tax': {
    label: '代理记账 · 税筹 · 审计',
    parent: 'on-pro',
    childIds: [],
  },
  'on-p-hr': {
    label: '制度 · 用工 · 社保筹划',
    parent: 'on-pro',
    childIds: [],
  },
  'on-p-strat': { label: '战略 · 商业计划书', parent: 'on-pro', childIds: [] },
  'on-p-ip': { label: '商标 · 专利 · 软著', parent: 'on-pro', childIds: [] },
  'on-p-comp': { label: '合规 · ISO · 高企', parent: 'on-pro', childIds: [] },

  /* ── 线上：电商与增长 ── */
  'on-ecom': {
    label: '电商与运营',
    parent: 'online',
    childIds: [
      'on-ec-shop',
      'on-ec-live',
      'on-ec-seo',
      'on-ec-pr',
      'on-ec-cross',
    ],
  },
  'on-ec-shop': { label: '店铺装修 · 详情页', parent: 'on-ecom', childIds: [] },
  'on-ec-live': { label: '直播代运营 · 脚本', parent: 'on-ecom', childIds: [] },
  'on-ec-seo': { label: 'SEO · SEM · 信息流', parent: 'on-ecom', childIds: [] },
  'on-ec-pr': { label: '私域 · 社群 · CRM', parent: 'on-ecom', childIds: [] },
  'on-ec-cross': {
    label: '跨境 · 独立站 · 申诉',
    parent: 'on-ecom',
    childIds: [],
  },

  /* ── 线上：文娱 ── */
  'on-media': {
    label: '文娱与陪练',
    parent: 'online',
    childIds: ['on-m-game', 'on-m-voice', 'on-m-copy'],
  },
  'on-m-game': { label: '游戏陪练 · 代练', parent: 'on-media', childIds: [] },
  'on-m-voice': {
    label: '配音 · 配乐 · 播客剪辑',
    parent: 'on-media',
    childIds: [],
  },
  'on-m-copy': {
    label: '剧本 · 文案 · 主持稿',
    parent: 'on-media',
    childIds: [],
  },

  /* ── 线下：居住与生活 ── */
  'off-life': {
    label: '家政与生活',
    parent: 'offline',
    childIds: [
      'off-l-daily',
      'off-l-deep',
      'off-l-acs',
      'off-l-move',
      'off-l-baby',
      'off-l-chef',
      'off-l-tea',
    ],
  },
  'off-l-daily': { label: '日常保洁 · 钟点', parent: 'off-life', childIds: [] },
  'off-l-deep': { label: '开荒 · 深度保洁', parent: 'off-life', childIds: [] },
  'off-l-acs': {
    label: '空调 · 油烟机 · 洗衣机清洗',
    parent: 'off-life',
    childIds: [],
  },
  'off-l-move': {
    label: '搬家 · 收纳 · 钢琴搬运',
    parent: 'off-life',
    childIds: [],
  },
  'off-l-baby': {
    label: '月嫂 · 育儿嫂 · 陪护',
    parent: 'off-life',
    childIds: [],
  },
  'off-l-chef': {
    label: '私厨 · 家宴 · 团餐上门',
    parent: 'off-life',
    childIds: [],
  },
  'off-l-tea': { label: '茶艺师上门 · 茶席', parent: 'off-life', childIds: [] },

  /* ── 线下：维修与弱电 ── */
  'off-repair': {
    label: '维修与弱电',
    parent: 'offline',
    childIds: [
      'off-r-phone',
      'off-r-pc',
      'off-r-appliance',
      'off-r-plumb',
      'off-r-lock',
      'off-r-net',
    ],
  },
  'off-r-phone': {
    label: '手机 · 平板换屏维修',
    parent: 'off-repair',
    childIds: [],
  },
  'off-r-pc': {
    label: '电脑 · 数据恢复 · 病毒',
    parent: 'off-repair',
    childIds: [],
  },
  'off-r-appliance': {
    label: '家电维修 · 净水地暖',
    parent: 'off-repair',
    childIds: [],
  },
  'off-r-plumb': {
    label: '管道 · 防水 · 疏通',
    parent: 'off-repair',
    childIds: [],
  },
  'off-r-lock': {
    label: '开锁换锁 · 智能门锁',
    parent: 'off-repair',
    childIds: [],
  },
  'off-r-net': {
    label: '监控 · 布线 · NAS 组网',
    parent: 'off-repair',
    childIds: [],
  },

  /* ── 线下：健康 ── */
  'off-health': {
    label: '健康与心理',
    parent: 'offline',
    childIds: [
      'off-h-clinic',
      'off-h-massage',
      'off-h-tcm',
      'off-h-psy',
      'off-h-diet',
    ],
  },
  'off-h-clinic': {
    label: '陪诊 · 取药 · 体检解读',
    parent: 'off-health',
    childIds: [],
  },
  'off-h-massage': {
    label: '推拿 · 艾灸 · 康复',
    parent: 'off-health',
    childIds: [],
  },
  'off-h-tcm': { label: '针灸 · 小儿推拿', parent: 'off-health', childIds: [] },
  'off-h-psy': { label: '心理咨询 · 沙盘', parent: 'off-health', childIds: [] },
  'off-h-diet': { label: '慢病饮食指导', parent: 'off-health', childIds: [] },

  /* ── 线下：车辆 ── */
  'off-auto': {
    label: '车辆与出行',
    parent: 'offline',
    childIds: [
      'off-c-wash',
      'off-c-beauty',
      'off-c-repair',
      'off-c-rescue',
      'off-c-pile',
      'off-c-driver',
    ],
  },
  'off-c-wash': {
    label: '洗车 · 打蜡 · 内饰',
    parent: 'off-auto',
    childIds: [],
  },
  'off-c-beauty': {
    label: '贴膜 · 改色 · 装潢',
    parent: 'off-auto',
    childIds: [],
  },
  'off-c-repair': {
    label: '钣金喷漆 · 保养 · 年检代办',
    parent: 'off-auto',
    childIds: [],
  },
  'off-c-rescue': {
    label: '道路救援 · 搭电 · 拖车',
    parent: 'off-auto',
    childIds: [],
  },
  'off-c-pile': {
    label: '充电桩安装 · 报装',
    parent: 'off-auto',
    childIds: [],
  },
  'off-c-driver': {
    label: '代驾 · 陪练 · 商务接送',
    parent: 'off-auto',
    childIds: [],
  },

  /* ── 线下：房产与环境 ── */
  'off-estate': {
    label: '房产与环境',
    parent: 'offline',
    childIds: [
      'off-he-check',
      'off-he-rent',
      'off-he-bnb',
      'off-he-law',
      'off-he-air',
      'off-he-pest',
    ],
  },
  'off-he-check': {
    label: '验房 · 量房 · 监理',
    parent: 'off-estate',
    childIds: [],
  },
  'off-he-rent': {
    label: '租房保洁 · 退租清扫',
    parent: 'off-estate',
    childIds: [],
  },
  'off-he-bnb': {
    label: '民宿代运营 · 拍摄',
    parent: 'off-estate',
    childIds: [],
  },
  'off-he-law': {
    label: '法拍尽调 · 商铺转让协助',
    parent: 'off-estate',
    childIds: [],
  },
  'off-he-air': {
    label: '除甲醛 · 空气检测',
    parent: 'off-estate',
    childIds: [],
  },
  'off-he-pest': {
    label: '白蚁 · 四害消杀',
    parent: 'off-estate',
    childIds: [],
  },

  /* ── 线下：企业到场 ── */
  'off-biz': {
    label: '企业到场',
    parent: 'offline',
    childIds: [
      'off-b-event',
      'off-b-photo',
      'off-b-logi',
      'off-b-hr',
      'off-b-iso',
      'off-b-train',
    ],
  },
  'off-b-event': {
    label: '年会 · 展台 · 灯光音响',
    parent: 'off-biz',
    childIds: [],
  },
  'off-b-photo': {
    label: '活动摄影 · 宣传片跟拍',
    parent: 'off-biz',
    childIds: [],
  },
  'off-b-logi': {
    label: '仓拣 · 搬运 · 冷链短驳',
    parent: 'off-biz',
    childIds: [],
  },
  'off-b-hr': { label: '劳务派遣 · 驻场 HR', parent: 'off-biz', childIds: [] },
  'off-b-iso': {
    label: '体系辅导 · 验厂陪同',
    parent: 'off-biz',
    childIds: [],
  },
  'off-b-train': {
    label: '企业内训 · 拓展执行',
    parent: 'off-biz',
    childIds: [],
  },

  /* ── 线下：婚庆与美业 ── */
  'off-wed': {
    label: '婚庆与美业',
    parent: 'offline',
    childIds: [
      'off-w-photo',
      'off-w-makeup',
      'off-w-host',
      'off-w-dress',
      'off-w-nail',
      'off-w-skin',
    ],
  },
  'off-w-photo': {
    label: '婚礼跟拍 · 百天 · 写真',
    parent: 'off-wed',
    childIds: [],
  },
  'off-w-makeup': {
    label: '跟妆 · 半永久 · 汉服妆造',
    parent: 'off-wed',
    childIds: [],
  },
  'off-w-host': { label: '司仪 · 现场督导', parent: 'off-wed', childIds: [] },
  'off-w-dress': {
    label: '礼服 · 婚纱租赁协助',
    parent: 'off-wed',
    childIds: [],
  },
  'off-w-nail': { label: '美甲美睫上门', parent: 'off-wed', childIds: [] },
  'off-w-skin': {
    label: '皮肤管理 · 轻医美陪同',
    parent: 'off-wed',
    childIds: [],
  },

  /* ── 线下：宠物与园艺 ── */
  'off-pet': {
    label: '宠物与园艺',
    parent: 'offline',
    childIds: [
      'off-p-board',
      'off-p-walk',
      'off-p-train',
      'off-p-vet',
      'off-p-plant',
      'off-p-fish',
    ],
  },
  'off-p-board': { label: '寄养 · 上门喂养', parent: 'off-pet', childIds: [] },
  'off-p-walk': { label: '代遛 · 宠物出行', parent: 'off-pet', childIds: [] },
  'off-p-train': { label: '训犬 · 行为纠正', parent: 'off-pet', childIds: [] },
  'off-p-vet': {
    label: '宠物医疗协助 · 疫苗驱虫',
    parent: 'off-pet',
    childIds: [],
  },
  'off-p-plant': {
    label: '绿植租摆 · 庭院养护',
    parent: 'off-pet',
    childIds: [],
  },
  'off-p-fish': {
    label: '鱼缸维护 · 锦鲤问诊',
    parent: 'off-pet',
    childIds: [],
  },

  /* ── 线下：三农 ── */
  'off-farm': {
    label: '三农与设备',
    parent: 'offline',
    childIds: ['off-f-machine', 'off-f-greenhouse', 'off-f-cold', 'off-f-org'],
  },
  'off-f-machine': {
    label: '农机检修 · 农机手',
    parent: 'off-farm',
    childIds: [],
  },
  'off-f-greenhouse': {
    label: '大棚温控 · 灌溉改造',
    parent: 'off-farm',
    childIds: [],
  },
  'off-f-cold': { label: '冷库维保', parent: 'off-farm', childIds: [] },
  'off-f-org': {
    label: '有机认证 · 农残检测',
    parent: 'off-farm',
    childIds: [],
  },

  /* ── 线下：旅行与向导 ── */
  'off-travel': {
    label: '旅行与户外',
    parent: 'offline',
    childIds: [
      'off-t-guide',
      'off-t-driver',
      'off-t-ski',
      'off-t-dive',
      'off-t-climb',
      'off-t-camp',
    ],
  },
  'off-t-guide': {
    label: '地陪 · 城市向导 · 研学',
    parent: 'off-travel',
    childIds: [],
  },
  'off-t-driver': {
    label: '包车 · 长途代驾',
    parent: 'off-travel',
    childIds: [],
  },
  'off-t-ski': {
    label: '滑雪教练 · 雪场协作',
    parent: 'off-travel',
    childIds: [],
  },
  'off-t-dive': {
    label: '潜水体验 · 考证陪同',
    parent: 'off-travel',
    childIds: [],
  },
  'off-t-climb': {
    label: '攀岩保护 · 户外保障',
    parent: 'off-travel',
    childIds: [],
  },
  'off-t-camp': {
    label: '露营搭建 · 装备租赁',
    parent: 'off-travel',
    childIds: [],
  },

  'off-lang': {
    label: '翻译与口译',
    parent: 'offline',
    childIds: ['off-lang-doc', 'off-lang-escort', 'off-lang-sim'],
  },
  'off-lang-doc': {
    label: '文件翻译 · 盖章',
    parent: 'off-lang',
    childIds: [],
  },
  'off-lang-escort': {
    label: '陪同口译 · 展会翻译',
    parent: 'off-lang',
    childIds: [],
  },
  'off-lang-sim': {
    label: '同传设备 · 会议同传',
    parent: 'off-lang',
    childIds: [],
  },

  'off-study': {
    label: '留学与升学',
    parent: 'offline',
    childIds: ['off-s-paper', 'off-s-visa', 'off-s-interview'],
  },
  'off-s-paper': {
    label: '文书 · 选校规划',
    parent: 'off-study',
    childIds: [],
  },
  'off-s-visa': {
    label: '签证材料 · 面签辅导',
    parent: 'off-study',
    childIds: [],
  },
  'off-s-interview': {
    label: '面试模拟 · 作品集指导',
    parent: 'off-study',
    childIds: [],
  },

  'off-tea': {
    label: '茶艺与咖啡',
    parent: 'offline',
    childIds: ['off-tea-class', 'off-tea-party', 'off-coffee'],
  },
  'off-tea-class': {
    label: '茶艺课 · 评茶员辅导',
    parent: 'off-tea',
    childIds: [],
  },
  'off-tea-party': {
    label: '茶席活动 · 商务茶歇',
    parent: 'off-tea',
    childIds: [],
  },
  'off-coffee': {
    label: '咖啡拉花 · 上门咖啡角',
    parent: 'off-tea',
    childIds: [],
  },
}

/** 仅叶子：与 Prisma category 精确匹配，用于 GET /demands/search */
export const NODE_SEARCH_CATEGORY: Record<string, string> = {
  /* 线上-设计 */
  'on-d-logo': '设计',
  'on-d-ui': '设计',
  'on-d-pack': '设计',
  'on-d-video': '设计',
  'on-d-3d': '设计',
  'on-d-photo': '设计',
  /* 线上-技术 */
  'on-t-web': '技术开发',
  'on-t-mini': '技术开发',
  'on-t-app': '技术开发',
  'on-t-api': '技术开发',
  'on-t-data': '技术开发',
  'on-t-cloud': '技术开发',
  'on-t-sec': '技术开发',
  /* 线上-教育 */
  'on-e-lang': '教育培训',
  'on-e-k12': '教育培训',
  'on-e-cert': '教育培训',
  'on-e-it': '教育培训',
  'on-e-art': '教育培训',
  'on-e-sport': '教育培训',
  /* 线上-顾问（法务/财税映射到对应类目；管理类用咨询服务） */
  'on-p-law': '法律法务',
  'on-p-tax': '财务税务',
  'on-p-hr': '企业服务',
  'on-p-strat': '咨询服务',
  'on-p-ip': '法律法务',
  'on-p-comp': '咨询服务',
  /* 线上-电商 */
  'on-ec-shop': '电商运营',
  'on-ec-live': '电商运营',
  'on-ec-seo': '电商运营',
  'on-ec-pr': '电商运营',
  'on-ec-cross': '电商运营',
  /* 线上-文娱 */
  'on-m-game': '影音娱乐',
  'on-m-voice': '设计',
  'on-m-copy': '咨询服务',

  /* 线下-家政生活 */
  'off-l-daily': '家政服务',
  'off-l-deep': '家政服务',
  'off-l-acs': '家政服务',
  'off-l-move': '家政服务',
  'off-l-baby': '家政服务',
  'off-l-chef': '美食餐饮',
  'off-l-tea': '茶艺文化',
  /* 线下-维修 */
  'off-r-phone': '维修服务',
  'off-r-pc': '维修服务',
  'off-r-appliance': '维修服务',
  'off-r-plumb': '维修服务',
  'off-r-lock': '维修服务',
  'off-r-net': '技术开发',
  /* 线下-健康 */
  'off-h-clinic': '医疗健康',
  'off-h-massage': '医疗健康',
  'off-h-tcm': '医疗健康',
  'off-h-psy': '心理咨询',
  'off-h-diet': '医疗健康',
  /* 线下-车 */
  'off-c-wash': '汽车服务',
  'off-c-beauty': '汽车服务',
  'off-c-repair': '汽车服务',
  'off-c-rescue': '汽车服务',
  'off-c-pile': '汽车服务',
  'off-c-driver': '汽车服务',
  /* 线下-房产 */
  'off-he-check': '房产相关',
  'off-he-rent': '房产相关',
  'off-he-bnb': '房产相关',
  'off-he-law': '房产相关',
  'off-he-air': '环保检测',
  'off-he-pest': '家政服务',
  /* 线下-企业 */
  'off-b-event': '企业服务',
  'off-b-photo': '婚庆摄影',
  'off-b-logi': '仓储物流',
  'off-b-hr': '企业服务',
  'off-b-iso': '咨询服务',
  'off-b-train': '教育培训',
  /* 线下-婚庆美业 */
  'off-w-photo': '婚庆摄影',
  'off-w-makeup': '婚庆摄影',
  'off-w-host': '婚庆摄影',
  'off-w-dress': '婚庆摄影',
  'off-w-nail': '家政服务',
  'off-w-skin': '家政服务',
  /* 线下-宠物园艺 */
  'off-p-board': '宠物服务',
  'off-p-walk': '宠物服务',
  'off-p-train': '宠物服务',
  'off-p-vet': '宠物服务',
  'off-p-plant': '家政服务',
  'off-p-fish': '宠物服务',
  /* 三农 */
  'off-f-machine': '三农服务',
  'off-f-greenhouse': '三农服务',
  'off-f-cold': '维修服务',
  'off-f-org': '咨询服务',
  /* 旅行 */
  'off-t-guide': '旅游出行',
  'off-t-driver': '汽车服务',
  'off-t-ski': '旅游出行',
  'off-t-dive': '旅游出行',
  'off-t-climb': '健身运动',
  'off-t-camp': '旅游出行',
  /* 翻译留学 */
  'off-lang-doc': '翻译语言',
  'off-lang-escort': '翻译语言',
  'off-lang-sim': '翻译语言',
  'off-s-paper': '留学出国',
  'off-s-visa': '留学出国',
  'off-s-interview': '教育培训',
  'off-tea-class': '茶艺文化',
  'off-tea-party': '茶艺文化',
  'off-coffee': '美食餐饮',
}

/** 子树内所有叶子 id（与 collectLeaves 相同语义） */
export function subtreeLeafIds(nodeId: string): string[] {
  return collectLeaves(nodeId)
}

/** 子树叶子映射的去重类目（卡池中间层按类目并集计数） */
export function subtreeSearchCategories(taxonId: string): string[] {
  const set = new Set<string>()
  for (const id of collectLeaves(taxonId)) {
    const c = NODE_SEARCH_CATEGORY[id]
    if (c) set.add(c)
  }
  return [...set].sort()
}

function collectLeaves(nodeId: string): string[] {
  const meta = TAXONOMY[nodeId]
  if (!meta) return []
  if (meta.childIds.length === 0) return [nodeId]
  return meta.childIds.flatMap(collectLeaves)
}

export const ONLINE_LEAVES = collectLeaves('online') as readonly string[]
export const OFFLINE_LEAVES = collectLeaves('offline') as readonly string[]

export function taxonomyPathLabel(path: string[]): string {
  if (path.length === 0) return '全部'
  const last = path[path.length - 1]!
  return TAXONOMY[last]?.label ?? last
}

export function childBlackIds(path: string[]): string[] {
  const last = path[path.length - 1]!
  return TAXONOMY[last]?.childIds ?? []
}

export function isTaxonomyLeaf(path: string[]): boolean {
  return childBlackIds(path).length === 0
}

/** 线下到场子树内层级：0=「线下到场」节点，1=二级大类，2=叶子…；非该子树为 null */
export function offlineTaxonomyTier(taxonId: string): number | null {
  if (taxonId === 'root' || taxonId === 'online') return null
  if (taxonId === 'offline') return 0
  let tier = 1
  let id: string | null = TAXONOMY[taxonId]?.parent ?? null
  while (id) {
    if (id === 'offline') return tier
    if (id === 'root' || id === 'online') return null
    id = TAXONOMY[id]?.parent ?? null
    tier++
  }
  return null
}

/** 线下到场层级色：深蓝→靛→紫→玫红（避开黄/浅绿），高饱和、在暗色界面与 bg-card 上更清晰 */
const OFFLINE_SPECTRUM = [
  'hsl(212, 93%, 72%)',
  'hsl(228, 90%, 71%)',
  'hsl(244, 88%, 70%)',
  'hsl(262, 86%, 69%)',
  'hsl(280, 85%, 68%)',
  'hsl(298, 84%, 67%)',
  'hsl(316, 82%, 66%)',
  'hsl(330, 80%, 65%)',
] as const

export function offlineSpectrumColor(tier: number): string {
  const i = Math.min(Math.max(tier, 0), OFFLINE_SPECTRUM.length - 1)
  return OFFLINE_SPECTRUM[i]!
}

/** 线上服务子树内层级：0=「线上服务」节点，1=二级大类，2=叶子…；非该子树为 null */
export function onlineTaxonomyTier(taxonId: string): number | null {
  if (taxonId === 'root' || taxonId === 'offline') return null
  if (taxonId === 'online') return 0
  let tier = 1
  let id: string | null = TAXONOMY[taxonId]?.parent ?? null
  while (id) {
    if (id === 'online') return tier
    if (id === 'root' || id === 'offline') return null
    id = TAXONOMY[id]?.parent ?? null
    tier++
  }
  return null
}

/** 线上层级色：青绿→翠→琥珀→橙→玫（与线下蓝紫系区分，同样偏高饱和） */
const ONLINE_SPECTRUM = [
  'hsl(186, 92%, 69%)',
  'hsl(172, 90%, 68%)',
  'hsl(160, 88%, 67%)',
  'hsl(148, 86%, 66%)',
  'hsl(136, 84%, 65%)',
  'hsl(38, 92%, 64%)',
  'hsl(20, 90%, 64%)',
  'hsl(352, 86%, 66%)',
] as const

export function onlineSpectrumColor(tier: number): string {
  const i = Math.min(Math.max(tier, 0), ONLINE_SPECTRUM.length - 1)
  return ONLINE_SPECTRUM[i]!
}

/** 「线上服务」与「线下到场」同为 root 下一级分叉，视觉上用同一锚点色（子级仍各走各枝色板） */
const TAXONOMY_ROOT_BRANCH_PEER_COLOR = 'hsl(220, 90%, 69%)'

/** 任意分类节点：在线上或线下子树内则返回对应层级色 */
export function taxonomySpectrumColorForNodeId(
  taxonId: string,
): string | undefined {
  if (taxonId === 'online' || taxonId === 'offline') {
    return TAXONOMY_ROOT_BRANCH_PEER_COLOR
  }
  const off = offlineTaxonomyTier(taxonId)
  if (off !== null) return offlineSpectrumColor(off)
  const on = onlineTaxonomyTier(taxonId)
  if (on !== null) return onlineSpectrumColor(on)
  return undefined
}
