import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { userService } from '../services/user.service.js';
import { success, fail } from '../utils/response.js';

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
userRouter.put('/profile', authMiddleware, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }, { name: 'demandCardCover', maxCount: 1 }]), async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files?.avatar?.[0]) data.avatarUrl = `/uploads/${files.avatar[0].filename}`;
    if (files?.cover?.[0]) data.coverUrl = `/uploads/${files.cover[0].filename}`;
    if (files?.demandCardCover?.[0]) data.demandCardCoverUrl = `/uploads/${files.demandCardCover[0].filename}`;
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

// GET /api/users/:id — public profile (keep last, catches unmatched routes)
userRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getProfile(req.params.id as string);
    success(res, user);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
