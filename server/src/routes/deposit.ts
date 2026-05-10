import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { depositService } from '../services/deposit.service.js';
import { success, fail } from '../utils/response.js';

export const depositRouter = Router();

const holdSchema = z.object({
  demandIds: z.array(z.string()).min(1).max(10),
});

// POST /api/deposits/hold
depositRouter.post('/hold', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = holdSchema.parse(req.body);
    const deposit = await depositService.createDeposit(req.user!.userId, data.demandIds);
    success(res, { ...deposit, amount: Number(deposit.amount) }, '押金已缴纳', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/deposits/my
depositRouter.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await depositService.getMyDeposits(req.user!.userId);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/deposits/:id/return
depositRouter.post('/:id/return', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deposit = await depositService.refundDeposit(req.params.id as string, req.user!.userId);
    success(res, deposit, '押金已退还');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
