import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { tagService } from '../services/tag.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

export const tagRouter = Router();

const createSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum(['service', 'demand', 'both']).optional(),
});

const nameSchema = z.object({
  name: z.string().min(1),
});

const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

// GET /api/tags — 标签列表（支持 ?q=xxx 搜索 / ?withCounts=true&regionId=xxx）
tagRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (req.query.withCounts === 'true') {
      const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
      const stage = req.query.stage as string | undefined
      const result = await tagService.listWithCounts(regionId, stage);
      return success(res, result);
    }
    const { q } = searchSchema.parse(req.query);
    if (q) {
      const tags = await tagService.search(q);
      return success(res, tags);
    }
    const tags = await tagService.list();
    success(res, tags);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/tags/:name — 单个标签详情
tagRouter.get('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = nameSchema.parse(req.params);
    const tag = await tagService.getByName(name);
    if (!tag) return fail(res, '标签不存在', 404);
    success(res, tag);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/tags — 创建标签（需登录）
tagRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const params = createSchema.parse(req.body);
    const tag = await tagService.create(params);
    success(res, tag, '创建成功', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// DELETE /api/tags/:name — 删除标签（需登录，后续增加管理员校验）
tagRouter.delete('/:name', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = nameSchema.parse(req.params);
    await tagService.delete(name);
    success(res, null, '删除成功');
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
