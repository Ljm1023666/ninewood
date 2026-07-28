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
        partialProposals: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId && order.requesterId !== userId) {
      throw { status: 403, message: '无权查看' };
    }
    const pending = order.partialProposals[0];
    return {
      ...order,
      agreedPrice: Number(order.agreedPrice),
      demand: order.demand ? { ...order.demand, minPrice: Number(order.demand.minPrice) } : null,
      partialProposal: pending
        ? {
            id: pending.id,
            proposedPrice: Number(pending.proposedPrice),
            description: pending.description,
            createdAt: pending.createdAt,
          }
        : null,
      partialProposals: undefined,
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
    const demand = await prisma.demand.findFirst({
      where: { orders: { some: { id: orderId } } },
    });
    // 先读 demand 仅用于算费；真正写库全部在事务内条件更新

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw { status: 404, message: '订单不存在' };
      if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可支付' };
      if (order.paidAt) {
        return { alreadyPaid: true as const, agreedPrice: Number(order.agreedPrice), serviceFee: 0 };
      }
      if (order.status !== 'IN_PROGRESS' && order.status !== 'PARTIAL_PENDING') {
        throw { status: 400, message: '订单状态不允许支付' };
      }

      const d =
        demand ??
        (await tx.demand.findUnique({ where: { id: order.demandId } }));
      if (!d) throw { status: 404, message: '需求不存在' };

      const breakdown = calculateSettlement(
        Number(d.minPrice),
        Number(order.agreedPrice),
        Number(d.minPrice),
      );

      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          requesterId: userId,
          paidAt: null,
          status: { in: ['IN_PROGRESS', 'PARTIAL_PENDING'] },
        },
        data: { paidAt: new Date() },
      });
      if (claimed.count === 0) {
        const again = await tx.order.findUnique({ where: { id: orderId } });
        if (again?.paidAt) {
          return {
            alreadyPaid: true as const,
            agreedPrice: Number(again.agreedPrice),
            serviceFee: breakdown.serviceFee,
          };
        }
        throw { status: 409, message: '订单状态冲突，请重试', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      await walletService.debit(
        userId,
        breakdown.serviceFee,
        {
          referenceType: 'ORDER',
          referenceId: orderId,
          memo: 'prepay 服务费(5%)',
          operationKey: `order:${orderId}:prepay-fee`,
        },
        tx,
      );

      return {
        alreadyPaid: false as const,
        agreedPrice: Number(order.agreedPrice),
        serviceFee: breakdown.serviceFee,
      };
    });

    return {
      message: result.alreadyPaid ? '订单已支付' : '点数已扣除，支付完成',
      amount: result.agreedPrice,
      serviceFee: result.serviceFee,
    };
  },

  async complete(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId) throw { status: 403, message: '仅接单方可标记完成' };
    if (order.status === 'PARTIAL_PENDING') {
      throw {
        status: 409,
        message: '存在未决的部分完成提议，请先撤回或等待需求方处理',
        details: { code: 'PARTIAL_PROPOSAL_ACTIVE' },
      };
    }
    if (order.status !== 'IN_PROGRESS') throw { status: 400, message: '订单状态不允许此操作' };

    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: 'IN_PROGRESS', providerId: userId },
      data: { status: 'WAITING_REVIEW' },
    });
    if (updated.count === 0) {
      throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
    }

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
      const claimed = await tx.order.updateMany({
        where: { id: orderId, requesterId: userId, status: 'WAITING_REVIEW' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      const { breakdown } = await walletService.settleDemand(
        order.demandId,
        Number(order.agreedPrice),
        { skipServiceFee },
        tx,
      );

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

    // Phase 2：订单完成 → Quiet（失败隔离）
    const { quietTaskSafe } = await import('./task-quiet.service.js');
    quietTaskSafe({
      resourceType: 'ORDER',
      resourceId: orderId,
      outcomeStatus: 'SUCCEEDED',
      outcomeSummary: '订单已完成验收并结算',
      userId: order.requesterId,
      nextRequiredAction: null,
    });

    return { message: '订单已完成', breakdown };
  },

  async cancel(orderId: string, userId: string) {
    // ADR 推荐：WAITING_REVIEW 禁止 cancel，须 confirm 或 dispute
    const allowed: Array<'IN_PROGRESS' | 'PARTIAL_PENDING'> = ['IN_PROGRESS', 'PARTIAL_PENDING'];

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { demand: { select: { id: true, minPrice: true } } },
      });
      if (!order) throw { status: 404, message: '订单不存在' };
      if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可取消' };
      if (order.status === 'CANCELLED') {
        return { alreadyCancelled: true as const };
      }
      if (order.status === 'WAITING_REVIEW') {
        throw {
          status: 409,
          message: '服务方已提交验收，请确认完成或发起争议，不可直接取消',
          details: { code: 'ORDER_STATE_CONFLICT' },
        };
      }
      if (!allowed.includes(order.status as any)) {
        throw { status: 400, message: '订单状态不允许取消' };
      }

      const claimed = await tx.order.updateMany({
        where: { id: orderId, requesterId: userId, status: { in: allowed } },
        data: { status: 'CANCELLED' },
      });
      if (claimed.count === 0) {
        const again = await tx.order.findUnique({ where: { id: orderId } });
        if (again?.status === 'CANCELLED') return { alreadyCancelled: true as const };
        throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      await tx.orderPartialProposal.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'SUPERSEDED', decidedAt: new Date(), decidedBy: userId },
      });

      if (order.paidAt && order.demand) {
        const breakdown = calculateSettlement(
          Number(order.demand.minPrice),
          Number(order.agreedPrice),
          Number(order.demand.minPrice),
        );
        if (breakdown.serviceFee > 0) {
          await walletService.credit(
            userId,
            breakdown.serviceFee,
            {
              referenceType: 'ORDER',
              referenceId: orderId,
              memo: '取消订单退还服务费',
              operationKey: `order:${orderId}:cancel-fee-refund`,
            },
            tx,
          );
        }
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

      return { alreadyCancelled: false as const, demandId: order.demandId };
    });

    if (!result.alreadyCancelled && result.demandId) {
      shadowOnLoopCancelled(result.demandId, 'ORDER_CANCELLED').catch((err) => {
        console.error('[loop-shadow] order cancel hook failed', orderId, err);
      });
      const { quietTaskSafe } = await import('./task-quiet.service.js');
      quietTaskSafe({
        resourceType: 'ORDER',
        resourceId: orderId,
        outcomeStatus: 'CANCELLED',
        outcomeSummary: '订单已取消',
        userId,
        nextRequiredAction: null,
      });
    }

    return { message: result.alreadyCancelled ? '订单已取消' : '订单已取消' };
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
    // 仅提议，零资金副作用（ADR D1）
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: '订单不存在' };
    if (order.providerId !== userId) throw { status: 403, message: '仅接单方可提出部分完成' };
    if (order.status !== 'IN_PROGRESS') throw { status: 400, message: '订单状态不允许部分完成' };
    if (newPrice >= Number(order.agreedPrice) || newPrice <= 0) {
      throw { status: 400, message: '部分完成报价必须低于原价且大于 0' };
    }

    const proposal = await prisma.$transaction(async (tx) => {
      const pending = await tx.orderPartialProposal.findFirst({
        where: { orderId, status: 'PENDING' },
      });
      if (pending) {
        throw { status: 409, message: '已有未决的部分完成提议', details: { code: 'PARTIAL_PROPOSAL_ACTIVE' } };
      }

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'IN_PROGRESS', providerId: userId },
        data: { status: 'PARTIAL_PENDING' },
      });
      if (claimed.count === 0) {
        throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      const created = await tx.orderPartialProposal.create({
        data: {
          orderId,
          proposedPrice: newPrice,
          description,
          status: 'PENDING',
          proposedBy: userId,
        },
      });

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: order.requesterId,
          orderId,
          content: `接单方提出部分完成：¥${newPrice}，说明：${description}。请确认或拒绝后才会结算。`,
          type: 'SYSTEM',
        },
      });

      return created;
    });

    return {
      message: '部分完成提议已提交，等待需求方确认',
      proposalId: proposal.id,
      status: 'PARTIAL_PENDING' as const,
      proposedPrice: Number(proposal.proposedPrice),
      description: proposal.description,
    };
  },

  async acceptPartial(orderId: string, userId: string) {
    const out = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { demand: true },
      });
      if (!order) throw { status: 404, message: '订单不存在' };
      if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可确认部分完成' };
      if (order.status !== 'PARTIAL_PENDING') throw { status: 400, message: '订单状态不允许确认部分完成' };

      const proposal = await tx.orderPartialProposal.findFirst({
        where: { orderId, status: 'PENDING' },
      });
      if (!proposal) throw { status: 400, message: '没有待确认的部分完成提议' };

      const P = Number(proposal.proposedPrice);
      const A = Number(order.agreedPrice);

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'PARTIAL_PENDING', requesterId: userId },
        data: { status: 'COMPLETED', agreedPrice: P, completedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      await tx.orderPartialProposal.update({
        where: { id: proposal.id },
        data: { status: 'ACCEPTED', decidedBy: userId, decidedAt: new Date() },
      });

      const { breakdown, remainingPrice } = await walletService.settlePartialWithRemainder(
        {
          demandId: order.demandId,
          orderId,
          proposedPrice: P,
          agreedPriceBefore: A,
          requesterId: order.requesterId,
          providerId: order.providerId,
          skipServiceFee: Boolean(order.paidAt),
          isWelfare: Boolean(order.demand.isPublicWelfare),
        },
        tx,
      );

      await tx.user.update({
        where: { id: order.providerId },
        data: { completedOrders: { increment: 1 } },
      });

      const remainingDemand = await tx.demand.create({
        data: {
          userId: order.requesterId,
          title: `[剩余] ${order.demand.title}`,
          description: `原订单部分完成，剩余部分：${proposal.description}。原需求：${order.demand.description}`,
          minPrice: remainingPrice,
          category: order.demand.category,
          serviceType: order.demand.serviceType,
          cityCode: order.demand.cityCode,
          expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          mediaUrls: JSON.parse(JSON.stringify(order.demand.mediaUrls)),
          status: 'ACTIVE',
        },
      });

      const remainingDeposit = walletService.calculateDeposit(remainingPrice);
      await assertMinorCanSpend(order.requesterId, remainingDeposit);
      await walletService.holdForDemand(order.requesterId, remainingDemand.id, remainingDeposit, tx);

      await tx.orderPartialProposal.update({
        where: { id: proposal.id },
        data: { remainingDemandId: remainingDemand.id },
      });

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: order.providerId,
          orderId,
          content: `需求方已同意部分完成：¥${P}。剩余需求已生成。服务费 ¥${breakdown.serviceFee.toFixed(2)}。`,
          type: 'SYSTEM',
        },
      });

      return {
        breakdown,
        remainingDemand,
        settledPrice: P,
        providerId: order.providerId,
        demandId: order.demandId,
      };
    });

    shadowOnOrderConfirmed(out.demandId, orderId, {
      price: out.settledPrice,
      serviceFee: Number(out.breakdown.serviceFee),
    }).catch((err) => {
      console.error('[loop-shadow] partial accept hook failed', orderId, err);
    });
    refreshServiceCardEvidenceForOrder(orderId).catch((err) => {
      console.error('[service-card] evidence refresh failed', orderId, err);
    });
    triggerResourceHeaven('builtin.heaven.validate.order_wallet_consistency', { orderId });

    const { quietTaskSafe } = await import('./task-quiet.service.js');
    quietTaskSafe({
      resourceType: 'ORDER',
      resourceId: orderId,
      outcomeStatus: 'SUCCEEDED',
      outcomeSummary: '订单部分完成已确认并结算',
      userId,
      nextRequiredAction: null,
    });

    return {
      message: '部分完成已确认，剩余需求已生成',
      originalOrderId: orderId,
      settledPrice: out.settledPrice,
      remainingDemandId: out.remainingDemand.id,
      remainingDemand: out.remainingDemand,
      breakdown: out.breakdown,
    };
  },

  async rejectPartial(orderId: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw { status: 404, message: '订单不存在' };
      if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可拒绝部分完成' };
      if (order.status !== 'PARTIAL_PENDING') throw { status: 400, message: '订单状态不允许拒绝' };

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'PARTIAL_PENDING', requesterId: userId },
        data: { status: 'IN_PROGRESS' },
      });
      if (claimed.count === 0) {
        throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      await tx.orderPartialProposal.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'REJECTED', decidedBy: userId, decidedAt: new Date() },
      });

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: order.providerId,
          orderId,
          content: '需求方已拒绝部分完成提议，订单继续进行',
          type: 'SYSTEM',
        },
      });
    });

    return { message: '已拒绝部分完成提议', status: 'IN_PROGRESS' as const };
  },

  async withdrawPartial(orderId: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw { status: 404, message: '订单不存在' };
      if (order.providerId !== userId) throw { status: 403, message: '仅接单方可撤回部分完成提议' };
      if (order.status !== 'PARTIAL_PENDING') throw { status: 400, message: '订单状态不允许撤回' };

      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'PARTIAL_PENDING', providerId: userId },
        data: { status: 'IN_PROGRESS' },
      });
      if (claimed.count === 0) {
        throw { status: 409, message: '订单状态冲突', details: { code: 'ORDER_STATE_CONFLICT' } };
      }

      await tx.orderPartialProposal.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'WITHDRAWN', decidedBy: userId, decidedAt: new Date() },
      });

      await tx.message.create({
        data: {
          fromUserId: userId,
          toUserId: order.requesterId,
          orderId,
          content: '服务方已撤回部分完成提议',
          type: 'SYSTEM',
        },
      });
    });

    return { message: '已撤回部分完成提议', status: 'IN_PROGRESS' as const };
  },
};
