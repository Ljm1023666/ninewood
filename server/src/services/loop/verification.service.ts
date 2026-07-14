// 验证契约服务 · 自然回
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §6 Wave E
import { prisma } from '../../lib/prisma.js';
import { LoopEventVisibility, Prisma } from '@prisma/client';
import { getLoopExecutor } from './executors/index.js';
import { loopRunService } from './loop-run.service.js';

export type VerificationOutcome = 'PASSED' | 'FAILED' | 'ERROR' | 'INCONCLUSIVE' | 'SKIPPED';

const VERIFIER_CODE = 'builtin.heaven.validate.demand_fields';

/**
 * 为内置地回 Offering 绑定验证契约（幂等）。
 * 至少把 builtin.heaven.validate.demand_fields 绑到一个 EARTH offering 上。
 */
export async function ensureVerificationContracts(): Promise<{ contracts: number }> {
  const verifier = await prisma.capabilityEndpoint.findUnique({ where: { code: VERIFIER_CODE } });
  if (!verifier) return { contracts: 0 };

  const offering = await prisma.loopOffering.findFirst({
    where: { status: 'ACTIVE', definition: { loopKind: 'EARTH' } },
    orderBy: { createdAt: 'asc' },
  });
  if (!offering) return { contracts: 0 };

  const existing = await prisma.verificationContract.findUnique({
    where: { offeringId_verifierEndpointId: { offeringId: offering.id, verifierEndpointId: verifier.id } },
  });
  if (existing) return { contracts: 0 };

  await prisma.verificationContract.create({
    data: {
      offeringId: offering.id,
      verifierEndpointId: verifier.id,
      claimSchema: {},
      isRequired: true,
    },
  });
  return { contracts: 1 };
}

/**
 * 执行某回运行上所有 required 验证契约，逐条写 VerificationRun。
 * 设计原则（宪法 #3）：验证失败/异常只记录，绝不抛错阻断主路径。
 */
export async function runForLoopRun(loopRunId: string): Promise<VerificationOutcome> {
  const run = await prisma.loopRun.findUnique({
    where: { id: loopRunId },
    include: {
      offering: {
        include: { verificationContracts: { include: { verifierEndpoint: true } } },
      },
    },
  });
  if (!run || !run.offering) return 'SKIPPED';

  const contracts = run.offering.verificationContracts.filter((c) => c.isRequired);
  if (contracts.length === 0) return 'SKIPPED';

  let overall: VerificationOutcome = 'PASSED';

  for (const contract of contracts) {
    const code = contract.verifierEndpoint.code;
    const exec = getLoopExecutor(code);
    let status: VerificationOutcome = 'ERROR';
    let resultJson: Prisma.InputJsonValue = {};

    try {
      if (!exec) {
        status = 'SKIPPED';
      } else {
        const r = await exec.execute(
          { demandId: run.demandId, loopRunId },
          { loopRunId },
        );
        status =
          r.status === 'SUCCEEDED'
            ? 'PASSED'
            : r.status === 'INCONCLUSIVE'
              ? 'INCONCLUSIVE'
              : 'FAILED';
        resultJson = r.outcome;
      }
    } catch (err: any) {
      status = 'ERROR';
      resultJson = { error: err?.message || 'verifier 抛错' };
    }

    await prisma.verificationRun.create({
      data: { contractId: contract.id, loopRunId, status, resultJson },
    });

    await updateOfferingMetrics(run.offeringId!, status === 'PASSED');

    if (status !== 'PASSED') {
      overall = status === 'ERROR' ? 'ERROR' : status;
    }
  }

  return overall;
}

/** 指标更新：recentTotalN++；PASSED → recentSuccessN++；内部成功率重算（successRatePublic 维持 false）。 */
async function updateOfferingMetrics(offeringId: string, passed: boolean): Promise<void> {
  await prisma.loopOffering.update({
    where: { id: offeringId },
    data: {
      recentTotalN: { increment: 1 },
      ...(passed ? { recentSuccessN: { increment: 1 } } : {}),
    },
  });

  const off = await prisma.loopOffering.findUnique({
    where: { id: offeringId },
    select: { recentSuccessN: true, recentTotalN: true },
  });
  if (off && off.recentTotalN > 0) {
    const rate = Math.round((off.recentSuccessN / off.recentTotalN) * 1000) / 1000;
    await prisma.loopOffering.update({
      where: { id: offeringId },
      data: { internalSuccessRate: rate },
    });
  }
}

/**
 * 人回影子无 Offering 时：直接跑需求字段/路径校验，只写事件不写 VerificationRun。
 * （契约 VerificationRun 仅挂在带 offering 的地回上。）
 */
async function runShadowDemandValidators(
  demandId: string,
): Promise<VerificationOutcome> {
  const codes = [
    'builtin.heaven.validate.demand_fields',
    'builtin.heaven.validate.paths',
  ];
  let overall: VerificationOutcome = 'PASSED';
  for (const code of codes) {
    const exec = getLoopExecutor(code);
    if (!exec) continue;
    try {
      const r = await exec.execute({ demandId }, { loopRunId: '' });
      if (r.status !== 'SUCCEEDED') {
        overall = r.status === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : 'FAILED';
      }
    } catch {
      overall = 'ERROR';
    }
  }
  return overall;
}

/**
 * 按 runId 执行验证（confirm 钩子内、CLOSED 之前调用，避免竞态）。
 * 有 offering → runForLoopRun；人回无 offering → 需求字段校验桩。
 * 仅记事件 / VerificationRun，不改 LoopRun 状态、不阻断结算。
 */
export async function verifyDemandShadowByRunId(loopRunId: string): Promise<void> {
  const run = await prisma.loopRun.findUnique({
    where: { id: loopRunId },
    select: { id: true, demandId: true, offeringId: true },
  });
  if (!run) return;

  let overall: VerificationOutcome = 'SKIPPED';
  if (run.offeringId) {
    overall = await runForLoopRun(run.id);
  } else if (run.demandId) {
    overall = await runShadowDemandValidators(run.demandId);
  }

  await loopRunService.appendEvent(run.id, {
    type: 'VERIFICATION_RESULT',
    actorRef: 'system:verification',
    visibility: LoopEventVisibility.SYSTEM_ONLY,
    payload: { overall },
    idempotencyKey: `verify:${run.id}`,
  });
}

/**
 * @deprecated 易与 CLOSED 竞态；请用 verifyDemandShadowByRunId（由 shadowOnOrderConfirmed 串联）。
 * 保留给旧调用：找开放回再验证。
 */
export async function verifyDemandShadow(demandId: string): Promise<void> {
  const open = await loopRunService.findOpenByDemand(demandId);
  if (!open) return;
  await verifyDemandShadowByRunId(open.id);
}
