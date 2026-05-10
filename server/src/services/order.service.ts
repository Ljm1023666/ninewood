import { prisma } from '../lib/prisma.js';
import { OrderStatus } from '@prisma/client';

export const orderService = {
  async create(demandId: string, applicationId: string, userId: string) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: { _count: { select: { orders: true } } },
    });
    if (!demand) throw { status: 404, message: '需求不存在' };
    if (demand.userId !== userId) throw { status: 403, message: '无权操作' };
    if (demand._count.orders > 0) throw { status: 400, message: '该需求已生成订单' };

    const application = await prisma.demandApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application || application.demandId !== demandId || application.status !== 'ACCEPTED') {
      throw { status: 400, message: '申请状态不正确' };
    }

    const agreedPrice = application.offerPrice || demand.minPrice;

    // Wrap in transaction: order + demand status + notification
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          demandId,
          providerId: application.userId,
          requesterId: userId,
          agreedPrice,
          status: 'IN_PROGRESS',
        },
        include: {
          provider: { select: { id: true, nickname: true, avatarUrl: true } },
          requester: { select: { id: true, nickname: true, avatarUrl: true } },
          demand: { select: { id: true, title: true } },
        },
      });

      await tx.demand.update({
        where: { id: demandId },
        data: { status: 'COMPLETED' },
      });

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: application.userId,
          orderId: created.id,
          content: `需求方已确认订单「${demand.title}」，服务开始。订单金额：¥${Number(agreedPrice)}`,
          type: 'SYSTEM',
        },
      });

      return created;
    });

    return order;
  },

  async getById(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        provider: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        requester: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        demand: { select: { id: true, title: true, description: true, minPrice: true, category: true } },
      },
    });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId && order.requesterId !== userId) {
      throw { status: 403, message: '无权查看' };
    }
    return {
      ...order,
      agreedPrice: Number(order.agreedPrice),
      demand: order.demand ? { ...order.demand, minPrice: Number(order.demand.minPrice) } : null,
    };
  },

  async listMine(userId: string, role?: string, page = 1) {
    const limit = 20;
    const where: any = {};
    if (role === 'provider') where.providerId = userId;
    else if (role === 'requester') where.requesterId = userId;
    else where.OR = [{ providerId: userId }, { requesterId: userId }];

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          provider: { select: { id: true, nickname: true, avatarUrl: true } },
          requester: { select: { id: true, nickname: true, avatarUrl: true } },
          demand: { select: { id: true, title: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return {
      orders: orders.map(o => ({ ...o, agreedPrice: Number(o.agreedPrice) })),
      total, page, totalPages: Math.ceil(total / limit),
    };
  },

  async prepay(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可支付' };
    if (order.status !== 'IN_PROGRESS') throw { status: 400, message: '订单状态不允许支付' };

    await prisma.order.update({
      where: { id: orderId },
      data: { paidAt: new Date() },
    });

    return { message: '支付成功（模拟）', amount: Number(order.agreedPrice) };
  },

  async complete(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId) throw { status: 403, message: '仅接单方可标记完成' };
    if (order.status !== 'IN_PROGRESS') throw { status: 400, message: '订单状态不允许此操作' };

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'WAITING_REVIEW' },
    });

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: order.requesterId,
        orderId,
        content: '服务方已标记服务完成，请验收确认',
        type: 'SYSTEM',
      },
    });

    return { message: '已标记完成，等待验收' };
  },

  async confirm(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可确认' };
    if (order.status !== 'WAITING_REVIEW') throw { status: 400, message: '订单状态不允许确认' };

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Increment provider completed orders
    await prisma.user.update({
      where: { id: order.providerId },
      data: { completedOrders: { increment: 1 } },
    });

    // Refund deposit if exists for this demand
    const deposit = await prisma.deposit.findFirst({
      where: { userId: order.requesterId, status: 'PENDING' },
    });
    if (deposit) {
      const demandIds = deposit.demandIds as string[];
      if (demandIds.includes(order.demandId)) {
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: { status: 'REFUNDED' },
        });
      }
    }

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: order.providerId,
        orderId,
        content: `订单已完成验收，¥${Number(order.agreedPrice)} 已结算`,
        type: 'SYSTEM',
      },
    });

    return { message: '订单已完成' };
  },

  async dispute(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId && order.requesterId !== userId) {
      throw { status: 403, message: '无权操作' };
    }
    if (order.status === 'COMPLETED' || order.status === 'DISPUTED') {
      throw { status: 400, message: '订单状态不允许争议' };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DISPUTED' },
    });

    return { message: '争议已提交，等待管理员处理' };
  },

  async partialComplete(orderId: string, userId: string, newPrice: number, description: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { demand: true },
    });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId) throw { status: 403, message: '仅接单方可提出部分完成' };
    if (order.status !== 'IN_PROGRESS') throw { status: 400, message: '订单状态不允许部分完成' };
    if (newPrice >= Number(order.agreedPrice)) throw { status: 400, message: '部分完成报价必须低于原价' };

    // Complete the original order at new price
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', agreedPrice: newPrice, completedAt: new Date() },
    });

    // Increment provider completed orders
    await prisma.user.update({
      where: { id: order.providerId },
      data: { completedOrders: { increment: 1 } },
    });

    // Create a new "remaining" demand as draft (status=PENDING, ready for requester to republish)
    const remainingPrice = Number(order.demand.minPrice) - newPrice;
    const remainingDemand = await prisma.demand.create({
      data: {
        userId: order.requesterId,
        title: `[剩余] ${order.demand.title}`,
        description: `原订单部分完成，剩余部分：${description}。原需求：${order.demand.description}`,
        minPrice: Math.max(1, remainingPrice),
        category: order.demand.category,
        serviceType: order.demand.serviceType,
        locationLat: order.demand.locationLat,
        locationLng: order.demand.locationLng,
        cityCode: order.demand.cityCode,
        expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mediaUrls: JSON.parse(JSON.stringify(order.demand.mediaUrls)),
      },
    });

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: order.requesterId,
        orderId,
        content: `接单方提出部分完成：¥${newPrice}，说明：${description}。剩余需求已生成草稿，请确认发布。`,
        type: 'SYSTEM',
      },
    });

    return {
      message: '部分完成已确认，剩余需求已生成',
      originalOrderId: orderId,
      settledPrice: newPrice,
      remainingDemandId: remainingDemand.id,
      remainingDemand,
    };
  },
};
