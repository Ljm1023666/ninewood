import { prisma } from '../lib/prisma.js';

export const messageService = {
  async send(fromUserId: string, toUserId: string, content: string, orderId?: string) {
    return prisma.message.create({
      data: { fromUserId, toUserId, content, type: 'TEXT', orderId: orderId || null },
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
