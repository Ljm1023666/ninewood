// 影子钩子 · 自然回
// 在现有 Demand/Order 生命周期中并行记账回；宪法：影子优先，绝不阻断主路径。
// 每个钩子本身可能抛错，调用方必须用 .catch 隔离（见 demand.service / order.service 注入点）。
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §4
import { LoopKind, LoopRunStatus, LoopEventVisibility } from '@prisma/client';
import { loopRunService } from './loop-run.service.js';
import { HUMAN_DEMAND_FULFILLMENT_CODE } from './builtin-loops.js';
import { verifyDemandShadowByRunId } from './verification.service.js';

// §4.1 需求创建后
export async function shadowOnDemandCreated(demand: {
  id: string;
  userId: string;
  title: string;
  paths: string[];
}): Promise<string> {
  const runId = await loopRunService.create({
    definitionCode: HUMAN_DEMAND_FULFILLMENT_CODE,
    loopKind: LoopKind.HUMAN,
    initiatorRef: `user:${demand.userId}`,
    inputJson: { title: demand.title, paths: demand.paths },
    demandId: demand.id,
  });
  await loopRunService.appendEvent(runId, {
    type: 'DEMAND_SHADOWED',
    actorRef: `user:${demand.userId}`,
    visibility: LoopEventVisibility.SYSTEM_ONLY,
    payload: { demandId: demand.id, title: demand.title },
  });
  return runId;
}

// §4.2 acceptApplicant 成功后
export async function shadowOnApplicantAccepted(
  demandId: string,
  requesterId: string,
  providerId: string,
  orderId: string,
): Promise<void> {
  let run = await loopRunService.findOpenByDemand(demandId);
  if (!run) {
    const id = await loopRunService.create({
      definitionCode: HUMAN_DEMAND_FULFILLMENT_CODE,
      loopKind: LoopKind.HUMAN,
      initiatorRef: `user:${requesterId}`,
      demandId,
    });
    run = { id };
  }
  await loopRunService.transition(run.id, LoopRunStatus.EXECUTING, {
    receiverRef: `user:${providerId}`,
    orderId,
  });
  await loopRunService.appendEvent(run.id, {
    type: 'HUMAN_MATCHED',
    actorRef: `user:${providerId}`,
    visibility: LoopEventVisibility.ACTOR,
    payload: { providerId, orderId },
  });
}

// §4.3 + Wave E · order.confirm 后串联：记账 → VERIFYING → 验证 → SUCCEEDED → CLOSED
// 验证必须在 CLOSED 之前（避免 findOpen 竞态）；验证失败只记事件，仍闭环（宪法 #3/#5）。
export async function shadowOnOrderConfirmed(
  demandId: string,
  orderId: string,
  summary: { price: number; serviceFee: number },
): Promise<void> {
  const run = await loopRunService.findOpenByDemand(demandId);
  if (!run) return; // 无关联回，跳过（不阻断结算）

  await loopRunService.appendEvent(run.id, {
    type: 'ORDER_SETTLED_SHADOW',
    actorRef: 'system:settlement',
    visibility: LoopEventVisibility.SYSTEM_ONLY,
    payload: { orderId, price: summary.price, serviceFee: summary.serviceFee },
  });
  await loopRunService.transition(run.id, LoopRunStatus.VERIFYING);

  // 验证异常吞掉为事件侧失败，绝不阻断后续 CLOSED
  try {
    await verifyDemandShadowByRunId(run.id);
  } catch (err) {
    console.error('[loop-shadow] verify during confirm failed (non-blocking)', demandId, err);
    try {
      await loopRunService.appendEvent(run.id, {
        type: 'VERIFICATION_RESULT',
        actorRef: 'system:verification',
        visibility: LoopEventVisibility.SYSTEM_ONLY,
        payload: { overall: 'ERROR', error: String((err as Error)?.message ?? err) },
        idempotencyKey: `verify:${run.id}`,
      });
    } catch {
      /* ignore */
    }
  }

  await loopRunService.transition(run.id, LoopRunStatus.SUCCEEDED);
  await loopRunService.transition(run.id, LoopRunStatus.CLOSED);
}

// §4.4 withdraw / cancel
export async function shadowOnLoopCancelled(demandId: string, reason: string): Promise<void> {
  const run = await loopRunService.findOpenByDemand(demandId);
  if (!run) return;
  await loopRunService.appendEvent(run.id, {
    type: 'LOOP_CANCELLED',
    actorRef: 'system',
    visibility: LoopEventVisibility.SYSTEM_ONLY,
    payload: { reason },
  });
  await loopRunService.transition(run.id, LoopRunStatus.CLOSED);
}
