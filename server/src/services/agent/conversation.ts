import { prisma } from '../../lib/prisma.js';

/** 创建新对话 */
export async function createConversation(params: {
  userId: string;
  title?: string;
  model?: string;
  provider?: string;
  thinkMode?: boolean;
}) {
  return prisma.agentConversation.create({
    data: {
      userId: params.userId,
      title: params.title || '新对话',
      model: params.model,
      provider: params.provider,
      thinkMode: params.thinkMode ?? false,
    },
  });
}

/** 获取用户的对话列表（按更新时间倒序） */
export async function listConversations(userId: string) {
  return prisma.agentConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      model: true,
      provider: true,
      thinkMode: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

/** 获取单个对话（含消息） */
export async function getConversation(id: string, userId: string) {
  return prisma.agentConversation.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          thinking: true,
          toolCalls: true,
          tokenCount: true,
          createdAt: true,
        },
      },
    },
  });
}

/** 删除对话 */
export async function deleteConversation(id: string, userId: string) {
  return prisma.agentConversation.deleteMany({
    where: { id, userId },
  });
}

/** 添加消息到对话 */
export async function addMessage(params: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  toolCalls?: { name: string; arguments: Record<string, unknown>; result?: unknown; data?: unknown }[];
  tokenCount?: number;
}) {
  // 添加消息
  await prisma.agentMessage.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      thinking: params.thinking,
      toolCalls: params.toolCalls ? JSON.parse(JSON.stringify(params.toolCalls)) : undefined,
      tokenCount: params.tokenCount,
    },
  });

  // 更新对话的 updatedAt
  await prisma.agentConversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  });
}

/** 用首条消息前 50 字作为对话标题 */
export async function truncateTitle(conversationId: string, firstMessage: string) {
  const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '…' : '');
  await prisma.agentConversation.update({
    where: { id: conversationId },
    data: { title },
  });
}
