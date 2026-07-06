import { Router, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import { adminGate } from '../middleware/admin-gate.js';
import { success, fail } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { z } from 'zod';
import { welfareDisbursementService } from '../services/welfare-disbursement.js';
import { calculateSettlement } from '../services/settlement.js';
import { adminOpsRouter } from './admin-ops.js';

export const adminRouter = Router();

async function resolveOperatorId(req: Request): Promise<string | null> {
  if (req.adminOperatorId) return req.adminOperatorId;
  if (req.user?.userId) return req.user.userId;
  if (config.adminSystemUserId) return config.adminSystemUserId;
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  return admin?.id ?? null;
}

adminRouter.use(adminGate);

adminRouter.use(adminOpsRouter);

// GET /api/admin/health — 运营后台连通性探测
adminRouter.get('/health', (_req: Request, res: Response) => {
  success(res, { ok: true, service: 'ninewood', version: '1' });
});

// GET /api/admin/dashboard — 管理员聚合数据
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const now = new Date();

  const [userCount, demandCount, orderCount, circleCount, providerCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.demand.count(),
      prisma.order.count(),
      prisma.circle.count({ where: { status: 'ACTIVE' } }),
      prisma.userTag.count({ where: { status: 'IDLE' } }),
    ]);
  const disputeCount = await prisma.order.count({ where: { status: 'DISPUTED' } });

  const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const ordersForRevenue = await prisma.order.findMany({
    where: { completedAt: { gte: sevenMonthsAgo }, status: 'COMPLETED' },
    select: { agreedPrice: true, completedAt: true, createdAt: true },
  });

  const revenueMap: Record<string, number> = {};
  const userGrowthMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    revenueMap[key] = 0;
    userGrowthMap[key] = 0;
  }

  for (const o of ordersForRevenue) {
    const d = o.completedAt || o.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (revenueMap[key] !== undefined) {
      revenueMap[key] += Number(o.agreedPrice);
    }
  }

  const usersByMonth = await prisma.user.findMany({
    where: { createdAt: { gte: sevenMonthsAgo } },
    select: { createdAt: true },
  });

  for (const u of usersByMonth) {
    const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (userGrowthMap[key] !== undefined) {
      userGrowthMap[key]++;
    }
  }

  let running = await prisma.user.count({
    where: { createdAt: { lt: sevenMonthsAgo } },
  });
  const userGrowthTrend = Object.entries(userGrowthMap).map(([name, count]) => {
    running += count;
    return { name, users: running, newUsers: count };
  });

  const revenueTrend = Object.entries(revenueMap).map(([name, revenue]) => ({
    name,
    revenue: Math.round(revenue * 100) / 100,
  }));

  const [
    pendingOrders,
    inProgressOrders,
    waitingReviewOrders,
    completedOrders,
    cancelledOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.order.count({ where: { status: 'WAITING_REVIEW' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      provider: { select: { id: true, nickname: true } },
      requester: { select: { id: true, nickname: true } },
      demand: { select: { id: true, title: true } },
    },
  });

  const [activeDemands, frozenDemands, inProgressDemands, completedDemands, withdrawnDemands] =
    await Promise.all([
      prisma.demand.count({ where: { status: 'ACTIVE' } }),
      prisma.demand.count({ where: { status: 'FROZEN' } }),
      prisma.demand.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.demand.count({ where: { status: 'COMPLETED' } }),
      prisma.demand.count({ where: { status: 'WITHDRAWN' } }),
    ]);

  const topTags = await prisma.demand.groupBy({
    by: ['tagName'],
    _count: { id: true },
    where: { tagName: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const circlesByType = await prisma.circle.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  success(res, {
    overview: {
      userCount,
      demandCount,
      orderCount,
      disputeCount,
      circleCount,
      providerCount,
    },
    revenueTrend,
    userGrowthTrend,
    orderDistribution: {
      pending: pendingOrders,
      inProgress: inProgressOrders,
      waitingReview: waitingReviewOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
    },
    demandDistribution: {
      active: activeDemands,
      frozen: frozenDemands,
      inProgress: inProgressDemands,
      completed: completedDemands,
      withdrawn: withdrawnDemands,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      demandTitle: o.demand?.title || '—',
      provider: o.provider?.nickname || '—',
      requester: o.requester?.nickname || '—',
      amount: Number(o.agreedPrice),
      status: o.status,
      createdAt: o.createdAt,
      completedAt: o.completedAt,
    })),
    topTags: topTags.map((t) => ({ tagName: t.tagName, count: t._count.id })),
    circlesByType,
  });
});

// GET /api/admin/users
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const role = String(req.query.role || '').trim();
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const where: {
      OR?: Array<{ nickname?: object; phone?: object }>;
      role?: string | { not: string };
    } = {};
    if (q) {
      where.OR = [
        { nickname: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
    if (role === 'ADMIN') {
      where.role = 'ADMIN';
    } else if (role === 'USER') {
      where.role = { not: 'ADMIN' };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          nickname: true,
          avatarUrl: true,
          certificationLevel: true,
          role: true,
          isBusy: true,
          points: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    success(res, {
      items: users.map((u) => ({
        ...u,
        points: Number(u.points),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error';
    fail(res, msg, 500);
  }
});

// GET /api/admin/stats
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  const [userCount, demandCount, circleCount, orderCount] = await Promise.all([
    prisma.user.count(),
    prisma.demand.count(),
    prisma.circle.count(),
    prisma.order.count(),
  ]);
  success(res, { userCount, demandCount, circleCount, orderCount });
});

// GET /api/admin/circles
adminRouter.get('/circles', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || '').trim();
    const q = String(req.query.q || '').trim();
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const where: {
      status?: 'ACTIVE' | 'WARNING' | 'DEFUNCT';
      OR?: Array<{ name?: object; description?: object }>;
    } = {};
    if (status === 'ACTIVE' || status === 'WARNING' || status === 'DEFUNCT') {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.circle.findMany({
        where,
        include: {
          owner: { select: { id: true, nickname: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.circle.count({ where }),
    ]);

    success(res, {
      items: items.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        status: c.status,
        memberCount: c.memberCount,
        activeScore: c.activeScore,
        cityCode: c.cityCode,
        coverUrl: c.coverUrl,
        createdAt: c.createdAt,
        owner: c.owner,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error';
    fail(res, msg, 500);
  }
});

// GET /api/admin/disputes
adminRouter.get('/disputes', async (_req: Request, res: Response) => {
  const disputes = await prisma.order.findMany({
    where: { status: { in: ['DISPUTED', 'WAITING_REVIEW'] } },
    include: {
      provider: { select: { id: true, nickname: true } },
      requester: { select: { id: true, nickname: true } },
      demand: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  success(
    res,
    disputes.map((o) => ({ ...o, agreedPrice: Number(o.agreedPrice) })),
  );
});

// POST /api/admin/disputes/:id/resolve
adminRouter.post('/disputes/:id/resolve', async (req: Request, res: Response) => {
  const operatorId = await resolveOperatorId(req);
  if (!operatorId) {
    return fail(res, '无法确定运营操作者，请配置 ADMIN_SYSTEM_USER_ID', 500);
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: { demand: { select: { id: true, minPrice: true } } },
  });
  if (!order) {
    return fail(res, '订单不存在', 404);
  }
  if (order.status !== 'WAITING_REVIEW' && order.status !== 'DISPUTED') {
    return fail(res, '订单状态不允许裁决', 400);
  }

  const { action } = req.body;
  if (!['refund', 'complete'].includes(action)) {
    return fail(res, '无效的裁决操作', 400);
  }

  if (action === 'refund') {
    const { walletService } = await import('../services/wallet.service.js');
    await prisma.$transaction(async (tx) => {
      await walletService.releaseHold(order.demandId, 'WITHDRAWN', tx);
      if (order.paidAt && order.demand) {
        const breakdown = calculateSettlement(
          Number(order.demand.minPrice),
          Number(order.agreedPrice),
          Number(order.demand.minPrice),
        );
        if (breakdown.serviceFee > 0) {
          await walletService.credit(
            order.requesterId,
            breakdown.serviceFee,
            {
              referenceType: 'ORDER',
              referenceId: order.id,
              memo: '争议退款退还已付服务费',
            },
            tx,
          );
        }
      }
      await tx.demand.update({
        where: { id: order.demandId },
        data: { status: 'WITHDRAWN' },
      });
      await tx.order.update({
        where: { id: req.params.id as string },
        data: { status: 'REFUNDED', completedAt: new Date() },
      });
    });
  } else {
    try {
      const { walletService } = await import('../services/wallet.service.js');
      await walletService.settleDemand(order.demandId, Number(order.agreedPrice));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[admin.disputes.resolve] settleDemand failed:', msg);
    }
    await prisma.order.update({
      where: { id: req.params.id as string },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  const finalStatus = action === 'refund' ? 'REFUNDED' : 'COMPLETED';
  const io = req.app.get('io') as SocketServer | undefined;
  for (const uid of [order.providerId, order.requesterId]) {
    await prisma.message.create({
      data: {
        fromUserId: operatorId,
        toUserId: uid,
        orderId: order.id,
        content: `争议订单已被管理员裁决：${action === 'complete' ? '订单完成，结算放款' : '订单退款关闭'}`,
        type: 'SYSTEM',
      },
    });
    io?.to(`user:${uid}`).emit('order:update', {
      orderId: order.id,
      status: finalStatus,
    });
  }

  success(res, { message: '争议已裁决', orderId: order.id, status: finalStatus });
});

// PUT /api/admin/circles/:id/approve
adminRouter.put('/circles/:id/approve', async (req: Request, res: Response) => {
  const circle = await prisma.circle.update({
    where: { id: req.params.id as string },
    data: { status: 'ACTIVE' },
  });
  success(res, circle, '圈子已设为活跃');
});

// PUT /api/admin/circles/:id/status — 运营后台调整圈子状态
adminRouter.put('/circles/:id/status', async (req: Request, res: Response) => {
  const schema = z.object({
    status: z.enum(['ACTIVE', 'WARNING', 'DEFUNCT']),
  });
  try {
    const { status } = schema.parse(req.body);
    const circle = await prisma.circle.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    success(res, circle, '圈子状态已更新');
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

const disbursementCreateSchema = z.object({
  regionId: z.coerce.number().int().min(0),
  amount: z.coerce.number().positive(),
  recipientOrg: z.string().min(1).max(200),
  memo: z.string().max(500).optional(),
});

adminRouter.post('/welfare/disbursements', async (req: Request, res: Response) => {
  try {
    const operatorId = await resolveOperatorId(req);
    if (!operatorId) {
      return fail(res, '无法确定运营操作者', 500);
    }
    const data = disbursementCreateSchema.parse(req.body);
    const result = await welfareDisbursementService.recordDisbursement({
      regionId: data.regionId,
      amount: data.amount,
      recipientOrg: data.recipientOrg,
      memo: data.memo,
      operatorId,
    });
    success(res, result, '拨付已登记', 201);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    const err = e as { status?: number; message?: string };
    if (err.status) return fail(res, err.message || 'error', err.status);
    fail(res, err.message || 'server error', 500);
  }
});

adminRouter.get('/welfare/disbursements', async (req: Request, res: Response) => {
  try {
    const regionId = Number(req.query.regionId);
    if (!Number.isFinite(regionId)) {
      return fail(res, '缺少 regionId', 400);
    }
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await welfareDisbursementService.listDisbursements(
      regionId,
      page,
      limit,
    );
    success(res, result);
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err.status) return fail(res, err.message || 'error', err.status);
    fail(res, err.message || 'server error', 500);
  }
});
