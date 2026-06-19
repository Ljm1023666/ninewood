import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';
import { q } from '../utils/query.js';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const shortsRouter = Router();

function getUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), config.jwtSecret) as { userId: string };
    return payload.userId;
  } catch { return null; }
}

// GET /api/shorts — casual explore feed
shortsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const limit = parseInt(q(req.query.limit) || '10');
    const tab = q(req.query.tab) || 'all';
    const userId = getUserId(req);

    let where: any = {};
    if (tab === 'follow' && userId) {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const ids = following.map((f: any) => f.followingId);
      ids.push(userId); // also include own
      where.userId = { in: ids };
    }
    if (tab === 'nearby' && userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { cityCode: true } });
      if (me?.cityCode) {
        const nearbyUsers = await prisma.user.findMany({
          where: { cityCode: me.cityCode },
          select: { id: true },
        });
        where.userId = { in: nearbyUsers.map((u: any) => u.id) };
      }
    }

    const [videos, total] = await Promise.all([
      prisma.short.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, certificationLevel: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.short.count({ where }),
    ]);

    success(res, { videos, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/shorts — create a short (requires auth)
shortsRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { mediaUrl, coverUrl, description, tags } = req.body;

    if (!mediaUrl) {
      return fail(res, 'mediaUrl 为必填', 400);
    }

    const short = await prisma.short.create({
      data: {
        userId: req.user!.userId,
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
