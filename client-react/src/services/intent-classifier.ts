/**
 * 前端意图分类器 — L0 系统指令层
 *
 * 在用户输入到达 LLM 之前，先由本地分类器拦截：
 *   L0: 系统导航/UI操作 → 前端直接执行，0 LLM 调用
 *   L1: 简单查询 → 可本地处理，也可走 LLM
 *   L2/L3: 复杂任务 → 交给 LLM 工具执行
 *
 * 匹配方式：正则关键词（轻量，无模型依赖，<1ms）
 */

// ─── 路由表 ─────────────────────────────────────────────────────────────────

export interface SystemIntent {
  type: 'navigate'
  /** target path */
  path: string
  title: string
}

interface PatternEntry {
  patterns: RegExp[]
  action: SystemIntent
  /** 是否必须精确匹配（排除误触发） */
  exact?: boolean
}

const NAV_PATTERNS: PatternEntry[] = [
  {
    patterns: [
      /^(去|到|回|跳转到|帮我跳转到|打开)?(首页|主页|发现|discover)$/i,
      /^回到首页$/i,
      /^去发现$/i,
    ],
    action: { type: 'navigate', path: '/discover', title: '发现页' },
  },
  {
    patterns: [
      /^去发布$/i,
      /^我要发布/i,
      /^发需求$/i,
      /^(去|到)?发布(需求|页)/i,
      /^帮我发(布)?(需求|单)/i,
    ],
    action: { type: 'navigate', path: '/demands/create', title: '发布需求' },
  },
  {
    patterns: [
      /^看(看)?(我(的)?)?需求/i,
      /^(我的|我发布的)需求$/i,
      /^管理需求/i,
      /^去我的需求$/i,
    ],
    action: { type: 'navigate', path: '/my-demands', title: '我的需求' },
  },
  {
    patterns: [/^看(看)?(我(的)?)?订单$/i, /^订单$/i, /^(我的|我(的)?)订单/i],
    action: { type: 'navigate', path: '/orders', title: '订单' },
  },
  {
    patterns: [/^设置$/i, /^打开设置/i, /^偏好设置$/i, /^去设置$/i],
    action: { type: 'navigate', path: '/settings', title: '设置' },
  },
  {
    patterns: [/^帮助$/i, /^帮助文档$/i, /^怎么用$/i, /^使用帮助$/i],
    action: { type: 'navigate', path: '/help', title: '帮助文档' },
  },
  {
    patterns: [/^消(息)?$/i, /^看消息$/i, /^我的消息$/i, /^私信$/i, /^聊天$/i],
    action: { type: 'navigate', path: '/messages', title: '消息' },
  },
  {
    patterns: [/^(去)?卡池$/i, /^打开卡池/i],
    action: { type: 'navigate', path: '/card-pool', title: '卡池' },
  },
  {
    patterns: [/^死池$/i, /^去死池/i, /^看(看)?死池/i],
    action: { type: 'navigate', path: '/card-pool/dead', title: '死池' },
  },
  {
    patterns: [/^认证$/i, /^认证中心$/i, /^去认证/i, /^实名认证$/i],
    action: { type: 'navigate', path: '/cert-center', title: '认证中心' },
  },
  {
    patterns: [/^(去)?圈子$/i, /^打开圈子/i, /^看圈子$/i],
    action: { type: 'navigate', path: '/circles', title: '圈子' },
  },
  {
    patterns: [/^(去)?公益(中心)?$/i, /^福利中心$/i],
    action: { type: 'navigate', path: '/welfare', title: '公益中心' },
  },
  {
    patterns: [/^市场分析$/i, /^标签统计$/i, /^(去)?看(看)?市场/i],
    action: { type: 'navigate', path: '/tag-stats', title: '市场分析' },
  },
  {
    patterns: [/^交易(记录)?$/i, /^(我的|我(的)?)交易/i, /^结算(明细)?$/i],
    action: { type: 'navigate', path: '/transactions', title: '交易记录' },
  },
  {
    patterns: [/^找人$/i, /^找师傅$/i, /^搜索用户/i],
    action: { type: 'navigate', path: '/search', title: '找人' },
  },
  {
    patterns: [/^个人(主页)?$/i, /^我的主页/i, /^(我的)资料/i],
    action: { type: 'navigate', path: '/profile', title: '个人主页' },
  },
  {
    patterns: [/^AI(助手)?$/i, /^机器人$/i, /^打开AI/i, /^对话$/i],
    action: { type: 'navigate', path: '/agent', title: 'AI 助手' },
  },
  {
    patterns: [/^刷新$/i, /^重新加载$/i, /^刷新页面$/i],
    action: { type: 'navigate', path: '__reload__', title: '' },
  },
  {
    patterns: [
      /^(去|到|打开|帮我跳转到)(后台|管理后台|后台管理|管理员)/i,
      /^后台(管理)?$/i,
      /^管理后台$/i,
      /^管理员(面板)?$/i,
    ],
    action: { type: 'navigate', path: '/dashboard', title: '后台管理' },
  },
]

// ─── 简单操作模式（可直接走本地无须 LLM） ────────────────────────────────────

export interface SimpleQuery {
  type: 'search' | 'my_list'
  category?: string
  keyword?: string
  listType?: string
}

const SIMPLE_PATTERNS: {
  patterns: RegExp[]
  extract: (m: RegExpMatchArray) => SimpleQuery | null
}[] = [
  {
    // "搜一下王者"、"看看编程的需求"、"搜索王者荣耀代打"
    patterns: [
      /^搜(索|一下)?\s*(.+)/i,
      /^看(看)?\s*(.+)(的)?需求/i,
      /^搜索\s*(.+)/i,
    ],
    extract: (m) => ({ type: 'search', keyword: m[2] || m[1] }),
  },
]

// ─── 分类器 ─────────────────────────────────────────────────────────────────

export type IntentType =
  | { level: 'L0'; intent: SystemIntent; raw: string }
  | { level: 'L1'; intent: SimpleQuery; raw: string }
  | { level: 'L2_L3'; raw: string }

/**
 * 对用户输入进行本地意图分类
 *
 * 返回值：
 *   L0 — 系统导航，调用方可直接执行（路由跳转等）
 *   L1 — 简单查询，可直接本地处理
 *   L2_L3 — 复杂任务，需交给 LLM
 */
const NAV_PREFIX_RE = /^(跳转到|跳转|帮我跳转到|帮我跳转|打开)/i

export function classifyIntent(input: string): IntentType {
  let trimmed = input.trim()
  if (!trimmed) return { level: 'L2_L3', raw: input }

  // 统一剥掉导航前缀，使所有 L0 规则天然支持「跳转到/打开 + 目标」
  trimmed = trimmed.replace(NAV_PREFIX_RE, '')

  // 先匹配 L0 系统导航（精确优先）
  for (const entry of NAV_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(trimmed)) {
        return { level: 'L0', intent: entry.action, raw: trimmed }
      }
    }
  }

  // 然后匹配 L1 简单查询
  for (const entry of SIMPLE_PATTERNS) {
    for (const pattern of entry.patterns) {
      const m = trimmed.match(pattern)
      if (m) {
        const extracted = entry.extract(m)
        if (extracted) return { level: 'L1', intent: extracted, raw: trimmed }
      }
    }
  }

  // 默认走 LLM
  return { level: 'L2_L3', raw: trimmed }
}

/**
 * 判断是否属于「明显需要 LLM」的复杂任务
 * 用于二段判断：非 L0 且非简单模式时再确认是否真的需要 LLM
 */
export function isComplexTask(input: string): boolean {
  const trimmed = input.trim()
  // 包含数量+单位+动作 = 复杂任务
  const hasComplexity =
    /(预算|价格|金额)\s*\d+/.test(trimmed) ||
    /(帮我|我要|我想).*(发布|发|创建|申请|接受|拒绝|下架|撤回)/.test(trimmed) ||
    /(同时|并且|然后|再).*(发布|申请|接受)/.test(trimmed) ||
    /^(帮我|我要|我想).{8,}/.test(trimmed)
  return hasComplexity
}
