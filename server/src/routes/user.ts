import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { upload, verifyUpload } from '../middleware/upload.js';
import { userService } from '../services/user.service.js';
import { success, fail } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';

export const userRouter = Router();

// GET /api/users/me
userRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await userService.getProfile(req.user!.userId);
    success(res, user);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// PUT /api/users/profile
userRouter.put('/profile', authMiddleware, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }, { name: 'demandCardCover', maxCount: 1 }]), verifyUpload, async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files?.avatar?.[0]) data.avatarUrl = `/uploads/avatars/${files.avatar[0].filename}`;
    if (files?.cover?.[0]) data.coverUrl = `/uploads/covers/${files.cover[0].filename}`;
    if (files?.demandCardCover?.[0]) data.demandCardCoverUrl = `/uploads/card-covers/${files.demandCardCover[0].filename}`;
    const user = await userService.updateProfile(req.user!.userId, data);
    success(res, user, '更新成功');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/cert-status
userRouter.get('/cert-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await userService.getCertStatus(req.user!.userId);
    success(res, status);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/users/upgrade-cert
userRouter.post('/upgrade-cert', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await userService.upgradeCert(req.user!.userId);
    success(res, result, '认证升级成功');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/snatch-status
userRouter.get('/snatch-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await userService.getSnatchStatus(req.user!.userId);
    success(res, status);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/search?tags=xxx&regionId=xxx — 按标签搜索服务者（公开）
userRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  const tags = req.query.tags as string;
  if (!tags) return next();
  try {
    const tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagsArr.length === 0) return fail(res, '请提供标签', 400);
    if (tagsArr.length > 20) return fail(res, '标签数量不能超过20个', 400);

    const regionId = req.query.regionId as string;
    const includeBusy = req.query.includeBusy === 'true';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = 20;

    const where: any = {
      serviceTags: { hasSome: tagsArr }
    };
    if (!includeBusy) where.isBusy = false;
    if (regionId) where.cityCode = regionId;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          cityCode: true,
          serviceTags: true,
          certificationLevel: true,
          isBusy: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where })
    ]);

    success(res, { items, total, page, pageSize });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/search?keyword= — search users (excludes self)
userRouter.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const keyword = (req.query.keyword as string || '').trim();
    if (!keyword || keyword.length < 1) return fail(res, '请输入搜索关键词', 400);
    const users = await userService.searchUsers(keyword, req.user!.userId);
    success(res, users);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/users/:id/follow
userRouter.post('/:id/follow', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await userService.follow(req.user!.userId, req.params.id as string);
    success(res, result, '关注成功');
  } catch (e: any) {
    fail(res, e.message || '操作失败', e.status || 500);
  }
});

// DELETE /api/users/:id/follow
userRouter.delete('/:id/follow', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await userService.unfollow(req.user!.userId, req.params.id as string);
    success(res, result, '已取消关注');
  } catch (e: any) {
    fail(res, e.message || '操作失败', e.status || 500);
  }
});

// GET /api/users/:id/followers
userRouter.get('/:id/followers', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const result = await userService.getFollowers(req.params.id as string, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/:id/following
userRouter.get('/:id/following', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const result = await userService.getFollowing(req.params.id as string, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/users/favorites/:demandId — toggle favorite
userRouter.post('/favorites/:demandId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await userService.toggleFavorite(req.user!.userId, req.params.demandId as string);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '操作失败', e.status || 500);
  }
});

// GET /api/users/favorites — get my favorites
userRouter.get('/favorites', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const result = await userService.getFavorites(req.user!.userId, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/favorites/:demandId/status — check if favorited
userRouter.get('/favorites/:demandId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await userService.isFavorited(req.user!.userId, req.params.demandId as string);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 服务标签管理 ========

// PUT /api/users/tags — 更新自己的服务标签
userRouter.put('/tags', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tags: z.array(z.string().min(1)).max(20)
    });
    const { tags } = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { serviceTags: tags }
    });
    success(res, { serviceTags: user.serviceTags });
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/tags — 获取自己的服务标签
userRouter.get('/tags', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { serviceTags: true }
    });
    success(res, { serviceTags: user?.serviceTags || [] });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/tags/:userId — 查看某用户的服务标签（公开）
userRouter.get('/tags/:userId', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { serviceTags: true }
    });
    if (!user) return fail(res, '用户不存在', 404);
    success(res, { serviceTags: user.serviceTags });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 忙碌状态 ========

// PUT /api/users/busy — 切换忙碌状态
userRouter.put('/busy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      isBusy: z.boolean(),
      allowSpecialSearch: z.boolean().optional()
    });
    const { isBusy, allowSpecialSearch } = schema.parse(req.body);
    const data: any = { isBusy };
    if (allowSpecialSearch !== undefined) data.allowSpecialSearch = allowSpecialSearch;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data
    });
    success(res, { isBusy: user.isBusy, allowSpecialSearch: user.allowSpecialSearch });
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/busy — 获取自己的忙碌状态
userRouter.get('/busy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { isBusy: true, allowSpecialSearch: true }
    });
    success(res, { isBusy: user?.isBusy ?? false, allowSpecialSearch: user?.allowSpecialSearch ?? false });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 推送屏蔽 ========

// GET /api/users/blocklist — 获取屏蔽列表
userRouter.get('/blocklist', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { pushBlocklist: true }
    });
    success(res, user?.pushBlocklist || { tags: [], keywords: [], ageRanges: [] });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// PUT /api/users/blocklist — 更新屏蔽列表
userRouter.put('/blocklist', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tags: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      ageRanges: z.array(z.string()).optional()
    });
    const body = schema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { pushBlocklist: true }
    });
    const current = (user?.pushBlocklist as any) || { tags: [], keywords: [], ageRanges: [] };
    const merged = {
      tags: body.tags ?? current.tags,
      keywords: body.keywords ?? current.keywords,
      ageRanges: body.ageRanges ?? current.ageRanges
    };
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { pushBlocklist: merged }
    });
    success(res, updated.pushBlocklist);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/users/:id — public profile (keep last, catches unmatched routes)
userRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getProfile(req.params.id as string);
    success(res, user);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
