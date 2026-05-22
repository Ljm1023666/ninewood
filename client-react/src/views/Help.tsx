import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  Search,
  Send,
  ChevronDown,
  FileText,
  Layers,
  Users,
  MessageCircle,
  User,
  Settings,
  Award,
  ShoppingBag,
  ClipboardList,
  Compass,
  MessageSquare,
  Target,
  Lightbulb,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ===================================================================
//  意图理解引擎 — 从自然语言提取「用户想做什么」
// ===================================================================

/** 已知游戏名称（持续扩充） */
const GAME_NAMES = [
  '王者荣耀',
  '农药',
  'LOL',
  '英雄联盟',
  '撸啊撸',
  '绝地求生',
  '吃鸡',
  'PUBG',
  '和平精英',
  '原神',
  '梦幻西游',
  '穿越火线',
  'CF',
  'DNF',
  '地下城',
  'CSGO',
  'CS2',
  '魔兽世界',
  'WOW',
  '炉石传说',
  '金铲铲之战',
  '云顶之弈',
  '永劫无间',
  'Apex英雄',
  'APEX',
  'VALORANT',
  '瓦罗兰特',
  '瓦',
  '逆水寒',
  '剑网3',
  '第五人格',
  '崩坏',
  '星穹铁道',
  '绝区零',
  '明日方舟',
  '碧蓝航线',
  '阴阳师',
  '蛋仔派对',
  '光遇',
] as const

/** 服务/行为类型 */
const SERVICE_TYPES = [
  '代打',
  '代练',
  '上分',
  '陪玩',
  '陪练',
  '教学',
  '带教学',
  '带刷',
  '代肝',
  '代做任务',
  '代做',
  '代挂',
  '设计',
  '开发',
  '翻译',
  '咨询',
  '维修',
  '保洁',
  '家政',
] as const

/** 意图动词 → 类别映射 */
const INTENT_VERBS: [string, string][] = [
  // 发布意图
  ['发布', 'publish'],
  ['发需求', 'publish'],
  ['发', 'publish'],
  ['创建', 'publish'],
  ['我想要', 'publish'],
  ['我要发', 'publish'],
  ['找人做', 'publish'],
  ['找人', 'publish'],
  ['找师傅', 'publish'],
  // 发现意图
  ['找', 'discover'],
  ['接', 'discover'],
  ['搜索', 'discover'],
  ['看看', 'discover'],
  ['浏览', 'discover'],
  ['有活', 'discover'],
  ['接单', 'discover'],
  ['找服务', 'discover'],
  // 管理意图
  ['管理', 'manage'],
  ['查看', 'manage'],
  ['我的', 'manage'],
  // 设置意图
  ['设置', 'settings'],
  ['配置', 'settings'],
  // 认证意图
  ['认证', 'cert'],
  ['资质', 'cert'],
  // 消息意图
  ['消息', 'messages'],
  ['私信', 'messages'],
  ['聊天', 'messages'],
]

/** 询问/怎么办 类问题（应转向询问模式） */
const QUESTION_PATTERNS = [
  '怎么',
  '如何',
  '怎样',
  '能不能',
  '是不是',
  '是什么',
  '怎么办',
  '为什么',
  '啥是',
]

interface ExtractedEntities {
  intents: string[] // 检测到的意图类别
  gameName: string | null // 提取的游戏名
  serviceType: string | null // 提取的服务类型
  isQuestion: boolean // 是否问句
  raw: string // 原始输入
  fullIntent: string | null // 用户完整意图描述（用于预填）
}

/** 从用户输入提取实体 */
function extractEntities(input: string): ExtractedEntities {
  const raw = input.trim()
  const lowered = raw.toLowerCase()

  // 1. 检测意图动词
  const intents: string[] = []
  for (const [verb, intent] of INTENT_VERBS) {
    if (lowered.includes(verb)) {
      if (!intents.includes(intent)) intents.push(intent)
    }
  }

  // 2. 提取游戏名
  let gameName: string | null = null
  for (const name of GAME_NAMES) {
    if (lowered.includes(name.toLowerCase())) {
      gameName = name
      break
    }
  }

  // 3. 提取服务类型
  let serviceType: string | null = null
  for (const svc of SERVICE_TYPES) {
    if (lowered.includes(svc)) {
      serviceType = svc
      break
    }
  }

  // 4. 检测是否问句
  const isQuestion = QUESTION_PATTERNS.some((p) => lowered.includes(p))

  // 5. 完整意图描述（去除"我想""我要"等前缀）
  let fullIntent: string | null = raw
    .replace(/^(我想要|我要|我想|帮我|请|我需要|能不能帮我)/, '')
    .replace(/^(发布|找|接|搜索|查看)\s*/, '')
    .trim()
  if (!fullIntent || fullIntent.length < 2) fullIntent = raw

  return { intents, gameName, serviceType, isQuestion, raw, fullIntent }
}

// ===================================================================
//  页面映射（跳转模式）
// ===================================================================

interface PageEntry {
  id: string
  path: string
  icon: LucideIcon
  title: string
  desc: string
  /** 此页面能处理的意图类别（空 = 通用） */
  accepts: string[]
  /** 此页面能处理的实体类型 */
  acceptsEntities: string[]
  /** 关键词降级匹配 */
  keywords: string[]
  /** 如何从实体构建跳转参数 */
  buildParams?: (e: ExtractedEntities) => Record<string, string> | null
  /** 当实体匹配时的定制标题/描述 */
  describeFor?: (e: ExtractedEntities) => { title: string; desc: string } | null
}

const PAGE_MAP: PageEntry[] = [
  {
    id: 'demand-create',
    path: '/demands/create',
    icon: FileText,
    title: '发布需求',
    desc: '发布新需求，AI 辅助填写标题、描述和分类',
    accepts: ['publish'],
    acceptsEntities: ['game', 'service'],
    keywords: ['发布', '发需求', '创建需求', '发单'],
    buildParams: (e) => {
      const p: Record<string, string> = {}
      if (e.gameName || e.serviceType) {
        // 将游戏 + 服务组成标题预填
        const parts = [e.gameName, e.serviceType, '需求'].filter(Boolean)
        p.title = parts.join('')
      }
      return Object.keys(p).length ? p : null
    },
    describeFor: (e) => {
      const parts = [e.gameName, e.serviceType].filter(Boolean)
      if (parts.length > 0) {
        return {
          title: `发布${parts.join('')}需求`,
          desc: `直接进入发布页，已为您关注「${parts.join(' · ')}」分类`,
        }
      }
      return null
    },
  },
  {
    id: 'discover',
    path: '/discover',
    icon: Compass,
    title: '需求搜索',
    desc: '浏览所有可接的需求，按分类筛选匹配',
    accepts: ['discover'],
    acceptsEntities: ['game', 'service'],
    keywords: ['找需求', '接单', '搜索需求', '发现', '找服务', '接活'],
    buildParams: (e) => {
      const kw = [e.gameName, e.serviceType].filter(Boolean).join(' ')
      return kw ? { keyword: kw } : null
    },
    describeFor: (e) => {
      const parts = [e.gameName, e.serviceType].filter(Boolean)
      if (parts.length > 0) {
        return {
          title: `找${parts.join('')}相关需求`,
          desc: `搜索「${parts.join(' ')}」相关需求，快速匹配`,
        }
      }
      return null
    },
  },
  {
    id: 'my-demands',
    path: '/my-demands',
    icon: ClipboardList,
    title: '我的需求',
    desc: '管理已发布的需求，查看申请人列表',
    accepts: ['manage'],
    acceptsEntities: [],
    keywords: ['我的需求', '管理需求', '我发的', '已发布'],
  },
  {
    id: 'orders',
    path: '/orders',
    icon: ShoppingBag,
    title: '订单',
    desc: '查看所有订单和交易记录',
    accepts: [],
    acceptsEntities: [],
    keywords: ['订单', '交易', '购买', '支付', '订单记录'],
  },
  {
    id: 'cert-center',
    path: '/cert-center',
    icon: Award,
    title: '认证中心',
    desc: '查看认证等级，申请或升级认证',
    accepts: ['cert'],
    acceptsEntities: [],
    keywords: ['认证', '资质', '证书', '认证中心', '等级'],
  },
  {
    id: 'messages',
    path: '/messages',
    icon: MessageCircle,
    title: '消息',
    desc: '查看私信、群聊和系统通知',
    accepts: ['messages'],
    acceptsEntities: [],
    keywords: ['消息', '私信', '聊天', '通知', '对话', '联系'],
  },
  {
    id: 'settings',
    path: '/settings',
    icon: Settings,
    title: '设置',
    desc: '应用设置、主题切换和偏好配置',
    accepts: ['settings'],
    acceptsEntities: [],
    keywords: ['设置', '配置', '偏好', '主题'],
  },
  {
    id: 'profile',
    path: '/profile',
    icon: User,
    title: '个人主页',
    desc: '查看和编辑个人资料、头像、简介',
    accepts: [],
    acceptsEntities: [],
    keywords: ['个人主页', '资料', '编辑资料', '头像', '我的'],
  },
  {
    id: 'card-pool',
    path: '/card-pool',
    icon: Layers,
    title: '卡池',
    desc: '浏览和组装配件卡片',
    accepts: [],
    acceptsEntities: [],
    keywords: ['卡池', '卡片', '组装', '配件', '工具集'],
  },
  {
    id: 'circles',
    path: '/circles',
    icon: Users,
    title: '圈子',
    desc: '加入兴趣圈子，和同好交流互动',
    accepts: [],
    acceptsEntities: [],
    keywords: ['圈子', '社区', '群组', '交流', '加入圈子'],
  },
  {
    id: 'search',
    path: '/search',
    icon: Search,
    title: '找人',
    desc: '搜索其他用户，查看个人主页',
    accepts: [],
    acceptsEntities: [],
    keywords: ['找人', '用户', '搜索用户', '个人主页', '找师傅'],
  },
  {
    id: 'help',
    path: '/help',
    icon: HelpCircle,
    title: '帮助中心',
    desc: '使用帮助和常见问题（当前页面）',
    accepts: [],
    acceptsEntities: [],
    keywords: ['帮助', '帮助中心', '使用指南', '教程'],
  },
]

// ===================================================================
//  意图 → 页面匹配引擎
// ===================================================================

interface MatchResult {
  page: PageEntry
  score: number
  reason: string // 匹配原因（用于展示）
  params: Record<string, string> | null // 跳转参数
  customLabel: { title: string; desc: string } | null // 定制显示
}

function classifyIntent(query: string): MatchResult[] {
  const entities = extractEntities(query)
  const results: MatchResult[] = []

  for (const page of PAGE_MAP) {
    let score = 0
    let reason = ''
    let params: Record<string, string> | null = null
    let customLabel: { title: string; desc: string } | null = null

    // —— 第一优先级：意图 + 实体精准匹配 ——
    if (page.accepts.length > 0) {
      const matchedIntent = entities.intents.find((i) =>
        page.accepts.includes(i),
      )
      if (matchedIntent) {
        score += 30 // 意图命中，高权重
        reason = `意图匹配：${matchedIntent}`

        // 实体匹配加分
        if (entities.gameName && page.acceptsEntities.includes('game')) {
          score += 15
          reason += ` · 游戏：${entities.gameName}`
        }
        if (entities.serviceType && page.acceptsEntities.includes('service')) {
          score += 10
          reason += ` · 服务：${entities.serviceType}`
        }

        // 尝试构建参数
        if (page.buildParams) {
          params = page.buildParams(entities)
        }
        // 尝试定制显示
        if (page.describeFor) {
          customLabel = page.describeFor(entities)
        }
      }
    }

    // —— 第二优先级：关键词降级匹配 ——
    if (score === 0) {
      const q = query.toLowerCase()
      for (const kw of page.keywords) {
        if (q.includes(kw)) {
          score += 5
          reason = `关键词匹配：${kw}`
          break
        }
      }
    }

    // —— 第三优先级：语义补全 ——
    // 如果用户只输入了游戏名或服务名，但没有明确意图 → 给出候选
    if (score === 0 && entities.gameName && page.id === 'demand-create') {
      score += 8
      reason = `检测到游戏「${entities.gameName}」，推荐发布需求`
      params = page.buildParams?.(entities) ?? null
      customLabel = page.describeFor?.(entities) ?? null
    }
    if (score === 0 && entities.gameName && page.id === 'discover') {
      score += 6
      reason = `检测到游戏「${entities.gameName}」，推荐搜索需求`
      params = page.buildParams?.(entities) ?? null
      customLabel = page.describeFor?.(entities) ?? null
    }
    if (score === 0 && entities.serviceType && page.id === 'demand-create') {
      score += 5
      reason = `检测到服务「${entities.serviceType}」，推荐发布`
    }

    if (score > 0) {
      results.push({ page, score, reason, params, customLabel })
    }
  }

  // 按分数降序排列
  results.sort((a, b) => b.score - a.score)

  // 去重：同一页面的高分覆盖低分
  const seen = new Set<string>()
  return results.filter((r) => {
    if (seen.has(r.page.id)) return false
    seen.add(r.page.id)
    return true
  })
}

// ===================================================================
//  FAQ 知识库（询问模式）
// ===================================================================

interface FaqEntry {
  q: string
  a: string
  keywords: string[]
}

const FAQ: FaqEntry[] = [
  {
    q: '如何发布需求？',
    a: '点击左侧导航栏的「发布」按钮（📄 图标），进入发布页面。填写标题、描述、价格等信息，AI 会自动帮你分类。你也可以在帮助页的「跳转模式」输入"我想发布XXX"快速跳转到发布页。',
    keywords: ['发布', '发需求', '怎么发布', '创建需求', '发单'],
  },
  {
    q: '如何找到适合自己的需求？',
    a: '点击「发现」进入需求广场，可按分类筛选。也可以使用页面右下角的悬浮球输入你的能力描述（如"我会王者荣耀代打"），AI 会自动匹配适合你的需求。',
    keywords: ['找需求', '接单', '匹配', '发现', '搜索需求', '接活'],
  },
  {
    q: '如何进行实名/技能认证？',
    a: '点击左侧导航栏底部「我的」→ 进入个人主页 → 点击「认证中心」。认证等级分为：NONE（未认证）、BASIC（基础）、INTERMEDIATE（中级）、ADVANCED（高级）。等级越高，抢单信用分权重越大。',
    keywords: ['认证', '实名', '资质', '技能认证', '认证等级'],
  },
  {
    q: '如何查看和管理我的订单？',
    a: '点击左侧导航栏「我的」→ 选择「订单」，即可查看所有交易记录。订单状态包括：待付款、进行中、已完成、已取消。点击任一订单可查看详情。',
    keywords: ['订单', '交易', '查看订单', '订单管理', '购买记录'],
  },
  {
    q: '如何与需求方/服务方联系？',
    a: '在需求详情页点击「申请接单」或「联系对方」，系统会自动创建一条私信对话。之后可以在左侧「消息」图标处查看所有对话。',
    keywords: ['联系', '消息', '私信', '聊天', '沟通', '对话'],
  },
  {
    q: '如何查看已发布的需求？',
    a: '点击左侧导航栏「我的」→ 选择「我的需求」，可查看所有已发布的需求列表，包括审核中、已上架、已下架的状态。',
    keywords: ['我的需求', '已发布', '查看发布', '管理需求', '我发的'],
  },
  {
    q: '支付流程是怎样的？',
    a: '平台采用担保交易模式：需求方先付款到平台，服务方完成后平台再打款。在订单详情页可查看支付状态和操作付款。如有纠纷可申请平台介入。',
    keywords: ['支付', '付款', '交易', '担保', '打款', '退款'],
  },
  {
    q: '如何加入或创建圈子？',
    a: '点击左侧导航栏「圈子」进入圈子广场，可浏览公开圈子并申请加入。在圈子页面右上角有「创建圈子」按钮，可创建自己的兴趣圈子。',
    keywords: ['圈子', '加入圈子', '创建圈子', '社区', '群组'],
  },
  {
    q: '如何修改个人资料？',
    a: '点击左侧导航栏「我的」进入个人主页，点击右上角的编辑按钮（或直接点击资料区域），可修改头像、昵称、个人简介等信息。',
    keywords: ['个人资料', '修改资料', '头像', '昵称', '简介', '编辑'],
  },
  {
    q: '什么是卡池功能？',
    a: '卡池是一个个性化工具集功能。你可以在卡池中浏览各种配件卡片，将它们组装成自己的工具组合，方便快速访问常用功能。点击左侧「卡池」图标进入。',
    keywords: ['卡池', '卡片', '工具集', '组装', '配件'],
  },
  {
    q: '如何切换深色/浅色主题？',
    a: '在左侧导航栏底部有主题切换开关（🌙/☀️），点击即可在深色和浅色主题间切换。你也可以在「设置」页面中查看更多主题选项。',
    keywords: ['主题', '深色', '浅色', '暗黑', '白天', '切换主题'],
  },
  {
    q: '发布需求后多久能审核通过？',
    a: '系统审核通常为自动进行，一般几分钟内完成。如遇到敏感词或需要人工复核的情况，可能需要 1-2 个工作日。审核结果会通过消息通知你。',
    keywords: ['审核', '审核时间', '发布审核', '通过', '审核中', '等待'],
  },
  {
    q: '如何取消已发布的需求？',
    a: '进入「我的需求」页面，找到需要取消的需求，点击进入详情页，在页面底部有「下架需求」按钮。已有人申请的需求建议先与申请人沟通。',
    keywords: ['取消', '下架', '删除需求', '取消发布', '停止'],
  },
  {
    q: '收不到消息通知怎么办？',
    a: '请检查：1) 是否开启了浏览器通知权限；2) 是否在「设置」中开启了消息提醒；3) 网络连接是否正常。如果仍收不到，可以尝试刷新页面或重新登录。',
    keywords: ['通知', '消息通知', '收不到', '提醒', '推送'],
  },
]

// ===================================================================
//  子组件
// ===================================================================

/** FAQ 折叠项 */
function FaqItem({
  faq,
  defaultOpen,
}: {
  faq: FaqEntry
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-colors hover:border-white/[0.1]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-white/85">{faq.q}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-white/30 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-sm text-white/55 leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  )
}

/** 跳转卡片 — 点击即导航，携带参数 */
function JumpCard({
  match,
  onNavigate,
}: {
  match: MatchResult
  onNavigate: (path: string, params: Record<string, string> | null) => void
}) {
  const Icon = match.page.icon
  const label = match.customLabel ?? {
    title: match.page.title,
    desc: match.page.desc,
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(match.page.path, match.params)}
      className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-accent/30 hover:bg-accent/[0.04] hover:shadow-[0_0_20px_rgba(var(--accent-color-rgb),0.06)] w-full"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/85">
            {label.title}
          </span>
          <ArrowRight className="size-3.5 text-accent/50 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
        <p className="mt-0.5 text-sm text-white/40 line-clamp-1">
          {label.desc}
        </p>
        {match.params && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(match.params).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full bg-accent/8 px-2 py-0.5 text-[11px] text-accent/70"
              >
                {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ===================================================================
//  主页面
// ===================================================================

type HelpMode = 'ask' | 'jump'

export default function Help() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<HelpMode>('ask')
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 跳转模式的实时建议
  const [liveResults, setLiveResults] = useState<MatchResult[]>([])
  const [liveLoading, setLiveLoading] = useState(false)

  // 聚焦输入
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [mode])

  // —— 跳转模式：500ms 防抖实时建议 ——
  useEffect(() => {
    if (mode !== 'jump') {
      setLiveResults([])
      return
    }
    const q = query.trim()
    if (!q) {
      setLiveResults([])
      return
    }

    setLiveLoading(true)
    const timer = setTimeout(() => {
      const results = classifyIntent(q)
      // 只展示 top 3
      setLiveResults(results.slice(0, 3))
      setLiveLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [query, mode])

  // —— 询问模式：FAQ 匹配 ——
  const matchedFaq = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return FAQ.filter(
      (faq) =>
        faq.q.toLowerCase().includes(q) ||
        faq.keywords.some((kw) => kw.toLowerCase().includes(q)),
    )
  }, [query])

  // —— 跳转导航 ——
  const handleJumpNavigate = useCallback(
    (path: string, params: Record<string, string> | null) => {
      if (params && Object.keys(params).length > 0) {
        const sp = new URLSearchParams(params)
        navigate(`${path}?${sp.toString()}`)
      } else {
        navigate(path)
      }
    },
    [navigate],
  )

  // —— 发送 ——
  const handleSend = useCallback(() => {
    if (!query.trim()) return
    if (mode === 'jump') {
      // 跳转模式：取第一个匹配结果直接跳
      const results = classifyIntent(query)
      if (results.length > 0) {
        const top = results[0]
        handleJumpNavigate(top.page.path, top.params)
        return
      }
    }
    setSubmitted(true)
  }, [query, mode, handleJumpNavigate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // —— 检测到问句时提示切换模式 ——
  const entities = useMemo(() => {
    if (!query.trim() || mode !== 'jump') return null
    return extractEntities(query)
  }, [query, mode])

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll thin-scroll">
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col self-center px-4 pb-8 pt-6 sm:px-6">
          {/* 头部 */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">帮助中心</h1>
              <p className="text-sm text-white/40">
                了解如何使用，或快速跳转到你需要的页面
              </p>
            </div>
          </div>

          {/* 模式切换 */}
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <Switch
              id="help-mode"
              checked={mode === 'jump'}
              onCheckedChange={(checked) => {
                setMode(checked ? 'jump' : 'ask')
                setSubmitted(false)
              }}
            />
            <Label
              htmlFor="help-mode"
              className="flex items-center gap-2 text-sm font-medium text-white/70 cursor-pointer select-none"
            >
              <span
                className={cn(mode === 'ask' && 'text-accent font-semibold')}
              >
                💬 询问
              </span>
              <span className="text-white/20">/</span>
              <span
                className={cn(mode === 'jump' && 'text-accent font-semibold')}
              >
                🚀 跳转
              </span>
            </Label>
          </div>

          {/* 输入区 */}
          <div className="relative mb-6">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (submitted) setSubmitted(false)
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'ask'
                  ? '输入你的问题，如"怎么发布需求？"'
                  : '描述你想做什么，如"我想发布王者荣耀代打"'
              }
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 pr-12 text-sm text-white/85 outline-none placeholder:text-white/25 transition-colors focus:border-accent/40 focus:bg-accent/[0.03]"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:text-accent disabled:opacity-30"
            >
              <Send className="size-4" />
            </button>
          </div>

          {/* 内容区 */}
          {mode === 'ask' ? (
            /* ====== 询问模式 ====== */
            <div className="space-y-3">
              {!submitted && !query.trim() && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-6 text-center">
                  <MessageSquare className="mx-auto mb-2 size-8 text-white/15" />
                  <p className="text-sm text-white/30">
                    输入问题并按回车，或从下方常见问题中选择
                  </p>
                </div>
              )}

              {submitted && matchedFaq.length === 0 && query.trim() && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-6 text-center">
                  <p className="text-sm text-white/40">
                    未找到相关问题，试试换个关键词，或切换到「跳转模式」寻找对应页面
                  </p>
                </div>
              )}

              {submitted && matchedFaq.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-white/40 mb-3">
                    找到 {matchedFaq.length} 个相关问题
                  </p>
                  {matchedFaq.map((faq, i) => (
                    <FaqItem key={i} faq={faq} defaultOpen={i === 0} />
                  ))}
                </div>
              )}

              {(!submitted || (submitted && !query.trim())) && (
                <>
                  <h2 className="text-sm font-medium text-white/50">
                    常见问题
                  </h2>
                  {FAQ.map((faq, i) => (
                    <FaqItem key={i} faq={faq} defaultOpen={false} />
                  ))}
                </>
              )}
            </div>
          ) : (
            /* ====== 跳转模式 ====== */
            <div className="space-y-3">
              {/* 问句检测提示 */}
              {entities?.isQuestion && liveResults.length === 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
                  <Lightbulb className="size-4 text-amber-400/70 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400/70">
                    看起来你在提问题，试试切换到「💬 询问模式」获取文字解答
                  </p>
                </div>
              )}

              {/* 输入为空：展示所有页面 */}
              {!query.trim() && (
                <>
                  <p className="text-sm text-white/40 mb-1">
                    描述你想做什么，系统会自动推荐最合适的页面
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAGE_MAP.map((entry) => (
                      <JumpCard
                        key={entry.id}
                        match={{
                          page: entry,
                          score: 0,
                          reason: '',
                          params: null,
                          customLabel: null,
                        }}
                        onNavigate={handleJumpNavigate}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* 实时建议（防抖 500ms） */}
              {query.trim() && liveLoading && (
                <div className="flex items-center gap-2 px-1 py-2">
                  <span className="inline-block size-3 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                  <span className="text-sm text-white/30">分析意图...</span>
                </div>
              )}

              {query.trim() && !liveLoading && liveResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-white/40">
                    推荐以下页面（按匹配度排序）
                  </p>
                  {liveResults.map((r, i) => (
                    <JumpCard
                      key={`${r.page.id}-${i}`}
                      match={r}
                      onNavigate={handleJumpNavigate}
                    />
                  ))}
                </div>
              )}

              {query.trim() && !liveLoading && liveResults.length === 0 && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-6 text-center space-y-2">
                  <Target className="mx-auto size-8 text-white/15" />
                  <p className="text-sm text-white/40">未找到完全匹配的页面</p>
                  <p className="text-sm text-white/25">
                    试试更具体的描述，如「我想发布王者荣耀代打」或「找陪玩需求」
                  </p>
                </div>
              )}

              {/* 已发送且未匹配足够结果时，展示降级兜底 */}
              {submitted && !liveLoading && liveResults.length === 0 && (
                <div className="mt-4">
                  <p className="text-sm text-white/30 mb-2">
                    或者浏览所有可用页面：
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAGE_MAP.map((entry) => (
                      <JumpCard
                        key={entry.id}
                        match={{
                          page: entry,
                          score: 0,
                          reason: '',
                          params: null,
                          customLabel: null,
                        }}
                        onNavigate={handleJumpNavigate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
