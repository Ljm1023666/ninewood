import { prisma } from '../lib/prisma.js';
import { tagService } from './tag.service.js';

export const bidService = {
  /**
   * 服务者对需求应标
   */
  async bid(demandId: string, userId: string, params: { offerPrice?: number; message?: string }) {
    try {
      const demand = await prisma.demand.findUnique({ where: { id: demandId } });
      if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
      if (demand.stage !== 'active') throw Object.assign(new Error('该需求不在应标阶段'), { status: 400 });
      if (demand.status !== 'PENDING') throw Object.assign(new Error('该需求不可应标'), { status: 400 });
      if (demand.userId === userId) throw Object.assign(new Error('不能给自己的需求应标'), { status: 400 });

      const existing = await prisma.demandApplication.findUnique({
        where: { demandId_userId: { demandId, userId } },
      });
      if (existing) throw Object.assign(new Error('已对该需求应标'), { status: 409 });

      const application = await prisma.demandApplication.create({
        data: {
          demandId,
          userId,
          isSnatched: false,
          offerPrice: params.offerPrice || null,
          message: params.message || null,
        },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        },
      });

      await prisma.demand.update({
        where: { id: demandId },
        data: { applicantCount: { increment: 1 } },
      });

      return application;
    } catch (error: any) {
      if (error.status) throw error;
      throw Object.assign(new Error('应标失败'), { status: 500 });
    }
  },

  /**
   * 查看某需求的应标列表（需求者视角）
   */
  async getBids(demandId: string) {
    try {
      const demand = await prisma.demand.findUnique({ where: { id: demandId } });
      if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });

      const bids = await prisma.demandApplication.findMany({
        where: { demandId },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return bids.map((b: any) => ({
        ...b,
        offerPrice: b.offerPrice ? Number(b.offerPrice) : null,
      }));
    } catch (error: any) {
      if (error.status) throw error;
      throw Object.assign(new Error('获取应标列表失败'), { status: 500 });
    }
  },

  /**
   * 获取用户的应标列表（服务者视角）
   */
  async getMyBids(userId: string, page = 1, limit = 20) {
    try {
      const [applications, total] = await Promise.all([
        prisma.demandApplication.findMany({
          where: { userId },
          include: {
            demand: {
              select: { id: true, title: true, minPrice: true, category: true, status: true, stage: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.demandApplication.count({ where: { userId } }),
      ]);

      return {
        bids: applications.map((b: any) => ({
          ...b,
          offerPrice: b.offerPrice ? Number(b.offerPrice) : null,
          demand: b.demand ? { ...b.demand, minPrice: Number(b.demand.minPrice) } : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      if (error.status) throw error;
      throw Object.assign(new Error('获取我的应标列表失败'), { status: 500 });
    }
  },

  /**
   * 需求者接受某个应标
   */
  async acceptBid(demandId: string, bidId: string, requesterId: string) {
    try {
      const demand = await prisma.demand.findUnique({ where: { id: demandId } });
      if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
      if (demand.userId !== requesterId) throw Object.assign(new Error('无权操作'), { status: 403 });

      const application = await prisma.demandApplication.findUnique({ where: { id: bidId } });
      if (!application || application.demandId !== demandId) {
        throw Object.assign(new Error('应标不存在'), { status: 404 });
      }
      if (application.status !== 'PENDING') {
        throw Object.assign(new Error('该应标状态不允许接受'), { status: 400 });
      }

      await prisma.$transaction(async (tx: any) => {
        // 接受该应标
        await tx.demandApplication.update({
          where: { id: bidId },
          data: { status: 'ACCEPTED' },
        });

        // 创建订单
        const agreedPrice = application.offerPrice || demand.minPrice;
        await tx.order.create({
          data: {
            demandId,
            providerId: application.userId,
            requesterId,
            agreedPrice,
          },
        });

        // 更新需求状态
        await tx.demand.update({
          where: { id: demandId },
          data: { status: 'COMPLETED' as const },
        });

        // 拒绝其他待处理的应标
        await tx.demandApplication.updateMany({
          where: { demandId, status: 'PENDING', id: { not: bidId } },
          data: { status: 'REJECTED' },
        });

        // 发送系统通知
        await tx.message.create({
          data: {
            fromUserId: requesterId,
            toUserId: application.userId,
            content: `你在需求「${demand.title}」的应标已被接受`,
            type: 'SYSTEM',
          },
        });

        // 服务者自动进入忙碌状态
        await tx.user.update({
          where: { id: application.userId },
          data: { isBusy: true },
        });
      });

      // 更新标签统计数据
      if (demand.tagName) {
        try {
          const amount = demand.amountEstimate ? Number(demand.amountEstimate) : Number(demand.minPrice);
          await tagService.updateStats(demand.tagName, amount);
        } catch (err) {
          console.warn(`[Bid] tagService.updateStats failed:`, err);
        }
      }

      return { message: '已接受应标' };
    } catch (error: any) {
      if (error.status) throw error;
      throw Object.assign(new Error('接受应标失败'), { status: 500 });
    }
  },

  /**
   * 需求者拒绝某个应标
   */
  async rejectBid(demandId: string, bidId: string, requesterId: string) {
    try {
      const demand = await prisma.demand.findUnique({ where: { id: demandId } });
      if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
      if (demand.userId !== requesterId) throw Object.assign(new Error('无权操作'), { status: 403 });

      const application = await prisma.demandApplication.findUnique({ where: { id: bidId } });
      if (!application || application.demandId !== demandId) {
        throw Object.assign(new Error('应标不存在'), { status: 404 });
      }
      if (application.status !== 'PENDING') {
        throw Object.assign(new Error('该应标状态不允许拒绝'), { status: 400 });
      }

      await prisma.demandApplication.update({
        where: { id: bidId },
        data: { status: 'REJECTED' },
      });

      await prisma.message.create({
        data: {
          fromUserId: requesterId,
          toUserId: application.userId,
          content: `你在需求「${demand.title}」的应标已被拒绝`,
          type: 'SYSTEM',
        },
      });

      return { message: '已拒绝该应标' };
    } catch (error: any) {
      if (error.status) throw error;
      throw Object.assign(new Error('拒绝应标失败'), { status: 500 });
    }
  },
};
