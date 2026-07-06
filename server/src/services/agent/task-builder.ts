/**
 * Task 10 · 自然语言 → 可执行自动化任务（多轮构建）
 *
 * 用户用口语描述任务；AI 解析为 DEMAND_DIGEST 结构化参数 + 执行流程步骤。
 * LLM 不可用时回退到规则启发式（保证离线/测试可用）。
 */
import { chatCompletion, parseJSON } from '../ai/client.js'
import { describeSchedule } from './task-schedule.js'
import {
  DEMAND_DIGEST_ID,
  getTaskType,
  validateDemandDigestFilters,
} from './task-types/index.js'

export interface TaskBuildStep {
  key: string
  label: string
}

export interface AgentTaskBuildResult {
  buildId: string
  ready: boolean
  name: string
  type: typeof DEMAND_DIGEST_ID
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'
  atHour: number | null
  atMinute: number
  weekday: number | null
  filters: Record<string, unknown>
  deliveryChannels: ('MESSAGE' | 'AGENT_INBOX')[]
  humanSchedule: string
  humanFilters: string
  summary: string
  revisionHint: string | null
  steps: TaskBuildStep[]
  userDescription: string
  round: number
}

export interface BuildAgentTaskInput {
  description: string
  feedback?: string
  previousSummary?: string
  round?: number
}

interface LlmDraft {
  ready?: boolean
  name?: string
  frequency?: string
  atHour?: number | null
  atMinute?: number
  weekday?: number | null
  filters?: Record<string, unknown>
  deliveryChannels?: string[]
  summary?: string
  revisionHint?: string | null
  steps?: Array<{ key?: string; label?: string }>
}

const BUILD_SYSTEM = `你是九木平台的自动化任务构建助手。用户用自然语言描述一个「定时筛选需求并推送摘要」的任务。

你必须返回纯 JSON（不要 markdown 包裹）：
{
  "ready": boolean,
  "name": "任务名 1-50 字",
  "frequency": "HOURLY" | "DAILY" | "WEEKLY",
  "atHour": number | null,
  "atMinute": number,
  "weekday": number | null,
  "filters": {
    "keyword"?: string,
    "category"?: string,
    "serviceType"?: "ONLINE" | "OFFLINE",
    "cityCode"?: string,
    "tagName"?: string,
    "minPrice"?: number,
    "maxPrice"?: number,
    "createdWithinHours"?: number,
    "limit"?: number
  },
  "deliveryChannels": ["MESSAGE", "AGENT_INBOX"],
  "summary": "用 2-4 句话说明任务会做什么",
  "revisionHint": string | null,
  "steps": [
    { "key": "trigger", "label": "..." },
    { "key": "search", "label": "..." },
    { "key": "summarize", "label": "..." },
    { "key": "deliver", "label": "..." }
  ]
}

规则：
- 平台宪法：只读 + 只推送，永不调用写工具；type 固定 DEMAND_DIGEST
- 从用户描述中提取：运行频率/时刻、筛选条件（关键词、标签、分类、价格、近 N 小时等）
- filters 只能使用白名单字段；limit 最大 10
- HOURLY 时 atHour 为 null；DAILY/WEEKLY 必须给 atHour；WEEKLY 必须给 weekday (1=周一…7=周日)
- ready=true 表示描述已足够明确可保存；若缺时刻或筛选太模糊，ready=false 并在 revisionHint 用一句话提示用户补充
- steps 必须 4 步：触发 → 只读搜索 → 生成摘要 → 双通道投递
- 使用简体中文`

export async function buildAgentTaskFromDescription(
  input: BuildAgentTaskInput,
): Promise<AgentTaskBuildResult> {
  const description = input.description.trim()
  if (!description) {
    throw new TaskBuildError('请用自然语言描述你想定时执行的任务')
  }
  if (description.length > 2000) {
    throw new TaskBuildError('任务描述不能超过 2000 字')
  }

  const round = (input.round ?? 0) + 1
  const userDescription = [description, input.feedback?.trim()].filter(Boolean).join('\n\n补充：')

  let llmDraft: LlmDraft | null = null
  try {
    llmDraft = await callTaskBuilderLlm(input, userDescription)
  } catch {
    llmDraft = null
  }

  const heuristic = parseTaskHeuristics(userDescription)
  const merged: LlmDraft = {
    ...heuristic,
    ...(llmDraft ?? {}),
    filters: { ...heuristic.filters, ...(llmDraft?.filters ?? {}) },
  }

  return finalizeBuild(merged, userDescription, round)
}

export class TaskBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskBuildError'
  }
}

async function callTaskBuilderLlm(
  input: BuildAgentTaskInput,
  userDescription: string,
): Promise<LlmDraft> {
  const userParts = [`【任务描述】\n${input.description.trim()}`]
  if (input.feedback?.trim()) {
    userParts.push(`【本轮补充】\n${input.feedback.trim()}`)
  }
  if (input.previousSummary?.trim()) {
    userParts.push(`【上一轮构建摘要】\n${input.previousSummary.trim()}`)
  }

  const { content } = await chatCompletion({
    messages: [
      { role: 'system', content: BUILD_SYSTEM },
      { role: 'user', content: userParts.join('\n\n') },
    ],
    maxTokens: 1200,
    temperature: 0.15,
  })

  const parsed = parseJSON(content) as LlmDraft | null
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('LLM 返回无法解析')
  }
  return parsed
}

/** 规则启发式（LLM 回退 + 单测） */
export function parseTaskHeuristics(description: string): LlmDraft {
  const d = description

  let frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' = 'DAILY'
  if (/每[小時时]|每小时/.test(d)) frequency = 'HOURLY'
  else if (/每周|每星期|每礼拜|每週/.test(d)) frequency = 'WEEKLY'

  let atHour: number | null = frequency === 'HOURLY' ? null : 9
  let atMinute = 0
  let weekday: number | null = frequency === 'WEEKLY' ? 1 : null

  const weekNames: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7,
  }
  for (const [ch, n] of Object.entries(weekNames)) {
    if (new RegExp(`周${ch}|星期${ch}|礼拜${ch}`).test(d)) {
      weekday = n
      break
    }
  }

  const timeColon = d.match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (timeColon) {
    atHour = parseInt(timeColon[1]!, 10)
    atMinute = parseInt(timeColon[2]!, 10)
  } else {
    const timePoint = d.match(/(\d{1,2})\s*[点點时時]/)
    if (timePoint) atHour = parseInt(timePoint[1]!, 10)
  }

  const filters: Record<string, unknown> = {}

  const tagSuffix = d.match(/含\s*[「""『]?([^」""』，,。\n]+?)\s*标签/)
  const tagQuoted = d.match(/标签[包含含是为]?\s*[「""『]([^」""』]+)[」""』]/)
  const tagLoose = d.match(/标签[包含含是为]?\s*([^\s，,。]{2,20})/)
  const tagBefore = d.match(/([^\s，,。]{2,20})\s*标签/)

  const tagRaw =
    tagSuffix?.[1] ?? tagQuoted?.[1] ?? tagLoose?.[1] ?? tagBefore?.[1]
  if (tagRaw) filters.tagName = tagRaw.trim()

  const kwMatch = d.match(/关键词[是为]?\s*[「""]?([^」""，,。\n]+)/)
  if (kwMatch?.[1]) filters.keyword = kwMatch[1].trim()

  const hoursMatch = d.match(/近\s*(\d+)\s*[小時时]/)
  if (hoursMatch?.[1]) filters.createdWithinHours = parseInt(hoursMatch[1], 10)

  if (/线上/.test(d)) filters.serviceType = 'ONLINE'
  if (/线下/.test(d)) filters.serviceType = 'OFFLINE'

  const name =
    d.length > 30
      ? d.slice(0, 28).replace(/\s+/g, '') + '…'
      : d.replace(/\s+/g, ' ').trim() || '自动化任务'

  return {
    ready: Object.keys(filters).length > 0 && (frequency === 'HOURLY' || atHour !== null),
    name,
    frequency,
    atHour,
    atMinute,
    weekday,
    filters,
    deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
    summary: `将按「${describeSchedule({ frequency, atHour, atMinute, weekday })}」定时筛选需求并推送摘要。`,
    revisionHint:
      Object.keys(filters).length === 0
        ? '可补充标签、关键词或「近 N 小时」等筛选条件'
        : null,
  }
}

function finalizeBuild(
  draft: LlmDraft,
  userDescription: string,
  round: number,
): AgentTaskBuildResult {
  const frequency = draft.frequency
  if (!frequency || !['HOURLY', 'DAILY', 'WEEKLY'].includes(frequency)) {
    throw new TaskBuildError('无法识别运行频率，请说明「每小时 / 每天 / 每周」')
  }

  const name = String(draft.name ?? '').trim()
  if (!name || name.length > 50) {
    throw new TaskBuildError('任务名称无效，请让描述更具体一些')
  }

  let atHour: number | null = draft.atHour ?? null
  let atMinute = typeof draft.atMinute === 'number' ? draft.atMinute : 0
  let weekday: number | null = draft.weekday ?? null

  if (frequency === 'HOURLY') {
    atHour = null
    weekday = null
  } else {
    if (atHour === null || atHour < 0 || atHour > 23) {
      throw new TaskBuildError('请说明每天或每周的具体时刻，例如「每天早上 9 点」')
    }
    if (frequency === 'WEEKLY') {
      if (weekday === null || weekday < 1 || weekday > 7) {
        throw new TaskBuildError('每周任务请说明星期，例如「每周一 9:00」')
      }
    } else {
      weekday = null
    }
  }

  if (atMinute < 0 || atMinute > 59) atMinute = 0

  const typeDef = getTaskType(DEMAND_DIGEST_ID)
  if (!typeDef) throw new TaskBuildError('任务类型未注册')

  const v = typeDef.validateFilters(draft.filters ?? {})
  if (!v.ok) throw new TaskBuildError(v.error || '筛选条件不合法')

  const filters = v.normalized!
  const humanSchedule = describeSchedule({
    frequency: frequency as 'HOURLY' | 'DAILY' | 'WEEKLY',
    atHour,
    atMinute,
    weekday,
  })
  const humanFilters = describeFiltersHuman(filters)

  let deliveryChannels: ('MESSAGE' | 'AGENT_INBOX')[]
  if (Array.isArray(draft.deliveryChannels) && draft.deliveryChannels.length > 0) {
    const allowed = new Set(['MESSAGE', 'AGENT_INBOX'])
    deliveryChannels = draft.deliveryChannels.filter(
      (c): c is 'MESSAGE' | 'AGENT_INBOX' => typeof c === 'string' && allowed.has(c),
    )
    if (deliveryChannels.length === 0) deliveryChannels = ['MESSAGE', 'AGENT_INBOX']
  } else {
    deliveryChannels = ['MESSAGE', 'AGENT_INBOX']
  }

  const steps = normalizeSteps(draft.steps, humanSchedule, humanFilters, deliveryChannels)

  return {
    buildId: `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ready: draft.ready !== false,
    name,
    type: DEMAND_DIGEST_ID,
    frequency: frequency as 'HOURLY' | 'DAILY' | 'WEEKLY',
    atHour,
    atMinute,
    weekday,
    filters,
    deliveryChannels,
    humanSchedule,
    humanFilters,
    summary: String(draft.summary ?? `定时任务：${name}`).trim(),
    revisionHint: draft.revisionHint ?? null,
    steps,
    userDescription,
    round,
  }
}

function normalizeSteps(
  raw: LlmDraft['steps'],
  humanSchedule: string,
  humanFilters: string,
  channels: ('MESSAGE' | 'AGENT_INBOX')[],
): TaskBuildStep[] {
  const channelLabel = channels
    .map(c => (c === 'MESSAGE' ? '消息中心' : '结果箱'))
    .join(' + ')

  const defaults: TaskBuildStep[] = [
    { key: 'trigger', label: `到达计划时刻（${humanSchedule}）` },
    { key: 'search', label: `只读搜索平台需求：${humanFilters}` },
    { key: 'summarize', label: '汇总命中结果，生成 Markdown 摘要（最多 10 条）' },
    { key: 'deliver', label: `推送到 ${channelLabel}（只推送，不写库）` },
  ]

  if (!Array.isArray(raw) || raw.length === 0) return defaults

  const mapped = raw
    .filter(s => s && typeof s.label === 'string' && s.label.trim())
    .map((s, i) => ({
      key: String(s.key ?? `step_${i + 1}`),
      label: s.label!.trim(),
    }))

  return mapped.length >= 2 ? mapped : defaults
}

function describeFiltersHuman(filters: Record<string, unknown>): string {
  const parts: string[] = []
  if (typeof filters.keyword === 'string' && filters.keyword) parts.push(`关键词「${filters.keyword}」`)
  if (typeof filters.tagName === 'string' && filters.tagName) parts.push(`标签「${filters.tagName}」`)
  if (typeof filters.category === 'string' && filters.category) parts.push(`分类「${filters.category}」`)
  if (filters.serviceType === 'ONLINE') parts.push('线上')
  else if (filters.serviceType === 'OFFLINE') parts.push('线下')
  if (typeof filters.createdWithinHours === 'number') {
    parts.push(`近 ${filters.createdWithinHours} 小时内发布`)
  }
  if (typeof filters.minPrice === 'number') parts.push(`最低 ¥${filters.minPrice}`)
  if (typeof filters.maxPrice === 'number') parts.push(`最高 ¥${filters.maxPrice}`)
  return parts.length > 0 ? parts.join('，') : '无额外筛选（返回最新匹配）'
}
