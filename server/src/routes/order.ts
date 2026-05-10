import { Router, Request, Response } from 'express';
import type { Server as SocketServer } from 'socket.io';
import { authMiddleware } from '../middleware/auth.js';
import { orderService } from '../services/order.service.js';
import { success, fail } from '../utils/response.js';
import { q } from '../utils/query.js';

export const orderRouter = Router();

function emitOrderUpdate(req: Request, order: any) {
  const io = req.app.get('io') as SocketServer | undefined;
  if (!io || !order) return;
  const otherId = order.providerId === req.user?.userId ? order.requesterId : order.providerId;
  if (otherId) {
    io.to(`user:${otherId}`).emit('order:update', {
      orderId: order.id || order,
      status: order.status,
      updatedAt: new Date().toISOString(),
    });
  }
}

// POST /api/orders
orderRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { demandId, applicationId } = req.body;
    if (!demandId || !applicationId) return fail(res, '缺少demandId或applicationId', 400);
    const order = await orderService.create(demandId, applicationId, req.user!.userId);
    emitOrderUpdate(req, order);
    success(res, order, '订单已创建', 201);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/orders — list mine
orderRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const role = q(req.query.role) || undefined;
    const result = await orderService.listMine(req.user!.userId, role, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/orders/:id
orderRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await orderService.getById(req.params.id as string, req.user!.userId);
    success(res, order);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/prepay
orderRouter.post('/:id/prepay', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.prepay(req.params.id as string, req.user!.userId);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/complete
orderRouter.post('/:id/complete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.complete(req.params.id as string, req.user!.userId);
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/confirm
orderRouter.post('/:id/confirm', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.confirm(req.params.id as string, req.user!.userId);
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/dispute
orderRouter.post('/:id/dispute', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.dispute(req.params.id as string, req.user!.userId);
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/partial
orderRouter.post('/:id/partial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { newPrice, description } = req.body;
    if (!newPrice || !description) return fail(res, '缺少newPrice或description', 400);
    const result = await orderService.partialComplete(
      req.params.id as string, req.user!.userId, Number(newPrice), description,
    );
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
