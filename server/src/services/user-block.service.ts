import { prisma } from '../lib/prisma.js';

export const userBlockService = {
  async block(userId: string, blockedId: string) {
    if (userId === blockedId) {
      throw Object.assign(new Error('不能拉黑自己'), { status: 400 });
    }
    const target = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) {
      throw Object.assign(new Error('用户不存在'), { status: 404 });
    }
    return prisma.userBlock.upsert({
      where: { userId_blockedId: { userId, blockedId } },
      create: { userId, blockedId },
      update: {},
    });
  },

  async unblock(userId: string, blockedId: string) {
    await prisma.userBlock.deleteMany({
      where: { userId, blockedId },
    });
  },

  async listBlocked(userId: string) {
    const rows = await prisma.userBlock.findMany({
      where: { userId },
      include: {
        blocked: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      blockedId: r.blockedId,
      user: r.blocked,
      createdAt: r.createdAt,
    }));
  },

  async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    const row = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { userId: userA, blockedId: userB },
          { userId: userB, blockedId: userA },
        ],
      },
      select: { id: true },
    });
    return !!row;
  },

  async getBlockedPartnerIds(userId: string): Promise<Set<string>> {
    const [outgoing, incoming] = await Promise.all([
      prisma.userBlock.findMany({
        where: { userId },
        select: { blockedId: true },
      }),
      prisma.userBlock.findMany({
        where: { blockedId: userId },
        select: { userId: true },
      }),
    ]);
    return new Set([
      ...outgoing.map((r) => r.blockedId),
      ...incoming.map((r) => r.userId),
    ]);
  },
};
