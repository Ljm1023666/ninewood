import { Router, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { success, fail } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';

export const adminRouter = Router();

// GET /api/admin/dashboard — no auth required (aggregate data)
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const now = new Date();

  // ── Overview Counts ──
  const [userCount, demandCount, orderCount, circleCount, providerCount] = await Promise.all([
    prisma.user.count(),
    prisma.demand.count(),
    prisma.order.count(),
    prisma.circle.count({ where: { status: 'ACTIVE' } }),
    prisma.userTag.count({ where: { status: 'IDLE' } }),
  ]);
  const disputeCount = 0;

  // ── Monthly Revenue Trend (last 7 months) ──
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

  // ── User Growth (last 7 months) ──
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

  // running total
  let running = await prisma.user.count({ where: { createdAt: { lt: sevenMonthsAgo } } });
  const userGrowthTrend = Object.entries(userGrowthMap).map(([name, count]) => {
    running += count;
    return { name, users: running, newUsers: count };
  });

  const revenueTrend = Object.entries(revenueMap).map(([name, revenue]) => ({
    name, revenue: Math.round(revenue * 100) / 100,
  }));

  // ── Order Status Distribution ──
  const [pendingOrders, inProgressOrders, waitingReviewOrders, completedOrders, cancelledOrders] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.order.count({ where: { status: 'WAITING_REVIEW' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
  ]);

  // ── Recent Orders ──
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      provider: { select: { id: true, nickname: true } },
      requester: { select: { id: true, nickname: true } },
      demand: { select: { id: true, title: true } },
    },
  });

  // ── Demand Status Distribution ──
  const [activeDemands, frozenDemands, inProgressDemands, completedDemands, withdrawnDemands] = await Promise.all([
    prisma.demand.count({ where: { status: 'ACTIVE' } }),
    prisma.demand.count({ where: { status: 'FROZEN' } }),
    prisma.demand.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.demand.count({ where: { status: 'COMPLETED' } }),
    prisma.demand.count({ where: { status: 'WITHDRAWN' } }),
  ]);

  // ── Top Tags by demand count ──
  const topTags = await prisma.demand.groupBy({
    by: ['tagName'],
    _count: { id: true },
    where: { tagName: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // ── Active Circles count ──
  const circlesByType = await prisma.circle.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  success(res, {
    overview: { userCount, demandCount, orderCount, disputeCount, circleCount, providerCount },
    revenueTrend,
    userGrowthTrend,
    orderDistribution: { pending: pendingOrders, inProgress: inProgressOrders, waitingReview: waitingReviewOrders, completed: completedOrders, cancelled: cancelledOrders },
    demandDistribution: { active: activeDemands, frozen: frozenDemands, inProgress: inProgressDemands, completed: completedDemands, withdrawn: withdrawnDemands },
    recentOrders: recentOrders.map((o: any) => ({
      id: o.id,
      demandTitle: o.demand?.title || '—',
      provider: o.provider?.nickname || '—',
      requester: o.requester?.nickname || '—',
      amount: Number(o.agreedPrice),
      status: o.status,
      createdAt: o.createdAt,
      completedAt: o.completedAt,
    })),
    topTags: topTags.map((t: any) => ({ tagName: t.tagName, count: t._count.id })),
    circlesByType,
  });
});

adminRouter.use(authMiddleware, adminMiddleware);

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

// GET /api/admin/disputes
adminRouter.get('/disputes', async (_req: Request, res: Response) => {
  const disputes = await prisma.order.findMany({
    where: { status: 'WAITING_REVIEW' },
    include: {
      provider: { select: { id: true, nickname: true } },
      requester: { select: { id: true, nickname: true } },
      demand: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  success(res, disputes.map((o: any) => ({ ...o, agreedPrice: Number(o.agreedPrice) })));
});

// POST /api/admin/disputes/:id/resolve
adminRouter.post('/disputes/:id/resolve', async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id as string } });
  if (!order || order.status !== 'WAITING_REVIEW') {
    return fail(res, '订单不存在或非审核状态', 404);
  }

  const { action } = req.body; // 'refund' | 'complete'
  if (!['refund', 'complete'].includes(action)) {
    return fail(res, '无效的裁决操作', 400);
  }

  const newStatus = action === 'complete' ? 'COMPLETED' : 'COMPLETED';
  await prisma.order.update({
    where: { id: req.params.id as string },
    data: { status: newStatus, completedAt: new Date() },
  });

  // Notify both parties
  const io = req.app.get('io') as SocketServer | undefined;
  for (const uid of [order.providerId, order.requesterId]) {
    await prisma.message.create({
      data: {
        fromUserId: req.user!.userId,
        toUserId: uid,
        orderId: order.id,
        content: `争议订单已被管理员裁决：${action === 'complete' ? '订单完成，结算放款' : '订单关闭，退款处理'}`,
        type: 'SYSTEM',
      },
    });
    io?.to(`user:${uid}`).emit('order:update', { orderId: order.id, status: newStatus });
  }

  success(res, { message: '争议已裁决', orderId: order.id, status: newStatus });
});

// PUT /api/admin/circles/:id/approve
adminRouter.put('/circles/:id/approve', async (req: Request, res: Response) => {
  const circle = await prisma.circle.update({
    where: { id: req.params.id as string },
    data: { status: 'ACTIVE' },
  });
  success(res, circle, '公开圈已审核通过');
});
