import { Router, Request, Response } from 'express';
import { success, fail } from '../utils/response.js';
import { q } from '../utils/query.js';
import { prisma } from '../lib/prisma.js';

export const shortsRouter = Router();

// GET /api/shorts — casual explore feed
shortsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const limit = parseInt(q(req.query.limit) || '10');

    const [videos, total] = await Promise.all([
      prisma.short.findMany({
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.short.count(),
    ]);

    success(res, { videos, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/shorts — create a short (for seeding / admin use)
shortsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { mediaUrl, coverUrl, description, tags, userId } = req.body;

    if (!mediaUrl || !userId) {
      return fail(res, 'mediaUrl 和 userId 为必填', 400);
    }

    const short = await prisma.short.create({
      data: {
        userId,
        mediaUrl,
        coverUrl: coverUrl || null,
        description: description || null,
        tags: tags || [],
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    success(res, short, '发布成功');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
