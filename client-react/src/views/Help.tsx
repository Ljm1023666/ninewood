import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PixelCanvas,
  Component as LogoGrid,
} from '@/components/ui/pixel-logo-grid'
import { PageHeader } from '@/components/layout/PageHeader'
import { InternalPageShell } from '@/components/layout/internal-ui'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
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
  icon: string
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
    icon: STITCH_PAGE_ICONS['demand-create'],
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
    id: 'providers',
    path: '/providers',
    icon: STITCH_PAGE_ICONS.providers,
    title: '找服务者',
    desc: '按标签搜索空闲/忙碌的服务者',
    accepts: [],
    acceptsEntities: [],
    keywords: ['找服务者', '服务者', '搜索服务', '找人服务', '出租车', '司机'],
  },
  {
    id: 'my-demands',
    path: '/my-demands',
    icon: STITCH_PAGE_ICONS['my-demands'],
    title: '我的需求',
    desc: '管理已发布的需求，查看申请人列表',
    accepts: ['manage'],
    acceptsEntities: [],
    keywords: ['我的需求', '管理需求', '我发的', '已发布'],
  },
  {
    id: 'orders',
    path: '/orders',
    icon: STITCH_PAGE_ICONS.orders,
    title: '订单',
    desc: '查看所有订单和交易记录',
    accepts: [],
    acceptsEntities: [],
    keywords: ['订单', '交易', '购买', '支付', '订单记录'],
  },
  {
    id: 'cert-center',
    path: '/cert-center',
    icon: STITCH_PAGE_ICONS['cert-center'],
    title: '认证中心',
    desc: '查看认证等级，申请或升级认证',
    accepts: ['cert'],
    acceptsEntities: [],
    keywords: ['认证', '资质', '证书', '认证中心', '等级'],
  },
  {
    id: 'messages',
    path: '/messages',
    icon: STITCH_PAGE_ICONS.messages,
    title: '消息',
    desc: '查看私信、群聊和系统通知',
    accepts: ['messages'],
    acceptsEntities: [],
    keywords: ['消息', '私信', '聊天', '通知', '对话', '联系'],
  },
  {
    id: 'settings',
    path: '/settings',
    icon: STITCH_PAGE_ICONS.settings,
    title: '设置',
    desc: '应用设置、主题切换和偏好配置',
    accepts: ['settings'],
    acceptsEntities: [],
    keywords: ['设置', '配置', '偏好', '主题'],
  },
  {
    id: 'profile',
    path: '/profile',
    icon: STITCH_PAGE_ICONS.profile,
    title: '个人主页',
    desc: '查看和编辑个人资料、头像、简介',
    accepts: [],
    acceptsEntities: [],
    keywords: ['个人主页', '资料', '编辑资料', '头像', '我的'],
  },
  {
    id: 'card-pool',
    path: '/card-pool',
    icon: STITCH_PAGE_ICONS['card-pool'],
    title: '卡池',
    desc: '以卡牌形式浏览服务分类，筛选匹配需求',
    accepts: [],
    acceptsEntities: [],
    keywords: ['卡池', '分类', '手牌', '卡包', '筛选需求', '服务分类'],
  },
  {
    id: 'circles',
    path: '/circles',
    icon: STITCH_PAGE_ICONS.circles,
    title: '圈子',
    desc: '加入兴趣圈子，和同好交流互动',
    accepts: [],
    acceptsEntities: [],
    keywords: ['圈子', '社区', '群组', '交流', '加入圈子'],
  },
  {
    id: 'dead-pool',
    path: '/card-pool/dead',
    icon: STITCH_PAGE_ICONS['dead-pool'],
    title: '死池',
    desc: '浏览已过期或流拍的需求，捡漏机会',
    accepts: [],
    acceptsEntities: [],
    keywords: ['死池', '过期', '流拍', '捡漏', '已结束'],
  },
  {
    id: 'my-bids',
    path: '/my-bids',
    icon: STITCH_PAGE_ICONS['my-bids'],
    title: '我的应标',
    desc: '管理已投递的应标和竞标记录',
    accepts: ['bids'],
    acceptsEntities: [],
    keywords: ['应标', '竞标', '投标', '我的应标', '投递'],
  },
  {
    id: 'my-tags',
    path: '/my-tags',
    icon: STITCH_PAGE_ICONS['my-tags'],
    title: '标签管理',
    desc: '管理服务标签，优化需求匹配',
    accepts: [],
    acceptsEntities: [],
    keywords: ['标签', '服务标签', '标签管理', '分类标签'],
  },
  {
    id: 'certified-search',
    path: '/discover/certified',
    icon: STITCH_PAGE_ICONS['certified-search'],
    title: '认证服务者',
    desc: '搜索已认证的高质量服务者',
    accepts: [],
    acceptsEntities: [],
    keywords: ['认证', '服务者', '认证服务者', '搜认证', '认证找人'],
  },
  {
    id: 'search',
    path: '/search',
    icon: STITCH_PAGE_ICONS.search,
    title: '找人',
    desc: '搜索其他用户，查看个人主页',
    accepts: [],
    acceptsEntities: [],
    keywords: ['找人', '用户', '搜索用户', '个人主页', '找师傅'],
  },
  {
    id: 'licenses',
    path: '/licenses',
    icon: STITCH_PAGE_ICONS.licenses,
    title: '开源许可',
    desc: '查看第三方开源组件的许可证信息',
    accepts: [],
    acceptsEntities: [],
    keywords: ['许可', 'license', '开源', 'MIT', '依赖', '第三方', '版权'],
  },
  {
    id: 'my-tags-manage',
    path: '/my-tags-manage',
    icon: STITCH_PAGE_ICONS['my-tags-manage'],
    title: '标签管理',
    desc: '管理服务标签开关与可见性',
    accepts: [],
    acceptsEntities: [],
    keywords: ['标签', '服务标签', '开关', '空闲', '忙碌'],
  },
  {
    id: 'push-settings',
    path: '/push-settings',
    icon: STITCH_PAGE_ICONS['push-settings'],
    title: '推送设置',
    desc: '管理推送偏好，拒绝不想收到的内容',
    accepts: [],
    acceptsEntities: [],
    keywords: ['推送', '通知', '偏好', '排除'],
  },
  {
    id: 'welfare',
    path: '/welfare',
    icon: STITCH_PAGE_ICONS.welfare,
    title: '公益中心',
    desc: '发布公益需求，查看公益资金池',
    accepts: [],
    acceptsEntities: [],
    keywords: ['公益', '慈善', '求助', '捐赠', '寻人'],
  },
  {
    id: 'circles-list',
    path: '/circles-list',
    icon: STITCH_PAGE_ICONS['circles-list'],
    title: '需求圈',
    desc: '浏览公开需求圈，加入参与',
    accepts: [],
    acceptsEntities: [],
    keywords: ['需求圈', '圈子', '公开圈', '加入'],
  },
  {
    id: 'tag-stats',
    path: '/tag-stats',
    icon: STITCH_PAGE_ICONS['tag-stats'],
    title: '市场分析',
    desc: '按标签查看市场指标与趋势',
    accepts: [],
    acceptsEntities: [],
    keywords: ['统计', '市场', '分析', '指标', '趋势'],
  },
  {
    id: 'home',
    path: '/',
    icon: STITCH_PAGE_ICONS.home,
    title: '首页',
    desc: '返回平台首页，查看最新动态',
    accepts: [],
    acceptsEntities: [],
    keywords: ['首页', '主页', '返回首页'],
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    icon: STITCH_PAGE_ICONS.dashboard,
    title: '管理后台',
    desc: '业务指标监控、用户管理和系统资源面板',
    accepts: [],
    acceptsEntities: [],
    keywords: ['管理', '后台', '管理员', 'dashboard', 'admin', '数据', '监控'],
  },
  {
    id: 'transactions',
    path: '/transactions',
    icon: STITCH_PAGE_ICONS.transactions,
    title: '交易记录',
    desc: '查看所有已完成交易的结算明细',
    accepts: [],
    acceptsEntities: [],
    keywords: ['交易', '记录', '结算', '明细', '账单', '收支'],
  },
  {
    id: 'discover',
    path: '/discover',
    icon: STITCH_PAGE_ICONS.discover,
    title: '发现页',
    desc: '星空主题发现页，搜索和筛选需求',
    accepts: ['discover'],
    acceptsEntities: ['game', 'service'],
    keywords: ['发现', '搜索', '浏览', '寻觅', '遇见', '星空'],
  },
  {
    id: 'agent',
    path: '/agent',
    icon: STITCH_PAGE_ICONS.agent,
    title: 'AI 助手',
    desc: '智能 AI 对话助手，回答问题并辅助操作',
    accepts: [],
    acceptsEntities: [],
    keywords: ['AI', '助手', '机器人', '对话', 'agent', '智能'],
  },
  {
    id: 'help-docs',
    path: '/help/docs',
    icon: STITCH_PAGE_ICONS['help-docs'],
    title: '帮助文档',
    desc: '平台使用说明、FAQ 与操作指南',
    accepts: [],
    acceptsEntities: [],
    keywords: ['帮助', '帮助文档', 'FAQ', '文档', '怎么用', '教程'],
  },

]

const PAGE_PALETTES: Record<string, string[]> = {
  'demand-create': ['#f97316', '#ea580c', '#fb923c', '#fdba74', '#fed7aa'],
  providers: ['#7C3AED', '#6D28D9', '#A78BFA', '#C4B5FD', '#EDE9FE'],
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
  home: ['#6366f1', '#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe'],
  licenses: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0'],
  agent: ['#a855f7', '#9333ea', '#c084fc', '#d8b4fe', '#e9d5ff'],
  'help-docs': ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe'],
  'my-tags-manage': ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'],
  'push-settings': ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a'],
  welfare: ['#ef4444', '#dc2626', '#f87171', '#fca5a5', '#fecaca'],
  'circles-list': ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe'],
  'tag-stats': ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  dashboard: ['#FFFFFF', '#CCCCCC', '#9A9A9A', '#5A5A5A', '#2A2A2A'],
  transactions: ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fde68a'],
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
  home: '#6366f1',
  licenses: '#22c55e',
  agent: '#a855f7',
  'help-docs': '#3b82f6',
  'my-tags-manage': '#10b981',
  'push-settings': '#f59e0b',
  welfare: '#ef4444',
  'circles-list': '#3b82f6',
  'tag-stats': '#8b5cf6',
  dashboard: '#FFFFFF',
  transactions: '#f59e0b',
}

/** Stitch Navigation Matrix 磁贴顺序（其余页面追加在后） */
const STITCH_MATRIX_ORDER = [
  'demand-create',
  'providers',
  'my-demands',
  'orders',
  'cert-center',
  'messages',
  'settings',
  'profile',
  'card-pool',
  'circles',
  'dead-pool',
  'my-bids',
  'my-tags',
  'certified-search',
  'search',
  'push-settings',
  'welfare',
  'circles-list',
  'tag-stats',
  'help-docs',
] as const

function sortPagesForMatrix(pages: PageEntry[]) {
  const rank = new Map(
    STITCH_MATRIX_ORDER.map((id, index) => [id, index] as const),
  )
  return [...pages].sort((a, b) => {
    const ra = rank.get(a.id as (typeof STITCH_MATRIX_ORDER)[number])
    const rb = rank.get(b.id as (typeof STITCH_MATRIX_ORDER)[number])
    if (ra == null && rb == null) return 0
    if (ra == null) return 1
    if (rb == null) return -1
    return ra - rb
  })
}

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


// ---------- 品牌像素卡片 ----------
function JumpBrandCard({
  entry,
  onNavigate,
}: {
  entry: PageEntry
  onNavigate: (path: string, params: Record<string, string> | null) => void
}) {
  const palette = PAGE_PALETTES[entry.id] || PAGE_PALETTES['help-docs']
  const brand = PAGE_BRANDS[entry.id] || PAGE_BRANDS['help-docs']

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
      <MsIcon
        name={entry.icon}
        size={28}
        className="relative z-[3] transition-all duration-500 group-hover:scale-110 text-foreground/35 group-hover:text-[var(--brand)]"
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
        <MsIcon name={match.page.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {label.title}
          </span>
          <MsIcon
            name="arrow_forward"
            size={14}
            className="text-accent/50 transition-all group-hover:translate-x-0.5 group-hover:text-accent"
          />
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

export default function Help() {
  const navigate = useNavigate()
  const [query] = useState('')

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

  const intentResults = useMemo(() => {
    const q = query.trim()
    if (!q) return [] as MatchResult[]
    return classifyIntent(q)
  }, [query])

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

  const matrixPages = useMemo(
    () => sortPagesForMatrix(filteredPages),
    [filteredPages],
  )

  return (
    <InternalPageShell
      width="matrix"
      flush
      className="nav-matrix-page"
      contentClassName="flex min-h-0 h-auto flex-1 flex-col"
    >
      <PageHeader
        title="帮助中心"
        onBack="back"
        divider={false}
        className="nav-matrix-page__header mb-0 shrink-0 !px-12 !pb-0 !pt-0"
      />
      <div className="nav-matrix-page__main relative z-[1] flex w-full flex-1 flex-col">
        {intentResults.length > 0 && (
          <div className="mx-auto mb-8 w-full max-w-3xl">
            <p className="mb-3 px-1 text-[14px] font-medium text-text-muted">
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
              <p className="mb-3 mt-8 px-1 text-[14px] font-medium text-text-muted">
                其他相关页面
              </p>
            )}
          </div>
        )}
        {filteredPages.length > 0 ? (
          !query.trim() ? (
            <LogoGrid
              heading="选择要前往的页面"
              subtitle="NINEWOOD · NAVIGATION MATRIX"
              pages={matrixPages.map((p) => ({
                id: p.id,
                title: p.title,
                icon: <MsIcon name={p.icon} size={28} />,
                pixelColors: PAGE_PALETTES[p.id] ?? PAGE_PALETTES['help-docs'],
                onClick: () => handleJumpNavigate(p.path, null),
              }))}
            />
          ) : (
            <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-border/30">
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
              <MsIcon name="search_off" size={20} className="text-foreground/12" />
            </div>
            <p className="text-base font-medium text-foreground/35">
              未找到匹配的页面
            </p>
            <p className="mt-1.5 max-w-md text-[15px] text-foreground/22">
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
    </InternalPageShell>
  )
}
