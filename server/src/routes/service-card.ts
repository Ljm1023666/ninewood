import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { fail, success } from '../utils/response.js';
import { serviceCardService } from '../services/service-card.service.js';

const claimSchema = z.object({
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
});

const inputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().min(1).max(10000),
  coverImage: z.string().trim().max(200000).optional(),
  category: z.string().trim().min(1).max(80),
  serviceType: z.enum(['ONLINE', 'OFFLINE']).optional(),
  cityCode: z.string().trim().max(40).optional(),
  regionId: z.number().int().positive().optional(),
  paths: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  priceUnit: z.string().trim().max(30).optional(),
  deliveryMode: z.string().trim().max(40).optional(),
  availability: z.string().trim().max(40).optional(),
  claims: z.array(claimSchema).max(30).optional(),
});

function parseId(req: Request) {
  const id = String(req.params.id || '').trim();
  if (!id) throw Object.assign(new Error('服务卡 ID 不能为空'), { status: 400 });
  return id;
}

export const serviceCardRouter = Router();

serviceCardRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const input = inputSchema.parse(req.body);
    const card = await serviceCardService.create(req.user!.userId, input);
    return success(res, card, '服务卡已保存', 201);
  } catch (error: any) {
    return fail(res, error?.message || '服务卡保存失败', error?.status || 400);
  }
});

serviceCardRouter.get('/mine', authMiddleware, async (req: Request, res: Response) => {
  try {
    return success(res, await serviceCardService.listMine(req.user!.userId));
  } catch (error: any) {
    return fail(res, error?.message || '服务卡加载失败', error?.status || 500);
  }
});

serviceCardRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const tags = typeof req.query.tags === 'string'
      ? req.query.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : undefined;
    return success(res, await serviceCardService.search({
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      tags,
      limit: Number(req.query.limit) || 20,
    }));
  } catch (error: any) {
    return fail(res, error?.message || '服务卡检索失败', error?.status || 500);
  }
});

serviceCardRouter.get('/owned/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const card = await serviceCardService.getOwned(parseId(req), req.user!.userId);
    if (!card) return fail(res, '服务卡不存在或无权查看', 404);
    return success(res, card);
  } catch (error: any) {
    return fail(res, error?.message || '服务卡加载失败', error?.status || 500);
  }
});

serviceCardRouter.get('/:id/evidence', async (req: Request, res: Response) => {
  try {
    const card = await serviceCardService.getPublic(parseId(req));
    if (!card) return fail(res, '服务卡不存在或未公开', 404);
    return success(res, card.evidence);
  } catch (error: any) {
    return fail(res, error?.message || '经验信息加载失败', error?.status || 500);
  }
});

serviceCardRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const card = await serviceCardService.getPublic(parseId(req));
    if (!card) return fail(res, '服务卡不存在或未公开', 404);
    return success(res, card);
  } catch (error: any) {
    return fail(res, error?.message || '服务卡加载失败', error?.status || 500);
  }
});

serviceCardRouter.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const input = inputSchema.parse(req.body);
    const card = await serviceCardService.update(parseId(req), req.user!.userId, input);
    return success(res, card, '服务卡已更新');
  } catch (error: any) {
    return fail(res, error?.message || '服务卡更新失败', error?.status || 400);
  }
});

serviceCardRouter.post('/:id/publish', authMiddleware, async (req: Request, res: Response) => {
  try {
    return success(res, await serviceCardService.setPublished(parseId(req), req.user!.userId, true), '服务卡已发布');
  } catch (error: any) {
    return fail(res, error?.message || '服务卡发布失败', error?.status || 400);
  }
});

serviceCardRouter.post('/:id/unpublish', authMiddleware, async (req: Request, res: Response) => {
  try {
    return success(res, await serviceCardService.setPublished(parseId(req), req.user!.userId, false), '服务卡已下架');
  } catch (error: any) {
    return fail(res, error?.message || '服务卡下架失败', error?.status || 400);
  }
});
