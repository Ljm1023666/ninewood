import { prisma } from '../lib/prisma.js';

export const messageService = {
  async send(fromUserId: string, toUserId: string, content: string, orderId?: string, type = 'TEXT', duration?: number) {
    return prisma.message.create({
      data: { fromUserId, toUserId, content, type: type as any, orderId: orderId || null, duration: duration ?? null },
      include: {
        fromUser: { select: { id: true, nickname: true, avatarUrl: true } },
        toUser: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
  },

  async getConversations(userId: string) {
    // Get unique conversation partners
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, nickname: true, avatarUrl: true } },
        toUser: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    const userMap = new Map<string, any>();
    const conversations: any[] = [];

    for (const msg of messages) {
      const otherId = msg.fromUserId === userId ? msg.toUserId : msg.fromUserId;
      if (otherId === userId) continue; // skip self
      const other = msg.fromUserId === userId ? msg.toUser : msg.fromUser;
      if (!userMap.has(otherId)) {
        userMap.set(otherId, other);
        const unread = await prisma.message.count({
          where: { fromUserId: otherId, toUserId: userId, isRead: false },
        });
        conversations.push({ user: other, lastMessage: msg, unreadCount: unread });
      }
    }

    return conversations;
  },

  async getMessages(userId: string, otherId: string, page = 1) {
    const limit = 50;
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: otherId },
          { fromUserId: otherId, toUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        fromUser: { select: { id: true, nickname: true, avatarUrl: true } },
        toUser: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    // Mark as read
    await prisma.message.updateMany({
      where: { fromUserId: otherId, toUserId: userId, isRead: false },
      data: { isRead: true },
    });

    return messages.reverse();
  },

  async getUnreadCount(userId: string) {
    return prisma.message.count({
      where: { toUserId: userId, isRead: false },
    });
  },

  // ── 群聊（ConversationMerge）──

  async createMerge(userId: string, title: string, memberIds: string[]) {
    if (!title.trim()) throw { status: 400, message: '群聊名称不能为空' };
    if (memberIds.length < 1) throw { status: 400, message: '至少选择一位联系人' };
    const ids = [...new Set([userId, ...memberIds])];
    return prisma.conversationMerge.create({
      data: { userId, title: title.trim(), memberIds: ids },
    });
  },

  async getMerges(userId: string) {
    return prisma.conversationMerge.findMany({
      where: { memberIds: { hasSome: [userId] } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getMergeMessages(mergeId: string, userId: string, page = 1) {
    const merge = await prisma.conversationMerge.findUnique({ where: { id: mergeId } });
    if (!merge) throw { status: 404, message: '群聊不存在' };
    if (!merge.memberIds.includes(userId)) throw { status: 403, message: '不是群成员' };
    // Send messages to all members: store as multi-target
    const limit = 50;
    const messages = await prisma.message.findMany({
      where: { mergeId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        fromUser: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
    return messages.reverse();
  },

  async sendMergeMessage(fromUserId: string, mergeId: string, content: string) {
    const merge = await prisma.conversationMerge.findUnique({ where: { id: mergeId } });
    if (!merge) throw { status: 404, message: '群聊不存在' };
    if (!merge.memberIds.includes(fromUserId))
      throw { status: 403, message: '不是群成员' };

    const recipients = merge.memberIds.filter((id) => id !== fromUserId);
    const msgs = await Promise.all(
      recipients.map((toId) =>
        prisma.message.create({
          data: { fromUserId, toUserId: toId, content, type: 'TEXT', mergeId },
          include: {
            fromUser: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        }),
      ),
    );
    return { messages: msgs, mergeId };
  },

  async getNotifications(userId: string, page = 1) {
    const limit = 20;
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { toUserId: userId, type: 'SYSTEM' },
        include: { fromUser: { select: { id: true, nickname: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { toUserId: userId, type: 'SYSTEM' } }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  },
};
