import api from './index'

export interface AgentConversation {
  id: string
  title: string
  model?: string
  provider?: string
  thinkMode: boolean
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  thinking?: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
  }>
  tokenCount?: number
  createdAt: string
}

export interface AgentConversationDetail extends AgentConversation {
  messages: AgentMessage[]
}

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  category: string
  requiresConfirmation: boolean
}

export interface AgentSkill {
  name: string
  description: string
  source: string
}

export interface AgentProvider {
  provider: string
  model: string
  thinkModel: string
  fastModel: string
}

/** 获取工具列表 */
export async function getTools() {
  const res = await api.get<{ tools: AgentTool[] }>('/agent/tools')
  return res.data.tools
}

/** 获取技能列表 */
export async function getSkills() {
  const res = await api.get<{ skills: AgentSkill[] }>('/agent/skills')
  return res.data.skills
}

/** 获取 AI 供应商信息 */
export async function getProvider() {
  const res = await api.get<AgentProvider>('/agent/provider')
  return res.data
}

/** 获取对话列表 */
export async function getConversations() {
  const res = await api.get<{ conversations: AgentConversation[] }>(
    '/agent/conversations',
  )
  return res.data.conversations
}

/** 获取对话详情 */
export async function getConversation(id: string) {
  const res = await api.get<AgentConversationDetail>(
    `/agent/conversations/${id}`,
  )
  return res.data
}

/** 创建新对话 */
export async function createConversation(params?: {
  title?: string
  thinkMode?: boolean
}) {
  const res = await api.post<AgentConversation>('/agent/conversations', params)
  return res.data
}

/** 删除对话 */
export async function deleteConversation(id: string) {
  await api.delete(`/agent/conversations/${id}`)
}

/** 流式发送消息（返回 SSE EventSource 类似接口） */
export function streamMessage(
  conversationId: string,
  message: string,
  thinkMode = false,
  context?: Record<string, unknown>,
  webSearch = false,
): {
  abort: () => void
  onEvent: (event: string, handler: (data: unknown) => void) => void
  onDone: (handler: () => void) => void
  onError: (handler: (err: Error) => void) => void
} {
  const token = localStorage.getItem('token')
  const baseURL =
    location.protocol === 'file:' ? 'http://localhost:3001/api' : '/api'

  const controller = new AbortController()
  const eventHandlers = new Map<string, Array<(data: unknown) => void>>()
  let doneHandler: (() => void) | null = null
  let errorHandler: ((err: Error) => void) | null = null

  const api = {
    abort: () => controller.abort(),
    onEvent: (event: string, handler: (data: unknown) => void) => {
      if (!eventHandlers.has(event)) eventHandlers.set(event, [])
      eventHandlers.get(event)!.push(handler)
    },
    onDone: (handler: () => void) => {
      doneHandler = handler
    },
    onError: (handler: (err: Error) => void) => {
      errorHandler = handler
    },
  }

  ;(async () => {
    try {
      const response = await fetch(
        `${baseURL}/agent/conversations/${conversationId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, thinkMode, context, webSearch }),
          signal: controller.signal,
        },
      )

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error')
        errorHandler?.(new Error(`HTTP ${response.status}: ${err}`))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        errorHandler?.(new Error('无法读取响应流'))
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice(6)
            if (currentEvent && rawData) {
              try {
                const data = JSON.parse(rawData)
                eventHandlers.get(currentEvent)?.forEach((h) => h(data))
              } catch {
                eventHandlers.get(currentEvent)?.forEach((h) => h(rawData))
              }
            }
            currentEvent = ''
          }
        }
      }

      doneHandler?.()
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        errorHandler?.(e)
      }
    }
  })()

  return api
}
