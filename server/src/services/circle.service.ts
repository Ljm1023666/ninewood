import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

const CIRCLE_PRIORITY_WINDOW_MS = 15 * 60 * 1000; // 15 min

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export const circleService = {
  async create(userId: string, data: { name: string; description?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw { status: 404, message: '用户不存在' };

    const inviteCode = generateInviteCode();
    const circle = await prisma.circle.create({
      data: {
        name: data.name,
        type: 'PRIVATE',
        ownerId: userId,
        inviteCode,
        memberCount: 1,
      },
    });

    // Creator joins as owner
    await prisma.circleMember.create({
      data: { circleId: circle.id, userId, role: 'OWNER' },
    });

    return circle;
  },

  async joinPublic(userId: string, circleId: string) {
    const circle = await prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle) throw { status: 404, message: '圈子不存在' };
    if (circle.type !== 'PUBLIC') throw { status: 400, message: '私密圈子需要通过邀请码加入' };

    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing) throw { status: 409, message: '已在圈子中' };

    await prisma.circleMember.create({ data: { circleId, userId, role: 'MEMBER' } });
    await prisma.circle.update({ where: { id: circleId }, data: { memberCount: { increment: 1 } } });
    return { success: true };
  },

  async joinByCode(userId: string, code: string) {
    const circle = await prisma.circle.findUnique({
      where: { inviteCode: code.toUpperCase() },
    });
    if (!circle) throw { status: 404, message: '邀请码无效' };

    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
    });
    if (existing) throw { status: 409, message: '已在圈子中' };

    await prisma.circleMember.create({ data: { circleId: circle.id, userId, role: 'MEMBER' } });
    await prisma.circle.update({
      where: { id: circle.id },
      data: { memberCount: { increment: 1 } },
    });

    return { message: '已加入圈子', circle };
  },

  async getMyCircles(userId: string) {
    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          include: {
            _count: { select: { members: true } },
            owner: { select: { id: true, nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships;
  },

  async getById(circleId: string) {
    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        owner: { select: { id: true, nickname: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } } },
          take: 20,
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true, demands: true } },
      },
    });
    if (!circle) throw { status: 404, message: '圈子不存在' };
    return circle;
  },

  async listPublic(excludeUserId?: string) {
    const where: any = { type: 'PUBLIC', status: 'ACTIVE' };
    if (excludeUserId) {
      const myCircleIds = await prisma.circleMember.findMany({
        where: { userId: excludeUserId },
        select: { circleId: true },
      });
      if (myCircleIds.length) {
        where.id = { notIn: myCircleIds.map(m => m.circleId) };
      }
    }
    return prisma.circle.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: [{ memberCount: 'desc' }, { activeScore: 'desc' }],
    });
  },

  async applyPublicCircle(userId: string, data: { name: string; description?: string; cityCode?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw { status: 404, message: '用户不存在' };

    // Check name convention: region prefix
    if (data.cityCode && !data.name.startsWith(data.cityCode)) {
      // Just a warning, not blocking
    }

    const circle = await prisma.circle.create({
      data: {
        name: data.name,
        type: 'PUBLIC',
        ownerId: userId,
        cityCode: data.cityCode || null,
      },
    });

    await prisma.circleMember.create({
      data: { circleId: circle.id, userId, role: 'OWNER' },
    });

    return { circle, message: '公开圈申请已提交' };
  },

  async approveCircle(circleId: string) {
    return prisma.circle.update({
      where: { id: circleId },
      data: { status: 'ACTIVE' },
    });
  },

  async getCircleDemands(circleId: string, userId: string, page = 1) {
    const member = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw { status: 403, message: '请先加入圈子' };

    const limit = 20;
    const [demands, total] = await Promise.all([
      prisma.demand.findMany({
        where: { circleId, status: 'PENDING' },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demand.count({ where: { circleId, status: 'PENDING' } }),
    ]);
    return { demands, total, page, totalPages: Math.ceil(total / limit) };
  },
};
