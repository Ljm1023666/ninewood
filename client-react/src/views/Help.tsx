import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HelpCircle,
  Search,
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
  Target,
  ArrowRight,
  ArrowUp,
  Skull,
  Gavel,
  Tags,
  BadgeCheck,
  type LucideIcon,
  Lightbulb,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react'
import {
  PixelCanvas,
  Component as LogoGrid,
} from '@/components/ui/pixel-logo-grid'
import { LimelightNav, type NavItem } from '@/components/ui/limelight-nav'
import { AnimatedSearchBar } from '@/components/ui/animated-search-bar'
import { DynamicIslandTOC } from '@/components/ui/dynamic-island-toc'
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
  ['发布', 'publish'],
  ['发需求', 'publish'],
  ['发', 'publish'],
  ['创建', 'publish'],
  ['我想要', 'publish'],
  ['我要发', 'publish'],
  ['找人做', 'publish'],
  ['找人', 'publish'],
  ['找师傅', 'publish'],
  ['找', 'discover'],
  ['接', 'discover'],
  ['搜索', 'discover'],
  ['看看', 'discover'],
  ['浏览', 'discover'],
  ['有活', 'discover'],
  ['接单', 'discover'],
  ['找服务', 'discover'],
  ['管理', 'manage'],
  ['查看', 'manage'],
  ['我的', 'manage'],
  ['设置', 'settings'],
  ['配置', 'settings'],
  ['认证', 'cert'],
  ['资质', 'cert'],
  ['消息', 'messages'],
  ['私信', 'messages'],
  ['聊天', 'messages'],
]

/** 询问/怎么办 类问题 */
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
  intents: string[]
  gameName: string | null
  serviceType: string | null
  isQuestion: boolean
  raw: string
  fullIntent: string | null
}

function extractEntities(input: string): ExtractedEntities {
  const raw = input.trim()
  const lowered = raw.toLowerCase()
  const intents: string[] = []
  for (const [verb, intent] of INTENT_VERBS) {
    if (lowered.includes(verb)) {
      if (!intents.includes(intent)) intents.push(intent)
    }
  }
  let gameName: string | null = null
  for (const name of GAME_NAMES) {
    if (lowered.includes(name.toLowerCase())) {
      gameName = name
      break
    }
  }
  let serviceType: string | null = null
  for (const svc of SERVICE_TYPES) {
    if (lowered.includes(svc)) {
      serviceType = svc
      break
    }
  }
  const isQuestion = QUESTION_PATTERNS.some((p) => lowered.includes(p))
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
  accepts: string[]
  acceptsEntities: string[]
  keywords: string[]
  buildParams?: (e: ExtractedEntities) => Record<string, string> | null
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
    desc: '以卡牌形式浏览服务分类，筛选匹配需求',
    accepts: [],
    acceptsEntities: [],
    keywords: ['卡池', '分类', '手牌', '卡包', '筛选需求', '服务分类'],
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
    id: 'dead-pool',
    path: '/card-pool/dead',
    icon: Skull,
    title: '死池',
    desc: '浏览已过期或流拍的需求，捡漏机会',
    accepts: [],
    acceptsEntities: [],
    keywords: ['死池', '过期', '流拍', '捡漏', '已结束'],
  },
  {
    id: 'my-bids',
    path: '/my-bids',
    icon: Gavel,
    title: '我的应标',
    desc: '管理已投递的应标和竞标记录',
    accepts: ['bids'],
    acceptsEntities: [],
    keywords: ['应标', '竞标', '投标', '我的应标', '投递'],
  },
  {
    id: 'my-tags',
    path: '/my-tags',
    icon: Tags,
    title: '标签管理',
    desc: '管理服务标签，优化需求匹配',
    accepts: [],
    acceptsEntities: [],
    keywords: ['标签', '服务标签', '标签管理', '分类标签'],
  },
  {
    id: 'certified-search',
    path: '/discover/certified',
    icon: BadgeCheck,
    title: '认证服务者',
    desc: '搜索已认证的高质量服务者',
    accepts: [],
    acceptsEntities: [],
    keywords: ['认证', '服务者', '认证服务者', '搜认证', '认证找人'],
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
  {
    id: 'home',
    path: '/',
    icon: Compass,
    title: '首页',
    desc: '返回平台首页，查看最新动态',
    accepts: [],
    acceptsEntities: [],
    keywords: ['首页', '主页', '返回首页'],
  },
]

const PAGE_PALETTES: Record<string, string[]> = {
  'demand-create': ['#f97316', '#ea580c', '#fb923c', '#fdba74', '#fed7aa'],
  discover: ['#06b6d4', '#0891b2', '#22d3ee', '#67e8f9', '#a5f3fc'],
  'my-demands': ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  orders: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'],
  'cert-center': ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a'],
  messages: ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe'],
  settings: ['#6366f1', '#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe'],
  profile: ['#ec4899', '#db2777', '#f472b6', '#f9a8d4', '#fbcfe8'],
  'card-pool': ['#14b8a6', '#0d9488', '#2dd4bf', '#5eead4', '#99f6e4'],
  'dead-pool': ['#6b7280', '#4b5563', '#9ca3af', '#d1d5db', '#e5e7eb'],
  'my-bids': ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a'],
  'my-tags': ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'],
  'certified-search': ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe'],
  circles: ['#e11d48', '#be123c', '#fb7185', '#fda4af', '#fecdd3'],
  search: ['#a855f7', '#9333ea', '#c084fc', '#d8b4fe', '#e9d5ff'],
  help: ['#64748b', '#475569', '#94a3b8', '#cbd5e1', '#e2e8f0'],
  home: ['#6366f1', '#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe'],
  agent: ['#a855f7', '#9333ea', '#c084fc', '#d8b4fe', '#e9d5ff'],
}

const PAGE_BRANDS: Record<string, string> = {
  'demand-create': '#f97316',
  discover: '#06b6d4',
  'my-demands': '#8b5cf6',
  orders: '#10b981',
  'cert-center': '#f59e0b',
  messages: '#3b82f6',
  settings: '#6366f1',
  profile: '#ec4899',
  'card-pool': '#14b8a6',
  'dead-pool': '#6b7280',
  'my-bids': '#f59e0b',
  'my-tags': '#10b981',
  'certified-search': '#3b82f6',
  circles: '#e11d48',
  search: '#a855f7',
  help: '#64748b',
  home: '#6366f1',
  agent: '#a855f7',
}

const helpNavItems: NavItem[] = [
  { id: 'ask', label: '帮助文档' },
  { id: 'jump', label: '页面跳转' },
]

// ===================================================================
//  意图 → 页面匹配引擎
// ===================================================================

interface MatchResult {
  page: PageEntry
  score: number
  reason: string
  params: Record<string, string> | null
  customLabel: { title: string; desc: string } | null
}

function classifyIntent(query: string): MatchResult[] {
  const entities = extractEntities(query)
  const results: MatchResult[] = []

  for (const page of PAGE_MAP) {
    let score = 0
    let reason = ''
    let params: Record<string, string> | null = null
    let customLabel: { title: string; desc: string } | null = null

    if (page.accepts.length > 0) {
      const matchedIntent = entities.intents.find((i) =>
        page.accepts.includes(i),
      )
      if (matchedIntent) {
        score += 30
        reason = `意图匹配：${matchedIntent}`
        if (entities.gameName && page.acceptsEntities.includes('game')) {
          score += 15
          reason += ` · 游戏：${entities.gameName}`
        }
        if (entities.serviceType && page.acceptsEntities.includes('service')) {
          score += 10
          reason += ` · 服务：${entities.serviceType}`
        }
        if (page.buildParams) params = page.buildParams(entities)
        if (page.describeFor) customLabel = page.describeFor(entities)
      }
    }

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

    if (score > 0) results.push({ page, score, reason, params, customLabel })
  }

  results.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  return results.filter((r) => {
    if (seen.has(r.page.id)) return false
    seen.add(r.page.id)
    return true
  })
}

// ===================================================================
//  FAQ 知识库 — 完整帮助文档
// ===================================================================

type TipType = 'tip' | 'warning' | 'danger' | 'info'

interface FaqStep {
  title: string
  content: string
}

interface FaqTip {
  type: TipType
  content: string
}

interface FaqRelatedLink {
  text: string
  faqId: string
}

interface FaqEntry {
  id: string
  q: string
  intro: string
  steps?: FaqStep[]
  tips?: FaqTip[]
  relatedLinks?: FaqRelatedLink[]
  category: string
  keywords: string[]
}

const FAQ_CATEGORIES = [
  {
    id: 'demand',
    title: '发布与管理需求',
    icon: FileText,
    desc: '需求发布、审核、管理',
  },
  {
    id: 'discover',
    title: '发现与匹配',
    icon: Compass,
    desc: '智能推荐与需求搜索',
  },
  {
    id: 'order',
    title: '订单与支付',
    icon: ShoppingBag,
    desc: '担保交易与支付流程',
  },
  { id: 'cert', title: '认证与信用', icon: Award, desc: '实名认证与信用体系' },
  {
    id: 'social',
    title: '沟通与社区',
    icon: MessageCircle,
    desc: '消息、圈子与通知',
  },
  {
    id: 'feature',
    title: '平台特色功能',
    icon: Layers,
    desc: '卡池、信用分等特色玩法',
  },
  {
    id: 'settings',
    title: '个人与偏好',
    icon: Settings,
    desc: '资料编辑与主题设置',
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
        title: '设置预算',
        content: '输入预算金额，范围 1-999,999 元。建议根据市场行情合理定价。',
      },
      {
        title: '选择分类',
        content: '系统会根据标题和描述自动推荐分类，您也可以手动选择或调整。',
      },
      {
        title: '选择服务方式',
        content: '线上服务（远程完成）或线下服务（需要当面完成）。',
      },
      {
        title: '设置有效期',
        content: '需求的有效展示时间，1-30 天。超期后需求自动下架。',
      },
      {
        title: '提交发布',
        content: '确认信息无误后点击「发布」按钮。需求将进入审核状态。',
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
          '如账户存在冻结状态，将无法发布新需求。需先联系平台解决冻结问题。',
      },
      {
        type: 'info',
        content:
          '圈内发布：进入圈子详情页后点击「发布需求」，该需求将只在该圈内展示，适合定向寻找服务方。',
      },
    ],
    relatedLinks: [
      { text: '发布需求后多久审核通过？', faqId: 'how-to-review' },
      { text: '如何取消已发布的需求？', faqId: 'how-to-cancel' },
      { text: '如何在圈内发布需求？', faqId: 'circle-demand' },
    ],
    category: 'demand',
    keywords: ['发布', '发需求', '怎么发布', '创建需求', '发单', '新建需求'],
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
          '列表展示所有需求，包含状态标签：审核中、已上架、已下架、已完成。',
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
          '需求状态流转：发布 → 审核中 → 已上架 →（有人申请后）→ 创建订单 → 已完成 → 评价。',
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
      '九木提供多种方式帮助您发现和匹配需求，包括分类浏览、关键词搜索和智能推荐。',
    steps: [
      {
        title: '进入发现页',
        content: '点击左侧导航栏的「发现」图标进入需求广场。',
      },
      {
        title: '分类筛选',
        content: '使用页面上的分类标签筛选特定类型的需求，减少无关信息干扰。',
      },
      {
        title: '使用卡池',
        content:
          '进入「卡池」页面，将服务分类卡片拖入手牌区，下方桌面区会实时展示匹配的需求。适合需要同时监控多个分类的用户。',
      },
      {
        title: 'AI 智能匹配',
        content:
          '点击页面右下角的悬浮球，输入您的能力描述（如"我会王者荣耀代打"），AI 会自动匹配适合您的需求。',
      },
    ],
    tips: [
      {
        type: 'tip',
        content:
          '在帮助页搜索框输入"找王者荣耀代打"，系统可直接跳转到需求搜索页并自动填入关键词。',
      },
    ],
    relatedLinks: [
      { text: '什么是卡池？如何使用？', faqId: 'what-is-cardpool' },
      { text: '如何申请接单？', faqId: 'how-to-apply' },
    ],
    category: 'discover',
    keywords: ['找需求', '接单', '匹配', '发现', '搜索需求', '接活', '浏览'],
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
        title: '提交申请',
        content:
          '点击「申请接单」按钮，系统会自动创建一条私信对话，您可以向需求方介绍自己的能力和经验。',
      },
      {
        title: '等待回应',
        content:
          '需求方审核您的申请后，可以选择接受或拒绝。接受后会创建正式订单。',
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
      { text: '信用分和抢单额度是什么？', faqId: 'credit-system' },
      { text: '订单的完整生命周期是怎样的？', faqId: 'order-lifecycle' },
      { text: '如何与需求方联系？', faqId: 'how-to-contact' },
    ],
    category: 'discover',
    keywords: ['申请', '接单', '抢单', '承接', '报名'],
  },

  // ========== 订单与支付 ==========
  {
    id: 'order-lifecycle',
    q: '订单的完整生命周期是怎样的？',
    intro:
      '九木采用担保交易模式，订单从创建到完成有明确的状态流转，保障双方权益。',
    steps: [
      {
        title: '创建订单',
        content: '需求方接受申请后，系统创建订单，状态为待付款。',
      },
      {
        title: '需求方付款',
        content: '需求方在订单详情页完成付款，资金由平台托管，状态变为进行中。',
      },
      {
        title: '服务方履约',
        content: '服务方按约定完成服务。期间双方可通过消息沟通进度。',
      },
      { title: '服务完成', content: '服务方提交完成后，状态变为等待验收。' },
      {
        title: '需求方验收',
        content:
          '需求方确认服务完成并满意后，状态变为已完成，平台将款项打给服务方。',
      },
    ],
    tips: [
      {
        type: 'warning',
        content:
          '如需求方在验收期不主动确认，系统会在一段时间后自动完成并打款。',
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
      '九木采用担保交易模式：需求方先付款到平台托管，服务完成后平台再打款给服务方，最大程度保障双方资金安全。',
    steps: [
      {
        title: '进入支付',
        content: '订单创建后，需求方在订单详情页点击「去支付」进入支付页面。',
      },
      {
        title: '完成支付',
        content:
          '选择支付方式完成付款。款项不会直接打给服务方，而是由平台暂时托管。',
      },
      {
        title: '平台托管',
        content: '支付成功后，订单状态变为进行中。服务方可以放心开始工作。',
      },
      {
        title: '验收打款',
        content:
          '服务完成后，需求方确认验收。平台将托管资金打给服务方，交易完成。',
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
        content: '点击左侧导航栏「我的」→ 进入个人主页 → 点击「认证中心」。',
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
          '页面展示服务分类的黑卡（分类卡片），每张卡片代表一个服务类别。点击叶子节点（最细分类）会触发展示该分类下的需求卡片动画。',
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
    id: 'switch-theme',
    q: '如何切换深色/浅色主题？',
    intro:
      '九木默认使用暖色调深色主题以降低长时间使用的视觉疲劳。您也可以切换到浅色主题。',
    steps: [
      {
        title: '快速切换',
        content:
          '点击左侧导航栏底部的主题切换按钮（月亮/太阳图标），即可在深色和浅色主题间一键切换。',
      },
      {
        title: '更多选项',
        content:
          '进入「设置」页面，可以浏览更多主题预设，包括不同的深色和浅色风格变体。',
      },
      {
        title: '自动跟随系统',
        content:
          '在设置中可开启跟随系统选项，主题会自动匹配 Windows 系统的深色/浅色模式。',
      },
    ],
    tips: [
      {
        type: 'info',
        content:
          '深色主题采用纯黑底色 #000 搭配灰度层次，减少长时间屏幕使用的眼部疲劳。',
      },
    ],
    relatedLinks: [],
    category: 'settings',
    keywords: ['主题', '深色', '浅色', '暗黑', '白天', '切换主题', '夜间模式'],
  },
]

// ===================================================================
//  子组件
// ===================================================================

// ---------- 搜索关键词高亮 ----------
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-300/25 px-0.5 text-inherit dark:bg-yellow-500/20"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

// ---------- 引用块（提示/警告/危险） ----------
const BLOCKQUOTE_STYLES: Record<
  TipType,
  { icon: LucideIcon; border: string; bg: string; text: string }
> = {
  tip: {
    icon: Lightbulb,
    border: 'border-l-emerald-500/60',
    bg: 'bg-emerald-500/[0.04]',
    text: 'text-emerald-300/80',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-l-amber-500/60',
    bg: 'bg-amber-500/[0.04]',
    text: 'text-amber-300/80',
  },
  danger: {
    icon: AlertTriangle,
    border: 'border-l-red-500/60',
    bg: 'bg-red-500/[0.04]',
    text: 'text-red-300/80',
  },
  info: {
    icon: Info,
    border: 'border-l-blue-500/60',
    bg: 'bg-blue-500/[0.04]',
    text: 'text-blue-300/80',
  },
}

const BLOCKQUOTE_LABELS: Record<TipType, string> = {
  tip: '提示',
  warning: '注意',
  danger: '警告',
  info: '说明',
}

function BlockquoteBlock({
  type,
  content,
}: {
  type: TipType
  content: string
}) {
  const style = BLOCKQUOTE_STYLES[type]
  const Icon = style.icon
  return (
    <div
      className={cn('my-3 rounded-r-lg border-l-2 p-3', style.border, style.bg)}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('size-3.5', style.text)} />
        <span className={cn('text-[14px] font-semibold', style.text)}>
          {BLOCKQUOTE_LABELS[type]}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/70">
        {content}
      </p>
    </div>
  )
}

// ---------- 步骤指示器 ----------
function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { title: string }[]
  currentStep?: number
}) {
  return (
    <div className="mb-4 flex items-center gap-1.5 text-[11px] font-medium">
      {steps.map((_step, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
              currentStep !== undefined && i === currentStep
                ? 'bg-accent text-accent-foreground'
                : currentStep !== undefined && i < currentStep
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-foreground/8 text-foreground/30',
            )}
          >
            {currentStep !== undefined && i < currentStep ? (
              <CheckCircle2 className="size-3" />
            ) : (
              i + 1
            )}
          </span>
          {i < steps.length - 1 && (
            <span className="h-px w-3 bg-foreground/10" />
          )}
        </span>
      ))}
    </div>
  )
}

// ---------- 可折叠区块 ----------
function CollapsibleBlock({
  title,
  children,
  defaultOpen,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="my-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[15px] font-medium text-foreground/60 transition-colors hover:bg-accent/[0.04] hover:text-foreground/80"
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
        {title}
      </button>
      {open && <div className="mt-2 pl-9">{children}</div>}
    </div>
  )
}

// ---------- 左侧文档导航树 ----------
function FaqNavTree({
  expandedCategories,
  selectedQuestion,
  searchQuery,
  onToggleCategory,
  onSelectQuestion,
}: {
  expandedCategories: Set<string>
  selectedQuestion: FaqEntry | null
  searchQuery: string
  onToggleCategory: (id: string) => void
  onSelectQuestion: (faq: FaqEntry | null) => void
}) {
  return (
    <nav className="py-2">
      {FAQ_CATEGORIES.map((cat) => {
        const Icon = cat.icon
        const entries = FAQ.filter((f) => f.category === cat.id)
        if (entries.length === 0) return null
        const isExpanded = expandedCategories.has(cat.id)
        const isCurrentCategory = selectedQuestion?.category === cat.id
        return (
          <div key={cat.id} className="mb-1">
            <button
              type="button"
              onClick={() => onToggleCategory(cat.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors',
                isCurrentCategory
                  ? 'text-foreground font-semibold'
                  : 'text-foreground/70 font-medium hover:text-foreground hover:bg-accent/[0.04]',
              )}
            >
              <Icon
                className={cn(
                  'size-4 shrink-0 transition-colors',
                  isCurrentCategory ? 'text-accent' : 'text-foreground/35',
                )}
              />
              <span className="flex-1 truncate text-[14px] tracking-wide">
                {cat.title}
              </span>
              <ChevronDown
                className={cn(
                  'size-3.5 shrink-0 text-foreground/25 transition-transform duration-200',
                  isExpanded && 'rotate-180',
                )}
              />
            </button>
            {isExpanded && (
              <div className="mt-0.5 space-y-px">
                {entries.map((faq) => {
                  const isActive = selectedQuestion?.q === faq.q
                  return (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => onSelectQuestion(faq)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md py-1.5 pl-9 pr-3 text-left text-[14px] leading-snug transition-colors',
                        isActive
                          ? 'text-accent font-medium'
                          : 'text-foreground/40 font-normal hover:text-foreground/70',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full transition-colors',
                          isActive ? 'bg-accent' : 'bg-foreground/15',
                        )}
                      />
                      <span className="truncate">
                        <HighlightText text={faq.q} query={searchQuery} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ---------- FAQ 答案内容（全量渲染用） ----------
function FaqAnswerContent({ faq }: { faq: FaqEntry }) {
  return (
    <>
      <p className="text-[16px] leading-relaxed text-foreground/70 max-w-[72ch] mb-5">{faq.intro}</p>
      {faq.steps && faq.steps.length > 0 && (
        <div className="mb-6">
          <ol className="space-y-4">
            {faq.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-[12px] font-bold mt-0.5">{i + 1}</span>
                <div>
                  <h4 className="text-[16px] font-semibold text-foreground/85">{step.title}</h4>
                  <p className="text-[15px] leading-relaxed text-foreground/60 mt-0.5">{step.content}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {faq.tips && faq.tips.length > 0 && (
        <div className="mb-6">
          {faq.tips.map((tip, i) => (<BlockquoteBlock key={i} type={tip.type} content={tip.content} />))}
        </div>
      )}
    </>
  )
}

// ---------- 中央内容面板 ----------
function FaqDocContent({
  selectedQuestion,
  onSelectQuestion,
}: {
  selectedQuestion: FaqEntry | null
  onSelectQuestion: (faq: FaqEntry | null) => void
}) {
  if (!selectedQuestion) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent/[0.06]">
            <HelpCircle className="size-7 text-foreground/15" />
          </div>
          <p className="text-base font-medium text-foreground/40">
            从左侧导航树选择一个问题，查看详细解答
          </p>
          <p className="mt-2 text-[14px] text-foreground/25">
            也可通过顶部搜索框输入关键词进行搜索
          </p>
        </div>
      </div>
    )
  }

  const cat = FAQ_CATEGORIES.find((c) => c.id === selectedQuestion.category)
  const siblings = cat ? FAQ.filter((f) => f.category === cat.id) : []
  const idx = siblings.findIndex((f) => f.id === selectedQuestion.id)
  const relatedFaqs = selectedQuestion.relatedLinks
    ?.map((link) => FAQ.find((f) => f.id === link.faqId))
    .filter(Boolean) as FaqEntry[] | undefined

  return (
    <div id={`faq-${selectedQuestion.id}`}>
      {/* 面包屑 */}
      <nav className="mb-5 flex items-center gap-1.5 text-[14px] text-foreground/40">
        <button
          type="button"
          onClick={() => onSelectQuestion(null)}
          className="transition-colors hover:text-foreground/70"
        >
          帮助中心
        </button>
        {cat && (
          <>
            <span className="text-foreground/15 select-none">&gt;</span>
            <button
              type="button"
              onClick={() => onSelectQuestion(null)}
              className="transition-colors hover:text-foreground/70"
            >
              {cat.title}
            </button>
          </>
        )}
        <span className="text-foreground/15 select-none">&gt;</span>
        <span className="text-foreground/70 font-medium truncate max-w-64">
          {selectedQuestion.q}
        </span>
      </nav>

      {/* 标题 */}
      <h2 className="text-[24px] font-bold tracking-tight text-foreground mb-2">
        {selectedQuestion.q}
      </h2>

      {/* 步骤指示器（有步骤时显示） */}
      {selectedQuestion.steps && selectedQuestion.steps.length > 1 && (
        <StepIndicator steps={selectedQuestion.steps} />
      )}

      {/* 引言 */}
      <p className="text-[18px] leading-relaxed text-foreground/80 max-w-[72ch] mb-5">
        {selectedQuestion.intro}
      </p>

      {/* 操作步骤 */}
      {selectedQuestion.steps && selectedQuestion.steps.length > 0 && (
        <div className="mb-6">
          {selectedQuestion.steps.length > 2 ? (
            <CollapsibleBlock
              title={`查看全部 ${selectedQuestion.steps.length} 个步骤`}
              defaultOpen={selectedQuestion.steps.length <= 3}
            >
              <ol className="space-y-4">
                {selectedQuestion.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-[12px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="text-[16px] font-semibold text-foreground/85">
                        {step.title}
                      </h4>
                      <p className="text-[15px] leading-relaxed text-foreground/60 mt-0.5">
                        {step.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CollapsibleBlock>
          ) : (
            <ol className="space-y-4">
              {selectedQuestion.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-[12px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="text-[16px] font-semibold text-foreground/85">
                      {step.title}
                    </h4>
                    <p className="text-[15px] leading-relaxed text-foreground/60 mt-0.5">
                      {step.content}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* 引用块 */}
      {selectedQuestion.tips && selectedQuestion.tips.length > 0 && (
        <div className="mb-6">
          {selectedQuestion.tips.map((tip, i) => (
            <BlockquoteBlock key={i} type={tip.type} content={tip.content} />
          ))}
        </div>
      )}

      {/* 相关链接 */}
      {relatedFaqs && relatedFaqs.length > 0 && (
        <div className="mt-8 border-t border-border/40 pt-5">
          <h4 className="text-[14px] font-semibold uppercase tracking-wider text-foreground/25 mb-3">
            继续阅读
          </h4>
          <div className="space-y-1.5">
            {relatedFaqs.map((faq) => (
              <button
                key={faq.id}
                type="button"
                onClick={() => onSelectQuestion(faq)}
                className="flex items-center gap-2 text-[15px] text-accent/70 transition-colors hover:text-accent"
              >
                <ArrowRight className="size-3.5" />
                {faq.q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 上一篇 / 下一篇 */}
      {(idx > 0 || idx < siblings.length - 1) && (
        <div className="mt-10 flex items-center justify-between border-t border-border/40 pt-5">
          {idx > 0 ? (
            <button
              type="button"
              onClick={() => onSelectQuestion(siblings[idx - 1])}
              className="group flex items-center gap-1.5 text-[14px] font-medium text-foreground/35 transition-colors hover:text-accent"
            >
              <ArrowRight className="size-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              <span className="max-w-48 truncate">{siblings[idx - 1].q}</span>
            </button>
          ) : (
            <div />
          )}
          {idx < siblings.length - 1 ? (
            <button
              type="button"
              onClick={() => onSelectQuestion(siblings[idx + 1])}
              className="group flex items-center gap-1.5 text-[14px] font-medium text-foreground/35 transition-colors hover:text-accent"
            >
              <span className="max-w-48 truncate">{siblings[idx + 1].q}</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  )
}

// ---------- 右侧页内目录 TOC ----------
function FaqTocPanel({
  selectedQuestion,
  onSelectQuestion,
}: {
  selectedQuestion: FaqEntry | null
  onSelectQuestion: (faq: FaqEntry | null) => void
}) {
  if (!selectedQuestion) return null

  const cat = FAQ_CATEGORIES.find((c) => c.id === selectedQuestion.category)
  if (!cat) return null

  const entries = FAQ.filter((f) => f.category === cat.id)

  return (
    <div>
      <h4 className="mb-3 px-2 text-[12px] font-semibold uppercase tracking-widest text-foreground/30">
        本页内容
      </h4>
      <div className="space-y-px">
        {entries.map((faq) => {
          const isActive = selectedQuestion.id === faq.id
          return (
            <a
              key={faq.id}
              href={`#faq-${faq.id}`}
              onClick={(e) => {
                e.preventDefault()
                onSelectQuestion(faq)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[14px] leading-snug transition-colors no-underline',
                isActive
                  ? 'text-accent font-medium'
                  : 'text-foreground/35 font-normal hover:text-foreground/60',
              )}
            >
              <span
                className={cn(
                  'size-1 shrink-0 rounded-full transition-colors',
                  isActive ? 'bg-accent' : 'bg-foreground/12',
                )}
              />
              <span className="line-clamp-2">{faq.q}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ---------- 搜索结果导航 ----------
function SearchNav({ total, onPrev, onNext }: { total: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <span className="text-xs text-text-muted">找到 {total} 个结果</span>
      <div className="flex gap-1">
        <button onClick={onPrev} className="flex size-7 items-center justify-center rounded-md border border-border text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors">
          <ArrowUp className="size-3.5" />
        </button>
        <button onClick={onNext} className="flex size-7 items-center justify-center rounded-md border border-border text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors">
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ---------- 返回顶部 ----------
function BackToTop() {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.querySelector(
      '.help-scroll-container',
    ) as HTMLElement | null
    if (!el) return
    containerRef.current = el
    const onScroll = () => setVisible(el.scrollTop > 400)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() =>
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
      className="fixed bottom-6 right-6 z-30 flex size-10 items-center justify-center rounded-full border border-border/50 bg-card/90 backdrop-blur-sm text-foreground/40 shadow-lg transition-all hover:text-accent hover:border-accent/40 hover:shadow-accent/10"
      aria-label="返回顶部"
    >
      <ArrowUp className="size-4" />
    </button>
  )
}

// ---------- 品牌像素卡片 ----------
function JumpBrandCard({
  entry,
  onNavigate,
}: {
  entry: PageEntry
  onNavigate: (path: string, params: Record<string, string> | null) => void
}) {
  const Icon = entry.icon
  const palette = PAGE_PALETTES[entry.id] || PAGE_PALETTES['help']
  const brand = PAGE_BRANDS[entry.id] || PAGE_BRANDS['help']

  return (
    <button
      type="button"
      onClick={() => onNavigate(entry.path, null)}
      className="group relative flex flex-col items-center justify-center gap-2 text-center transition-all duration-300 bg-transparent hover:bg-accent/[0.04] w-full aspect-[16/10] overflow-hidden border-r border-b border-border/30"
      style={{ ['--brand' as string]: brand }}
    >
      <PixelCanvas colors={palette} gap={8} speed={20} />
      <div
        className={cn(
          'absolute inset-0 z-[2] opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          'shadow-[inset_0_-48px_32px_-16px_color-mix(in_srgb,var(--brand)_10%,transparent)]',
        )}
      />
      <Icon
        className={cn(
          'relative z-[3] size-7 transition-all duration-500',
          'text-foreground/25 group-hover:text-[var(--brand)] group-hover:scale-110',
        )}
      />
      <span
        className={cn(
          'relative z-[3] text-[14px] font-semibold transition-all duration-500',
          'text-foreground/35 group-hover:text-foreground/90',
        )}
      >
        {entry.title}
      </span>
    </button>
  )
}

// ---------- 跳转卡片 ----------
export function JumpCard({
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
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-accent/30 hover:bg-accent/[0.04] hover:shadow-[0_0_20px_rgba(var(--accent-color-rgb),0.06)] w-full"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {label.title}
          </span>
          <ArrowRight className="size-3.5 text-accent/50 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
        <p className="mt-0.5 text-sm text-foreground/60 line-clamp-1">
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
  const location = useLocation()
  const [mode, setMode] = useState<HelpMode>('ask')
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // —— 页面过滤（跳转模式）——
  const filteredPages = useMemo(() => {
    const q = query.trim()
    if (!q) return PAGE_MAP
    const results = classifyIntent(q)
    if (results.length > 0) return results.map((r) => r.page)
    const lowered = q.toLowerCase()
    return PAGE_MAP.filter(
      (p) =>
        p.title.toLowerCase().includes(lowered) ||
        p.desc.toLowerCase().includes(lowered) ||
        p.keywords.some((kw) => kw.includes(lowered)),
    )
  }, [query])

  // —— 意图匹配完整结果 ——
  const intentResults = useMemo(() => {
    const q = query.trim()
    if (!q) return [] as MatchResult[]
    return classifyIntent(q)
  }, [query])

  // —— FAQ 匹配 ——
  const matchedFaq = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return FAQ.filter((faq) => {
      if (faq.q.toLowerCase().includes(q)) return true
      if (faq.keywords.some((kw) => kw.toLowerCase().includes(q))) return true
      if (faq.intro.toLowerCase().includes(q)) return true
      if (faq.steps?.some((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))) return true
      if (faq.tips?.some((t) => t.content.toLowerCase().includes(q))) return true
      return false
    })
  }, [query])

  // —— 文档导航状态 ——
  const [selectedQuestion, setSelectedQuestion] = useState<FaqEntry | null>(
    null,
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(FAQ_CATEGORIES.map((c) => c.id)),
  )

  // —— 处理 URL hash 锚点 ——
  useEffect(() => {
    const hash = location.hash
    if (hash.startsWith('#faq-')) {
      const faqId = hash.slice(5)
      const faq = FAQ.find((f) => f.id === faqId)
      if (faq) {
        setMode('ask')
        setSelectedQuestion(faq)
        setExpandedCategories((prev) => {
          const next = new Set(prev)
          next.add(faq.category)
          return next
        })
      }
    }
  }, [location.hash])

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // —— 选择问题时更新 URL hash ——
  const handleSelectQuestion = useCallback((faq: FaqEntry | null) => {
    setSelectedQuestion(faq)
    setSubmitted(false)
    if (faq) {
      window.history.replaceState(null, '', `#faq-${faq.id}`)
    } else {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

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
      if (intentResults.length > 0) {
        const top = intentResults[0]
        handleJumpNavigate(top.page.path, top.params)
        return
      }
    }
    setSubmitted(true)
    setSelectedQuestion(null)
  }, [query, mode, handleJumpNavigate, intentResults])

  // 计算搜索结果中匹配的 FAQ 分类展开
  const searchExpandedCategories = useMemo(() => {
    if (!submitted || matchedFaq.length === 0) return expandedCategories
    const cats = new Set(expandedCategories)
    matchedFaq.forEach((f) => cats.add(f.category))
    return cats
  }, [submitted, matchedFaq, expandedCategories])

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const sc = document.querySelector('.help-scroll-container') as HTMLElement | null
    const scrollTop = sc ? sc.scrollTop : window.scrollY
    const containerTop = sc ? sc.getBoundingClientRect().top : 0
    const y = el.getBoundingClientRect().top + scrollTop - containerTop - 80
    ;(sc || window).scrollTo({ top: y, behavior: 'smooth' })
  }

  const tocItems = useMemo(() => {
    const items: import('@/components/ui/dynamic-island-toc').TocItem[] = []
    for (const cat of FAQ_CATEGORIES) {
      const entries = FAQ.filter((f) => f.category === cat.id)
      if (entries.length === 0) continue
      items.push({ id: `cat-${cat.id}`, text: cat.title, level: 1, onClick: () => scrollToAnchor(`cat-${cat.id}`) })
      for (const faq of entries) {
        items.push({ id: `faq-${faq.id}`, text: faq.q, level: 2, onClick: () => scrollToAnchor(`faq-${faq.id}`) })
      }
    }
    return items
  }, [])

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      {/* ====== 共享顶部工具栏 ====== */}
      <div className="shrink-0 border-b border-border/40">
        <div className="flex justify-center px-5 pt-5">
          <LimelightNav
            items={helpNavItems}
            activeIndex={mode === 'ask' ? 0 : 1}
            onTabChange={(index) => {
              setMode(index === 0 ? 'ask' : 'jump')
              setSubmitted(false)
              setSelectedQuestion(null)
              window.history.replaceState(null, '', window.location.pathname)
            }}
            limelightClassName="w-16"
          />
        </div>
      </div>

      {/* ====== 模式内容 ====== */}
      {mode === 'ask' ? (
        <article id="help-full-content" className="help-scroll-container min-w-0 flex-1 overflow-y-auto px-6 py-8 sm:px-12 scroll-smooth">
          <div className="mx-auto max-w-3xl">
            {FAQ_CATEGORIES.map((cat) => {
                const entries = FAQ.filter((f) => f.category === cat.id)
                if (entries.length === 0) return null
                const CatIcon = cat.icon
                return (
                  <section key={cat.id} className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <CatIcon className="size-4.5" />
                      </div>
                      <h2 id={`cat-${cat.id}`} className="text-xl font-bold text-foreground">{cat.title}</h2>
                    </div>
                    <div className="space-y-8">
                      {entries.map((faq) => (
                        <div key={faq.id}>
                          <h3 id={`faq-${faq.id}`} className="text-lg font-semibold text-foreground mb-3">
                            {faq.q}
                          </h3>
                          <FaqAnswerContent faq={faq} />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })
            }
          </div>
        </article>
      ) : (
        /* ====== 跳转模式：品牌卡片矩阵 ====== */
        <div className="help-scroll-container flex min-h-0 flex-1 flex-col overflow-y-scroll thin-scroll">
          <div className="flex-1 overflow-y-auto p-8">
            {intentResults.length > 0 && (
              <div className="mx-auto mb-8 max-w-3xl">
                <p className="mb-3 px-1 text-[14px] font-medium text-foreground/35">
                  智能匹配到{' '}
                  <span className="text-accent">{intentResults.length}</span>{' '}
                  个页面
                </p>
                <div className="space-y-3">
                  {intentResults.map((match) => (
                    <JumpCard
                      key={match.page.id}
                      match={match}
                      onNavigate={handleJumpNavigate}
                    />
                  ))}
                </div>
                {filteredPages.length > 0 && (
                  <p className="mt-8 mb-3 px-1 text-[14px] font-medium text-foreground/25">
                    其他相关页面
                  </p>
                )}
              </div>
            )}
            {filteredPages.length > 0 ? (
              !query.trim() ? (
                <LogoGrid
                  heading="选择要前往的页面"
                  pages={filteredPages.map((p) => ({
                    id: p.id,
                    title: p.title,
                    icon: <p.icon className="size-5" />,
                    pixelColors: PAGE_PALETTES[p.id] ?? PAGE_PALETTES['help'],
                    onClick: () => handleJumpNavigate(p.path, null),
                  }))}
                />
              ) : (
                <div className="mx-auto max-w-6xl rounded-xl overflow-hidden border border-border/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredPages.map((entry) => (
                      <JumpBrandCard
                        key={entry.id}
                        entry={entry}
                        onNavigate={handleJumpNavigate}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent/[0.05]">
                  <Target className="size-6 text-foreground/12" />
                </div>
                <p className="text-base font-medium text-foreground/35">
                  未找到匹配的页面
                </p>
                <p className="text-[15px] text-foreground/22 mt-1.5 max-w-md">
                  试试：
                  {['"王者荣耀"', '"发布需求"', '"订单"', '"认证"'].map(
                    (s, i) => (
                      <span key={s} className="text-foreground/30">
                        {i > 0 ? '、' : ' '}
                        {s}
                      </span>
                    ),
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'ask' && <DynamicIslandTOC items={tocItems} />}
      <BackToTop />
    </div>
  )
}
