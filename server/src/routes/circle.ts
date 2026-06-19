import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { circleService } from '../services/circle.service.js';
import { success, fail } from '../utils/response.js';
import { q } from '../utils/query.js';

export const circleRouter = Router();

const createSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
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

// GET /api/circles/public
circleRouter.get('/public', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const circles = await circleService.listPublic(userId);
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
