/** Agent 工具调用记录（与后端 StoredToolCall 对齐） */
export type AgentToolCallStatus =
  | 'running'
  | 'pending'
  | 'executed'
  | 'rejected'

export type AgentToolCall = {
  id?: string
  name: string
  arguments: Record<string, unknown>
  status?: AgentToolCallStatus
  steps?: string[]
  result?: string
  data?: Record<string, unknown>
  success?: boolean
}

export function isPendingToolCall(tc: AgentToolCall): boolean {
  return (
    tc.status === 'pending' ||
    tc.data?.pending === true
  )
}

export function normalizeToolCall(raw: {
  id?: string
  name: string
  arguments: Record<string, unknown>
  status?: string
  steps?: string[]
  result?: unknown
  data?: unknown
  success?: boolean
}): AgentToolCall {
  const data =
    raw.data && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : undefined
  const status =
    raw.status === 'running' ||
    raw.status === 'pending' ||
    raw.status === 'executed' ||
    raw.status === 'rejected'
      ? raw.status
      : data?.pending === true
        ? 'pending'
        : raw.result != null
          ? 'executed'
          : undefined

  return {
    id: raw.id,
    name: raw.name,
    arguments: raw.arguments ?? {},
    status,
    steps: raw.steps,
    result:
      typeof raw.result === 'string'
        ? raw.result
        : raw.result != null
          ? String(raw.result)
          : undefined,
    data,
    success: raw.success,
  }
}

export function getNavigatePath(tc: AgentToolCall): string | null {
  if (tc.name !== 'navigate_to') return null
  const path = tc.data?.path
  return typeof path === 'string' ? path : null
}

export function getDemandId(tc: AgentToolCall): string | null {
  if (tc.name !== 'create_demand' && tc.name !== 'get_demand_detail') {
    return null
  }
  const id = tc.data?.id
  return typeof id === 'string' ? id : null
}
