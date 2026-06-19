import { create } from 'zustand'

export interface DemandFields {
  title: string
  description: string
  serviceType: 'ONLINE' | 'OFFLINE' | null
  budget: string
  schedule: string
  category: string
  taxonomyLeafId: string | null
  scopeLabels: string[]
  suggestedKeywords: string[]
}

interface DemandWorkspaceState {
  fields: DemandFields
  /** 被用户手动修改过的字段——后续 AI 回合不再覆盖 */
  fieldOverrides: Set<string>
  missingInfo: string[]
  /** 缺失信息回答队列：
   *  missingQueue — 红色，已勾选等待用户输入答案
   *  answeredQueue — 灰色，已收集答案，等待统一分析
   *  resolvedQueue — 绿色，AI 已分析并提取信息
   *  missingAnswers — 记录每个问题对应的用户答案 */
  missingQueue: string[]
  answeredQueue: string[]
  resolvedQueue: string[]
  missingAnswers: Record<string, string>
  /** 切换问题的勾选状态 */
  toggleMissingQueue: (item: string) => void
  /** 记录当前队列第一项的答案，移到 answeredQueue。返回是否所有项都已收集完毕 */
  recordAnswerAndAdvance: (answer: string) => boolean
  /** 统一分析所有已收集答案，完成后移到 resolved */
  resolveAllAnswered: () => void
  confidence: 'high' | 'medium' | 'low'
  readyToPublish: boolean
  /** Speed 模式：隐藏锁定图标，关键词默认全锁 */
  speedMode: boolean
  setSpeedMode: (on: boolean) => void
  /** 被用户锁定的关键词（点击关键词即可切换锁定状态） */
  lockedKeywords: Set<string>
  toggleKeywordLock: (keyword: string) => void

  updateField: <K extends keyof DemandFields>(
    key: K,
    value: DemandFields[K],
  ) => void
  /** 切换字段锁定状态。锁定的字段不会被 AI 覆盖，同时作为确认上下文发送给 AI */
  toggleLock: (key: string) => void
  /** 获取已锁定字段的确认上下文字符串 */
  getConfirmedContext: () => string
  /** 从 agent-demand-stream 的 tool_call result 中提取字段并更新 */
  applyAgentResult: (args: Record<string, string>) => void
  /** 从 analyze-demand-stream 的 result 中提取字段 */
  applyAnalyzeResult: (data: {
    title?: string | null
    summary?: string
    missingInfo?: string[]
    confidence?: string
    readyToPublish?: boolean
    suggestedKeywords?: string[]
    scopeLabels?: string[] | null
    serviceType?: string | null
    budget?: string | null
    schedule?: string | null
    category?: string | null
    taxonomyLeafId?: string | null
  }) => void
  reset: () => void
}

const INITIAL_FIELDS: DemandFields = {
  title: '',
  description: '',
  serviceType: null,
  budget: '',
  schedule: '',
  category: '',
  taxonomyLeafId: null,
  scopeLabels: [],
  suggestedKeywords: [],
}

export const useDemandWorkspaceStore = create<DemandWorkspaceState>(
  (set, get) => ({
    fields: { ...INITIAL_FIELDS },
    fieldOverrides: new Set(),
    missingInfo: [],
    missingQueue: [],
    answeredQueue: [],
    resolvedQueue: [],
    missingAnswers: {},
    confidence: 'low',
    readyToPublish: false,
    speedMode: false,
    lockedKeywords: new Set(),

    setSpeedMode: (on) => set({ speedMode: on }),

    toggleMissingQueue: (item) => {
      set((s) => {
        const idx = s.missingQueue.indexOf(item)
        if (idx >= 0) {
          // 已在队列中 → 移除
          const next = s.missingQueue.filter((_, i) => i !== idx)
          const nextAnswers = { ...s.missingAnswers }
          delete nextAnswers[item]
          return { missingQueue: next, missingAnswers: nextAnswers }
        }
        // 从 answered/resolved 中重新加入队列（可重复回答）
        return {
          missingQueue: [...s.missingQueue, item],
          answeredQueue: s.answeredQueue.filter((i) => i !== item),
          resolvedQueue: s.resolvedQueue.filter((i) => i !== item),
          missingAnswers: { ...s.missingAnswers },
        }
      })
    },

    recordAnswerAndAdvance: (answer) => {
      const { missingQueue, missingAnswers } = get()
      if (missingQueue.length === 0) return true
      const currentItem = missingQueue[0]!
      const remaining = missingQueue.slice(1)
      set({
        missingQueue: remaining,
        answeredQueue: [...get().answeredQueue, currentItem],
        missingAnswers: { ...missingAnswers, [currentItem]: answer },
      })
      return remaining.length === 0 // true = 全部收集完毕
    },

    resolveAllAnswered: () => {
      set((s) => ({
        resolvedQueue: [...s.resolvedQueue, ...s.answeredQueue],
        answeredQueue: [],
      }))
    },

    toggleKeywordLock: (keyword) => {
      set((s) => {
        const next = new Set(s.lockedKeywords)
        if (next.has(keyword)) {
          next.delete(keyword)
        } else {
          next.add(keyword)
        }
        return { lockedKeywords: next }
      })
    },

    updateField: (key, value) => {
      set((s) => {
        const nextOverrides = new Set(s.fieldOverrides)
        nextOverrides.add(key as string)
        return {
          fields: { ...s.fields, [key]: value },
          fieldOverrides: nextOverrides,
        }
      })
    },

    toggleLock: (key) => {
      set((s) => {
        const next = new Set(s.fieldOverrides)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return { fieldOverrides: next }
      })
    },

    getConfirmedContext: () => {
      const { fields, fieldOverrides, lockedKeywords } = get()
      const FIELD_LABELS: Record<string, string> = {
        title: '标题',
        description: '描述',
        serviceType: '服务类型',
        budget: '预算',
        schedule: '时间',
        category: '分类',
      }
      const items: string[] = []
      for (const key of fieldOverrides) {
        const label = FIELD_LABELS[key] ?? key
        const value = (fields as Record<string, unknown>)[key]
        const display =
          key === 'serviceType'
            ? value === 'ONLINE'
              ? '线上'
              : value === 'OFFLINE'
                ? '线下'
                : ''
            : String(value ?? '')
        if (display) items.push(`${label}: ${display}`)
      }
      if (lockedKeywords.size > 0) {
        items.push(`关键词: ${[...lockedKeywords].join('、')}`)
      }
      return items.length > 0 ? `[已确认] ${items.join(' | ')}` : ''
    },

    applyAgentResult: (args) => {
      const { fieldOverrides } = get()
      set((s) => {
        const next = { ...s.fields }
        if (!fieldOverrides.has('title') && args.title) next.title = args.title
        if (!fieldOverrides.has('description') && args.description)
          next.description = args.description
        if (!fieldOverrides.has('serviceType') && args.serviceType) {
          next.serviceType =
            args.serviceType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'
        }
        if (!fieldOverrides.has('budget') && args.budget)
          next.budget = args.budget
        if (!fieldOverrides.has('schedule') && args.schedule)
          next.schedule = args.schedule
        if (!fieldOverrides.has('category') && args.category)
          next.category = args.category
        return { fields: next, readyToPublish: true }
      })
    },

    applyAnalyzeResult: (data) => {
      const { fieldOverrides, speedMode } = get()
      set((s) => {
        const next = { ...s.fields }
        if (!fieldOverrides.has('title') && data.title) next.title = data.title
        if (!fieldOverrides.has('description') && data.summary)
          next.description = data.summary
        if (!fieldOverrides.has('serviceType') && data.serviceType) {
          next.serviceType =
            data.serviceType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'
        }
        if (!fieldOverrides.has('budget') && data.budget)
          next.budget = data.budget
        if (!fieldOverrides.has('schedule') && data.schedule)
          next.schedule = data.schedule
        if (!fieldOverrides.has('category') && data.category)
          next.category = data.category
        if (data.taxonomyLeafId) next.taxonomyLeafId = data.taxonomyLeafId
        if (data.scopeLabels)
          next.scopeLabels = data.scopeLabels.filter(
            (s): s is string => s !== null,
          )
        if (data.suggestedKeywords) {
          next.suggestedKeywords = data.suggestedKeywords
          // Speed 模式：新关键词默认全部锁定
          if (speedMode) {
            set({
              lockedKeywords: new Set(
                data.suggestedKeywords.filter((s): s is string => s !== null),
              ),
            })
          }
        }
        return {
          fields: next,
          missingInfo: data.missingInfo ?? s.missingInfo,
          confidence:
            (data.confidence as DemandWorkspaceState['confidence']) ??
            s.confidence,
          readyToPublish: data.readyToPublish ?? s.readyToPublish,
        }
      })
    },

    reset: () =>
      set({
        fields: { ...INITIAL_FIELDS },
        fieldOverrides: new Set(),
        lockedKeywords: new Set(),
        speedMode: false,
        missingInfo: [],
        missingQueue: [],
        answeredQueue: [],
        resolvedQueue: [],
        missingAnswers: {},
        confidence: 'low',
        readyToPublish: false,
      }),
  }),
)
