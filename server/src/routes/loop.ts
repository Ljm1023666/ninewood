// 自然回（Natural Loop）HTTP 路由
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §3.2
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { LoopKind, LoopRunStatus } from '@prisma/client';
import { adminGate } from '../middleware/admin-gate.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';
import { loopRunService } from '../services/loop/loop-run.service.js';
import { ensureSystemOfferings, listOfferings, retrieveOffering, retryOfferingVerification, runOffering, quoteOfferingFee } from '../services/loop/offering.service.js';
import { recommendLoops } from '../services/loop/recommendation.service.js';
import { listHeavenCapabilities } from '../services/loop/heaven-runner.service.js';
import { getLoopExecutor } from '../services/loop/executors/index.js';
import { listRecipes } from '../services/loop/composition.service.js';
import {
  createUserOffering,
  listUserOfferings,
  setUserOfferingStatus,
  healthCheckUserOffering,
} from '../services/loop/supply.service.js';
// 副作用：注册内置回执行器（Executor 注册表）
import '../services/loop/executors/index.js';

export const loopRouter = Router();

const parseCsv = (value: unknown): string[] =>
  typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

async function canAccessRun(run: any, userId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin || run.initiatorRef === `user:${userId}`) return true;
  if (run.parentRunId) {
    const parent = await loopRunService.getById(run.parentRunId);
    if (parent && await canAccessRun(parent, userId, isAdmin)) return true;
  }
  if (!run.demandId && !run.orderId) return false;
  const [demand, order] = await Promise.all([
    run.demandId
      ? prisma.demand.findUnique({ where: { id: run.demandId }, select: { userId: true } })
      : null,
    run.orderId
      ? prisma.order.findUnique({ where: { id: run.orderId }, select: { providerId: true, requesterId: true } })
      : run.demandId
        ? prisma.order.findFirst({ where: { demandId: run.demandId }, select: { providerId: true, requesterId: true } })
        : null,
  ]);
  return demand?.userId === userId || order?.providerId === userId || order?.requesterId === userId;
}

// 公开：列出内置/公开回定义
loopRouter.get('/definitions', async (_req: Request, res: Response) => {
  const defs = await prisma.loopDefinition.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      loopKind: true,
      executionMode: true,
      isBuiltin: true,
    },
  });
  success(res, defs);
});

loopRouter.get('/recommend', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const paths = parseCsv(req.query.paths);
  const facets = parseCsv(req.query.facets);
  if (!q && paths.length === 0 && facets.length === 0) {
    return fail(res, 'q、paths、facets 至少提供一个', 400);
  }
  try {
    const data = await recommendLoops({
      q: q || undefined,
      paths,
      facets,
      limit: Number(req.query.limit) || 20,
    });
    return success(res, data);
  } catch (err: any) {
    return fail(res, err?.message || '回推荐失败', err?.status || 500, err?.details);
  }
});

// 公开：列出内置组合路径（大回）元数据
loopRouter.get('/recipes', async (_req: Request, res: Response) => {
  success(
    res,
    listRecipes().map((r) => ({
      code: r.code,
      title: r.title,
      summary: r.summary,
      paths: r.paths,
      ioDoc: r.ioDoc,
      steps: r.steps.map((s) => ({
        key: s.key,
        definitionCode: s.definitionCode,
        relation: s.relation,
      })),
    })),
  );
});

// 公开：需求者检索「可用方案」（offering）
// 字段白名单：绝不返回 internalSuccessRate / verifier 机密配置（宪法：成功率仅内部）
loopRouter.get('/offerings', async (req: Request, res: Response) => {
  const q = (req.query.q as string) || undefined;
  const pathsRaw = req.query.paths as string | undefined;
  const paths = pathsRaw ? String(pathsRaw).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const loopKind = (req.query.loopKind as string) || undefined;
  const limitRaw = req.query.limit as string | undefined;
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 100) : 20;

  const items = await listOfferings({ q, paths, loopKind: loopKind as any, limit });
  success(res, items);
});

// 公开：上架物详情；内部成功率仅 admin 可见
loopRouter.get('/offerings/:id', async (req: Request, res: Response) => {
  const item = await retrieveOffering(req.params.id, req.adminOperatorId != null);
  if (!item) return fail(res, '方案不存在', 404);
  success(res, item);
});

// 公开：天回（系统自动）能力运行状态看板；供 /loops 展示自动能力的
// 触发方式、当前阶段、成功/失败次数、最近运行时间与最近结果。
loopRouter.get('/capabilities', async (_req: Request, res: Response) => {
  try {
    const items = await listHeavenCapabilities();
    success(res, items);
  } catch (err: any) {
    fail(res, err?.message || '加载天回能力失败', 500);
  }
});

// 用户侧「运行此能力」：对指定需求运行，或用自由输入试跑（auth）
// 只读影子同源：paths 类可回写 demand.paths，校验类只读，预览能力诚实返回 skipped。
loopRouter.post('/offerings/:id/run', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { demandId, input, billable, serviceAmount } = (req.body || {}) as {
    demandId?: string;
    input?: Record<string, unknown>;
    billable?: boolean;
    serviceAmount?: number;
  };
  try {
    const result = await runOffering(req.params.id, userId, {
      demandId,
      input,
      billable: billable === true,
      serviceAmount: serviceAmount != null ? Number(serviceAmount) : undefined,
    });
    success(res, result, '已运行');
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 500;
    fail(res, err?.message || '运行失败', status);
  }
});

// 回域费用预览（不落账）
loopRouter.get('/offerings/:id/fee-quote', authMiddleware, async (req: Request, res: Response) => {
  const amount = Number(req.query.serviceAmount ?? 0);
  try {
    const quote = await quoteOfferingFee(req.params.id, amount);
    success(res, quote);
  } catch (err: any) {
    fail(res, err?.message || '报价失败', err?.status || 500);
  }
});

// ── 开放供给：我的地回 ──────────────────────────────────────────────
loopRouter.get('/my-offerings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const items = await listUserOfferings(req.user!.userId);
    success(res, items);
  } catch (err: any) {
    fail(res, err?.message || '加载失败', err?.status || 500);
  }
});

loopRouter.post('/my-offerings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const item = await createUserOffering(req.user!.userId, {
      title: String(body.title ?? ''),
      summary: body.summary != null ? String(body.summary) : undefined,
      paths: Array.isArray(body.paths) ? body.paths.map(String) : undefined,
      endpointUrl: body.endpointUrl != null ? String(body.endpointUrl) : undefined,
      inputSchema: (body.inputSchema as Record<string, unknown> | undefined) ?? undefined,
      outcomeSchema: (body.outcomeSchema as Record<string, unknown> | undefined) ?? undefined,
      ioDoc: body.ioDoc != null ? String(body.ioDoc) : undefined,
      verifierCodes: Array.isArray(body.verifierCodes) ? body.verifierCodes.map(String) : undefined,
      claimedServiceAmount:
        body.claimedServiceAmount != null ? Number(body.claimedServiceAmount) : undefined,
      verificationFee: body.verificationFee != null ? Number(body.verificationFee) : undefined,
    });
    success(res, item, '已上架（健康未知，请先做健康检查）');
  } catch (err: any) {
    fail(res, err?.message || '上架失败', err?.status || 500);
  }
});

loopRouter.post('/my-offerings/:id/health-check', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await healthCheckUserOffering(req.user!.userId, req.params.id);
    success(res, result, result.recommendable ? '已上线，可进入推荐' : '健康未达标');
  } catch (err: any) {
    fail(res, err?.message || '健康检查失败', err?.status || 500);
  }
});

loopRouter.patch('/my-offerings/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const status = String((req.body || {}).status ?? '');
  if (!['ACTIVE', 'PAUSED', 'DELISTED'].includes(status)) {
    return fail(res, 'status 须为 ACTIVE | PAUSED | DELISTED', 400);
  }
  try {
    const item = await setUserOfferingStatus(
      req.user!.userId,
      req.params.id,
      status as 'ACTIVE' | 'PAUSED' | 'DELISTED',
    );
    success(res, item, '状态已更新');
  } catch (err: any) {
    fail(res, err?.message || '更新失败', err?.status || 500);
  }
});

// 回列表（按需求）：仅需求方/接单方可见
loopRouter.get('/runs', authMiddleware, async (req: Request, res: Response) => {
  const demandId = req.query.demandId as string | undefined;
  if (!demandId) return fail(res, 'demandId 必填', 400);
  const userId = req.user!.userId;

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { userId: true },
  });
  if (!demand) return fail(res, '需求不存在', 404);

  const order = await prisma.order.findFirst({
    where: { demandId },
    select: { providerId: true, requesterId: true },
  });
  const isParticipant =
    demand.userId === userId || order?.providerId === userId || order?.requesterId === userId;
  if (!isParticipant) return fail(res, '无权查看该回', 403);

  const runs = await loopRunService.listByDemand(demandId);
  success(res, runs);
});

// 用户侧「回中心」：汇总当前用户参与的全部天回/地回/人回运行实例。
loopRouter.get('/runs/mine', authMiddleware, async (req: Request, res: Response) => {
  const kindRaw = req.query.kind as string | undefined;
  const kindsRaw = req.query.kinds as string | undefined;
  const statusRaw = req.query.status as string | undefined;
  const sortRaw = (req.query.sort as string | undefined) ?? 'recent';
  const limitRaw = Number(req.query.limit ?? 100);
  const loopKindValues = Object.values(LoopKind) as string[];
  const statuses = Object.values(LoopRunStatus) as string[];

  const requestedKinds: string[] = [];
  if (kindRaw) requestedKinds.push(kindRaw);
  if (kindsRaw) requestedKinds.push(...kindsRaw.split(',').map((s) => s.trim()).filter(Boolean));
  const uniqueKinds = Array.from(new Set(requestedKinds));
  if (uniqueKinds.length && !uniqueKinds.every((k) => loopKindValues.includes(k))) {
    return fail(res, 'kind/kinds 参数无效', 400);
  }
  if (statusRaw && !statuses.includes(statusRaw)) return fail(res, 'status 参数无效', 400);
  if (!['recent', 'completion', 'success'].includes(sortRaw)) {
    return fail(res, 'sort 参数无效', 400);
  }

  try {
    const result = await loopRunService.listMine(req.user!.userId, {
      loopKinds: uniqueKinds.length ? (uniqueKinds as LoopKind[]) : undefined,
      status: statusRaw as LoopRunStatus | undefined,
      sort: sortRaw as 'recent' | 'completion' | 'success',
      limit: Number.isFinite(limitRaw) ? limitRaw : 100,
    });
    return success(res, result);
  } catch (err: any) {
    return fail(res, err?.message || '加载我的回失败', 500);
  }
});

// 回详情（参与方或 admin）
loopRouter.get('/runs/:id', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const run = await loopRunService.getById(req.params.id);
  if (!run) return fail(res, '回不存在', 404);

  const isAdmin = req.adminOperatorId != null;
  if (!await canAccessRun(run, userId, isAdmin)) return fail(res, '无权查看该回', 403);
  const events = isAdmin ? run.events : run.events.filter((event) => event.visibility !== 'SYSTEM_ONLY');
  const verificationRuns = run.verificationRuns.map((item) => ({
    id: item.id,
    status: item.status,
    resultJson: item.resultJson,
    createdAt: item.createdAt,
    verifier: item.contract.verifierEndpoint,
  }));
  success(res, { ...run, events, verificationRuns });
});

loopRouter.post('/runs/:id/retry-verification', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await retryOfferingVerification(req.params.id, req.user!.userId);
    success(res, result, '验证已重试');
  } catch (err: any) {
    fail(res, err?.message || '重试验证失败', err?.status || 500);
  }
});

// 回事件（默认不含 SYSTEM_ONLY；admin 可看全）
loopRouter.get('/runs/:id/events', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const run = await loopRunService.getById(req.params.id);
  if (!run) return fail(res, '回不存在', 404);

  if (!await canAccessRun(run, userId, req.adminOperatorId != null)) return fail(res, '无权查看该回', 403);

  const events = await loopRunService.getEvents(req.params.id, req.adminOperatorId != null);
  success(res, events);
});

// 运营：幂等种子（adminGate）
loopRouter.post('/admin/seed-builtins', adminGate, async (_req: Request, res: Response) => {
  try {
    const summary = await ensureSystemOfferings();
    success(res, summary, 'seed 完成');
  } catch (err: any) {
    console.error('[loop] seed-builtins failed', err);
    fail(res, err?.message || 'seed 失败', 500);
  }
});

// 运营：对给定 demand 跑内置执行器（paths + validate.*），结果用于影子校验
// 本质只读影子：写回的是 demand.paths 与校验结论，不改 Demand/Order 主事务（宪法 #5）
loopRouter.post('/admin/run-builtin', adminGate, async (req: Request, res: Response) => {
  const { demandId, executorCodes } = (req.body || {}) as { demandId?: string; executorCodes?: unknown };
  if (!demandId) return fail(res, 'demandId 必填', 400);

  const codes: string[] =
    Array.isArray(executorCodes) && (executorCodes as unknown[]).length
      ? (executorCodes as string[])
      : ['builtin.earth.demand.paths', 'builtin.heaven.validate.demand_fields', 'builtin.heaven.validate.paths'];

  const results: Array<Record<string, unknown>> = [];
  for (const code of codes) {
    const exec = getLoopExecutor(code);
    if (!exec) {
      results.push({ code, status: 'FAILED', outcome: { error: 'executor 未注册' } });
      continue;
    }
    try {
      const r = await exec.execute({ demandId }, { loopRunId: '' });
      results.push({ code, status: r.status, outcome: r.outcome });
    } catch (err: any) {
      results.push({ code, status: 'FAILED', outcome: { error: err?.message || 'executor 抛错' } });
    }
  }
  success(res, results, '内置执行器已运行');
});
