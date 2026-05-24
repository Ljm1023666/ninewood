import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { certificationService } from '../services/certification.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail, paginated } from '../utils/response.js';

export const certificationRouter = Router();

const registerSchema = z.object({
  tags: z.array(z.string().min(1)).min(1, '至少提供一个标签'),
  regionId: z.number().int().optional(),
});

const searchSchema = z.object({
  tags: z.string().optional(), // 逗号分隔
  regionId: z.coerce.number().int().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const providerUserIdSchema = z.object({
  userId: z.string().uuid(),
});

// POST /api/certification/register — 注册认证服务者
certificationRouter.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const params = registerSchema.parse(req.body);
    const result = await certificationService.register(req.user!.userId, params);
    success(res, result, '注册成功', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/certification/providers — 搜索认证服务者
certificationRouter.get('/providers', async (req: Request, res: Response) => {
  try {
    const params = searchSchema.parse(req.query);
    const tags = params.tags ? params.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
    const result = await certificationService.search({
      tags,
      regionId: params.regionId,
      minRating: params.minRating,
      page: params.page,
      limit: params.limit,
    });
    paginated(res, result.items, result.page, result.limit, result.total);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/certification/providers/:userId — 认证服务者详情
certificationRouter.get('/providers/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = providerUserIdSchema.parse(req.params);
    const provider = await certificationService.getByUserId(userId);
    if (!provider) return fail(res, '认证服务者不存在', 404);
    success(res, provider);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
