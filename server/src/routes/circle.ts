import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { circleService } from '../services/circle.service.js';
import { circlePostsService } from '../services/circle-posts.service.js';
import { success, fail } from '../utils/response.js';
import { q } from '../utils/query.js';

export const circleRouter = Router();

const createSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
});

const postSchema = z.object({
  content: z.string().min(1).max(2000),
});

const replySchema = z.object({
  content: z.string().min(1).max(1000),
});

// POST /api/circles
circleRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const circle = await circleService.create(req.user!.userId, data);
    success(res, circle, '圈子已创建', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/circles/join-by-code
circleRouter.post('/join-by-code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return fail(res, '请输入邀请码', 400);
    const result = await circleService.joinByCode(req.user!.userId, code);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/circles/my
circleRouter.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const circles = await circleService.getMyCircles(req.user!.userId);
    success(res, circles);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/circles/public — 可选登录：已加入的圈子从「发现」列表排除
circleRouter.get('/public', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const circles = await circleService.listPublic(req.user?.userId);
    success(res, circles);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/public-circles/apply
circleRouter.post('/public/apply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await circleService.applyPublicCircle(req.user!.userId, { ...data, cityCode: req.body.cityCode });
    success(res, result, '申请已提交', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// PUT /api/circles/:id/approve
circleRouter.put('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const circle = await circleService.approveCircle(req.params.id as string);
    success(res, circle, '已通过审核');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/circles/:id/join — join a public circle directly
circleRouter.post('/:id/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await circleService.joinPublic(req.user!.userId, req.params.id as string);
    success(res, result, '已加入圈子');
  } catch (e: any) {
    fail(res, e.message || '加入失败', e.status || 500);
  }
});

// POST /api/circles/:id/leave
circleRouter.post('/:id/leave', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await circleService.leave(req.user!.userId, req.params.id as string);
    success(res, result, '已退出圈子');
  } catch (e: any) {
    fail(res, e.message || '退出失败', e.status || 500);
  }
});

// ── 讨论区 posts ──

circleRouter.get('/:id/posts', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1', 10);
    const limit = parseInt(q(req.query.pageSize) || q(req.query.limit) || '20', 10);
    const data = await circlePostsService.list(
      req.params.id as string,
      req.user?.userId ?? null,
      page,
      limit,
    );
    success(res, data);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

circleRouter.post('/:id/posts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = postSchema.parse(req.body);
    const post = await circlePostsService.create(
      req.params.id as string,
      req.user!.userId,
      body.content,
    );
    success(res, post, '已发布', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

circleRouter.delete('/:id/posts/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await circlePostsService.remove(
      req.params.id as string,
      req.params.postId as string,
      req.user!.userId,
    );
    success(res, result, '已删除');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

circleRouter.post('/:id/posts/:postId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await circlePostsService.like(
      req.params.id as string,
      req.params.postId as string,
      req.user!.userId,
    );
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

circleRouter.delete('/:id/posts/:postId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await circlePostsService.unlike(
      req.params.id as string,
      req.params.postId as string,
      req.user!.userId,
    );
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

circleRouter.get('/:id/posts/:postId/replies', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const replies = await circlePostsService.listReplies(
      req.params.id as string,
      req.params.postId as string,
      req.user?.userId ?? null,
    );
    success(res, replies);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

circleRouter.post('/:id/posts/:postId/replies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = replySchema.parse(req.body);
    const reply = await circlePostsService.createReply(
      req.params.id as string,
      req.params.postId as string,
      req.user!.userId,
      body.content,
    );
    success(res, reply, '已回复', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/circles/:id
circleRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const circle = await circleService.getById(req.params.id as string);
    success(res, circle);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/circles/:id/demands — anyone can view, members get full access
circleRouter.get('/:id/demands', async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const userId = (req as any).user?.userId || null;
    const demands = await circleService.getCircleDemands(req.params.id as string, userId, page);
    success(res, demands);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
