import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'

export type TipType = 'tip' | 'warning' | 'danger' | 'info'

export interface FaqStep {
  title: string
  content: string
}

export interface FaqTip {
  type: TipType
  content: string
}

export interface FaqRelatedLink {
  text: string
  faqId: string
}

export interface FaqEntry {
  id: string
  q: string
  intro: string
  steps?: FaqStep[]
  tips?: FaqTip[]
  relatedLinks?: FaqRelatedLink[]
  category: string
  keywords: string[]
}

export const FAQ_CATEGORIES = [
  {
    id: 'demand',
    title: '发布与管理需求',
    icon: STITCH_PAGE_ICONS['demand-create'],
    desc: '需求发布、审核、管理',
  },
  {
    id: 'discover',
    title: '发现与匹配',
    icon: STITCH_PAGE_ICONS.discover,
    desc: '星空发现页、AI 匹配与标签筛选',
  },
  {
    id: 'order',
    title: '订单与支付',
    icon: 'shopping_bag',
    desc: '担保交易与支付流程',
  },
  { id: 'cert', title: '认证与信用', icon: 'workspace_premium', desc: '实名认证与信用体系' },
  {
    id: 'social',
    title: '沟通与社区',
    icon: STITCH_PAGE_ICONS.messages,
    desc: '消息、圈子与通知',
  },
  {
    id: 'feature',
    title: '平台特色功能',
    icon: STITCH_PAGE_ICONS['card-pool'],
    desc: '卡池、市场分析、管理后台、福利中心、AI 助手等',
  },
  {
    id: 'settings',
    title: '个人与偏好',
    icon: STITCH_PAGE_ICONS.settings,
    desc: '资料编辑、主题设置、推送屏蔽与开源许可',
  },
] as const

const FAQ: FaqEntry[] = [
  // ========== 发布与管理需求 ==========
  {
    id: 'how-to-publish',
    q: '如何发布需求？',
    intro:
      '发布需求是九木平台的核心功能。您可以在平台上发布各类服务需求，系统会用 AI 辅助您完成分类和填写。',
    steps: [
      {
        title: '进入发布页',
        content: '点击左侧导航栏的「发布」按钮，进入需求发布页面。',
      },
      {
        title: '填写标题',
        content: '输入需求标题，2-100 字。简洁明了地描述您需要什么服务。',
      },
      {
        title: '填写描述',
        content:
          '详细描述需求内容，2-2000 字。越详细越容易匹配到合适的服务方。',
      },
      {
        title: '设置预算与期望效果',
        content:
          '填写最低报价（1 元起）与期望达到的效果说明。效果描述是验收依据：服务未达标可拒付，需保留沟通与交付证据。',
      },
      {
        title: '确认标签与推送',
        content:
          '系统会 AI 推荐标签，您可确认或修改。带标签的需求可推送给对应认证服务者；服务者也可开启「主动接受」接收匹配推送。',
      },
      {
        title: '检查匹配路径',
        content:
          '发布前在工作区可预览「匹配路径」——系统根据分类、标签、预算等自动派生。您可增删改路径以控制需求如何被检索命中；胡乱修改可能导致无人问津。',
      },
      {
        title: '提交发布',
        content:
          '确认信息无误后点击「发布」。需求进入 15 分钟公开窗口，期间他人可申请；窗口结束后无人接单会冻结，需处理冻结需求后才能再发。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '在帮助页搜索框输入"我想发布王者荣耀代打"，系统可直接跳转到发布页并预填分类信息。',
      },
      {
        type: 'warning',
        content:
          '存在冻结中的需求时无法发布新需求，请先在「我的需求」中删除或处理冻结项。',
      },
      {
        type: 'info',
        content:
          '同时发布多条需求需缴纳押金（约为各条最低报价的 1%）；单条完成或删除后按规则退还。详见结算与押金说明。',
      },
      {
        type: 'info',
        content:
          '圈内发布：进入圈子详情页后点击「发布需求」，该需求将只在该圈内展示，适合定向寻找服务方。',
      },
    ],
    relatedLinks: [
      { text: '什么是路径检索？', faqId: 'what-is-path-search' },
      { text: '什么是两段式接单？', faqId: 'two-phase-ordering' },
      { text: '15 分钟窗口与沟通资格是什么？', faqId: 'emergency-window' },
      { text: '如何在圈内发布需求？', faqId: 'circle-demand' },
    ],
    category: 'demand',
    keywords: ['发布', '发需求', '怎么发布', '创建需求', '发单', '新建需求', '匹配路径'],
  },
  {
    id: 'what-is-path-search',
    q: '什么是路径检索？',
    intro:
      '路径检索是九木的规则化需求发现方式：将需求表示为一组可读标签（如分类、标签、预算档），检索时按命中路径数量排序，无 AI 黑箱，结果可解释。',
    steps: [
      {
        title: '进入路径检索页',
        content: '在浏览器访问「路径检索」页面（/path-search），或从帮助页相关链接进入。',
      },
      {
        title: '输入并搜索',
        content:
          '在搜索框输入需求关键词（如「家政」「技术开发 线上」），系统会自动解析为池内真实路径。左侧展示检索依据 chips，可手动增删路径。',
      },
      {
        title: '筛选与排序',
        content:
          '结果区可设置命中要求（任意/多数/全部/至少 N 条）、意图要求（含意图/意图全中，需有检索词）、以及排序方式（交叉命中、意图优先、命中率、信用、最新、价格等）。筛选与排序会写入 URL，可刷新复现。',
      },
      {
        title: '查看命中结果',
        content:
          '默认按交叉命中数排序；可切换为意图优先或命中率等。卡片显示匹配路径与命中/意图环形指标，点击可进入需求详情。',
      },
      {
        title: '发布者编辑路径',
        content:
          '发布需求时工作区可预览并编辑匹配路径；发布后可在需求详情页（仅发布者可见）继续调整路径。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '路径检索与首页 AI 搜索、标签筛选并行存在，互不影响。适合需要精确、可复现匹配规则的场景。',
      },
      {
        type: 'warning',
        content: '关键词路径（kw:）仅支持用户手动添加，系统不会从标题或描述自动抽词。',
      },
    ],
    relatedLinks: [
      { text: '如何发布需求？', faqId: 'how-to-publish' },
      { text: '如何找到适合自己的需求？', faqId: 'how-to-find' },
    ],
    category: 'discover',
    keywords: ['路径检索', '路径搜索', 'path-search', '匹配路径', '命中', '标签检索'],
  },
  {
    id: 'how-to-review',
    q: '发布需求后多久能审核通过？',
    intro:
      '九木平台对发布的需求进行自动审核，确保内容合规。大多数需求可以在极短时间内通过审核。',
    steps: [
      {
        title: '自动审核',
        content:
          '系统会对标题和描述进行敏感词检测和内容合规校验，通常在几秒钟到几分钟内完成。',
      },
      {
        title: '人工复核',
        content:
          '如遇到敏感词标记或系统无法自动判断的情况，会进入人工复核队列，通常需要 1-2 个工作日。',
      },
      {
        title: '查看审核结果',
        content:
          '审核结果会通过消息通知发送给您。也可以进入「我的需求」页面查看需求状态：审核中表示正在处理。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '标题和描述中避免使用敏感词汇可加快自动审核速度。描述越规范、越详细，越容易直接通过。',
      },
      {
        type: 'warning',
        content: '已审核通过的需求如果后续被举报违规，仍可能被冻结或下架。',
      },
    ],
    relatedLinks: [
      { text: '如何发布需求？', faqId: 'how-to-publish' },
      { text: '如何管理我发布的需求？', faqId: 'my-demands-manage' },
    ],
    category: 'demand',
    keywords: ['审核', '审核时间', '发布审核', '通过', '审核中', '等待'],
  },
  {
    id: 'how-to-cancel',
    q: '如何取消或下架已发布的需求？',
    intro: '如果需求不再需要或者想更换内容，您可以随时取消或下架已发布的需求。',
    steps: [
      {
        title: '进入需求管理',
        content:
          '点击左侧导航栏「我的」→ 选择「我的需求」，进入已发布需求列表。',
      },
      {
        title: '找到目标需求',
        content: '在列表中找到需要下架的需求，点击进入需求详情页。',
      },
      {
        title: '执行下架',
        content:
          '在需求详情页底部找到「下架需求」按钮，点击确认。已有人申请的需求建议先与申请人沟通说明情况。',
      },
    ],
    tips: [
      {
        type: 'warning',
        content:
          '下架后需求不可恢复。如果只是想暂停展示，可以考虑修改需求内容而非直接下架。',
      },
      { type: 'tip', content: '已过期的需求会自动下架，无需手动操作。' },
    ],
    relatedLinks: [
      { text: '如何管理我发布的需求？', faqId: 'my-demands-manage' },
    ],
    category: 'demand',
    keywords: ['取消', '下架', '删除需求', '取消发布', '停止', '撤回'],
  },
  {
    id: 'my-demands-manage',
    q: '如何管理我发布的所有需求？',
    intro: '我的需求页面集中展示您发布的所有需求，支持按状态筛选和批量管理。',
    steps: [
      {
        title: '进入管理页',
        content: '点击左侧导航栏「我的」→ 选择「我的需求」。',
      },
      {
        title: '查看需求列表',
        content:
          '列表展示所有需求，包含状态标签：进行中、已冻结、已完成等。点击需求可查看申请人并正式接单。',
      },
      {
        title: '查看申请',
        content:
          '点击任一需求进入详情页，可以查看所有申请人的列表，选择接受或拒绝。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '需求状态流转：发布 → 15 分钟公开窗口 →（有人请求接单）→ 您选择正式接单 → 创建订单 → 点数支付 → 服务中 → 验收/结算 → 评价。',
      },
    ],
    relatedLinks: [
      { text: '如何取消已发布的需求？', faqId: 'how-to-cancel' },
      { text: '订单的完整生命周期是怎样的？', faqId: 'order-lifecycle' },
    ],
    category: 'demand',
    keywords: [
      '我的需求',
      '已发布',
      '查看发布',
      '管理需求',
      '我发的',
      '需求列表',
    ],
  },

  // ========== 发现与匹配 ==========
  {
    id: 'how-to-find',
    q: '如何找到适合自己的需求？',
    intro:
      '发现页（首页）是九木的核心功能入口，采用沉浸式星空背景，提供遇见（AI 搜索）、寻觅（标签筛选）、探索（分类浏览）三种模式帮助您快速定位需求。',
    steps: [
      {
        title: '进入发现页',
        content: '点击左侧导航栏的「发现」图标，进入星空主题的发现页面。',
      },
      {
        title: '关键词搜索（遇见）',
        content:
          '在首屏"遇见"区域的搜索框中输入关键词（如"王者荣耀 陪玩"），AI 会自动分析意图并匹配需求。搜索结果以半透明玻璃卡片形式展现，直接滑动浏览。',
      },
      {
        title: '标签筛选（寻觅）',
        content:
          '向下滚动到"寻觅"区域，在标签输入框中输入关键词后按回车添加标签。系统会根据标签精准筛选需求列表。支持多标签组合筛选。',
      },
      {
        title: '使用卡池',
        content:
          '进入「卡池」页面，将服务分类卡片加入手牌区，下方桌面展示匹配需求列表。点击分类叶子节点可触发开卡动画预览该分类下的需求卡片。适合需要同时监控多个分类的用户。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '在帮助页搜索框输入"找王者荣耀代打"，系统可直接跳转到需求搜索页并自动填入关键词。',
      },
      {
        type: 'info',
        content:
          '需求卡片采用高透明玻璃设计，可以隐约看到背后的星空背景，增强沉浸感。',
      },
    ],
    relatedLinks: [
      { text: '如何使用标签筛选？', faqId: 'how-to-tags' },
      { text: '什么是卡池？如何使用？', faqId: 'what-is-cardpool' },
      { text: '如何申请接单？', faqId: 'how-to-apply' },
    ],
    category: 'discover',
    keywords: [
      '找需求',
      '接单',
      '匹配',
      '发现',
      '搜索需求',
      '接活',
      '浏览',
      '寻觅',
      '遇见',
      '星空',
    ],
  },
  {
    id: 'how-to-apply',
    q: '如何申请接单？',
    intro: '找到合适的需求后，您可以通过申请接单功能向需求方表达承接意愿。',
    steps: [
      {
        title: '进入需求详情',
        content: '在发现页或卡池桌面区点击感兴趣的需求卡片，进入需求详情页。',
      },
      {
        title: '查看需求细节',
        content: '仔细阅读需求描述、预算、截止时间等信息，确认自己能胜任。',
      },
      {
        title: '发送请求接单',
        content:
          '在需求详情页点击「申请接单」并填写说明。这是在 15 分钟公开窗口内的「请求接单」阶段，会消耗 1 次抢单额度。',
      },
      {
        title: '沟通窗口',
        content:
          '双方各发送一条消息后开启 5 分钟沟通计时，用于说明能力与报价。需求被正式接单或完成后，该沟通资格会关闭。',
      },
      {
        title: '等待正式接单',
        content:
          '发布者从申请人中选定一人「正式接单」后，系统创建订单并进入支付。未被选中不会扣信用分。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content: '申请时附上一段自我介绍和经验说明，能显著提高被接受的概率。',
      },
      {
        type: 'warning',
        content: '每个用户有抢单信用额度限制，频繁申请后不履约将影响信用分。',
      },
    ],
    relatedLinks: [
      { text: '什么是两段式接单？', faqId: 'two-phase-ordering' },
      { text: '15 分钟窗口与沟通资格是什么？', faqId: 'emergency-window' },
      { text: '信用分和抢单额度是什么？', faqId: 'credit-system' },
    ],
    category: 'discover',
    keywords: ['申请', '接单', '抢单', '承接', '报名'],
  },
  {
    id: 'how-to-tags',
    q: '如何使用标签筛选需求？',
    intro:
      '标签筛选是发现页"寻觅"区域的核心功能，通过输入关键词标签精准筛选需求列表。',
    steps: [
      {
        title: '进入寻觅区域',
        content:
          '在发现页向下滚动，进入"寻觅 — 探索创意的边界，发现无限可能"区域。',
      },
      {
        title: '添加标签',
        content:
          '在输入框中输入关键词（如"设计"、"编程"、"王者荣耀"），按 Enter 键添加为标签。标签会以胶囊形式显示在输入框下方。',
      },
      {
        title: '多标签筛选',
        content:
          '可以添加多个标签，系统会按最后一个标签进行筛选匹配。点击标签右侧的 × 可删除单个标签。',
      },
      {
        title: '查看结果',
        content:
          '添加标签后，下方的需求列表会实时更新，展示与该标签匹配的需求。每页显示 12 条，支持翻页浏览。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '标签支持模糊匹配，输入"王者"即可匹配"王者荣耀"相关需求。标签数量上限为 10 个。',
      },
      {
        type: 'info',
        content:
          'Ask AI 搜索也会自动生成标签并同步到寻觅区域，两者可以协同使用。',
      },
    ],
    relatedLinks: [{ text: '如何找到适合自己的需求？', faqId: 'how-to-find' }],
    category: 'discover',
    keywords: ['标签', '筛选', '寻觅', '关键词', 'tag', '分类', '精确查找'],
  },
  // ========== 订单与支付 ==========
  {
    id: 'order-lifecycle',
    q: '订单的完整生命周期是怎样的？',
    intro:
      '九木采用担保交易模式，订单从创建到完成有明确的状态流转，保障双方权益。',
    steps: [
      {
        title: '正式接单并创建订单',
        content:
          '发布者从申请人中选定服务方后，系统创建订单。需求方需在支付页用点数完成预扣（含 5% 平台服务费）。',
      },
      {
        title: '服务进行中',
        content: '支付成功后订单进入进行中。双方可通过消息沟通进度，需求详情页可跳转订单与聊天。',
      },
      {
        title: '服务完成与验收',
        content:
          '服务方标记完成后进入待验收。发布者确认达标则结算打款；未达「期望效果」可拒付并提交证据，进入纠纷/投诉流程。',
      },
      {
        title: '结算与评价',
        content:
          '验收通过后平台自动结算（无需手算金额），可在订单详情、需求结算面板与「交易记录」查看分项明细，双方可互评。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '开发期使用「点数」模拟货币（1 点 = 1 元），支付页与订单详情会展示服务费与到账明细。',
      },
      {
        type: 'danger',
        content: '订单状态变为纠纷中时，双方交易暂停，平台客服介入处理。',
      },
    ],
    relatedLinks: [
      { text: '担保交易的支付流程是怎样的？', faqId: 'how-payment-works' },
      { text: '订单出现纠纷怎么办？', faqId: 'order-dispute' },
    ],
    category: 'order',
    keywords: ['订单', '生命周期', '状态', '流程', '订单流程'],
  },
  {
    id: 'how-payment-works',
    q: '担保交易的支付流程是怎样的？',
    intro:
      '九木采用担保交易：需求方先用点数预付至平台托管，服务验收通过后自动结算给服务方。开发期 1 点 = 1 元，成交另收 5% 平台服务费。',
    steps: [
      {
        title: '进入支付',
        content:
          '正式接单后，需求方在订单详情或需求详情页点击「去支付」，进入点数支付页。',
      },
      {
        title: '确认扣款明细',
        content:
          '支付页展示成交价、5% 平台服务费与应付总额。可展开查看 pay-breakdown 分项，无需自行计算。',
      },
      {
        title: '完成点数支付',
        content: '确认后从账户点数余额扣款，订单进入进行中，服务方可开始履约。',
      },
      {
        title: '验收后结算',
        content:
          '验收通过后平台将托管金额结算给服务方（扣除已明示的服务费）。取消订单时按规则退还服务费并恢复需求状态。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '平台担保机制确保：服务方只要完成约定服务就能收到款项；需求方不满意服务可申请退款或纠纷介入。',
      },
      {
        type: 'warning',
        content: '不要通过平台以外的渠道私下交易，私下交易不受平台保护。',
      },
    ],
    relatedLinks: [
      { text: '订单的完整生命周期是怎样的？', faqId: 'order-lifecycle' },
      { text: '订单出现纠纷怎么办？', faqId: 'order-dispute' },
    ],
    category: 'order',
    keywords: ['支付', '付款', '交易', '担保', '打款', '退款', '托管'],
  },
  {
    id: 'order-dispute',
    q: '订单出现纠纷怎么办？',
    intro:
      '如果在交易过程中出现问题（服务未按要求完成、沟通不畅等），可以通过纠纷处理机制寻求平台帮助。',
    steps: [
      {
        title: '优先协商',
        content: '建议首先通过消息与对方友好沟通，大多数问题可以通过协商解决。',
      },
      {
        title: '申请纠纷介入',
        content:
          '在订单详情页点击「申请纠纷介入」，描述问题并提交相关证据（聊天记录、截图等）。',
      },
      {
        title: '平台调查',
        content:
          '平台客服会查看双方提交的证据，了解事情经过。订单状态变为纠纷中，交易暂停。',
      },
      {
        title: '裁决处理',
        content:
          '平台根据证据做出裁决：支持退款、继续履约或其他处理方案。裁决后订单恢复流转。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content: '保留好沟通记录和服务交付证据，这对纠纷处理至关重要。',
      },
      {
        type: 'warning',
        content: '虚假纠纷申请会影响信用分。请仅在确实出现问题时使用此功能。',
      },
    ],
    relatedLinks: [
      { text: '担保交易的支付流程是怎样的？', faqId: 'how-payment-works' },
      { text: '信用分和抢单额度是什么？', faqId: 'credit-system' },
    ],
    category: 'order',
    keywords: ['纠纷', '争议', '投诉', '维权', '退款', '客服'],
  },

  // ========== 认证与信用 ==========
  {
    id: 'how-to-cert',
    q: '如何进行实名/技能认证？',
    intro:
      '认证是提升您在平台可信度的关键步骤。认证等级越高，在抢单和订单匹配中的权重越大。',
    steps: [
      {
        title: '进入认证中心',
        content: '点击左侧导航栏「我的」→ 进入个人主页 → 在右侧导航栏点击「认证」。',
      },
      {
        title: '选择认证类型',
        content:
          '根据您的需求选择实名认证或技能认证。实名认证为基础认证，技能认证需要提供相关资质证明。',
      },
      {
        title: '提交认证材料',
        content:
          '按照页面指引上传身份证件、技能证书、作品集等材料。确保图片清晰可辨。',
      },
      {
        title: '等待审核',
        content:
          '提交后等待平台审核，通常需要 1-3 个工作日。审核结果会通过消息通知。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '建议先完成基础实名认证，再逐步申请更高级别的技能认证。每次升级认证都会提升信用权重。',
      },
    ],
    relatedLinks: [
      { text: '认证等级有什么作用？', faqId: 'cert-benefits' },
      { text: '信用分和抢单额度是什么？', faqId: 'credit-system' },
    ],
    category: 'cert',
    keywords: ['认证', '实名', '资质', '技能认证', '认证等级', '上传证件'],
  },
  {
    id: 'cert-benefits',
    q: '认证等级有什么作用？',
    intro:
      '九木的认证体系分为五个等级，等级越高，您在平台上的可信度和权益越多。',
    steps: [
      {
        title: 'NONE（未认证）',
        content: '初始状态。可以浏览需求和发布需求，但无法申请抢单。',
      },
      {
        title: 'BASIC（基础认证）',
        content: '完成实名认证。获得基础的抢单权限，信用分初始值 60。',
      },
      {
        title: 'INTERMEDIATE（中级认证）',
        content: '通过基础技能审核。抢单信用权重提升，可同时申请更多订单。',
      },
      {
        title: 'ADVANCED（高级认证）',
        content: '通过高级技能审核。在搜索结果和需求方推荐中优先展示。',
      },
      {
        title: 'MASTER（大师认证）',
        content:
          '平台最高认证等级。获得专属标识和最高的信用权重，适合资深服务方。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '认证等级不仅影响抢单权限，还会影响在需求方眼中的可信度。高等级认证更容易获得订单。',
      },
    ],
    relatedLinks: [{ text: '如何进行实名/技能认证？', faqId: 'how-to-cert' }],
    category: 'cert',
    keywords: [
      '认证等级',
      '等级',
      'NONE',
      'BASIC',
      'INTERMEDIATE',
      'ADVANCED',
      'MASTER',
      '权重',
    ],
  },

  // ========== 沟通与社区 ==========
  {
    id: 'how-to-contact',
    q: '如何与需求方/服务方联系？',
    intro: '九木内置实时聊天系统，支持文字、图片、语音等多种沟通方式。',
    steps: [
      {
        title: '发起对话',
        content:
          '在需求详情页点击「联系对方」或「申请接单」，系统会自动创建一条私信对话。',
      },
      {
        title: '消息列表',
        content: '点击左侧导航栏的「消息」图标，可以查看所有对话记录。',
      },
      {
        title: '发送消息',
        content:
          '在聊天窗口中输入文字发送消息。支持发送图片、文件（点击附件图标）和语音消息（长按录音按钮）。',
      },
      {
        title: '群聊功能',
        content:
          '多人协作的需求会创建群聊（合并会话），在消息列表中会单独展示。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content: '重要沟通内容建议在平台内完成，以便在出现纠纷时作为证据。',
      },
    ],
    relatedLinks: [
      { text: '收不到消息通知怎么办？', faqId: 'notifications-troubleshoot' },
    ],
    category: 'social',
    keywords: ['联系', '消息', '私信', '聊天', '沟通', '对话', '语音'],
  },
  {
    id: 'how-to-circles',
    q: '如何加入或创建圈子？',
    intro: '圈子是九木的兴趣社区功能，您可以在圈子内交流、发布圈内专属需求。',
    steps: [
      {
        title: '浏览圈子',
        content: '点击左侧导航栏的「圈子」图标进入圈子广场，浏览所有公开圈子。',
      },
      {
        title: '加入圈子',
        content:
          '在公开圈子卡片上点击「加入」按钮即可加入。私密圈子需要邀请才能加入。',
      },
      {
        title: '创建圈子',
        content:
          '在圈子页面右上角点击「创建圈子」按钮，填写圈子名称、简介、封面等信息。',
      },
      {
        title: '设置圈子类型',
        content:
          '选择公开圈（任何人可加入）或私密圈（仅邀请加入）。创建后不可更改类型。',
      },
      {
        title: '圈内互动',
        content: '进入圈子详情页，可以发布圈内需求、查看成员列表、参与讨论。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '圈内发布的需求仅在圈子内部可见，适合定向寻找特定领域的服务方。',
      },
      {
        type: 'warning',
        content: '圈子状态为 DEFUNCT（已失效）时，将无法加入或发布新需求。',
      },
    ],
    relatedLinks: [{ text: '如何在圈内发布需求？', faqId: 'circle-demand' }],
    category: 'social',
    keywords: [
      '圈子',
      '加入圈子',
      '创建圈子',
      '社区',
      '群组',
      '公开圈',
      '私密圈',
    ],
  },
  {
    id: 'circle-demand',
    q: '如何在圈内发布需求？',
    intro: '圈内需求只在该圈子内展示，适合寻找特定社区内的服务方。',
    steps: [
      {
        title: '进入目标圈子',
        content: '在圈子列表中找到目标圈子，点击进入圈子详情页。',
      },
      {
        title: '发布需求',
        content: '在圈子详情页点击「发布需求」按钮，跳转到发布页面。',
      },
      {
        title: '填写并提交',
        content:
          '按常规流程填写需求信息并提交。该需求将标记为圈内需求，仅在当前圈子中展示。',
      },
      {
        title: '发布后跳转',
        content:
          '发布成功后自动跳回圈子详情页，可在圈内需求列表中看到新发布的需求。',
      },
    ],
    tips: [{ type: 'tip', content: '圈内发布的需求仍然遵循平台的审核流程。' }],
    relatedLinks: [
      { text: '如何加入或创建圈子？', faqId: 'how-to-circles' },
      { text: '如何发布需求？', faqId: 'how-to-publish' },
    ],
    category: 'social',
    keywords: ['圈内发布', '圈子需求', '圈内', '社区发布'],
  },
  {
    id: 'notifications-troubleshoot',
    q: '收不到消息通知怎么办？',
    intro: '如果收不到消息通知，通常可以通过以下步骤排查和解决。',
    steps: [
      {
        title: '检查浏览器通知权限',
        content:
          '打开浏览器设置，确认九木网站的通知权限已开启。在 Windows 上还要检查系统通知设置。',
      },
      {
        title: '检查应用内设置',
        content: '进入「设置」页面，确认消息提醒开关已打开。',
      },
      {
        title: '检查网络连接',
        content:
          '确保网络连接正常。Socket.IO 连接断开时，系统会自动降到 10 秒轮询模式。',
      },
      {
        title: '刷新页面',
        content: '尝试刷新页面或重新登录，重建消息推送连接。',
      },
      {
        title: '清除缓存',
        content: '如果上述步骤无效，尝试清除浏览器缓存后重新登录。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '在 Electron 桌面应用中，通知权限跟随系统设置。请检查 Windows 通知中心中九木应用的通知开关。',
      },
    ],
    relatedLinks: [
      { text: '如何与需求方/服务方联系？', faqId: 'how-to-contact' },
    ],
    category: 'social',
    keywords: ['通知', '消息通知', '收不到', '提醒', '推送', '不提醒'],
  },

  // ========== 平台特色功能 ==========
  {
    id: 'what-is-cardpool',
    q: '什么是卡池？如何使用？',
    intro:
      '卡池是九木独有的服务分类浏览功能，以卡牌形式直观展示服务分类层级。它让您像玩卡牌游戏一样管理您关注的分类。',
    steps: [
      {
        title: '进入卡池',
        content: '点击左侧导航栏的「卡池」图标进入卡池主页。',
      },
      {
        title: '浏览分类',
        content:
          '页面展示服务分类的黑卡（分类卡片），每张卡片代表一个服务类别。点击叶子节点（最细分类）会触发开卡动画：卡面以需求封面图为底，从散落炸开到圆形排列、再过渡到底弧排列。点击卡面可翻面查看价格并跳转详情页。',
      },
      {
        title: '加入手牌',
        content: '将感兴趣的分类卡片添加到手牌区，表示您持续关注该分类。',
      },
      {
        title: '桌面筛选',
        content:
          '手牌区开启后，下方桌面区会实时展示手牌中所有分类的匹配需求列表。',
      },
      {
        title: '弃牌与恢复',
        content: '不需要的分类可以从手牌移到弃牌区，也可从弃牌区恢复。',
      },
      {
        title: '资源管理器',
        content: '通过卡池资源管理器可以查看全局焦点分类树，适合深度分类浏览。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content: '手牌状态会跨页面保持（本地存储），下次访问卡池时自动恢复。',
      },
      {
        type: 'info',
        content: '桌面列表的行数也可以自定义（右键桌面区域），方便高效浏览。',
      },
    ],
    relatedLinks: [{ text: '如何找到适合自己的需求？', faqId: 'how-to-find' }],
    category: 'feature',
    keywords: [
      '卡池',
      '分类',
      '手牌',
      '黑卡',
      '卡包',
      '筛选需求',
      '桌面',
      '弃牌',
    ],
  },
  {
    id: 'how-to-search-users',
    q: '如何使用搜索找人？',
    intro: '找人功能帮助您搜索平台上的其他用户，查看他们的个人主页和认证信息。',
    steps: [
      {
        title: '进入找人页面',
        content: '点击左侧导航栏的「找人」图标进入搜索页面。',
      },
      {
        title: '输入关键词',
        content: '输入用户昵称或相关关键词进行搜索。支持模糊匹配。',
      },
      {
        title: '查看结果',
        content: '搜索结果展示匹配的用户列表，包含头像、昵称和认证等级。',
      },
      {
        title: '访问主页',
        content:
          '点击任一用户进入其个人主页，查看详细资料、认证状态和过往订单记录。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content: '在帮助页搜索框输入"找师傅"，可以直接跳转到找人页面。',
      },
    ],
    relatedLinks: [],
    category: 'feature',
    keywords: ['找人', '用户', '搜索用户', '个人主页', '找师傅', '搜索人'],
  },
  {
    id: 'credit-system',
    q: '信用分和抢单额度是什么？',
    intro:
      '信用分和抢单额度是九木平台维护交易秩序的机制，确保用户认真对待每一次交易。',
    steps: [
      {
        title: '信用分',
        content:
          '初始信用分 60。完成订单并获好评会提升信用分；违约、纠纷败诉会降低信用分。信用分影响您的抢单权重和搜索排名。',
      },
      {
        title: '抢单额度',
        content:
          '每位用户有基础抢单次数限制。认证等级越高，抢单额度越多。每申请一次抢单消耗 1 个额度。',
      },
      {
        title: '额度恢复',
        content: '抢单额度会随时间自动恢复。完成订单也会返还一部分额度。',
      },
    ],
    tips: [
      {
        type: 'warning',
        content:
          '频繁申请后不履约或取消订单会导致信用分快速下降，严重的可能被限制使用平台功能。',
      },
      {
        type: 'tip',
        content: '保持良好履约记录、升级认证等级是提高信用分和额度的最佳方式。',
      },
    ],
    relatedLinks: [
      { text: '认证等级有什么作用？', faqId: 'cert-benefits' },
      { text: '如何进行实名/技能认证？', faqId: 'how-to-cert' },
    ],
    category: 'feature',
    keywords: ['信用分', '抢单额度', '额度', '积分', '信用', '违约'],
  },

  // ========== 个人与偏好 ==========
  {
    id: 'edit-profile',
    q: '如何修改个人资料？',
    intro:
      '个人资料是展示您身份和能力的重要窗口。完善的个人资料能提高被需求方选择的概率。',
    steps: [
      {
        title: '进入个人主页',
        content: '点击左侧导航栏的「我的」图标进入个人主页。',
      },
      {
        title: '进入编辑模式',
        content:
          '点击页面右上角的编辑按钮，或直接点击头像/昵称区域进入编辑状态。',
      },
      {
        title: '修改信息',
        content:
          '可以修改：头像、封面图、昵称、个人简介（Bio）。简介建议包括您擅长的领域和服务范围。',
      },
      {
        title: '保存',
        content:
          '修改完成后点击「保存」按钮。头像和封面上传后会自动裁剪和优化。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '头像建议使用清晰正面照或专业形象照。封面可以使用平台预设风格或自定义上传。',
      },
    ],
    relatedLinks: [{ text: '如何进行实名/技能认证？', faqId: 'how-to-cert' }],
    category: 'settings',
    keywords: ['个人资料', '修改资料', '头像', '昵称', '简介', '编辑', '封面'],
  },
  {
    id: 'settings-page-guide',
    q: '设置页有哪些功能？',
    intro:
      '设置页采用左侧导航 + 右侧内容的双栏布局（PRO Settings），集中管理账户、外观、通知偏好与法律信息。',
    steps: [
      {
        title: '进入设置',
        content: '点击左侧导航栏「设置」图标，或从个人主页进入「设置」。',
      },
      {
        title: '账户',
        content:
          '查看手机号/邮箱、认证等级，快捷进入个人主页、认证中心，或退出登录。',
      },
      {
        title: '外观',
        content: '切换 OLED 深色 / 浅色显示模式，并选择深色环境下的主题色预设。',
      },
      {
        title: '推送屏蔽',
        content:
          '配置屏蔽关键词与屏蔽标签，保存后匹配这些内容的推送将不再通知您。详细说明见「推送设置」页。',
      },
      {
        title: '服务标签与法律',
        content:
          '管理个人服务标签的上线/下线状态；底部可查看隐私政策、服务条款与版本号。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content: '标签、通知等子项也可通过侧栏直接进入：「我的标签」→ `/my-tags-manage`，「推送设置」→ `/push-settings`。',
      },
    ],
    relatedLinks: [
      { text: '如何切换深色/浅色主题？', faqId: 'switch-theme' },
      { text: '如何配置推送屏蔽？', faqId: 'push-settings-guide' },
    ],
    category: 'settings',
    keywords: ['设置', '账户', '外观', 'PRO', '偏好', '配置'],
  },
  {
    id: 'push-settings-guide',
    q: '如何配置推送屏蔽？',
    intro:
      '推送设置用于过滤不想看到的通知：可按关键词或标签屏蔽，减少无关推送打扰。',
    steps: [
      {
        title: '进入推送设置',
        content: '设置页侧栏选择「通知」，或直接访问 `/push-settings`。',
      },
      {
        title: '添加屏蔽关键词',
        content: '输入关键词后点击「添加」。匹配该词的需求或消息推送将被过滤。',
      },
      {
        title: '选择屏蔽标签',
        content: '在标签选择器中添加不想接收推送的标签，支持多选。',
      },
      {
        title: '保存',
        content: '点击「保存屏蔽设置」使配置生效。可随时返回修改。',
      },
    ],
    tips: [
      {
        type: 'warning',
        content: '屏蔽仅影响推送通知，不会隐藏平台上已公开发布的需求本身。',
      },
      {
        type: 'info',
        content: '若收不到任何通知，请同时检查浏览器/系统通知权限与应用内提醒开关。',
      },
      {
        type: 'info',
        content:
          '当前仍是「默认接收 + 屏蔽」过渡模型。系统不会把默认开启解释为您对未来所有通知类别的永久同意；后续将改为按类别正向订阅（交易/资金等必要通知除外）。',
      },
      {
        type: 'tip',
        content: '短视频信息流已下线，不会再向您推送或展示短视频 Feed。',
      },
    ],
    relatedLinks: [
      { text: '收不到消息通知怎么办？', faqId: 'notifications-troubleshoot' },
      { text: '设置页有哪些功能？', faqId: 'settings-page-guide' },
    ],
    category: 'settings',
    keywords: ['推送', '屏蔽', '通知', '关键词', '标签过滤', '免打扰'],
  },
  {
    id: 'switch-theme',
    q: '如何切换深色/浅色主题？',
    intro:
      '九木支持深色（OLED 纯黑）与浅色两种显示模式，并可在深色模式下选择强调色预设。设置会保存在本地，刷新后仍然生效。',
    steps: [
      {
        title: '导航栏快捷切换',
        content:
          '点击左侧导航栏底部的主题按钮（月亮/太阳图标），可在深色与浅色模式之间一键切换。',
      },
      {
        title: '设置页精细调节',
        content:
          '进入「设置」→「外观」。在「显示模式」中选择 OLED（深色）或浅色；在「主题色」中选择暗色环境下的强调色预设（如薄雾晨光）。',
      },
      {
        title: '内部页面同步',
        content:
          '设置、市场分析、帮助等内部工具页会跟随全局深浅色切换，文字与边框颜色自动适配当前模式。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '深色模式采用纯黑底 + 灰度层次，强调色默认为 #3388FF 蓝色，适合长时间桌面使用。',
      },
      {
        type: 'tip',
        content: '浅色模式适合强光环境；若在设置页看不清文字，请确认已切换到「浅色」并刷新页面。',
      },
    ],
    relatedLinks: [{ text: '设置页有哪些功能？', faqId: 'settings-page-guide' }],
    category: 'settings',
    keywords: ['主题', '深色', '浅色', '暗黑', '白天', '切换主题', '夜间模式', 'OLED'],
  },

  // ========== AI 2.5 新增功能 ==========
  {
    id: 'what-is-discover-page',
    q: '发现页有哪些功能？',
    intro:
      '发现页是九木的沉浸式需求探索入口，采用星空主题背景，集成了搜索、标签筛选、卡片交互等多种功能。',
    steps: [
      {
        title: '遇见 — AI 智能搜索',
        content:
          '发现页首屏"遇见"区域：在搜索框中输入关键词（如"王者荣耀 陪玩"），AI 会分析意图并匹配需求。结果以高透玻璃卡片形式展现，可直接滑动浏览、点击查看详情。',
      },
      {
        title: '寻觅 — 标签精准筛选',
        content:
          '向下滚动进入"寻觅"区域：输入关键词后按回车添加标签，系统按标签精准筛选需求列表。支持多标签组合，每页 12 条。',
      },
      {
        title: '探索 — 分类浏览（建设中）',
        content: '按服务类别分栏浏览，每个类别独立滚动，适合广泛浏览。',
      },
      {
        title: '卡片交互',
        content:
          '点击任意需求卡片进入详情页，支持滑切浏览（上下滑动切换卡片）。卡片采用 3D 翻转设计，正面展示封面和标题，背面查看完整描述。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '在遇见区域使用自然语言搜索效果最好，例如"帮我找个王者荣耀陪练"比单个关键词匹配更精准。',
      },
      {
        type: 'info',
        content:
          '首次加载发现页时，AI 可能会自动分析并推荐匹配的标签，可以帮助快速定位感兴趣的需求。',
      },
    ],
    relatedLinks: [
      { text: '如何使用标签筛选？', faqId: 'how-to-tags' },
      { text: '如何申请接单？', faqId: 'how-to-apply' },
      { text: '什么是卡池？如何使用？', faqId: 'what-is-cardpool' },
    ],
    category: 'discover',
    keywords: ['发现页', '遇见', '寻觅', '星空', '搜索', '玻璃卡片', '滑切'],
  },
  {
    id: 'two-phase-ordering',
    q: '什么是两段式接单？',
    intro:
      'AI 2.5 引入两段式接单流程，将传统的"抢单"模式升级为更严谨的匹配机制，减少随意申请带来的信用损耗。',
    steps: [
      {
        title: '第一段：发送请求',
        content:
          '在需求详情页点击"申请接单"，填写接单意向说明。系统会向需求方发送您的申请，消耗 1 个抢单额度。',
      },
      {
        title: '第二段：需求方审核',
        content:
          '需求方在「我的需求」页面查看所有申请人列表，根据申请人的认证等级、过往评价和意向说明进行筛选。',
      },
      {
        title: '接受并支付',
        content:
          '接受后系统创建订单并跳转支付。需求方完成点数支付后，需求对其他人隐藏，仅双方可见进行中状态。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '两段式接单的意义：需求方可以先筛选最合适的服务方再创建订单，避免盲目抢单导致的违约和纠纷。',
      },
      {
        type: 'info',
        content: '如果需求设置了"仅认证用户可申请"，未认证用户将无法提交申请。',
      },
    ],
    relatedLinks: [
      { text: '信用分和抢单额度是什么？', faqId: 'credit-system' },
      { text: '订单的完整生命周期是怎样的？', faqId: 'order-lifecycle' },
      { text: '如何申请接单？', faqId: 'how-to-apply' },
    ],
    category: 'discover',
    keywords: ['两段式', '接单', '申请', '审核', '筛选', '接受', '拒绝'],
  },
  {
    id: 'emergency-window',
    q: '15 分钟窗口与沟通资格是什么？',
    intro:
      '每条新需求默认进入 15 分钟「紧急公开窗口」：全员可见并可请求接单。窗口结束后需求冻结隐藏，已获得沟通资格的用户仍可继续短时沟通。',
    steps: [
      {
        title: '15 分钟公开期',
        content:
          '发布后需求在发现页/卡池可见约 15 分钟。期间任意用户可「请求接单」，不消耗发布者额外操作。',
      },
      {
        title: '窗口结束与冻结',
        content:
          '倒计时结束且无人正式接单时，需求自动冻结，不再出现在公开列表。您需删除或处理冻结需求后才能发布下一条。',
      },
      {
        title: '5 分钟沟通计时',
        content:
          '在公开期内请求接单的用户，与发布者双方各发一条消息后开启 5 分钟沟通窗口，用于说明方案。双方可协商延长，至需求被正式接单或完成为止。',
      },
      {
        title: '满员隐藏',
        content:
          '申请人达到您设置的上限（默认 10 人）后，需求会从广场隐藏，拒绝部分申请人后可重新露出。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '即使公开窗口只剩几秒，只要在期内点击请求接单，您仍可获得沟通资格，无需担心来不及介绍自己。',
      },
      {
        type: 'info',
        content: '激励任务使用更长的默认展示窗口（15 天），规则见「什么是激励中心？」。',
      },
    ],
    relatedLinks: [
      { text: '什么是两段式接单？', faqId: 'two-phase-ordering' },
      { text: '如何发布需求？', faqId: 'how-to-publish' },
    ],
    category: 'demand',
    keywords: ['15分钟', '紧急', '窗口', '冻结', '沟通', '5分钟', '公开期'],
  },
  {
    id: 'points-wallet',
    q: '点数钱包与结算明细怎么看？',
    intro:
      '开发期平台用「点数」模拟货币（1 点 = 1 元）完成担保交易。余额在个人账户中，所有扣款与结算可在订单、交易记录中追溯。',
    steps: [
      {
        title: '查看余额',
        content: '个人主页或钱包相关入口可查看当前点数余额（种子账号默认有充足测试点数）。',
      },
      {
        title: '支付扣款',
        content:
          '正式接单后支付页展示应付总额与 5% 服务费。确认后从余额扣除，订单进入进行中。',
      },
      {
        title: '结算与退还',
        content:
          '验收通过后自动结算给服务方；取消订单、拒付裁决等场景按规则退还服务费或恢复需求/押金状态。',
      },
      {
        title: '交易记录',
        content:
          '「交易记录」页查看历史流水；订单详情与需求完成后的结算面板展示分项金额，无需手算。',
      },
    ],
    tips: [
      {
        type: 'info',
        content: '正式上线前点数仅为开发模拟，规则以届时服务协议为准。',
      },
    ],
    relatedLinks: [
      { text: '担保交易的支付流程是怎样的？', faqId: 'how-payment-works' },
      { text: '如何查看交易记录和结算明细？', faqId: 'how-transactions-work' },
    ],
    category: 'order',
    keywords: ['点数', '钱包', '余额', '服务费', '5%', '扣款', '结算'],
  },
  {
    id: 'what-is-tag-stats',
    q: '市场分析（标签统计）是什么？',
    intro:
      '市场分析是九木的数据看板（`/tag-stats`），按标签汇总成交单量、活跃服务者、成交额与平台走势。数据来自后端统计接口，支持刷新与 CSV 导出，不含演示假数据。',
    steps: [
      {
        title: '进入市场分析',
        content:
          '点击左侧导航「市场分析」，进入控制中心。侧栏含三个 Tab：系统总览、数据分析、标签管理。',
      },
      {
        title: '数据分析',
        content:
          '展示总标签数、活跃标签、本周新增需求、关联进行中需求；下方为标签活跃度双柱图（成交单数 + 活跃服务者）、成交额 TOP 横向图、热门标签排行表。可搜索标签名，点击「重新计算」刷新聚合数据，「导出 CSV」下载表格。',
      },
      {
        title: '系统总览',
        content:
          '展示注册用户、订单、需求、总交易额等指标，以及近 30 日平台交易走势折线图（交易额 + 订单数，单位万元）。',
      },
      {
        title: '标签管理',
        content:
          '以卡片浏览各标签的成交、服务者人数与成交额进度条，便于快速对比标签表现。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '若图表为空，先点「重新计算」触发 `/api/tag-stats/refresh`，并确保数据库中已有 UserTag 与完成的需求数据。',
      },
      {
        type: 'info',
        content:
          '页面支持深浅色主题，与全局设置同步。内部工具项（假日志/假设置 Tab）已移除，仅保留有真实数据的模块。',
      },
    ],
    relatedLinks: [
      { text: '如何使用标签筛选需求？', faqId: 'how-to-tags' },
      { text: '什么是卡池？如何使用？', faqId: 'what-is-cardpool' },
    ],
    category: 'feature',
    keywords: ['市场分析', '标签统计', '指标', '趋势', '供需', '统计', '数据', 'tag-stats'],
  },
  {
    id: 'what-is-dashboard',
    q: '管理后台是什么？谁可以使用？',
    intro:
      '管理后台是平台运营者的管理工具，提供业务指标监控、用户管理和系统资源面板功能。仅管理员账号可以访问。',
    steps: [
      {
        title: '进入管理后台',
        content:
          '点击左侧导航栏的「管理后台」图标（LayoutDashboard）。非管理员账号无法看到此入口。',
      },
      {
        title: '业务指标',
        content:
          '首页仪表盘展示核心业务指标：用户总数、需求总数、订单量、交易额等关键数据。',
      },
      {
        title: '用户管理',
        content: '查看所有用户列表，支持搜索、封禁、解封、调整认证等级等操作。',
      },
      {
        title: '需求管理',
        content: '查看所有需求列表，支持审核、冻结、下架等管理操作。',
      },
      {
        title: '系统资源',
        content: '查看服务器资源使用情况、API 调用量、存储用量等系统运维数据。',
      },
    ],
    tips: [
      {
        type: 'warning',
        content: '管理后台操作权限较高，封禁用户或下架需求等操作请谨慎执行。',
      },
      {
        type: 'info',
        content: '如需要管理员权限，请联系平台运营团队申请开通。',
      },
    ],
    relatedLinks: [],
    category: 'feature',
    keywords: ['管理', '后台', '管理员', 'dashboard', 'admin', '监控', '封禁'],
  },
  {
    id: 'what-is-welfare',
    q: '什么是激励中心？激励任务怎么发？',
    intro:
      '激励中心是九木内测期的占位板块，用于演示两段式接单流程与模拟奖励。所有数据为测试用模拟数据，不构成公益捐赠、慈善募捐或有奖销售承诺。',
    steps: [
      {
        title: '进入激励中心',
        content:
          '点击左侧导航栏的「激励中心（内测）」图标（Heart），进入激励板块首页。',
      },
      {
        title: '浏览激励任务',
        content: '首页展示当前所有可认领的激励任务列表。',
      },
      {
        title: '发布激励任务',
        content:
          '填写标题、描述、预期效果与最低报酬（均为模拟）后提交。激励任务默认 15 天展示窗口。',
      },
      {
        title: '认领与完成',
        content:
          '服务者可在激励任务上认领并完成交付，走两段式接单流程；完成后可获得模拟奖励点数。',
      },
      {
        title: '查看激励池',
        content:
          '激励中心展示激励池余额与最近奖励记录，所有数据为模拟展示，不代表真实资金。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '内测期激励功能仅用于演示流程与 UI，不涉及真实资金流转或对外募捐。商业化前将根据法规要求重新设计。',
      },
    ],
    relatedLinks: [{ text: '如何发布需求？', faqId: 'how-to-publish' }],
    category: 'feature',
    keywords: ['激励', '内测', '模拟', '任务', '演示'],
  },
  {
    id: 'how-to-use-agent',
    q: 'AI 助手怎么用？',
    intro:
      'AI 助手是九木内置的智能对话助手，可以回答问题、辅助搜索需求、帮您完成平台操作。',
    steps: [
      {
        title: '打开 AI 助手',
        content: '点击左侧导航栏的「AI 助手」图标（Bot），进入对话界面。',
      },
      {
        title: '提问与对话',
        content:
          '在输入框中输入您的问题，AI 助手会实时回答。支持多轮对话，可以连续追问。',
      },
      {
        title: '需求搜索辅助',
        content:
          '输入"帮我找王者荣耀陪练"，AI 会分析意图并返回匹配的需求列表。点击卡片可直接跳转详情页。',
      },
      {
        title: '配置模型（可选）',
        content:
          '在「设置 → 大模型」绑定个人 API Key（BYOK）可提升配额；未配置时使用平台托管 Key（受每日/ hourly 配额限制）。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '支持 MiniMax、DeepSeek、通义千问等提供商（以设置页显示为准）。工具执行敏感操作前可能请求您批准。',
      },
    ],
    relatedLinks: [
      { text: '如何发布需求？', faqId: 'how-to-publish' },
      { text: '如何找到适合自己的需求？', faqId: 'how-to-find' },
    ],
    category: 'feature',
    keywords: [
      'AI',
      '助手',
      '机器人',
      '对话',
      'agent',
      '智能',
      '聊天',
      'AI助手',
    ],
  },
  {
    id: 'how-transactions-work',
    q: '如何查看交易记录和结算明细？',
    intro:
      '交易记录页面集中展示您所有已完成的交易和结算明细，方便核对收入和支出。',
    steps: [
      {
        title: '进入交易记录',
        content:
          '点击左侧导航栏的「交易记录」图标（Receipt），进入交易列表页面。',
      },
      {
        title: '查看交易列表',
        content:
          '列表展示已完成与进行中的钱包流水。点击订单可查看 pay-breakdown / 结算分项；部分场景支持导出 CSV。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '平台担保交易模式下，需求方付款后资金由平台托管，服务完成验收后才打款给服务方。整笔交易会完整记录在交易记录中。',
      },
      {
        type: 'info',
        content:
          '点数支付含 5% 平台服务费；激励订单（内测）抽成比例为 10% 进入激励池（模拟），公测/商业化后将重新设计。明细以订单页与结算面板为准。',
      },
    ],
    relatedLinks: [
      { text: '担保交易的支付流程是怎样的？', faqId: 'how-payment-works' },
      { text: '订单的完整生命周期是怎样的？', faqId: 'order-lifecycle' },
    ],
    category: 'order',
    keywords: ['交易', '记录', '结算', '明细', '账单', '收支', '到账'],
  },
]

export { FAQ }