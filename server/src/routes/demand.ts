import { Router, Request, Response } from 'express';
import { snatchLimiter } from '../middleware/rate-limit.js';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { upload, verifyUpload } from '../middleware/upload.js';
import { demandService } from '../services/demand.service.js';
import { success, fail, paginated } from '../utils/response.js';
import { q } from '../utils/query.js';
import { poolService } from '../services/pool.service.js';
import { bidService } from '../services/bid.service.js';
import { pushService } from '../services/push.service.js';

export const demandRouter = Router();

const qstr = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
};

const createSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(2).max(2000),
  minPrice: z.coerce.number().min(1),
  category: z.string().min(1).max(50),
  taxonomyLeafId: z.string().min(1).max(64).optional(),
  serviceType: z.enum(['ONLINE', 'OFFLINE']),
  cityCode: z.string().max(20).optional(),
  regionId: z.coerce.number().optional(),
  tagName: z.string().optional(),
  isCertifiedOnly: z.coerce.boolean().optional(),
  pushConfig: z.any().optional(),
  coverImage: z.string().optional(),
  amountEstimate: z.coerce.number().optional(),
  expireAt: z.string().min(1),
  circleId: z.string().optional(),
  // AI 2.5 新字段
  expectedOutcome: z.string().min(1).max(500).optional(),
  visibilityWindow: z.coerce.number().min(1).max(1440).optional(),
  maxApplicants: z.coerce.number().min(1).max(100).optional(),
  tags: z.union([z.string(), z.array(z.string())]).transform(v => typeof v === 'string' ? v.split(',').filter(Boolean) : v).optional(),
  aiTags: z.union([z.string(), z.array(z.string())]).transform(v => typeof v === 'string' ? v.split(',').filter(Boolean) : v).optional(),
  tagsConfirmed: z.coerce.boolean().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

/**
 * @openapi
 * /api/demands:
 *   post:
 *     tags: [Demands]
 *     summary: 创建需求
 *     description: 发布新需求，支持图片和视频上传
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, minPrice, category, serviceType, expireAt]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "王者荣耀代打上分"
 *               description:
 *                 type: string
 *                 example: "星耀二上王者，价格可议"
 *               minPrice:
 *                 type: number
 *                 example: 50
 *               category:
 *                 type: string
 *                 example: "游戏/王者荣耀/代打"
 *               serviceType:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE]
 *                 example: ONLINE
 *               expireAt:
 *                 type: string
 *                 example: "2025-12-31T23:59:59Z"
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 发布成功
 *       400:
 *         description: 输入验证失败
 *   get:
 *     tags: [Demands]
 *     summary: 获取需求列表
 *     description: 分页查询需求，支持关键词/分类/服务类型筛选
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: 搜索关键词
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: 分类筛选
 *       - in: query
 *         name: serviceType
 *         schema: { type: string, enum: [ONLINE, OFFLINE] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: 需求列表（分页）
 */

const applySchema = z.object({
  offerPrice: z.coerce.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

const extendSchema = z.object({
  months: z.coerce.number().int().positive().max(12),
});

const completeSchema = z.object({
  coverImage: z.string().min(1),
});

const bidSchema = z.object({
  offerPrice: z.coerce.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

const pushSchema = z.object({
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  ageRanges: z.array(z.string()).optional(),
});

// POST /api/demands — create
demandRouter.post('/', authMiddleware, upload.fields([
  { name: 'images', maxCount: 9 },
  { name: 'video', maxCount: 1 },
]), verifyUpload, async (req: Request, res: Response) => {
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
    const params = {
      keyword: qstr(req.query.keyword),
      tagName: qstr(req.query.tagName),
      tagNames: qstr(req.query.tagNames),
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
      searchMode: (qstr(req.query.searchMode) ?? 'exact') as 'exact' | 'fuzzy',
      exact: req.query.exact === 'true',
      stage: qstr(req.query.stage),
      regionId: req.query.regionId ? Number(req.query.regionId) : undefined,
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

// ======== 活池检索 ========
// GET /api/demands/active
demandRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const params = {
      regionId: req.query.regionId ? Number(req.query.regionId) : undefined,
      tagName: qstr(req.query.tagName),
      excludeTagName: qstr(req.query.excludeTagName),
      untaggedOnly: req.query.untaggedOnly === 'true' ? true : undefined,
      isCertifiedOnly: req.query.isCertifiedOnly === 'true' ? true : undefined,
      special: req.query.special === 'true' ? true : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.pageSize ? Number(req.query.pageSize) : 20,
    };
    const result = await poolService.getActive(params);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 死池检索 ========
// GET /api/demands/dead
demandRouter.get('/dead', async (req: Request, res: Response) => {
  try {
    const params = {
      regionId: req.query.regionId ? Number(req.query.regionId) : undefined,
      tagName: req.query.tagName ? (req.query.tagName as string).split(',').filter(Boolean)?.[0] : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.pageSize ? Number(req.query.pageSize) : 20,
    };
    const result = await poolService.getDead(params);
    success(res, result);
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
demandRouter.post('/:id/apply', authMiddleware, snatchLimiter, async (req: Request, res: Response) => {
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
demandRouter.post('/:id/snatch', authMiddleware, snatchLimiter, async (req: Request, res: Response) => {
  try {
    const app = await demandService.snatch(req.params.id as string, req.user!.userId);
    success(res, app, '抢单成功', 201);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/accept-snatch
demandRouter.post('/:id/accept-snatch', authMiddleware, snatchLimiter, async (req: Request, res: Response) => {
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

// ======== 时间杠杆：延期 ========
// POST /api/demands/:id/extend
demandRouter.post('/:id/extend', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { months } = extendSchema.parse(req.body);
    const result = await poolService.extendDemand(req.params.id, req.user!.userId, months);
    success(res, result);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 完成需求（移入死池）=======
// POST /api/demands/:id/complete
demandRouter.post('/:id/complete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { coverImage } = completeSchema.parse(req.body);
    const result = await poolService.completeDemand(req.params.id, req.user!.userId, coverImage);
    success(res, result);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 应标（竞标）=======
// POST /api/demands/:id/bid
demandRouter.post('/:id/bid', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = bidSchema.parse(req.body);
    const result = await bidService.bid(req.params.id, req.user!.userId, data);
    success(res, result, '应标成功', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/:id/bids
demandRouter.get('/:id/bids', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await bidService.getBids(req.params.id);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ======== 推送配置 ========
// POST /api/demands/:id/push/execute — 执行推送
demandRouter.post('/:id/push/execute', authMiddleware, async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await pushService.executePush(req.params.id, io);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// PUT /api/demands/:id/push
demandRouter.put('/:id/push', authMiddleware, async (req, res) => {
  try {
    const data = pushSchema.parse(req.body);
    // 先更新配置
    const result = await poolService.updatePushConfig(req.params.id, req.user!.userId, data);
    // 再执行推送
    const io = req.app.get('io');
    const pushResult = await pushService.executePush(req.params.id, io);
    success(res, { ...result, ...pushResult });
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ═══════ AI 2.5: 两段式接单 ═══════

const requestSchema = z.object({ message: z.string().min(1).max(500) });

// POST /api/demands/:id/request — 请求接单 (Phase 1)
demandRouter.post('/:id/request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = requestSchema.parse(req.body);
    const result = await demandService.requestDemand(
      req.params.id,
      req.user!.userId,
      data.message,
    );
    success(res, result, '已申请', 201);
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    if (e.message?.includes('满员') || e.message?.includes('上限')) {
      return fail(res, e.message, 429);
    }
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/accept/:applicantId — 正式接单 (Phase 2)
demandRouter.post('/:id/accept/:applicantId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await demandService.acceptApplicant(
      req.params.id,
      req.params.applicantId,
      req.user!.userId,
    );
    success(res, result, '已接受');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/reject/:applicantId — 拒绝申请
demandRouter.post('/:id/reject/:applicantId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await demandService.rejectApplicant(
      req.params.id,
      req.params.applicantId,
      req.user!.userId,
    );
    success(res, result, '已拒绝');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/demands/:id/applicants-v2 — 获取 V2 申请人列表
demandRouter.get('/:id/applicants-v2', authMiddleware, async (req: Request, res: Response) => {
  try {
    const apps = await demandService.getApplicantsV2(req.params.id, req.user!.userId);
    success(res, apps);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/demands/:id/withdraw — 自行撤回
demandRouter.post('/:id/withdraw', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await demandService.withdrawDemand(req.params.id, req.user!.userId);
    success(res, result, '已撤回');
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ═══ AI 2.8: 弹性延期 ═══
const lifecycleExtendSchema = z.object({
  months: z.coerce.number().int().min(1).max(12),
});

// POST /api/demands/:id/extend-lifecycle
demandRouter.post('/:id/extend-lifecycle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { months } = lifecycleExtendSchema.parse(req.body);
    const { prisma } = await import('../lib/prisma.js');
    const { extendLifecycle } = await import('../services/card-lifecycle.js');

    const demand = await prisma.demand.findUnique({ where: { id: req.params.id } });
    if (!demand) return fail(res, '需求不存在', 404);
    if (demand.userId !== req.user!.userId) return fail(res, '无权操作', 403);

    if (!demand.coverDeletedAt || !demand.detailDeletedAt || !demand.fullDeletedAt) {
      // 初始化生命周期（兼容旧数据）
      const { initLifecycle } = await import('../services/card-lifecycle.js');
      const init = initLifecycle(demand.visibilityWindow);
      await prisma.demand.update({
        where: { id: demand.id },
        data: init,
      });
      demand.coverDeletedAt = init.coverDeletedAt;
      demand.detailDeletedAt = init.detailDeletedAt;
      demand.fullDeletedAt = init.fullDeletedAt;
    }

    const { newCover, newDetail, newFull } = extendLifecycle(
      demand.coverDeletedAt,
      demand.detailDeletedAt,
      demand.fullDeletedAt,
      months,
    );

    await prisma.demand.update({
      where: { id: demand.id },
      data: {
        coverDeletedAt: newCover,
        detailDeletedAt: newDetail,
        fullDeletedAt: newFull,
      },
    });

    success(res, { newCoverDeletedAt: newCover, newDetailDeletedAt: newDetail, newFullDeletedAt: newFull });
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '参数错误', 400, e.errors);
    fail(res, e.message || 'server error', 500);
  }
});
