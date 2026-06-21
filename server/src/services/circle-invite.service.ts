import { prisma } from '../lib/prisma.js';

const STATUS_LABELS: Record<string, string> = {
  PENDING: '等待加入',
  ACCEPTED: '已加入',
  REVOKED: '已撤销',
  EXPIRED: '已过期',
};

function formatLastActive(lastSeenAt: Date | null, joinedAt: Date): string {
  if (lastSeenAt) {
    const diff = Date.now() - lastSeenAt.getTime();
    if (diff < 60_000) return '当前在线';
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + ' 分钟前活跃';
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + ' 小时前活跃';
    return Math.floor(diff / 86_400_000) + ' 天前活跃';
  }
  const diffJoin = Date.now() - joinedAt.getTime();
  if (diffJoin < 86_400_000) return '今日加入';
  return '加入 ' + Math.floor(diffJoin / 86_400_000) + ' 天';
}

export const circleInviteService = {
  async listMembers(circleId: string, params: { q?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const where: any = { circleId };
    if (params.q && params.q.trim()) {
      where.user = { nickname: { contains: params.q.trim(), mode: 'insensitive' } };
    }
    const [items, total] = await Promise.all([
      prisma.circleMember.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatarUrl: true, bio: true } } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.circleMember.count({ where }),
    ]);
    return {
      items: items.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        lastSeenAt: m.lastSeenAt ? m.lastSeenAt.toISOString() : null,
        lastActiveLabel: formatLastActive(m.lastSeenAt, m.joinedAt),
        user: {
          id: m.user.id,
          nickname: m.user.nickname,
          avatarUrl: m.user.avatarUrl,
          bio: m.user.bio ?? null,
        },
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  async listInvites(circleId: string) {
    const items = await prisma.circleInvite.findMany({
      where: { circleId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { id: true, nickname: true } } },
    });
    return items.map((it) => ({
      id: it.id,
      email: it.email,
      status: it.status,
      statusLabel: STATUS_LABELS[it.status] || it.status,
      invitedBy: it.invitedBy,
      createdAt: it.createdAt.toISOString(),
      expiresAt: it.expiresAt ? it.expiresAt.toISOString() : null,
    }));
  },

  async createInvite(circleId: string, invitedById: string, emailRaw: string) {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
      throw { status: 400, message: '邮箱格式不正确' };
    }
    // If an existing PENDING invite exists, refresh its createdAt.
    const existing = await prisma.circleInvite.findFirst({
      where: { circleId, email, status: 'PENDING' },
    });
    if (existing) {
      const updated = await prisma.circleInvite.update({
        where: { id: existing.id },
        data: { createdAt: new Date() },
        include: { invitedBy: { select: { id: true, nickname: true } } },
      });
      return this.toDto(updated);
    }
    const created = await prisma.circleInvite.create({
      data: { circleId, email, invitedById, status: 'PENDING' },
      include: { invitedBy: { select: { id: true, nickname: true } } },
    });
    return this.toDto(created);
  },

  async resendInvite(circleId: string, inviteId: string) {
    const invite = await prisma.circleInvite.findFirst({ where: { id: inviteId, circleId } });
    if (!invite) throw { status: 404, message: '邀请不存在' };
    if (invite.status !== 'PENDING') throw { status: 400, message: '仅可重发待处理的邀请' };
    const updated = await prisma.circleInvite.update({
      where: { id: inviteId },
      data: { createdAt: new Date() },
      include: { invitedBy: { select: { id: true, nickname: true } } },
    });
    return this.toDto(updated);
  },

  async revokeInvite(circleId: string, inviteId: string) {
    const invite = await prisma.circleInvite.findFirst({ where: { id: inviteId, circleId } });
    if (!invite) throw { status: 404, message: '邀请不存在' };
    if (invite.status === 'REVOKED') return { success: true };
    await prisma.circleInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });
    return { success: true };
  },

  async heartbeat(circleId: string, userId: string) {
    try {
      await prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId } },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      // not a member: best-effort, ignore
    }
    return { success: true };
  },

  toDto(it: any) {
    return {
      id: it.id,
      email: it.email,
      status: it.status,
      statusLabel: STATUS_LABELS[it.status] || it.status,
      invitedBy: it.invitedBy,
      createdAt: it.createdAt.toISOString(),
      expiresAt: it.expiresAt ? it.expiresAt.toISOString() : null,
    };
  },
};
