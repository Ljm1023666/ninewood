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
// Task 6.1 P0-01: 废弃旧路径，请使用 acceptApplicant (V2) 同事务创建 Order
orderRouter.post('/', authMiddleware, async (_req: Request, res: Response) => {
  return fail(
    res,
    '该接口已废弃，请使用 POST /api/demands/:id/accept/:applicantId 代替（V2）',
    410,
  );
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

// POST /api/orders/:id/cancel
orderRouter.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.cancel(req.params.id as string, req.user!.userId);
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
    if (newPrice == null || !description) return fail(res, '缺少newPrice或description', 400);
    const price = Number(newPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return fail(res, '部分完成价格必须为正数', 400);
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      return fail(res, '请填写部分完成说明', 400);
    }
    const result = await orderService.partialComplete(
      req.params.id as string, req.user!.userId, price, description.trim().slice(0, 2000),
    );
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/partial/accept
orderRouter.post('/:id/partial/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.acceptPartial(req.params.id as string, req.user!.userId);
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/partial/reject
orderRouter.post('/:id/partial/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.rejectPartial(req.params.id as string, req.user!.userId);
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/orders/:id/partial/withdraw
orderRouter.post('/:id/partial/withdraw', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await orderService.withdrawPartial(req.params.id as string, req.user!.userId);
    emitOrderUpdate(req, { id: req.params.id, providerId: '', requesterId: '' });
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
