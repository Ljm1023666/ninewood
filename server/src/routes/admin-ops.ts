import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { welfareDisbursementService } from '../services/welfare-disbursement.js';

export const adminOpsRouter = Router();

function parsePage(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function pagePayload<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

// ── 订单 ──────────────────────────────────────────────

adminOpsRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || '').trim();
    const q = String(req.query.q || '').trim();
    const { page, limit, skip } = parsePage(req);

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as Prisma.EnumOrderStatusFilter['equals'];
    if (q) {
      where.OR = [
        { demand: { title: { contains: q, mode: 'insensitive' } } },
        { provider: { nickname: { contains: q, mode: 'insensitive' } } },
        { requester: { nickname: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          demand: { select: { id: true, title: true } },
          provider: { select: { id: true, nickname: true } },
          requester: { select: { id: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((o) => ({
          id: o.id,
          demandId: o.demandId,
          demandTitle: o.demand?.title ?? '—',
          providerId: o.providerId,
          providerNickname: o.provider?.nickname ?? '—',
          requesterId: o.requesterId,
          requesterNickname: o.requester?.nickname ?? '—',
          agreedPrice: Number(o.agreedPrice),
          status: o.status,
          paidAt: o.paidAt,
          completedAt: o.completedAt,
          createdAt: o.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 需求 ──────────────────────────────────────────────

adminOpsRouter.get('/demands', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || '').trim();
    const q = String(req.query.q || '').trim();
    const { page, limit, skip } = parsePage(req);

    const where: Prisma.DemandWhereInput = { deletedAt: null };
    if (status) where.status = status as Prisma.EnumDemandStatusFilter['equals'];
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { user: { nickname: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          circle: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.demand.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          minPrice: Number(d.minPrice),
          category: d.category,
          tagName: d.tagName,
          publisherNickname: d.user?.nickname ?? '—',
          publisherPhone: d.user?.phone ?? '—',
          circleName: d.circle?.name ?? null,
          expireAt: d.expireAt,
          createdAt: d.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

adminOpsRouter.put('/demands/:id/status', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      status: z.enum(['ACTIVE', 'FROZEN', 'WITHDRAWN', 'CLOSED']),
    });
    const { status } = schema.parse(req.body);
    const data: Prisma.DemandUpdateInput = { status };
    if (status === 'FROZEN') data.frozenAt = new Date();
    if (status === 'ACTIVE') data.frozenAt = null;
    const demand = await prisma.demand.update({
      where: { id: req.params.id as string },
      data,
    });
    success(res, demand, '需求状态已更新');
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 投诉 ──────────────────────────────────────────────

adminOpsRouter.get('/complaints', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || '').trim();
    const { page, limit, skip } = parsePage(req);
    const where: Prisma.ComplaintWhereInput = status
      ? { status: status as Prisma.EnumComplaintStatusFilter['equals'] }
      : {};

    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          fromUser: { select: { id: true, nickname: true } },
          toUser: { select: { id: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.complaint.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((c) => ({
          id: c.id,
          demandId: c.demandId,
          reason: c.reason,
          status: c.status,
          result: c.result,
          fromNickname: c.fromUser?.nickname ?? '—',
          toNickname: c.toUser?.nickname ?? '—',
          createdAt: c.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

adminOpsRouter.post('/complaints/:id/resolve', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      action: z.enum(['uphold', 'dismiss']),
      result: z.string().max(500).optional(),
    });
    const { action, result } = schema.parse(req.body);
    const complaint = await prisma.complaint.update({
      where: { id: req.params.id as string },
      data: {
        status: action === 'uphold' ? 'UPHELD' : 'DISMISSED',
        result: result?.trim() || (action === 'uphold' ? '投诉成立' : '投诉驳回'),
      },
    });
    success(res, complaint, '投诉已处理');
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 评价 ──────────────────────────────────────────────

adminOpsRouter.get('/reviews', async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePage(req);
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        include: {
          reviewer: { select: { nickname: true } },
          reviewee: { select: { nickname: true } },
          order: {
            select: {
              demand: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count(),
    ]);

    success(
      res,
      pagePayload(
        items.map((r) => ({
          id: r.id,
          orderId: r.orderId,
          demandTitle: r.order?.demand?.title ?? '—',
          reviewerNickname: r.reviewer?.nickname ?? '—',
          revieweeNickname: r.reviewee?.nickname ?? '—',
          rating: r.rating,
          content: r.content,
          createdAt: r.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 用户写操作 ────────────────────────────────────────

adminOpsRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      role: z.enum(['USER', 'ADMIN']).optional(),
      points: z.number().int().min(0).optional(),
      isBusy: z.boolean().optional(),
      certificationLevel: z
        .enum(['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTER'])
        .optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data,
      select: {
        id: true,
        nickname: true,
        role: true,
        points: true,
        isBusy: true,
        certificationLevel: true,
      },
    });
    success(res, { ...user, points: Number(user.points) }, '用户已更新');
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 认证服务者 ────────────────────────────────────────

adminOpsRouter.get('/certifications', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const { page, limit, skip } = parsePage(req);
    const where: Prisma.CertifiedProviderWhereInput = q
      ? {
          user: {
            OR: [
              { nickname: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          },
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.certifiedProvider.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
              certificationLevel: true,
            },
          },
          region: { select: { id: true, name: true } },
        },
        orderBy: { verifiedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.certifiedProvider.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((p) => ({
          userId: p.userId,
          nickname: p.user?.nickname ?? '—',
          phone: p.user?.phone ?? '—',
          certificationLevel: p.user?.certificationLevel ?? 'NONE',
          tags: p.tags,
          regionName: p.region?.name ?? '—',
          avgRating: p.avgRating,
          totalCompleted: p.totalCompleted,
          verifiedAt: p.verifiedAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 服务标签 (UserTag) ────────────────────────────────

adminOpsRouter.get('/user-tags', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || '').trim();
    const { page, limit, skip } = parsePage(req);
    const where: Prisma.UserTagWhereInput = status
      ? { status: status as Prisma.EnumTagStatusFilter['equals'] }
      : {};

    const [items, total] = await Promise.all([
      prisma.userTag.findMany({
        where,
        include: { user: { select: { nickname: true, phone: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userTag.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((t) => ({
          id: t.id,
          userId: t.userId,
          nickname: t.user?.nickname ?? '—',
          tagName: t.tagName,
          status: t.status,
          certified: t.certified,
          rating: t.rating,
          orderCount: t.orderCount,
          updatedAt: t.updatedAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

adminOpsRouter.put('/user-tags/:id/status', async (req: Request, res: Response) => {
  try {
    const schema = z.object({ status: z.enum(['IDLE', 'BUSY', 'HIDDEN']) });
    const { status } = schema.parse(req.body);
    const tag = await prisma.userTag.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    success(res, tag, '标签状态已更新');
  } catch (e: unknown) {
    if (e instanceof z.ZodError) return fail(res, '参数验证失败', 400, e.errors);
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 钱包流水 ──────────────────────────────────────────

adminOpsRouter.get('/wallet/ledger', async (req: Request, res: Response) => {
  try {
    const userId = String(req.query.userId || '').trim();
    const { page, limit, skip } = parsePage(req);
    const where = userId ? { userId } : {};

    const [items, total] = await Promise.all([
      prisma.walletLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletLedger.count({ where }),
    ]);

    success(res, pagePayload(items, total, page, limit));
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 押金 ──────────────────────────────────────────────

adminOpsRouter.get('/deposits', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || '').trim();
    const { page, limit, skip } = parsePage(req);
    const where: Prisma.DepositWhereInput = status
      ? { status: status as Prisma.EnumDepositStatusFilter['equals'] }
      : {};

    const [items, total] = await Promise.all([
      prisma.deposit.findMany({
        where,
        include: { user: { select: { nickname: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deposit.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((d) => ({
          id: d.id,
          userId: d.userId,
          nickname: d.user?.nickname ?? '—',
          amount: Number(d.amount),
          status: d.status,
          createdAt: d.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 结算 ──────────────────────────────────────────────

adminOpsRouter.get('/settlements', async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePage(req);
    const [items, total] = await Promise.all([
      prisma.settlement.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.settlement.count(),
    ]);

    success(res, pagePayload(items, total, page, limit));
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 圈子成员 ──────────────────────────────────────────

adminOpsRouter.get('/circles/:id/members', async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePage(req);
    const circleId = req.params.id as string;
    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      select: { id: true, name: true, memberCount: true },
    });
    if (!circle) {
      return fail(res, '圈子不存在', 404);
    }
    const where = { circleId };

    const [items, total] = await Promise.all([
      prisma.circleMember.findMany({
        where,
        include: { user: { select: { nickname: true, phone: true } } },
        orderBy: { joinedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.circleMember.count({ where }),
    ]);

    success(res, {
      circle,
      ...pagePayload(
        items.map((m) => ({
          userId: m.userId,
          nickname: m.user?.nickname ?? '—',
          phone: m.user?.phone ?? '—',
          role: m.role,
          joinedAt: m.joinedAt,
          lastSeenAt: m.lastSeenAt,
        })),
        total,
        page,
        limit,
      ),
    });
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 消息监控 ──────────────────────────────────────────

adminOpsRouter.get('/messages', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const { page, limit, skip } = parsePage(req);
    const where: Prisma.MessageWhereInput = q
      ? {
          OR: [
            { content: { contains: q, mode: 'insensitive' } },
            { fromUser: { nickname: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          fromUser: { select: { nickname: true } },
          toUser: { select: { nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((m) => ({
          id: m.id,
          fromNickname: m.fromUser?.nickname ?? '—',
          toNickname: m.toUser?.nickname ?? '—',
          type: m.type,
          content:
            m.content.length > 120 ? `${m.content.slice(0, 120)}…` : m.content,
          isRead: m.isRead,
          createdAt: m.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 标签配置 ──────────────────────────────────────────

adminOpsRouter.get('/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    success(
      res,
      tags.map((t) => ({
        name: t.name,
        category: t.category,
        totalCompleted: t.totalCompleted,
        totalEstimatedAmount: Number(t.totalEstimatedAmount),
      })),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 地区 ──────────────────────────────────────────────

adminOpsRouter.get('/regions', async (req: Request, res: Response) => {
  try {
    const level = req.query.level ? Number(req.query.level) : undefined;
    const where = level ? { level } : {};
    const regions = await prisma.region.findMany({
      where,
      orderBy: { id: 'asc' },
      take: 500,
    });
    success(res, regions);
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── 公益：地区池 + 拨付列表（regionId 可选）──────────

adminOpsRouter.get('/welfare/pools', async (_req: Request, res: Response) => {
  try {
    const pools = await prisma.welfareFundPool.findMany({
      orderBy: { regionId: 'asc' },
    });
    success(
      res,
      pools.map((p) => ({
        regionId: p.regionId,
        balance: Number(p.balance),
        totalInflow: Number(p.totalInflow),
        totalOutflow: Number(p.totalOutflow),
      })),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

adminOpsRouter.get('/welfare/disbursements-all', async (req: Request, res: Response) => {
  try {
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
    const { page, limit, skip } = parsePage(req);
    const where =
      regionId !== undefined && Number.isFinite(regionId) ? { regionId } : {};

    const [items, total] = await Promise.all([
      prisma.welfareDisbursement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.welfareDisbursement.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((d) => ({ ...d, amount: Number(d.amount) })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

// ── Agent 任务 ────────────────────────────────────────

adminOpsRouter.get('/agent/tasks', async (req: Request, res: Response) => {
  try {
    const enabled = req.query.enabled;
    const { page, limit, skip } = parsePage(req);
    const where =
      enabled === 'true' ? { enabled: true } : enabled === 'false' ? { enabled: false } : {};

    const [items, total] = await Promise.all([
      prisma.agentTask.findMany({
        where,
        include: { user: { select: { nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.agentTask.count({ where }),
    ]);

    success(
      res,
      pagePayload(
        items.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          enabled: t.enabled,
          frequency: t.frequency,
          nickname: t.user?.nickname ?? '—',
          lastRunAt: t.lastRunAt,
          nextRunAt: t.nextRunAt,
          createdAt: t.createdAt,
        })),
        total,
        page,
        limit,
      ),
    );
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});

adminOpsRouter.put('/agent/tasks/:id/toggle', async (req: Request, res: Response) => {
  try {
    const task = await prisma.agentTask.findUnique({
      where: { id: req.params.id as string },
    });
    if (!task) return fail(res, '任务不存在', 404);
    const updated = await prisma.agentTask.update({
      where: { id: task.id },
      data: { enabled: !task.enabled },
    });
    success(res, updated, updated.enabled ? '任务已启用' : '任务已停用');
  } catch (e: unknown) {
    fail(res, e instanceof Error ? e.message : 'server error', 500);
  }
});
