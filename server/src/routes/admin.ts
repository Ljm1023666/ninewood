import { Router, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { success, fail } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';

export const adminRouter = Router();
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
    where: { status: 'DISPUTED' },
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
  if (!order || order.status !== 'DISPUTED') {
    return fail(res, '订单不存在或非争议状态', 404);
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

// PUT /api/admin/circles/:id/approve — approve public circle
adminRouter.put('/circles/:id/approve', async (req: Request, res: Response) => {
  const circle = await prisma.circle.update({
    where: { id: req.params.id as string },
    data: { status: 'ACTIVE' },
  });
  success(res, circle, '公开圈已审核通过');
});
