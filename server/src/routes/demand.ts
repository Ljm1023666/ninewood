import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { demandService } from '../services/demand.service.js';
import { success, fail, paginated } from '../utils/response.js';
import { q } from '../utils/query.js';

export const demandRouter = Router();

const createSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(2000),
  minPrice: z.coerce.number().min(1),
  category: z.string().min(1).max(50),
  taxonomyLeafId: z.string().min(1).max(64).optional(),
  serviceType: z.enum(['ONLINE', 'OFFLINE']),
  locationLat: z.coerce.number().min(-90).max(90).optional(),
  locationLng: z.coerce.number().min(-180).max(180).optional(),
  cityCode: z.string().max(20).optional(),
  expireAt: z.string().min(1),
  circleId: z.string().optional(),
});

const applySchema = z.object({
  offerPrice: z.coerce.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

// POST /api/demands — create
demandRouter.post('/', authMiddleware, upload.fields([
  { name: 'images', maxCount: 9 },
  { name: 'video', maxCount: 1 },
]), async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const mediaUrls: string[] = [];
    if (files.images) files.images.forEach(f => mediaUrls.push(`/uploads/${f.filename}`));
    if (files.video) files.video.forEach(f => mediaUrls.push(`/uploads/${f.filename}`));

    const demand = await demandService.create({
      userId: req.user!.userId,
      ...data,
      mediaUrls,
    });

    success(res, demand, '发布成功', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/search
demandRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const qstr = (v: unknown): string | undefined => {
      if (typeof v === 'string') return v;
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
      return undefined;
    };
    const params = {
      keyword: qstr(req.query.keyword),
      tags: qstr(req.query.tags),
      category: qstr(req.query.category),
      categories: qstr(req.query.categories),
      taxonomyLeafId: qstr(req.query.taxonomyLeafId),
      taxonomyLeafIds: qstr(req.query.taxonomyLeafIds),
      serviceType: qstr(req.query.serviceType),
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      distance: req.query.distance ? Number(req.query.distance) : undefined,
      lat: req.query.lat ? Number(req.query.lat) : undefined,
      lng: req.query.lng ? Number(req.query.lng) : undefined,
      cityCode: req.query.cityCode as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      excludeExample: req.query.excludeExample === 'true',
      userId: (req as any).user?.userId,
      publisherId: (req.query.publisher as string) || (req.query.publisherId as string) || undefined,
      ids: req.query.ids ? (req.query.ids as string).split(',').filter(Boolean) : undefined,
    };
    const result = await demandService.search(params);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/my
demandRouter.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const result = await demandService.getMyDemands(req.user!.userId, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/my-applications
demandRouter.get('/my-applications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const result = await demandService.getMyApplications(req.user!.userId, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/my-status
demandRouter.get('/my-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const frozenCount = await demandService.getFrozenCount(req.user!.userId);
    success(res, { hasFrozen: frozenCount > 0 });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/:id
demandRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const demand = await demandService.getById(req.params.id as string, userId);
    success(res, demand);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// DELETE /api/demands/:id
demandRouter.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await demandService.deleteDemand(req.params.id as string, req.user!.userId);
    success(res, null, '已删除');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/apply
demandRouter.post('/:id/apply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = applySchema.parse(req.body);
    const app = await demandService.apply(req.params.id as string, req.user!.userId, data.offerPrice, data.message);
    success(res, app, '申请成功', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/snatch
demandRouter.post('/:id/snatch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const app = await demandService.snatch(req.params.id as string, req.user!.userId);
    success(res, app, '抢单成功', 201);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/accept-snatch
demandRouter.post('/:id/accept-snatch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) return fail(res, '缺少applicationId', 400);
    const result = await demandService.acceptSnatch(req.params.id as string, applicationId, req.user!.userId);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/my/demands/:id/applications
demandRouter.get('/:id/applications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const apps = await demandService.getApplications(req.params.id as string, req.user!.userId);
    success(res, apps);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});
