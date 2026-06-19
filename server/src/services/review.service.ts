import { prisma } from '../lib/prisma.js';

async function updateCreditScore(userId: string) {
  const stats = await prisma.review.aggregate({
    where: { revieweeId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const avg = stats._avg.rating || 0;
  const count = stats._count.rating || 0;
  // 加权信用分：基础60 + 评价均分贡献，最低0最高100
  const score = count > 0
    ? Math.max(0, Math.min(100, Math.round(avg * 20)))
    : 60;
  await prisma.user.update({
    where: { id: userId },
    data: { creditScore: score },
  });
}

export const reviewService = {
  async create(params: {
    orderId: string;
    reviewerId: string;
    rating: number;
    content?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { providerId: true, requesterId: true, status: true },
    });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.status !== 'COMPLETED') throw { status: 400, message: '仅已完成订单可评价' };

    const { reviewerId } = params;
    if (reviewerId !== order.providerId && reviewerId !== order.requesterId) {
      throw { status: 403, message: '不是订单参与方' };
    }
    const revieweeId = reviewerId === order.providerId ? order.requesterId : order.providerId;

    if (params.rating < 1 || params.rating > 5) {
      throw { status: 400, message: '评分范围为 1-5' };
    }

    const existing = await prisma.review.findUnique({ where: { orderId: params.orderId } });
    if (existing) throw { status: 409, message: '该订单已评价' };

    const review = await prisma.review.create({
      data: {
        orderId: params.orderId,
        reviewerId,
        revieweeId,
        rating: params.rating,
        content: params.content || null,
      },
    });

    await updateCreditScore(revieweeId);

    return review;
  },

  async getByOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId && order.requesterId !== userId) {
      throw { status: 403, message: '无权查看' };
    }
    return prisma.review.findUnique({
      where: { orderId },
      include: {
        reviewer: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });
  },

  async getByUser(userId: string, page = 1) {
    const limit = 20;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: userId },
        include: {
          reviewer: { select: { id: true, nickname: true, avatarUrl: true } },
          order: { select: { id: true, demand: { select: { title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { revieweeId: userId } }),
    ]);
    const stats = await prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
    });
    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      avgRating: stats._avg.rating ? Math.round(Number(stats._avg.rating) * 10) / 10 : null,
    };
  },
};
