import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';

export const complaintRouter = Router();

const createSchema = z.object({
  toUserId: z.string().min(1),
  demandId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

// POST /api/complaints
complaintRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const complaint = await prisma.complaint.create({
      data: {
        fromUserId: req.user!.userId,
        toUserId: data.toUserId,
        demandId: data.demandId,
        reason: data.reason,
      },
    });
    success(res, complaint, '投诉已提交', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/complaints — list my complaints
complaintRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = 20;
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where: { fromUserId: req.user!.userId },
        include: {
          toUser: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.complaint.count({ where: { fromUserId: req.user!.userId } }),
    ]);
    success(res, { complaints, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
