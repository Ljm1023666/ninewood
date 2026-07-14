import type { DemandFields } from '@/stores/demand-workspace'

/** 需求工作区单条聊天消息（与 DemandCreate 对齐） */
export interface DemandChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  toolCall?: { name: string; arguments: Record<string, string> } | null
  reasoningContent?: string
}

export interface DemandSessionSnapshot {
  id: string
  title: string
  updatedAt: number
  messages: DemandChatMessage[]
  input: string
  fields: DemandFields
  fieldOverrides: string[]
  lockedKeywords: string[]
  missingInfo: string[]
  missingQueue: string[]
  answeredQueue: string[]
  resolvedQueue: string[]
  missingAnswers: Record<string, string>
  confidence: 'high' | 'medium' | 'low'
  readyToPublish: boolean
  speedMode: boolean
}

interface SessionsStore {
  activeId: string | null
  sessions: DemandSessionSnapshot[]
}

const LEGACY_DRAFT_KEY = 'ninewood_demand_draft'
const STORE_KEY = 'ninewood_demand_sessions_v1'
const MAX_SESSIONS = 40

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `ds${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readRawStore(): SessionsStore {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return { activeId: null, sessions: [] }
    const parsed = JSON.parse(raw) as SessionsStore
    if (!Array.isArray(parsed.sessions)) return { activeId: null, sessions: [] }
    return {
      activeId: parsed.activeId ?? null,
      sessions: parsed.sessions.filter((s) => s?.id),
    }
  } catch {
    return { activeId: null, sessions: [] }
  }
}

function writeRawStore(store: SessionsStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

function legacyDraftToSession(draft: Record<string, unknown>, id: string): DemandSessionSnapshot {
  const fields = (draft.fields as DemandFields) || ({} as DemandFields)
  const messages = (draft.messages as DemandChatMessage[]) || []
  const title = deriveSessionTitle({ title: fields.title, messages })
  return {
    id,
    title,
    updatedAt: Date.now(),
    messages,
    input: String(draft.input ?? ''),
    fields,
    fieldOverrides: (draft.fieldOverrides as string[]) || [],
    lockedKeywords: (draft.lockedKeywords as string[]) || [],
    missingInfo: (draft.missingInfo as string[]) || [],
    missingQueue: (draft.missingQueue as string[]) || [],
    answeredQueue: (draft.answeredQueue as string[]) || [],
    resolvedQueue: (draft.resolvedQueue as string[]) || [],
    missingAnswers: (draft.missingAnswers as Record<string, string>) || {},
    confidence: (draft.confidence as DemandSessionSnapshot['confidence']) || 'low',
    readyToPublish: Boolean(draft.readyToPublish),
    speedMode: draft.speedMode !== false,
  }
}

/** 将旧版单草稿迁移到会话列表 */
export function migrateLegacyDraftIfNeeded(): void {
  const legacy = localStorage.getItem(LEGACY_DRAFT_KEY)
  if (!legacy) return

  const store = readRawStore()
  if (store.sessions.length > 0) {
    localStorage.removeItem(LEGACY_DRAFT_KEY)
    return
  }

  try {
    const draft = JSON.parse(legacy) as Record<string, unknown>
    const id = newSessionId()
    const session = legacyDraftToSession(draft, id)
    writeRawStore({ activeId: id, sessions: [session] })
  } catch {
    /* ignore */
  }
  localStorage.removeItem(LEGACY_DRAFT_KEY)
}

export function deriveSessionTitle(data: {
  title?: string
  messages?: { role: string; content: string }[]
}): string {
  if (data.title?.trim()) return data.title.trim().slice(0, 48)
  const firstUser = data.messages?.find((m) => m.role === 'user')
  if (firstUser?.content.trim()) {
    const t = firstUser.content.trim().replace(/\s+/g, ' ')
    return t.length > 42 ? `${t.slice(0, 42)}…` : t
  }
  return '未命名会话'
}

export type SessionDateGroup = 'today' | 'yesterday' | 'previous7days' | 'older'

export const SESSION_GROUP_LABELS: Record<SessionDateGroup, string> = {
  today: '今天',
  yesterday: '昨天',
  previous7days: '过去 7 天',
  older: '更早',
}

export const SESSION_GROUP_ORDER: SessionDateGroup[] = [
  'today',
  'yesterday',
  'previous7days',
  'older',
]

export function sessionDateGroup(updatedAt: number): SessionDateGroup {
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOf7Days = startOfToday - 7 * 86_400_000

  if (updatedAt >= startOfToday) return 'today'
  if (updatedAt >= startOfYesterday) return 'yesterday'
  if (updatedAt >= startOf7Days) return 'previous7days'
  return 'older'
}

export function listDemandSessions(): DemandSessionSnapshot[] {
  migrateLegacyDraftIfNeeded()
  return readRawStore().sessions.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getActiveSessionId(): string | null {
  migrateLegacyDraftIfNeeded()
  return readRawStore().activeId
}

export function getDemandSession(id: string): DemandSessionSnapshot | null {
  return listDemandSessions().find((s) => s.id === id) ?? null
}

export function setActiveSessionId(id: string | null) {
  const store = readRawStore()
  writeRawStore({ ...store, activeId: id })
}

export function upsertDemandSession(
  snapshot: Omit<DemandSessionSnapshot, 'title' | 'updatedAt'> & {
    title?: string
    updatedAt?: number
  },
): DemandSessionSnapshot {
  const store = readRawStore()
  const title =
    snapshot.title ??
    deriveSessionTitle({
      title: snapshot.fields?.title,
      messages: snapshot.messages,
    })
  const next: DemandSessionSnapshot = {
    ...snapshot,
    title,
    updatedAt: snapshot.updatedAt ?? Date.now(),
  }

  const idx = store.sessions.findIndex((s) => s.id === next.id)
  let sessions: DemandSessionSnapshot[]
  if (idx >= 0) {
    sessions = [...store.sessions]
    sessions[idx] = next
  } else {
    sessions = [next, ...store.sessions]
  }

  sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  if (sessions.length > MAX_SESSIONS) {
    sessions = sessions.slice(0, MAX_SESSIONS)
  }

  writeRawStore({
    activeId: next.id,
    sessions,
  })
  return next
}

export function createEmptyDemandSession(): DemandSessionSnapshot {
  const id = newSessionId()
  const session: DemandSessionSnapshot = {
    id,
    title: '未命名会话',
    updatedAt: Date.now(),
    messages: [],
    input: '',
    fields: {
      title: '',
      description: '',
      serviceType: null,
      budget: '',
      schedule: '',
      category: '',
      taxonomyLeafId: null,
      scopeLabels: [],
      suggestedKeywords: [],
      isCertifiedOnly: false,
      expectedOutcome: '',
      visibilityWindow: 15,
      maxApplicants: 10,
      tags: [],
      aiTags: [],
      tagsConfirmed: false,
    },
    fieldOverrides: [],
    lockedKeywords: [],
    missingInfo: [],
    missingQueue: [],
    answeredQueue: [],
    resolvedQueue: [],
    missingAnswers: {},
    confidence: 'low',
    readyToPublish: false,
    speedMode: true,
  }
  upsertDemandSession(session)
  return session
}

export function deleteDemandSession(id: string): string | null {
  const store = readRawStore()
  const sessions = store.sessions.filter((s) => s.id !== id)
  let activeId = store.activeId

  if (activeId === id) {
    activeId = sessions[0]?.id ?? null
  }

  writeRawStore({ activeId, sessions })
  return activeId
}
