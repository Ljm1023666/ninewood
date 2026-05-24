import { prisma } from '../lib/prisma.js';

export const certificationService = {
  /**
   * 注册/更新认证服务者
   * 要求用户 certificationLevel 不是 NONE
   * 自动合并认证标签到 User.serviceTags
   */
  async register(userId: string, params: { tags: string[]; regionId?: number }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { certificationLevel: true, serviceTags: true },
    });

    if (!user) {
      throw Object.assign(new Error('用户不存在'), { status: 404 });
    }

    if (user.certificationLevel === 'NONE') {
      throw Object.assign(new Error('用户尚未认证，无法注册为认证服务者'), { status: 400 });
    }

    const certified = await prisma.certifiedProvider.upsert({
      where: { userId },
      update: {
        tags: params.tags,
        regionId: params.regionId ?? null,
      },
      create: {
        userId,
        tags: params.tags,
        regionId: params.regionId ?? null,
      },
    });

    // 合并认证标签到 User.serviceTags
    const mergedTags = Array.from(new Set([...user.serviceTags, ...params.tags]));
    await prisma.user.update({
      where: { id: userId },
      data: { serviceTags: mergedTags },
    });

    return certified;
  },

  /**
   * 搜索认证服务者（分页）
   * 支持标签、地域、最低评分筛选，按 avgRating 降序
   */
  async search(params: {
    tags?: string[];
    regionId?: number;
    minRating?: number;
    page?: number;
    limit?: number;
  }) {
    const { tags, regionId, minRating, page = 1, limit = 20 } = params;

    const where: any = {};

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (regionId !== undefined) {
      where.regionId = regionId;
    }

    if (minRating !== undefined) {
      where.avgRating = { gte: minRating };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.certifiedProvider.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              certificationLevel: true,
            },
          },
        },
        orderBy: { avgRating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.certifiedProvider.count({ where }),
    ]);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  },

  /**
   * 获取认证服务者详情（含用户基本信息和区域信息）
   */
  async getByUserId(userId: string) {
    return prisma.certifiedProvider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            certificationLevel: true,
            completedOrders: true,
          },
        },
        region: true,
      },
    });
  },

  /**
   * 更新评分和完成数（完成交易时调用）
   */
  async updateStats(userId: string, rating: number) {
    const provider = await prisma.certifiedProvider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw Object.assign(new Error('认证服务者不存在'), { status: 404 });
    }

    const newTotalCompleted = provider.totalCompleted + 1;
    const newAvgRating =
      (provider.avgRating * provider.totalCompleted + rating) / newTotalCompleted;

    return prisma.certifiedProvider.update({
      where: { userId },
      data: {
        totalCompleted: newTotalCompleted,
        avgRating: Math.round(newAvgRating * 100) / 100,
      },
    });
  },
};
