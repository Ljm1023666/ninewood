import { prisma } from '../../lib/prisma.js'
import type { StoredToolCall } from './tool-narration.js'

type RawToolCall = Record<string, unknown>

function parseToolCalls(raw: unknown): StoredToolCall[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const t = item as RawToolCall
    return {
      id: String(t.id ?? ''),
      name: String(t.name ?? ''),
      arguments: (t.arguments as Record<string, unknown>) ?? {},
      status: (t.status as StoredToolCall['status']) ?? 'executed',
      steps: Array.isArray(t.steps) ? (t.steps as string[]) : [],
      result: t.result != null ? String(t.result) : undefined,
      data: t.data,
      success: t.success as boolean | undefined,
    }
  })
}

/** 在对话消息中查找待批准的工具调用 */
export async function findPendingToolCall(
  conversationId: string,
  toolCallId: string,
): Promise<{
  messageId: string
  toolCall: StoredToolCall
} | null> {
  const messages = await prisma.agentMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, toolCalls: true },
  })

  for (const msg of messages) {
    const calls = parseToolCalls(msg.toolCalls)
    const hit = calls.find(
      (c) => c.id === toolCallId && c.status === 'pending',
    )
    if (hit) return { messageId: msg.id, toolCall: hit }
  }
  return null
}

/** 更新消息内某条工具调用状态 */
export async function updateStoredToolCall(
  messageId: string,
  toolCallId: string,
  patch: Partial<StoredToolCall>,
): Promise<StoredToolCall | null> {
  const msg = await prisma.agentMessage.findUnique({
    where: { id: messageId },
    select: { toolCalls: true },
  })
  if (!msg) return null

  const calls = parseToolCalls(msg.toolCalls)
  let updated: StoredToolCall | null = null
  const next = calls.map((c) => {
    if (c.id !== toolCallId) return c
    updated = { ...c, ...patch }
    return updated
  })
  if (!updated) return null

  await prisma.agentMessage.update({
    where: { id: messageId },
    data: { toolCalls: JSON.parse(JSON.stringify(next)) },
  })
  return updated
}
