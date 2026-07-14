// 回上架物（Offering）检索 / 详情 · 自然回
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §3.3 / §5
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { LoopKind, LoopEventVisibility, LoopRunStatus } from '@prisma/client';
import { seedBuiltinLoops } from './builtin-loops.js';
import { ensureVerificationContracts, runForLoopRun } from './verification.service.js';
import { getLoopExecutor } from './executors/index.js';
import { loopRunService } from './loop-run.service.js';
import { assertLoopSchema } from './schema-validator.js';

export interface ListOfferingsParams {
  q?: string;
  paths?: string[];
  loopKind?: LoopKind;
  limit?: number;
}

export function toPublicOffering(o: any, isAdmin = false) {
  const successRatePublic = Boolean(o.endpoint?.successRatePublic);
  const requiredVerifiers = (o.verificationContracts ?? []).filter((c: any) => c.isRequired);
  const base = {
    id: o.id,
    title: o.title,
    summary: o.summary,
    loopKind: o.definition.loopKind,
    definitionCode: o.definition.code,
    definitionName: o.definition.name,
    definitionDescription: o.definition.description,
    paths: o.paths,
    inputSchema: o.definition.inputSchema ?? {},
    outcomeSchema: o.definition.outcomeSchema ?? {},
    metrics: {
      dealRate: o.dealRate,
      avgDurationMs: o.avgDurationMs,
      publicSuccessRate: successRatePublic ? o.internalSuccessRate : null,
      sampleSize: successRatePublic ? o.recentTotalN : null,
      successRateStatus: successRatePublic ? 'PUBLIC' : 'ADAPTING',
    },
    requiresVerification: o.requiresVerification,
    verification: {
      status: requiredVerifiers.length > 0 ? 'VERIFIED' : 'UNAVAILABLE',
      verifierCount: requiredVerifiers.length,
      verifiers: requiredVerifiers.map((c: any) => ({
        id: c.verifierEndpoint.id,
        code: c.verifierEndpoint.code,
        name: c.verifierEndpoint.name,
      })),
    },
    endpoint: {
      healthStatus: o.endpoint?.healthStatus ?? null,
      hostMode: o.endpoint?.hostMode ?? null,
    },
  };
  return isAdmin ? { ...base, internalSuccessRate: o.internalSuccessRate } : base;
}

/**
 * 公开检索「可用方案」（offering）。
 * 公开字段：id/title/summary/loopKind/paths/dealRate/avgDurationMs/
 *   recentSuccessN/recentTotalN/requiresVerification/endpoint.healthStatus
 * 绝不返回 internalSuccessRate 或 verifier 内部配置（宪法：成功率仅内部）。
 */
export async function listOfferings(params: ListOfferingsParams = {}) {
  const { q, paths, loopKind, limit = 20 } = params;
  const where: Prisma.LoopOfferingWhereInput = { status: 'ACTIVE' };

  if (loopKind) where.definition = { loopKind };
  if (q) where.OR = [{ title: { contains: q } }, { summary: { contains: q } }];
  if (paths && paths.length) where.paths = { hasSome: paths };

  const rows = await prisma.loopOffering.findMany({
    where,
    include: {
      endpoint: { select: { healthStatus: true, hostMode: true, successRatePublic: true } },
      definition: { select: { loopKind: true, code: true, name: true, description: true, inputSchema: true, outcomeSchema: true } },
      verificationContracts: {
        include: { verifierEndpoint: { select: { id: true, code: true, name: true } } },
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((o) => toPublicOffering(o));
}

/**
 * 上架物详情；非 admin 不返回 internalSuccessRate / verifier 机密配置。
 */
export async function retrieveOffering(id: string, isAdmin: boolean) {
  const o = await prisma.loopOffering.findUnique({
    where: { id },
    include: {
      endpoint: { select: { healthStatus: true, hostMode: true, successRatePublic: true } },
      definition: { select: { loopKind: true, code: true, name: true, description: true, inputSchema: true, outcomeSchema: true } },
      verificationContracts: {
        include: { verifierEndpoint: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  if (!o) return null;

  return toPublicOffering(o, isAdmin);
}

/**
 * 确保每个 SYSTEM builtin 均有一条 ACTIVE 上架物（幂等）。
 * 复用 builtin-loops 的种子逻辑作为唯一来源。
 */
export async function ensureSystemOfferings() {
  const summary = await seedBuiltinLoops();
  // Wave E：把 validate.demand_fields 契约绑到至少一个 EARTH offering
  const contracts = await ensureVerificationContracts();
  return { ...summary, contracts: contracts.contracts };
}

/**
 * 用户侧「运行此能力」：对指定需求运行，或用自由输入试跑。
 * - demandId：必须由当前用户拥有（需求方），否则 403；执行器可回写 demand.paths（与影子同源，不破坏主流程）。
 * - input（自由输入）：仅用传入字段计算，不写库，返回真实结果（试一试）。
 * - 执行器未注册：不再返回 skipped 伪装，直接报错，确保问题可见。
 */
export async function runOffering(
  offeringId: string,
  userId: string,
  opts: { demandId?: string; input?: Record<string, unknown> },
): Promise<{
  runId: string;
  ran: boolean;
  preview: boolean;
  code: string;
  status: string;
  outcome: unknown;
}> {
  const o = await prisma.loopOffering.findUnique({
    where: { id: offeringId },
    include: {
      definition: { select: { code: true, loopKind: true, name: true, inputSchema: true, outcomeSchema: true } },
      endpoint: { select: { id: true, hostMode: true, healthStatus: true } },
      verificationContracts: { where: { isRequired: true }, select: { id: true } },
    },
  });
  if (!o) throw Object.assign(new Error('方案不存在'), { status: 404 });
  if (o.status !== 'ACTIVE') throw Object.assign(new Error('方案当前不可运行'), { status: 409 });
  if (o.endpoint?.healthStatus !== 'ONLINE') {
    throw Object.assign(new Error('能力接口当前不可用'), { status: 409 });
  }
  if (o.definition.loopKind === LoopKind.EARTH && o.verificationContracts.length === 0) {
    throw Object.assign(new Error('地回尚未绑定必要的天回验证'), { status: 409 });
  }

  const exec = getLoopExecutor(o.definition.code);
  if (!exec) {
    throw Object.assign(
      new Error(`能力执行器未注册：${o.definition.code}`),
      { status: 500 },
    );
  }

  const demandId = opts.demandId;
  if (demandId) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      select: { userId: true },
    });
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 });
    if (demand.userId !== userId) throw Object.assign(new Error('无权对该需求运行此能力'), { status: 403 });
  } else if (!opts.input || Object.keys(opts.input).length === 0) {
    throw Object.assign(new Error('需要提供 demandId 或 input'), { status: 400 });
  }
  if (!demandId) assertLoopSchema(o.definition.inputSchema, opts.input, '输入');

  const execInput: Record<string, unknown> = { endpointId: o.endpoint?.id };
  if (demandId) execInput.demandId = demandId;
  else execInput.fields = opts.input;

  const runId = await loopRunService.create({
    definitionCode: o.definition.code,
    loopKind: o.definition.loopKind,
    initiatorRef: `user:${userId}`,
    offeringId: o.id,
    demandId,
    inputJson: (opts.input ?? { demandId }) as Prisma.InputJsonValue,
    expectedOutcome: o.definition.outcomeSchema as Prisma.InputJsonValue,
  });
  await loopRunService.appendEvent(runId, {
    type: 'RUN_STARTED',
    actorRef: `user:${userId}`,
    visibility: LoopEventVisibility.ACTOR,
    payload: { code: o.definition.code, preview: !demandId },
  });
  await loopRunService.transition(runId, LoopRunStatus.EXECUTING);

  let r;
  try {
    r = await exec.execute(execInput, { userId, loopRunId: runId });
  } catch (error) {
    await loopRunService.appendEvent(runId, {
      type: 'RUN_FAILED',
      actorRef: `user:${userId}`,
      visibility: LoopEventVisibility.ACTOR,
      payload: { message: error instanceof Error ? error.message : '执行失败' },
    });
    await loopRunService.transition(runId, LoopRunStatus.FAILED);
    throw error;
  }
  await loopRunService.appendEvent(runId, {
    type: 'RUN_RESULT',
    actorRef: `user:${userId}`,
    visibility: LoopEventVisibility.ACTOR,
    payload: r.outcome as Prisma.InputJsonValue,
  });
  if (r.status !== 'SUCCEEDED') {
    const failedStatus = r.status === 'INCONCLUSIVE' ? LoopRunStatus.INCONCLUSIVE : LoopRunStatus.FAILED;
    await loopRunService.transition(runId, failedStatus, { actualOutcome: r.outcome as Prisma.InputJsonValue });
    return { runId, ran: true, preview: !demandId, code: o.definition.code, status: failedStatus, outcome: r.outcome };
  }
  try {
    assertLoopSchema(o.definition.outcomeSchema, r.outcome, '输出');
  } catch (error) {
    await loopRunService.transition(runId, LoopRunStatus.FAILED, { actualOutcome: r.outcome as Prisma.InputJsonValue });
    throw error;
  }

  let finalStatus: LoopRunStatus = LoopRunStatus.SUCCEEDED;
  await loopRunService.transition(runId, LoopRunStatus.VERIFYING, {
    actualOutcome: r.outcome as Prisma.InputJsonValue,
  });
  if (o.definition.loopKind === LoopKind.EARTH) {
    const verification = await runForLoopRun(runId);
    finalStatus = verification === 'PASSED'
      ? LoopRunStatus.SUCCEEDED
      : verification === 'FAILED'
        ? LoopRunStatus.FAILED
        : LoopRunStatus.INCONCLUSIVE;
  }
  await loopRunService.transition(runId, finalStatus, {
    actualOutcome: r.outcome as Prisma.InputJsonValue,
  });
  return {
    runId,
    ran: true,
    preview: !demandId,
    code: o.definition.code,
    status: finalStatus,
    outcome: r.outcome,
  };
}

export async function retryOfferingVerification(runId: string, userId: string) {
  const run = await prisma.loopRun.findUnique({
    where: { id: runId },
    select: { id: true, loopKind: true, status: true, initiatorRef: true, offeringId: true },
  });
  if (!run) throw Object.assign(new Error('回不存在'), { status: 404 });
  if (run.initiatorRef !== `user:${userId}`) throw Object.assign(new Error('无权重试该回'), { status: 403 });
  if (run.loopKind === LoopKind.EARTH && (run.status === LoopRunStatus.SUCCEEDED || run.status === LoopRunStatus.FAILED)) {
    return {
      runId: run.id,
      status: run.status,
      verification: run.status === LoopRunStatus.SUCCEEDED ? 'PASSED' : 'FAILED',
    };
  }
  if (run.loopKind !== LoopKind.EARTH || run.status !== LoopRunStatus.INCONCLUSIVE || !run.offeringId) {
    throw Object.assign(new Error('当前状态不可重试验证'), { status: 409 });
  }
  await loopRunService.transition(run.id, LoopRunStatus.VERIFYING);
  const outcome = await runForLoopRun(run.id);
  const status = outcome === 'PASSED'
    ? LoopRunStatus.SUCCEEDED
    : outcome === 'FAILED'
      ? LoopRunStatus.FAILED
      : LoopRunStatus.INCONCLUSIVE;
  await loopRunService.transition(run.id, status);
  return { runId: run.id, status, verification: outcome };
}
