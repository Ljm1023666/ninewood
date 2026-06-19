import { prisma } from '../lib/prisma.js';
import { tagService } from './tag.service.js';
import { certificationService } from './certification.service.js';

export const poolService = {
  // ======== 活池检索 ========
  async getActive(params: {
    regionId?: number;
    tagName?: string;
    untaggedOnly?: boolean;
    isCertifiedOnly?: boolean;
    special?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const and: any[] = [
      { deletedAt: null },
    ];

    // Stage filter
    if (params.special) {
      and.push({ stage: { in: ['active', 'compressed'] } });
    } else {
      and.push({ stage: 'active' });
    }

    // 标签卡包筛选
    if (params.tagName) {
      and.push({ tagName: params.tagName });
    }

    // 未分类需求（tagName 为空）
    if (params.untaggedOnly) {
      and.push({ tagName: null });
    }

    // 地域筛选
    if (params.regionId != null) {
      and.push({ regionId: params.regionId });
    }

    // 只看认证需求
    if (params.isCertifiedOnly) {
      and.push({ isCertifiedOnly: true });
    }

    const where = { AND: and };

    // 特殊搜索：忙碌中可接单的服务者
    let busyProviders: any[] = []
    if (params.special && params.tagName) {
      busyProviders = await prisma.user.findMany({
        where: {
          serviceTags: { hasSome: [params.tagName] },
          isBusy: true,
          allowSpecialSearch: true,
        },
        select: { id: true, nickname: true, serviceTags: true, certificationLevel: true, cityCode: true },
        take: 10,
      })
      busyProviders = busyProviders.map(p => ({
        ...p,
        cityCode: p.cityCode ? p.cityCode.slice(0, 2) + '0000' : null,
      }))
    }

    const [demands, total] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              demandCardCoverUrl: true,
              certificationLevel: true,
            },
          },
          _count: { select: { applications: true } },
          activeDemand: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demand.count({ where }),
    ]);

    return {
      demands,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      busyProviders: busyProviders.length > 0 ? busyProviders : undefined,
    };
  },

  // ======== 死池检索 ========
  async getDead(params: {
    regionId?: number;
    tagName?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const and: any[] = [
      { stage: 'completed', deletedAt: null },
    ];

    if (params.tagName) {
      and.push({ tagName: params.tagName });
    }
    if (params.regionId != null) {
      and.push({ regionId: params.regionId });
    }

    const where = { AND: and };

    const [demands, total] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              demandCardCoverUrl: true,
              certificationLevel: true,
            },
          },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demand.count({ where }),
    ]);

    return {
      demands,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  // ======== 时间杠杆（纯函数） ========
  calculateCompressionDates(publishedAt: Date, totalExtendedMonths: number) {
    const totalAcceleration = totalExtendedMonths * 10;

    // 封面删除时间：max(publishedAt, publishedAt + 1个月 - 加速月数)
    const coverDeletion = new Date(publishedAt);
    coverDeletion.setMonth(coverDeletion.getMonth() + 1 - totalAcceleration);
    if (coverDeletion.getTime() < publishedAt.getTime()) {
      coverDeletion.setTime(publishedAt.getTime());
    }

    // 详情删除时间：max(publishedAt, publishedAt + 12个月 - 加速月数)
    const detailDeletion = new Date(publishedAt);
    detailDeletion.setMonth(detailDeletion.getMonth() + 12 - totalAcceleration);
    if (detailDeletion.getTime() < publishedAt.getTime()) {
      detailDeletion.setTime(publishedAt.getTime());
    }

    // 卡片删除时间：publishedAt + 36个月 - 加速月数（无下限）
    const cardDeletion = new Date(publishedAt);
    cardDeletion.setMonth(cardDeletion.getMonth() + 36 - totalAcceleration);

    return { coverDeletion, detailDeletion, cardDeletion };
  },

  // ======== 延期需求 ========
  async extendDemand(demandId: string, userId: string, months: number) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      select: { userId: true, createdAt: true, stage: true },
    });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权操作' };

    // 累计延期月数
    let totalExtendedMonths = months;
    const activeDemand = await prisma.activeDemand.findUnique({
      where: { demandId },
    });
    if (activeDemand) {
      totalExtendedMonths += activeDemand.totalExtendedMonths;
    }

    // 重新计算压缩日期
    const dates = this.calculateCompressionDates(demand.createdAt, totalExtendedMonths);
    const nextCompressionDate = dates.coverDeletion;

    // 更新/创建 ActiveDemand
    await prisma.activeDemand.upsert({
      where: { demandId },
      create: { demandId, totalExtendedMonths, nextCompressionDate },
      update: { totalExtendedMonths, nextCompressionDate },
    });

    // 如果 coverDeletion 已到，立即推进到 compressed
    if (new Date() >= dates.coverDeletion) {
      await prisma.demand.update({
        where: { id: demandId },
        data: { stage: 'compressed' },
      });
    }

    return { totalExtendedMonths, nextCompressionDate };
  },

  // ======== 完成需求（移入死池） ========
  async completeDemand(demandId: string, userId: string, coverImage: string) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      select: { userId: true, stage: true, tagName: true, amountEstimate: true, minPrice: true, deposit: true },
    });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权操作' };
    if (demand.stage === 'completed') throw { status: 400, message: '需求已完成' };

    // 查找关联订单获取成交价
    const order = await prisma.order.findFirst({
      where: { demandId },
      select: { agreedPrice: true, providerId: true },
    });
    const finalPrice = order?.agreedPrice ? Number(order.agreedPrice) : Number(demand.minPrice);

    await prisma.demand.update({
      where: { id: demandId },
      data: { stage: 'completed', coverImage, status: 'COMPLETED' },
    });

    // AI 2.8: 创建结算记录
    try {
      const { transactionService } = await import('./transaction.service.js');
      await transactionService.createSettlement(demandId, finalPrice);
    } catch (err) {
      console.warn('[Pool] Settlement creation failed:', err);
    }

    // 更新标签统计数据
    if (demand.tagName && demand.amountEstimate != null) {
      try {
        await tagService.updateStats(demand.tagName, Number(demand.amountEstimate));
      } catch (err) {
        console.warn(`[Pool] tagService.updateStats failed:`, err);
      }
    }

    // 更新认证服务者统计
    try {
      const order = await prisma.order.findFirst({
        where: { demandId },
        select: { providerId: true },
      });
      if (order) {
        const certified = await prisma.certifiedProvider.findUnique({
          where: { userId: order.providerId },
        });
        if (certified) {
          await certificationService.updateStats(order.providerId, 5);
        }
      }
    } catch (err) {
      console.warn(`[Pool] certificationService.updateStats failed:`, err);
    }

    // 自动恢复服务者忙碌状态：如果该服务者没有其他进行中的订单，解除忙碌
    try {
      const order = await prisma.order.findFirst({
        where: { demandId },
        select: { providerId: true },
      });
      if (order) {
        const activeOrders = await prisma.order.count({
          where: {
            providerId: order.providerId,
            status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_REVIEW'] },
            demandId: { not: demandId },
          },
        });
        if (activeOrders === 0) {
          await prisma.user.update({
            where: { id: order.providerId },
            data: { isBusy: false },
          });
        }
      }
    } catch (err) {
      console.warn(`[Pool] auto-busy-recovery failed:`, err);
    }

    return { message: '已标记完成' };
  },

  // ======== 推送配置 ========
  async updatePushConfig(demandId: string, userId: string, pushConfig: object) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      select: { userId: true },
    });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权操作' };

    await prisma.demand.update({
      where: { id: demandId },
      data: { pushConfig },
    });

    return { message: '推送配置已更新' };
  },
};
