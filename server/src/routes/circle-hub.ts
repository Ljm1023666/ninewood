import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { q } from '../utils/query.js';
import { success, fail, paginated } from '../utils/response.js';
import {
  circleHubService,
  assertHubAccess,
  assertAdmin,
  assertMember,
} from '../services/circle-hub.service.js';
import { circleResourceService } from '../services/circle-resource.service.js';
import { circleInviteService } from '../services/circle-invite.service.js';
import { upload, verifyUpload } from '../middleware/upload.js';

export const circleHubRouter = Router({ mergeParams: true });

const announcementSchema = z.object({
  title: z.string().min(2).max(100),
  body: z.string().min(1).max(1000),
  pinned: z.boolean().optional(),
});

/** GET /api/circles/:id/hub/home */
circleHubRouter.get('/:id/hub/home', async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    const userId = (req as any).user?.userId ?? null;
    await assertHubAccess(circleId, userId);
    const data = await circleHubService.getHome(circleId);
    success(res, data);
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** GET /api/circles/:id/hub/activities?page=&limit= */
circleHubRouter.get('/:id/hub/activities', async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    const userId = (req as any).user?.userId ?? null;
    await assertHubAccess(circleId, userId);
    const page = parseInt(q(req.query.page) || '1', 10);
    const limit = parseInt(q(req.query.limit) || '20', 10);
    const result = await circleHubService.listActivities(circleId, page, limit);
    paginated(res, result.items, result.page, result.limit, result.total);
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** POST /api/circles/:id/hub/announcements  OWNER/ADMIN */
circleHubRouter.post(
  '/:id/hub/announcements',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const data = announcementSchema.parse(req.body);
      const circleId = req.params.id as string;
      await assertAdmin(circleId, req.user!.userId);
      const ann = await circleHubService.postAnnouncement(circleId, req.user!.userId, data);
      success(res, ann, '公告已发布', 201);
    } catch (e: any) {
      if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
      fail(res, e.message || 'server error', e.status || 500);
    }
  },
);
/** GET /api/circles/:id/resources?category=&q=&page=&limit= */
circleHubRouter.get('/:id/resources', async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    const userId = (req as any).user?.userId ?? null;
    await assertHubAccess(circleId, userId);
    const category = q(req.query.category) || undefined;
    const search = q(req.query.q) || undefined;
    const page = parseInt(q(req.query.page) || '1', 10);
    const limit = parseInt(q(req.query.limit) || '20', 10);
    const data = await circleResourceService.list(circleId, { category, q: search, page, limit });
    success(res, data);
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** POST /api/circles/:id/resources  multipart/form-data: file, optional category */
circleHubRouter.post(
  '/:id/resources',
  authMiddleware,
  upload.single('file'),
  verifyUpload,
  async (req: Request, res: Response) => {
    try {
      const circleId = req.params.id as string;
      await assertMember(circleId, req.user!.userId);
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return fail(res, '请上传文件', 400);
      const category = q(req.body.category) || undefined;
      const created = await circleResourceService.create(circleId, req.user!.userId, file, category);
      success(res, created, '上传成功', 201);
    } catch (e: any) {
      fail(res, e.message || 'server error', e.status || 500);
    }
  },
);

/** DELETE /api/circles/:id/resources/:resourceId */
circleHubRouter.delete(
  '/:id/resources/:resourceId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const circleId = req.params.id as string;
      const resourceId = req.params.resourceId as string;
      await circleResourceService.remove(circleId, resourceId, req.user!.userId);
      success(res, { success: true });
    } catch (e: any) {
      fail(res, e.message || 'server error', e.status || 500);
    }
  },
);

/** GET /api/circles/:id/analytics?range=30d */
circleHubRouter.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    const userId = (req as any).user?.userId ?? null;
    await assertHubAccess(circleId, userId);
    const rangeRaw = q(req.query.range) || '30d';
    const range: '7d' | '30d' = rangeRaw === '7d' ? '7d' : '30d';
    const data = await circleHubService.getAnalytics(circleId, range);
    success(res, data);
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** GET /api/circles/:id/members?q=&page=&limit= */
circleHubRouter.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    const userId = (req as any).user?.userId ?? null;
    await assertHubAccess(circleId, userId);
    const search = q(req.query.q) || undefined;
    const page = parseInt(q(req.query.page) || '1', 10);
    const limit = parseInt(q(req.query.limit) || '20', 10);
    const data = await circleInviteService.listMembers(circleId, { q: search, page, limit });
    paginated(res, data.items, data.page, data.limit, data.total);
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** GET /api/circles/:id/invites  PENDING list (OWNER/ADMIN) */
circleHubRouter.get('/:id/invites', authMiddleware, async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    await assertAdmin(circleId, req.user!.userId);
    const items = await circleInviteService.listInvites(circleId);
    success(res, { items });
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** POST /api/circles/:id/invites  OWNER/ADMIN */
circleHubRouter.post('/:id/invites', authMiddleware, async (req: Request, res: Response) => {
  try {
    const circleId = req.params.id as string;
    await assertAdmin(circleId, req.user!.userId);
    const email = q(req.body.email) || '';
    const invite = await circleInviteService.createInvite(circleId, req.user!.userId, email);
    success(res, invite, '邀请已发送', 201);
  } catch (e: any) {
    fail(res, e.message || 'server error', e.status || 500);
  }
});

/** POST /api/circles/:id/invites/:inviteId/resend  OWNER/ADMIN */
circleHubRouter.post(
  '/:id/invites/:inviteId/resend',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const circleId = req.params.id as string;
      const inviteId = req.params.inviteId as string;
      await assertAdmin(circleId, req.user!.userId);
      const invite = await circleInviteService.resendInvite(circleId, inviteId);
      success(res, invite);
    } catch (e: any) {
      fail(res, e.message || 'server error', e.status || 500);
    }
  },
);

/** DELETE /api/circles/:id/invites/:inviteId  OWNER/ADMIN */
circleHubRouter.delete(
  '/:id/invites/:inviteId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const circleId = req.params.id as string;
      const inviteId = req.params.inviteId as string;
      await assertAdmin(circleId, req.user!.userId);
      await circleInviteService.revokeInvite(circleId, inviteId);
      success(res, { success: true });
    } catch (e: any) {
      fail(res, e.message || 'server error', e.status || 500);
    }
  },
);

/** POST /api/circles/:id/hub/heartbeat  member */
circleHubRouter.post(
  '/:id/hub/heartbeat',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const circleId = req.params.id as string;
      await circleInviteService.heartbeat(circleId, req.user!.userId);
      success(res, { success: true });
    } catch (e: any) {
      fail(res, e.message || 'server error', e.status || 500);
    }
  },
);