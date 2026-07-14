// 验证契约服务 · 自然回
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §6 Wave E
import { prisma } from '../../lib/prisma.js';
import { LoopEventVisibility, LoopKind, LoopLinkRelation, LoopRunStatus, Prisma } from '@prisma/client';
import { getLoopExecutor } from './executors/index.js';
import { loopRunService } from './loop-run.service.js';

export type VerificationOutcome = 'PASSED' | 'FAILED' | 'ERROR' | 'INCONCLUSIVE' | 'SKIPPED';

const VERIFIER_BY_EARTH_CODE: Record<string, string> = {
  'builtin.earth.demand.structure': 'builtin.heaven.validate.demand_fields',
  'builtin.earth.demand.paths': 'builtin.heaven.validate.paths',
};

/**
 * 为内置地回 Offering 绑定验证契约（幂等）。
 * 至少把 builtin.heaven.validate.demand_fields 绑到一个 EARTH offering 上。
 */
export async function ensureVerificationContracts(): Promise<{ contracts: number }> {
  const offerings = await prisma.loopOffering.findMany({
    where: {
      status: 'ACTIVE',
      definition: { code: { in: Object.keys(VERIFIER_BY_EARTH_CODE) } },
    },
    include: { definition: { select: { code: true } } },
  });
  let contracts = 0;
  for (const offering of offerings) {
    const verifierCode = VERIFIER_BY_EARTH_CODE[offering.definition.code];
    const verifier = await prisma.capabilityEndpoint.findUnique({ where: { code: verifierCode } });
    if (!verifier) continue;
    await prisma.verificationContract.upsert({
      where: {
        offeringId_verifierEndpointId: {
          offeringId: offering.id,
          verifierEndpointId: verifier.id,
        },
      },
      create: {
        offeringId: offering.id,
        verifierEndpointId: verifier.id,
        claimSchema: {},
        isRequired: true,
      },
      update: { isRequired: true },
    });
    contracts++;
  }
  return { contracts };
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

  const outcomes: VerificationOutcome[] = [];

  for (const contract of contracts) {
    const code = contract.verifierEndpoint.code;
    const exec = getLoopExecutor(code);
    let status: VerificationOutcome = 'ERROR';
    let resultJson: Prisma.InputJsonValue = {};

    let verifierRunId: string | null = null;
    try {
      verifierRunId = await loopRunService.create({
        definitionCode: code,
        loopKind: LoopKind.HEAVEN,
        initiatorRef: 'system:verification',
        receiverRef: `endpoint:${contract.verifierEndpointId}`,
        parentRunId: run.id,
        correlationId: run.correlationId ?? run.id,
        inputJson: { parentRunId: run.id, contractId: contract.id },
      });
      await prisma.loopLink.create({
        data: {
          sourceRunId: run.id,
          targetRunId: verifierRunId,
          relation: LoopLinkRelation.VERIFY,
          meta: { contractId: contract.id },
        },
      });
      await loopRunService.transition(verifierRunId, LoopRunStatus.EXECUTING);
      await loopRunService.appendEvent(verifierRunId, {
        type: 'VERIFICATION_STARTED',
        actorRef: 'system:verification',
        visibility: LoopEventVisibility.ACTOR,
        payload: { parentRunId: run.id, contractId: contract.id },
      });
      if (!exec) {
        status = 'SKIPPED';
      } else {
        const fields =
          run.actualOutcome && typeof run.actualOutcome === 'object'
            ? run.actualOutcome
            : run.inputJson;
        const r = await exec.execute(
          { demandId: run.demandId ?? undefined, fields, loopRunId },
          { loopRunId: verifierRunId },
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

    if (verifierRunId) {
      await loopRunService.appendEvent(verifierRunId, {
        type: 'VERIFICATION_RESULT',
        actorRef: 'system:verification',
        visibility: LoopEventVisibility.ACTOR,
        payload: { status, result: resultJson },
      });
      await loopRunService.transition(
        verifierRunId,
        status === 'PASSED'
          ? LoopRunStatus.SUCCEEDED
          : status === 'FAILED'
            ? LoopRunStatus.FAILED
            : LoopRunStatus.INCONCLUSIVE,
        { actualOutcome: resultJson },
      );
    }

    outcomes.push(status);
  }

  const overall: VerificationOutcome = outcomes.includes('FAILED')
    ? 'FAILED'
    : outcomes.every((status) => status === 'PASSED')
      ? 'PASSED'
      : outcomes.includes('ERROR')
        ? 'ERROR'
        : outcomes.includes('INCONCLUSIVE')
          ? 'INCONCLUSIVE'
          : 'SKIPPED';

  await updateOfferingMetrics(run.offeringId!, overall === 'PASSED');

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
export async function verifyDemandShadowByRunId(loopRunId: string): Promise<VerificationOutcome> {
  const run = await prisma.loopRun.findUnique({
    where: { id: loopRunId },
    select: { id: true, demandId: true, offeringId: true },
  });
  if (!run) return 'SKIPPED';

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
  return overall;
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
