/**
 * Agent 配额与限流服务
 * 基于内存存储，多粒度控制 LLM 调用次数
 */
interface QuotaRecord {
  daily: number
  hourly: number
  session: Record<string, number> // conversationId → count
  slidingWindow: number[] // timestamps
  bannedUntil: number | null
}

interface IpQuota {
  daily: number
  bannedUntil: number | null
}

const store = new Map<string, QuotaRecord>()
const ipStore = new Map<string, IpQuota>()

const DAILY_LIMIT = 150
const HOURLY_LIMIT = 50
const SESSION_LIMIT = 250
const IP_DAILY_LIMIT = 1000
const SLIDING_WINDOW_MS = 60_000 // 1 分钟
const SLIDING_MAX = 25 // 1 分钟内最多 25 次

// 冷却惩罚（毫秒）
const COOLDOWN_1 = 30_000 // 30 秒
const COOLDOWN_2 = 300_000 // 5 分钟
const COOLDOWN_3 = 86_400_000 // 当日封禁

/** 每日重置 */
function resetIfNewDay(record: QuotaRecord): void {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if ((record as any)._dayTs !== today) {
    record.daily = 0
    ;(record as any)._dayTs = today
  }
}

/** 每小时重置 */
function resetIfNewHour(record: QuotaRecord): void {
  const now = new Date()
  const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()
  if ((record as any)._hourTs !== hour) {
    record.hourly = 0
    ;(record as any)._hourTs = hour
  }
}

/** 滑动窗口清理 */
function cleanSlidingWindow(record: QuotaRecord): void {
  const now = Date.now()
  record.slidingWindow = record.slidingWindow.filter(t => now - t < SLIDING_WINDOW_MS)
}

export interface QuotaResult {
  allowed: boolean
  reason?: string
  remaining: { daily: number; hourly: number }
  cooldownMs: number
  violationCount: number
}

/** 检查用户配额 */
export function checkQuota(
  userId: string,
  conversationId: string,
): QuotaResult {
  let record = store.get(userId)
  if (!record) {
    record = { daily: 0, hourly: 0, session: {}, slidingWindow: [], bannedUntil: null }
    store.set(userId, record)
  }

  resetIfNewDay(record)
  resetIfNewHour(record)
  cleanSlidingWindow(record)

  // 封禁检查
  if (record.bannedUntil && Date.now() < record.bannedUntil) {
    const remaining = Math.ceil((record.bannedUntil - Date.now()) / 1000)
    return { allowed: false, reason: `操作过于频繁，${remaining} 秒后解封`, remaining: { daily: DAILY_LIMIT - record.daily, hourly: HOURLY_LIMIT - record.hourly }, cooldownMs: remaining * 1000, violationCount: 0 }
  }

  // 每日配额
  if (record.daily >= DAILY_LIMIT) {
    return { allowed: false, reason: '今日 AI 额度已用完，明天再来吧', remaining: { daily: 0, hourly: HOURLY_LIMIT - record.hourly }, cooldownMs: 0, violationCount: 0 }
  }

  // 每小时配额
  if (record.hourly >= HOURLY_LIMIT) {
    return { allowed: false, reason: '操作太频繁，请稍后再试', remaining: { daily: DAILY_LIMIT - record.daily, hourly: 0 }, cooldownMs: 0, violationCount: 0 }
  }

  // 单会话配额
  const sessionCount = record.session[conversationId] || 0
  if (sessionCount >= SESSION_LIMIT) {
    return { allowed: false, reason: '当前会话已达上限，请创建新会话', remaining: { daily: DAILY_LIMIT - record.daily, hourly: HOURLY_LIMIT - record.hourly }, cooldownMs: 0, violationCount: 0 }
  }

  // 滑动窗口
  const violationCount = record.slidingWindow.length
  if (violationCount >= SLIDING_MAX) {
    // 渐进式惩罚
    const prevBans = (record as any)._banCount || 0
    let cooldown = COOLDOWN_1
    if (prevBans >= 2) {
      cooldown = COOLDOWN_3 // 当日封禁
    } else if (prevBans >= 1) {
      cooldown = COOLDOWN_2
    }
    record.bannedUntil = Date.now() + cooldown
    ;(record as any)._banCount = prevBans + 1
    return {
      allowed: false,
      reason: `请求太频繁，需等待 ${Math.ceil(cooldown / 1000)} 秒`,
      remaining: { daily: DAILY_LIMIT - record.daily, hourly: HOURLY_LIMIT - record.hourly },
      cooldownMs: cooldown,
      violationCount,
    }
  }

  return {
    allowed: true,
    remaining: { daily: DAILY_LIMIT - record.daily, hourly: HOURLY_LIMIT - record.hourly },
    cooldownMs: 0,
    violationCount,
  }
}

/** 记录一次 LLM 调用 */
export function recordCall(userId: string, conversationId: string): void {
  const record = store.get(userId)
  if (!record) return

  record.daily++
  record.hourly++
  record.session[conversationId] = (record.session[conversationId] || 0) + 1
  record.slidingWindow.push(Date.now())
}

/** 获取用户剩余配额 */
export function getRemaining(userId: string): { daily: number; hourly: number } {
  const record = store.get(userId)
  if (!record) return { daily: DAILY_LIMIT, hourly: HOURLY_LIMIT }
  resetIfNewDay(record)
  resetIfNewHour(record)
  return { daily: Math.max(0, DAILY_LIMIT - record.daily), hourly: Math.max(0, HOURLY_LIMIT - record.hourly) }
}

/** IP 级配额检查 */
export function checkIpQuota(ip: string): { allowed: boolean; reason?: string } {
  let record = ipStore.get(ip)
  if (!record) {
    record = { daily: 0, bannedUntil: null }
    ipStore.set(ip, record)
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if ((record as any)._dayTs !== today) {
    record.daily = 0
    ;(record as any)._dayTs = today
  }

  if (record.bannedUntil && Date.now() < record.bannedUntil) {
    return { allowed: false, reason: 'IP 已被限制' }
  }

  if (record.daily >= IP_DAILY_LIMIT) {
    return { allowed: false, reason: 'IP 单日额度已满' }
  }

  record.daily++
  return { allowed: true }
}

/** 奖励配额（完成订单/好评） */
export function rewardQuota(userId: string, amount: number): number {
  let record = store.get(userId)
  if (!record) {
    record = { daily: 0, hourly: 0, session: {}, slidingWindow: [], bannedUntil: null }
    store.set(userId, record)
  }
  record.daily = Math.max(0, record.daily - amount)
  return DAILY_LIMIT - record.daily
}
