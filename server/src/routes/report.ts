import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';

export const reportRouter = Router();

const createSchema = z.object({
  targetUserId: z.string().min(1),
  messageId: z.string().optional(),
  demandId: z.string().optional(),
  category: z.enum(['spam', 'abuse', 'adult', 'scam', 'other']).default('other'),
  reason: z.string().min(1).max(1000),
});

// POST /api/reports — 举报用户/消息/需求
reportRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    if (data.targetUserId === req.user!.userId) {
      return fail(res, '不能举报自己', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: data.targetUserId },
      select: { id: true },
    });
    if (!target) return fail(res, '被举报用户不存在', 404);

    if (data.messageId) {
      const msg = await prisma.message.findUnique({
        where: { id: data.messageId },
        select: { fromUserId: true, toUserId: true },
      });
      if (!msg) return fail(res, '消息不存在', 404);
      const involved =
        msg.fromUserId === req.user!.userId ||
        msg.toUserId === req.user!.userId;
      if (!involved) return fail(res, '无权举报该消息', 403);
    }

    const report = await prisma.contentReport.create({
      data: {
        reporterId: req.user!.userId,
        targetUserId: data.targetUserId,
        messageId: data.messageId || null,
        demandId: data.demandId || null,
        category: data.category,
        reason: data.reason,
      },
    });
    success(res, report, '举报已提交', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/reports — 我提交的举报
reportRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = 20;
    const [reports, total] = await Promise.all([
      prisma.contentReport.findMany({
        where: { reporterId: req.user!.userId },
        include: {
          targetUser: { select: { id: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contentReport.count({ where: { reporterId: req.user!.userId } }),
    ]);
    success(res, { reports, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
