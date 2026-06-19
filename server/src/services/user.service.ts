import { prisma } from '../lib/prisma.js';
import { CertLevel } from '@prisma/client';
import { getCache, setCache, delCache } from '../lib/redis.js';

const CERT_UPGRADE_REQUIREMENTS: Record<string, { next: CertLevel; needed: number }> = {
  NONE: { next: 'BASIC', needed: 5 },
  BASIC: { next: 'INTERMEDIATE', needed: 20 },
  INTERMEDIATE: { next: 'ADVANCED', needed: 50 },
};

export const userService = {
  async getProfile(userId: string) {
    const cacheKey = `user:profile:${userId}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, phone: true, nickname: true, avatarUrl: true, coverUrl: true, demandCardCoverUrl: true, cityCode: true,
        certificationLevel: true, bio: true, creditScore: true, completedOrders: true, snatchCredits: true,
      },
    });
    if (!user) throw { status: 404, message: '用户不存在' };

    await setCache(cacheKey, user, 300);
    return user;
  },

  async updateProfile(userId: string, data: { nickname?: string; avatarUrl?: string; coverUrl?: string; demandCardCoverUrl?: string | null; cityCode?: string; bio?: string }) {
    const patch: typeof data = { ...data };
    if (patch.demandCardCoverUrl === '') patch.demandCardCoverUrl = null;
    const user = await prisma.user.update({
      where: { id: userId },
      data: patch,
      select: {
        id: true, phone: true, nickname: true, avatarUrl: true, coverUrl: true, demandCardCoverUrl: true, cityCode: true,
        certificationLevel: true, snatchCredits: true, creditScore: true, bio: true, completedOrders: true,
      },
    });
    await delCache(`user:profile:${userId}`);
    return user;
  },

  async getCertStatus(userId: string) {
    const cacheKey = `user:cert:${userId}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { certificationLevel: true, completedOrders: true, snatchCredits: true, creditScore: true },
    });
    if (!user) throw { status: 404, message: '用户不存在' };

    const currentLevel = user.certificationLevel as string;
    const req = CERT_UPGRADE_REQUIREMENTS[currentLevel];
    const promotion = req ? {
      current: currentLevel,
      next: req.next,
      completed: user.completedOrders,
      needed: req.needed,
      progress: Math.min(1, user.completedOrders / req.needed),
    } : null;

    const result = {
      certificationLevel: user.certificationLevel,
      completedOrders: user.completedOrders,
      snatchCredits: user.snatchCredits,
      creditScore: user.creditScore,
      promotion,
    };

    await setCache(cacheKey, result, 300);
    return result;
  },

  async upgradeCert(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { certificationLevel: true, completedOrders: true },
    });
    if (!user) throw { status: 404, message: '用户不存在' };

    const currentLevel = user.certificationLevel as string;
    if (currentLevel === 'ADVANCED' || currentLevel === 'MASTER') {
      throw { status: 400, message: '高级及以上认证需由管理员授予' };
    }

    const req = CERT_UPGRADE_REQUIREMENTS[currentLevel];
    if (!req) throw { status: 400, message: '无法升级' };
    if (user.completedOrders < req.needed) {
      throw { status: 400, message: `升级到${req.next}需要完成至少${req.needed}次成功服务，当前已完成${user.completedOrders}次` };
    }

    const result = await prisma.user.update({
      where: { id: userId },
      data: { certificationLevel: req.next },
      select: {
        id: true, certificationLevel: true, completedOrders: true,
        snatchCredits: true, creditScore: true,
      },
    });
    await delCache(`user:cert:${userId}`);
    await delCache(`user:profile:${userId}`);
    return result;
  },

  // ── Follow ──
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw { status: 400, message: '不能关注自己' };
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });
    return { following: true };
  },

  async unfollow(followerId: string, followingId: string) {
    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { following: false };
  },

  async isFollowing(followerId: string, followingId: string) {
    const f = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { following: !!f };
  },

  async getFollowers(userId: string, page = 1) {
    const limit = 20;
    const [list, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: { follower: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true, bio: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);
    return { list: list.map(f => f.follower), total, page, totalPages: Math.ceil(total / limit) };
  },

  async getFollowing(userId: string, page = 1) {
    const limit = 20;
    const [list, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: { following: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true, bio: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { list: list.map(f => f.following), total, page, totalPages: Math.ceil(total / limit) };
  },

  async getFollowCounts(userId: string) {
    const [following, followers] = await Promise.all([
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);
    return { following, followers };
  },

  async searchUsers(keyword: string, excludeUserId?: string, limit = 20) {
    const users = await prisma.user.findMany({
      where: {
        id: excludeUserId ? { not: excludeUserId } : undefined,
        OR: [
          { nickname: { contains: keyword } },
          { phone: { contains: keyword } },
        ],
      },
      select: {
        id: true, nickname: true, avatarUrl: true, certificationLevel: true, bio: true,
      },
      take: limit,
      orderBy: { certificationLevel: 'desc' },
    });
    return users;
  },

  async getSnatchStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { certificationLevel: true, snatchCredits: true },
    });
    if (!user) throw { status: 404, message: '用户不存在' };
    return user;
  },

  // ── Favorite ──
  async toggleFavorite(userId: string, demandId: string) {
    const existing = await prisma.demandFavorite.findUnique({
      where: { userId_demandId: { userId, demandId } },
    });
    if (existing) {
      await prisma.demandFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await prisma.demandFavorite.create({ data: { userId, demandId } });
    return { favorited: true };
  },

  async isFavorited(userId: string, demandId: string) {
    const f = await prisma.demandFavorite.findUnique({
      where: { userId_demandId: { userId, demandId } },
    });
    return { favorited: !!f };
  },

  async getFavorites(userId: string, page = 1) {
    const limit = 20;
    const [list, total] = await Promise.all([
      prisma.demandFavorite.findMany({
        where: { userId },
        include: {
          demand: {
            select: {
              id: true, title: true, minPrice: true, category: true,
              serviceType: true, mediaUrls: true, status: true,
              createdAt: true,
              user: { select: { id: true, nickname: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demandFavorite.count({ where: { userId } }),
    ]);
    return {
      list: list.map(f => f.demand),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },
};
