/**
 * Task 10 · Agent 自动化任务类型注册表
 *
 * 调度器、API、executor 全部通过 getTaskType(id) / listTaskTypes() 访问，
 * 禁止在调用方硬编码 `if (type === 'DEMAND_DIGEST')`。
 * 新增任务类型只需在此注册即可，无需改调度器/API/Agent。
 *
 * 平台宪法（不可违反）：
 *   - 调度器只读 + 只推送；run() 内禁止任何写工具（create/apply/withdraw/pay ...）
 *   - 不得在 run() 中调用 LLM（保持确定性）
 *
 * 详见 docs/specs/TASK-10-agent-automation.md §3
 */

export interface AgentTaskRunResult {
  /** 命中的条目数（0 = EMPTY） */
  count: number
  /** Markdown 摘要，供消息中心 + 结果箱渲染 */
  summary: string
  /** 结构化结果，前端可做跳转卡片 */
  payload: unknown[]
}

export interface AgentTaskType {
  /** 唯一键，与 AgentTask.type 对应；MVP: DEMAND_DIGEST */
  id: string
  /** 人类可读标签（前端下拉、错误提示用） */
  label: string
  /** 自然语言草稿解析辅助（executor 推断 type 时使用） */
  intentSignals: RegExp[]
  /** 校验过滤器；失败返回 { ok:false, error }；成功返回 { ok:true, normalized } */
  validateFilters(filters: unknown): { ok: boolean; error?: string; normalized?: Record<string, unknown> }
  /**
   * 只读执行；不得修改数据库、不得调 LLM、不得触发任何副作用。
   * 错误必须抛异常，由调度器统一捕获并写入 AgentTaskRun status=ERROR。
   */
  run(userId: string, filters: Record<string, unknown>): Promise<AgentTaskRunResult>
}

// ─── 注册表 ────────────────────────────────────────────────────────────────

const registry = new Map<string, AgentTaskType>()

export function registerTaskType(type: AgentTaskType): void {
  if (registry.has(type.id)) {
    throw new Error(`[task-types] duplicate registration: ${type.id}`)
  }
  registry.set(type.id, type)
}

export function getTaskType(id: string): AgentTaskType | undefined {
  return registry.get(id)
}

export function listTaskTypes(): AgentTaskType[] {
  return Array.from(registry.values())
}

// ─── MVP 类型：DEMAND_DIGEST ──────────────────────────────────────────────
// filters 对齐 server/src/services/agent/tools.ts 中 search_demands 白名单参数；
// limit 硬顶 10（spec §0.1 单次摘要最多 10 条结果）。
// run() 实现在 Wave B（依赖 demand-search 抽取）；本 Wave 仅暴露 validateFilters。

const DEMAND_DIGEST_VALID_FIELDS = new Set([
  'keyword',
  'category',
  'serviceType',
  'cityCode',
  'minPrice',
  'maxPrice',
  'tagName',
  'limit',
  'createdWithinHours',
])

const DEMAND_DIGEST_LIMIT_MAX = 10

export const DEMAND_DIGEST_ID = 'DEMAND_DIGEST' as const

export function validateDemandDigestFilters(
  filters: unknown,
): { ok: boolean; error?: string; normalized?: Record<string, unknown> } {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    return { ok: false, error: 'filters 必须为对象' }
  }
  const raw = filters as Record<string, unknown>
  const normalized: Record<string, unknown> = {}

  for (const key of Object.keys(raw)) {
    if (!DEMAND_DIGEST_VALID_FIELDS.has(key)) {
      return { ok: false, error: `filters 含未知字段: ${key}` }
    }
  }

  if (raw.keyword !== undefined) {
    if (typeof raw.keyword !== 'string') return { ok: false, error: 'keyword 必须为字符串' }
    const kw = raw.keyword.trim()
    if (kw.length > 50) return { ok: false, error: 'keyword 长度不能超过 50' }
    if (kw) normalized.keyword = kw
  }
  if (raw.category !== undefined) {
    if (typeof raw.category !== 'string') return { ok: false, error: 'category 必须为字符串' }
    normalized.category = raw.category.trim()
  }
  if (raw.serviceType !== undefined) {
    if (raw.serviceType !== 'ONLINE' && raw.serviceType !== 'OFFLINE') {
      return { ok: false, error: 'serviceType 必须为 ONLINE 或 OFFLINE' }
    }
    normalized.serviceType = raw.serviceType
  }
  if (raw.cityCode !== undefined) {
    if (typeof raw.cityCode !== 'string') return { ok: false, error: 'cityCode 必须为字符串' }
    normalized.cityCode = raw.cityCode.trim()
  }
  if (raw.tagName !== undefined) {
    if (typeof raw.tagName !== 'string') return { ok: false, error: 'tagName 必须为字符串' }
    normalized.tagName = raw.tagName.trim()
  }
  if (raw.minPrice !== undefined) {
    if (typeof raw.minPrice !== 'number' || raw.minPrice < 0) {
      return { ok: false, error: 'minPrice 必须为非负数字' }
    }
    normalized.minPrice = raw.minPrice
  }
  if (raw.maxPrice !== undefined) {
    if (typeof raw.maxPrice !== 'number' || raw.maxPrice < 0) {
      return { ok: false, error: 'maxPrice 必须为非负数字' }
    }
    normalized.maxPrice = raw.maxPrice
  }
  if (
    typeof normalized.minPrice === 'number' &&
    typeof normalized.maxPrice === 'number' &&
    normalized.minPrice > normalized.maxPrice
  ) {
    return { ok: false, error: 'minPrice 不能大于 maxPrice' }
  }
  if (raw.limit !== undefined) {
    if (typeof raw.limit !== 'number' || raw.limit < 1) {
      return { ok: false, error: 'limit 必须为正整数' }
    }
    normalized.limit = Math.min(Math.floor(raw.limit), DEMAND_DIGEST_LIMIT_MAX)
  } else {
    normalized.limit = DEMAND_DIGEST_LIMIT_MAX
  }
  if (raw.createdWithinHours !== undefined) {
    if (typeof raw.createdWithinHours !== 'number' || raw.createdWithinHours < 1) {
      return { ok: false, error: 'createdWithinHours 必须为正整数（小时）' }
    }
    normalized.createdWithinHours = Math.floor(raw.createdWithinHours)
  }

  return { ok: true, normalized }
}

registerTaskType({
  id: DEMAND_DIGEST_ID,
  label: '需求筛选摘要',
  intentSignals: [
    /每[小時时].*筛|每[小時时].*推送/i,
    /每天.*筛|定时.*筛/i,
    /每周.*筛|每周.*推送|每周.*摘要/i,
    /自动.*筛|定时任务/i,
    /筛选.*摘要|需求.*推送/i,
  ],
  validateFilters: validateDemandDigestFilters,
  // run 在 Wave B 通过 registerTaskType({...DEMAND_DIGEST, run: ...}) 覆盖；
  // 此处留 stub 避免调度器提前误调。Stub 抛错等同于"未实现"。
  run: async () => {
    throw new Error(`[task-types] ${DEMAND_DIGEST_ID}.run not implemented yet (Wave B)`)
  },
})

// ─── 预留类型：PRICE_WATCH ─────────────────────────────────────────────────
// 仅占位注册，run 抛错；勿实现 — 见 spec §3.2 / Task 11+。

registerTaskType({
  id: 'PRICE_WATCH',
  label: '价格监控（预留）',
  intentSignals: [/价格.*[涨跌]|[涨跌].*价格/],
  validateFilters: () => ({ ok: false, error: 'PRICE_WATCH 暂未实现（Task 11+）' }),
  run: async () => {
    throw new Error('PRICE_WATCH not implemented yet (Task 11+)')
  },
})