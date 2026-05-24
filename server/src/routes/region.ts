import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { regionService } from '../services/region.service.js';
import { success, fail } from '../utils/response.js';

export const regionRouter = Router();

const parentIdSchema = z.object({
  parentId: z.coerce.number().int().optional(),
});

const idSchema = z.object({
  id: z.coerce.number().int(),
});

const searchSchema = z.object({
  q: z.string().min(1).max(100),
});

// GET /api/regions — 级联查询，支持 ?parentId=xxx
regionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { parentId } = parentIdSchema.parse(req.query);
    const regions = await regionService.getChildren(parentId);
    success(res, regions);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/regions/tree — 返回完整省市区树
regionRouter.get('/tree', async (_req: Request, res: Response) => {
  try {
    const tree = await regionService.getTree();
    success(res, tree);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/regions/search?q=xxx — 名称搜索
regionRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = searchSchema.parse(req.query);
    const regions = await regionService.searchByName(q);
    success(res, regions);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/regions/:id — 区域详情
regionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = idSchema.parse(req.params);
    const region = await regionService.getById(id);
    if (!region) return fail(res, '区域不存在', 404);
    success(res, region);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
