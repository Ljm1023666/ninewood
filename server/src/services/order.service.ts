import { prisma } from '../lib/prisma.js';
import { OrderStatus } from '@prisma/client';
import { walletService } from './wallet.service.js';
import { assertMinorCanSpend } from './minor-guard.js';
import { calculateSettlement } from './settlement.js';
import { shadowOnOrderConfirmed, shadowOnLoopCancelled } from './loop/shadow-hooks.js';
import { refreshServiceCardEvidenceForOrder } from './service-card-evidence.service.js';
import { triggerResourceHeaven } from './loop/heaven-runner.service.js';

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

    const order = await prisma.$transaction(async (tx: any) => {
      const dup = await tx.order.findFirst({
        where: { demandId },
        select: { id: true },
      });
      if (dup) throw { status: 400, message: '该需求已生成订单' };

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
        demand: { select: { id: true, title: true, description: true, minPrice: true, category: true, timeLimit: true } },
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
      orders: orders.map((o: any) => ({ ...o, agreedPrice: Number(o.agreedPrice) })),
      total, page, totalPages: Math.ceil(total / limit),
    };
  },

  async prepay(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可支付' };
    if (order.status !== 'IN_PROGRESS') throw { status: 400, message: '订单状态不允许支付' };
    if (order.paidAt) throw { status: 400, message: '订单已支付' };

    const demand = await prisma.demand.findUnique({ where: { id: order.demandId } });
    if (!demand) throw { status: 404, message: '需求不存在' };

    // Task 6.1 P0-02 修正：真实走 wallet.debit 扣服务费
    // - 需求发布时已 hold 了 minPrice，这里只需提前扣取服务费(5%)。
    // - 余额(finalPrice - minPrice)在 confirm 时一起扣，避免重复扣。
    // - 不足额返回 400 + 明确 message。
    const breakdown = calculateSettlement(
      Number(demand.minPrice),
      Number(order.agreedPrice),
      Number(demand.minPrice),
    )
    const balance = await walletService.getBalance(userId)
    if (balance < breakdown.serviceFee) {
      throw { status: 400, message: `点数不足，需 ${breakdown.serviceFee} 点服务费` }
    }

    await prisma.$transaction(async (tx) => {
      // 真实扣减服务费，走 wallet.ledger 可追溯
      await walletService.debit(
        userId,
        breakdown.serviceFee,
        {
          referenceType: 'ORDER',
          referenceId: orderId,
          memo: 'prepay 服务费(5%)',
        },
        tx,
      )
      await tx.order.update({
        where: { id: orderId },
        data: { paidAt: new Date() },
      })
    })

    return { message: '点数已扣除，支付完成', amount: Number(order.agreedPrice), serviceFee: breakdown.serviceFee }
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
    if (order.status === 'COMPLETED') throw { status: 400, message: '订单已完成' };
    if (order.status !== 'WAITING_REVIEW') throw { status: 400, message: '订单状态不允许确认' };

    const skipServiceFee = Boolean(order.paidAt);

    const { breakdown } = await prisma.$transaction(async (tx) => {
      const { breakdown } = await walletService.settleDemand(
        order.demandId,
        Number(order.agreedPrice),
        { skipServiceFee },
        tx,
      );

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      await tx.user.update({
        where: { id: order.providerId },
        data: { completedOrders: { increment: 1 } },
      });

      return { breakdown };
    });

    // Wave B+E: 影子记账 + 验证串联（失败隔离；验证在 CLOSED 前，绝不阻断结算）
    shadowOnOrderConfirmed(
      order.demandId,
      order.id,
      { price: Number(order.agreedPrice), serviceFee: Number(breakdown.serviceFee) },
    ).catch((err) => {
      console.error('[loop-shadow] order confirm hook failed', orderId, err);
    });
    refreshServiceCardEvidenceForOrder(orderId).catch((err) => {
      console.error('[service-card] evidence refresh failed', orderId, err);
    });
    triggerResourceHeaven('builtin.heaven.validate.order_wallet_consistency', { orderId });

    // 兼容：旧 Deposit/DepositDemand 表仅记录位，不作为主路径。
    const oldDeposit = await prisma.depositDemand.findFirst({
      where: {
        demandId: order.demandId,
        deposit: { userId: order.requesterId, status: 'PENDING' },
      },
    });
    if (oldDeposit) {
      console.warn(
        `[order.confirm] 检测到旧 Deposit/DepositDemand 记录（demandId=${order.demandId}），已过渡到 wallet 仓，请检查迁移脚本。`,
      );
    }

    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: order.providerId,
        orderId,
        content: `订单已完成验收，¥${Number(order.agreedPrice)} 已结算。服务费 ¥${breakdown.serviceFee.toFixed(2)}。`,
        type: 'SYSTEM',
      },
    });

    return { message: '订单已完成', breakdown };
  },

  async cancel(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { demand: { select: { id: true, minPrice: true } } },
    });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可取消' };
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'DISPUTED') {
      throw { status: 400, message: '订单状态不允许取消' };
    }

    const breakdown =
      order.demand != null
        ? calculateSettlement(
            Number(order.demand.minPrice),
            Number(order.agreedPrice),
            Number(order.demand.minPrice),
          )
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      if (order.paidAt && breakdown && breakdown.serviceFee > 0) {
        await walletService.credit(
          userId,
          breakdown.serviceFee,
          {
            referenceType: 'ORDER',
            referenceId: orderId,
            memo: '取消订单退还服务费',
          },
          tx,
        );
      }

      if (order.demand) {
        await tx.demand.update({
          where: { id: order.demandId },
          data: { status: 'ACTIVE', acceptedProviderId: null },
        });
        await tx.demandApplicantV2.updateMany({
          where: {
            demandId: order.demandId,
            userId: order.providerId,
            status: 'ACCEPTED',
          },
          data: { status: 'WITHDRAWN' },
        });
      }

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: order.providerId,
          orderId,
          content: '需求方已取消订单，需求已重新开放申请',
          type: 'SYSTEM',
        },
      });
    });

    // Wave B: 影子记账（失败隔离，不影响取消主路径）
    if (order.demandId) {
      shadowOnLoopCancelled(order.demandId, 'ORDER_CANCELLED').catch((err) => {
        console.error('[loop-shadow] order cancel hook failed', orderId, err);
      });
    }

    return { message: '订单已取消' };
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

    const skipServiceFee = Boolean(order.paidAt);

    const { remainingDemand } = await prisma.$transaction(async (tx) => {
      const { breakdown } = await walletService.settleDemand(
        order.demandId,
        newPrice,
        { skipServiceFee },
        tx,
      );

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', agreedPrice: newPrice, completedAt: new Date() },
      });

      await tx.user.update({
        where: { id: order.providerId },
        data: { completedOrders: { increment: 1 } },
      });

      const remainingPrice = Number(order.demand.minPrice) - newPrice;
      const remainingDemand = await tx.demand.create({
        data: {
          userId: order.requesterId,
          title: `[剩余] ${order.demand.title}`,
          description: `原订单部分完成，剩余部分：${description}。原需求：${order.demand.description}`,
          minPrice: Math.max(1, remainingPrice),
          category: order.demand.category,
          serviceType: order.demand.serviceType,
          cityCode: order.demand.cityCode,
          expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mediaUrls: JSON.parse(JSON.stringify(order.demand.mediaUrls)),
          status: 'ACTIVE',
        },
      });

      const remainingDeposit = walletService.calculateDeposit(
        Math.max(1, remainingPrice),
      );
      await assertMinorCanSpend(order.requesterId, remainingDeposit);
      await walletService.holdForDemand(
        order.requesterId,
        remainingDemand.id,
        remainingDeposit,
        tx,
      );

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: order.requesterId,
          orderId,
          content: `接单方提出部分完成：¥${newPrice}，说明：${description}。剩余需求已生成草稿，请确认发布。服务费 ¥${breakdown.serviceFee.toFixed(2)}。`,
          type: 'SYSTEM',
        },
      });

      return { remainingDemand };
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
