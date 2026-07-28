// 天回自动运行服务 · 自然回（接口 → 接口，系统自动）
// 任务：NATURAL-LOOP-NAVIGATION-DOWNGRADE.md —— 把平台内置自动能力归入天回，
// 并让它们真正按周期自动运行，把运行状态写入 /loops（LoopRun + LoopEvent + 计数）。
//
// 设计要点：
// - 复用现有 LoopDefinition / LoopOffering / LoopRun / LoopEvent（不新增模型，数据库零迁移）。
// - 每个天回能力都是真实检测逻辑（读库统计 / 巡检），不伪造结果。
// - 自动运行写入 LoopRun（initiatorRef = system:<code>），并回写 offering 的成功/总次数。
// - 不改变原有业务表（订单/认证/福利/圈子）的任何状态：天回只“检测并上报”，
//   真正的事务性变更仍由各 cron / 影子钩子负责（宪法 #5：影子优先、不改主流程）。
import { prisma } from '../../lib/prisma.js';
import { withSchedulerLease } from '../scheduler-lease.service.js';
import type { Prisma } from '@prisma/client';
import {
  LoopKind,
  LoopRunStatus,
  LoopEventVisibility,
  ParticipantKind,
  LoopExecutionMode,
  CapabilityHealth,
  CapabilityHostMode,
} from '@prisma/client';
import { getLoopExecutor, registerLoopExecutor } from './executors/index.js';
import { getRecipe } from './composition.service.js';
import { loopRunService } from './loop-run.service.js';

export type HeavenRunStatus = 'SUCCEEDED' | 'FAILED' | 'INCONCLUSIVE';

export interface HeavenCapabilityResult {
  status: HeavenRunStatus;
  summary: string;
  detail: Record<string, unknown>;
}

export interface HeavenCapability {
  /** LoopDefinition.code / 执行器注册键 */
  code: string;
  name: string;
  description: string;
  /** 触发方式（人类可读） */
  trigger: string;
  /** 执行周期（毫秒） */
  intervalMs: number;
  /** 真实检测逻辑 */
  run: () => Promise<HeavenCapabilityResult>;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * 天回自动能力清单。
 * 每一项都对应文档里“应建模为天回”的自动能力；逻辑尽量读库统计 / 巡检，
 * 不修改业务主表（只检测、只上报），确保不伪造完成、不动原有业务状态。
 */
export const HEAVEN_CAPABILITIES: HeavenCapability[] = [
  {
    code: 'builtin.heaven.monitor.system_health',
    name: '系统健康监控',
    description: '定时探测数据库与核心服务连通性，统计关键实体规模。',
    trigger: '每 60 秒自动探测',
    intervalMs: 60 * 1000,
    run: async () => {
      await prisma.$queryRaw`SELECT 1`;
      const [demands, orders, users, circles] = await Promise.all([
        prisma.demand.count(),
        prisma.order.count(),
        prisma.user.count(),
        prisma.circle.count(),
      ]);
      return {
        status: 'SUCCEEDED',
        summary: '数据库与核心服务在线',
        detail: { demands, orders, users, circles },
      };
    },
  },
  {
    code: 'builtin.heaven.monitor.service_availability',
    name: '服务可用性检测',
    description: '对平台托管的能力接口做健康检查，更新健康状态。',
    trigger: '每 120 秒自动巡检',
    intervalMs: 120 * 1000,
    run: async () => {
      const endpoints = await prisma.capabilityEndpoint.findMany({
        select: { id: true, code: true, hostMode: true, healthStatus: true },
      });
      const now = new Date();
      const platformHosted = endpoints.filter((e) => e.hostMode === 'PLATFORM_HOSTED');
      const isRunnablePlatformCapability = (code: string) =>
        Boolean(getLoopExecutor(code) || getRecipe(code));
      for (const endpoint of platformHosted) {
        await prisma.capabilityEndpoint.update({
          where: { id: endpoint.id },
          data: {
            // 组合大回无 recipe 编排、无单步 executor；不得标成 UNKNOWN 挤出推荐池
            healthStatus: isRunnablePlatformCapability(endpoint.code)
              ? CapabilityHealth.ONLINE
              : CapabilityHealth.UNKNOWN,
            healthCheckedAt: now,
          },
        });
      }
      const external = endpoints.filter((e) => e.hostMode === 'EXTERNAL_API');
      const unknown = platformHosted.filter((e) => !isRunnablePlatformCapability(e.code)).length;
      const offline = external.filter(
        (e) => e.healthStatus === 'OFFLINE' || e.healthStatus === 'UNKNOWN',
      ).length;
      return {
        status: unknown > 0 || offline > 0 ? 'INCONCLUSIVE' : 'SUCCEEDED',
        summary: `已巡检 ${endpoints.length} 个能力接口`,
        detail: {
          total: endpoints.length,
          platformHosted: platformHosted.length,
          external: external.length,
          unknown,
          offline,
        },
      };
    },
  },
  {
    code: 'builtin.heaven.tag.auto_stats',
    name: '标签自动统计',
    description: '自动统计标签确认率与 AI 标签覆盖，更新分类热度。',
    trigger: '每 5 分钟自动统计',
    intervalMs: 5 * 60 * 1000,
    run: async () => {
      const [total, confirmed, withAi] = await Promise.all([
        prisma.demand.count(),
        prisma.demand.count({ where: { tagsConfirmed: true } }),
        prisma.demand.count({ where: { aiTags: { isEmpty: false } } }),
      ]);
      return {
        status: 'SUCCEEDED',
        summary: `已统计 ${total} 条需求的标签`,
        detail: { total, tagsConfirmed: confirmed, withAiTags: withAi },
      };
    },
  },
  {
    code: 'builtin.heaven.path.index_maintain',
    name: '路径覆盖率检测',
    description: '自动检测缺少检索路径的需求并计算覆盖率，不直接修改需求数据。',
    trigger: '每 5 分钟自动检测',
    intervalMs: 5 * 60 * 1000,
    run: async () => {
      const [missing, total] = await Promise.all([
        prisma.demand.count({ where: { paths: { isEmpty: true }, isExample: false } }),
        prisma.demand.count({ where: { isExample: false } }),
      ]);
      const coverage = total ? Math.round(((total - missing) / total) * 100) : 100;
      return {
        status: 'SUCCEEDED',
        summary: `路径覆盖率 ${coverage}%`,
        detail: { missingPaths: missing, total, coverage },
      };
    },
  },
  {
    code: 'builtin.heaven.cert.auto_check',
    name: '认证自动检查',
    description: '自动检查已认证服务者的材料完整度，发现需复核的异常。',
    trigger: '每 10 分钟自动检查',
    intervalMs: 10 * 60 * 1000,
    run: async () => {
      const [certified, needsReview] = await Promise.all([
        prisma.certifiedProvider.count(),
        prisma.certifiedProvider.count({ where: { tags: { isEmpty: true } } }),
      ]);
      return {
        status: 'SUCCEEDED',
        summary: `已认证 ${certified} 位服务者`,
        detail: { certified, needsReview },
      };
    },
  },
  {
    code: 'builtin.heaven.order.timeout_detect',
    name: '订单超时检测',
    description: '自动检测超过 7 天仍进行中的订单，提示超时风险。',
    trigger: '每 5 分钟自动检测',
    intervalMs: 5 * 60 * 1000,
    run: async () => {
      const since = new Date(Date.now() - 7 * DAY);
      const timedOut = await prisma.order.count({
        where: { status: 'IN_PROGRESS', createdAt: { lt: since } },
      });
      return {
        status: 'SUCCEEDED',
        summary: `发现 ${timedOut} 笔超时订单`,
        detail: { timedOut, thresholdDays: 7 },
      };
    },
  },
  {
    code: 'builtin.heaven.order.auto_settle',
    name: '待结算订单检测',
    description: '自动发现等待复核的订单并上报待结算数量，不直接改变订单或账务状态。',
    trigger: '每 5 分钟自动检测',
    intervalMs: 5 * 60 * 1000,
    run: async () => {
      const pending = await prisma.order.count({ where: { status: 'WAITING_REVIEW' } });
      return {
        status: 'SUCCEEDED',
        summary: `待结算订单 ${pending} 笔`,
        detail: { pendingSettlement: pending },
      };
    },
  },
  {
    code: 'builtin.heaven.welfare.auto_grant',
    name: '激励资格检测',
    description: '自动发现进行中的公益需求并统计激励候选，不直接发放奖励。',
    trigger: '每 10 分钟自动判定',
    intervalMs: 10 * 60 * 1000,
    run: async () => {
      const open = await prisma.demand.count({
        where: {
          isPublicWelfare: true,
          lifecycleStage: { in: ['ACTIVE', 'NO_COVER', 'NO_DETAIL'] },
        },
      });
      return {
        status: 'SUCCEEDED',
        summary: `进行中公益需求 ${open} 条`,
        detail: { openWelfareDemands: open },
      };
    },
  },
  {
    code: 'builtin.heaven.circle.activity',
    name: '圈子活跃度检测',
    description: '自动检测低活跃圈子，提醒圈主处理异常。',
    trigger: '每 10 分钟自动检测',
    intervalMs: 10 * 60 * 1000,
    run: async () => {
      const [low, total] = await Promise.all([
        prisma.circle.count({ where: { activeScore: { lt: 0.2 } } }),
        prisma.circle.count(),
      ]);
      return {
        status: 'SUCCEEDED',
        summary: `低活跃圈子 ${low}/${total}`,
        detail: { lowActivity: low, total },
      };
    },
  },
  {
    code: 'builtin.heaven.push.scheduled',
    name: '推送条件检测',
    description: '自动统计可推送用户与即将到期的需求，不直接替代推送业务流程。',
    trigger: '每 5 分钟自动检测',
    intervalMs: 5 * 60 * 1000,
    run: async () => {
      const [optIn, expiringSoon] = await Promise.all([
        prisma.pushPreference.count({ where: { receivePushes: true } }),
        prisma.demand.count({
          where: {
            expireAt: { lt: new Date(Date.now() + DAY) },
            status: 'PENDING',
            isExample: false,
          },
        }),
      ]);
      return {
        status: 'SUCCEEDED',
        summary: `可推送 ${optIn} · 24h 内到期 ${expiringSoon}`,
        detail: { optIn, expiringSoon },
      };
    },
  },
  {
    code: 'builtin.heaven.automation.tasks',
    name: '自动化任务到期检测',
    description: '自动发现到期任务并上报待运行数量，实际任务由任务调度器执行。',
    trigger: '每 60 秒自动检测',
    intervalMs: 60 * 1000,
    run: async () => {
      const now = new Date();
      const due = await prisma.agentTask.count({
        where: { enabled: true, nextRunAt: { lte: now } },
      });
      return {
        status: 'SUCCEEDED',
        summary: `待运行自动化任务 ${due} 个`,
        detail: { dueTasks: due },
      };
    },
  },
];

/** 资源写入后立即触发的只读天回校验，不参与周期调度。 */
export const RESOURCE_HEAVEN_CODES = [
  'builtin.heaven.validate.demand_fields',
  'builtin.heaven.validate.paths',
  'builtin.heaven.validate.attachment_safety',
  'builtin.heaven.validate.order_wallet_consistency',
  'builtin.heaven.health.endpoint_ping',
] as const;

export const TRIGGER_BY_CODE: Record<string, string> = Object.fromEntries(
  HEAVEN_CAPABILITIES.map((c) => [c.code, c.trigger]),
);

// ── 幂等种子：确保天回能力的 LoopDefinition + 能力接口 + 上架物存在 ──────
export async function seedHeavenCapabilities(): Promise<{ definitions: number; endpoints: number; offerings: number }> {
  let defCount = 0;
  let epCount = 0;
  let offCount = 0;

  for (const cap of HEAVEN_CAPABILITIES) {
    const def = await prisma.loopDefinition.upsert({
      where: { code: cap.code },
      create: {
        code: cap.code,
        name: cap.name,
        description: cap.description,
        loopKind: LoopKind.HEAVEN,
        initiatorKind: ParticipantKind.INTERFACE,
        receiverKind: ParticipantKind.INTERFACE,
        executionMode: LoopExecutionMode.AUTOMATED,
        isBuiltin: true,
        isPublic: true,
      },
      update: {
        name: cap.name,
        description: cap.description,
        loopKind: LoopKind.HEAVEN,
        executionMode: LoopExecutionMode.AUTOMATED,
      },
    });
    defCount++;

    const endpoint = await prisma.capabilityEndpoint.upsert({
      where: { code: cap.code },
      create: {
        code: cap.code,
        name: cap.name,
        ownerType: 'SYSTEM',
        ownerId: null,
        hostMode: CapabilityHostMode.PLATFORM_HOSTED,
        executionMode: LoopExecutionMode.AUTOMATED,
        paths: [],
        healthStatus: CapabilityHealth.ONLINE,
        successRatePublic: false,
      },
      update: {
        name: cap.name,
        executionMode: LoopExecutionMode.AUTOMATED,
      },
    });
    epCount++;

    const existingCandidates = await prisma.loopOffering.findMany({
      where: { definitionId: def.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const existing = existingCandidates[0];
    if (!existing) {
      await prisma.loopOffering.create({
        data: {
          definitionId: def.id,
          endpointId: endpoint.id,
          title: cap.name,
          summary: cap.description,
          paths: [],
          status: 'ACTIVE',
          requiresVerification: false,
        },
      });
      offCount++;
    } else {
      const duplicateIds = existingCandidates.slice(1).map((item) => item.id);
      if (duplicateIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.loopRun.updateMany({
            where: { offeringId: { in: duplicateIds } },
            data: { offeringId: existing.id },
          });
          await tx.verificationContract.deleteMany({
            where: { offeringId: { in: duplicateIds } },
          });
          await tx.loopOffering.deleteMany({ where: { id: { in: duplicateIds } } });
        });
      }
      await prisma.loopOffering.update({
        where: { id: existing.id },
        data: {
          endpointId: endpoint.id,
          title: cap.name,
          summary: cap.description,
          status: 'ACTIVE',
        },
      });
    }
  }

  return { definitions: defCount, endpoints: epCount, offerings: offCount };
}

// ── 注册执行器：让天回能力也能被用户手动运行（POST /offerings/:id/run） ──
export function registerHeavenExecutors(): void {
  for (const cap of HEAVEN_CAPABILITIES) {
    registerLoopExecutor({
      definitionCode: cap.code,
      async execute() {
        const r = await cap.run();
        return { status: r.status, outcome: { summary: r.summary, ...r.detail } };
      },
    });
  }
}

async function resolveOffering(code: string): Promise<{ offeringId: string; definitionId: string } | null> {
  const def = await prisma.loopDefinition.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!def) return null;
  const offering = await prisma.loopOffering.findFirst({
    where: { definitionId: def.id },
    select: { id: true },
  });
  if (!offering) return null;
  return { offeringId: offering.id, definitionId: def.id };
}

/**
 * 运行单个天回能力：创建 LoopRun、记录事件、回写成功/总次数。
 * 失败不会中断调度器（由调用方 catch）。
 */
export async function runHeavenCapability(
  code: string,
  input: Record<string, unknown> = {},
): Promise<void> {
  const cap = HEAVEN_CAPABILITIES.find((c) => c.code === code);
  const executor = getLoopExecutor(code);
  if (!cap && !RESOURCE_HEAVEN_CODES.includes(code as (typeof RESOURCE_HEAVEN_CODES)[number])) {
    throw Object.assign(new Error(`天回能力不存在: ${code}`), { status: 400 });
  }
  if (!cap && !executor) {
    throw Object.assign(new Error(`资源天回执行器未注册: ${code}`), { status: 500 });
  }

  const resolved = await resolveOffering(code);
  if (!resolved) {
    throw Object.assign(new Error(`天回能力未播种: ${code}`), { status: 500 });
  }

  const startedAt = Date.now();
  const runId = await loopRunService.create({
    definitionCode: code,
    loopKind: LoopKind.HEAVEN,
    initiatorRef: `system:${code}`,
    offeringId: resolved.offeringId,
    inputJson: {
      trigger: cap?.trigger ?? '资源写入后自动触发',
      input: input as Prisma.InputJsonValue,
    },
  });

  await loopRunService.appendEvent(runId, {
    type: 'HEAVEN_RUN_STARTED',
    actorRef: `system:${code}`,
    visibility: LoopEventVisibility.SYSTEM_ONLY,
    payload: {
      trigger: cap?.trigger ?? '资源写入后自动触发',
      input: input as Prisma.InputJsonValue,
    },
    idempotencyKey: 'start',
  });
  await loopRunService.transition(runId, LoopRunStatus.EXECUTING);

  let status: LoopRunStatus = LoopRunStatus.FAILED;
  let summary = '';
  let detail: Record<string, unknown> = {};
  try {
    let result: HeavenCapabilityResult;
    if (cap) {
      result = await cap.run();
    } else {
      const execution = await executor!.execute(input, { loopRunId: runId });
      const outcome =
        execution.outcome && typeof execution.outcome === 'object' && !Array.isArray(execution.outcome)
          ? (execution.outcome as Record<string, unknown>)
          : { outcome: execution.outcome };
      result = {
        status: execution.status,
        summary: `资源校验${execution.status === 'SUCCEEDED' ? '通过' : '完成'}`,
        detail: outcome,
      };
    }
    status =
      result.status === 'SUCCEEDED'
        ? LoopRunStatus.SUCCEEDED
        : result.status === 'INCONCLUSIVE'
          ? LoopRunStatus.INCONCLUSIVE
          : LoopRunStatus.FAILED;
    summary = result.summary;
    detail = result.detail;
  } catch (err: any) {
    status = LoopRunStatus.FAILED;
    summary = '能力执行异常';
    detail = { error: err?.message || String(err) };
  }

  await loopRunService.transition(runId, status, {
    actualOutcome: { summary, ...detail },
  });
  await loopRunService.appendEvent(runId, {
    type: 'HEAVEN_RUN_RESULT',
    actorRef: `system:${code}`,
    visibility: LoopEventVisibility.SYSTEM_ONLY,
    payload: { status, summary, ...detail },
    idempotencyKey: 'result',
  });

  const elapsed = Date.now() - startedAt;
  await prisma.loopOffering.update({
    where: { id: resolved.offeringId },
    data: {
      recentTotalN: { increment: 1 },
      ...(status === LoopRunStatus.SUCCEEDED ? { recentSuccessN: { increment: 1 } } : {}),
      avgDurationMs: Math.round(elapsed),
    },
  });
}

export function triggerResourceHeaven(
  code: (typeof RESOURCE_HEAVEN_CODES)[number],
  input: Record<string, unknown>,
): void {
  void runHeavenCapability(code, input).catch((err) => {
    console.error(`[Heaven] 资源校验 ${code} 触发失败:`, err?.message || err);
  });
}

let schedulerStarted = false;

/** 启动天回自动调度（幂等）。在 startAllCronJobs 中调用一次。 */
export function startHeavenScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // 先确保定义/上架物存在
  seedHeavenCapabilities()
    .then((s) => console.log(`[Heaven] seeded ${s.definitions} 定义 / ${s.offerings} 上架物`))
    .catch((err) => console.error('[Heaven] seed failed', err));

  // 注册执行器（供手动运行）
  registerHeavenExecutors();

  for (const cap of HEAVEN_CAPABILITIES) {
    const tick = () => {
      withSchedulerLease(`heaven:${cap.code}`, Math.max(cap.intervalMs, 60_000), () => runHeavenCapability(cap.code)).catch((err) =>
        console.error(`[Heaven] ${cap.code} 运行失败:`, err?.message || err),
      );
    };
    // 立即跑一次健康/调度类，其余按周期
    if (cap.code === 'builtin.heaven.monitor.system_health' || cap.code === 'builtin.heaven.automation.tasks') {
      setTimeout(tick, 3000);
    }
    setInterval(tick, cap.intervalMs);
  }
  console.log('[Heaven] 天回自动调度已启动');
}

/**
 * 聚合天回能力清单（含最新一次运行、计数、触发方式、阶段）。
 * 提供给 /loops 作为系统自动能力的运行状态看板。
 */
export async function listHeavenCapabilities(): Promise<
  Array<{
    id: string;
    title: string;
    summary: string | null;
    definitionCode: string;
    trigger: string;
    stage: string;
    status: string;
    successCount: number;
    failCount: number;
    runCount: number;
    lastRunAt: string | null;
    lastResult: string | null;
    endpointHealth: string | null;
  }>
> {
  const offerings = await prisma.loopOffering.findMany({
    where: { definition: { loopKind: LoopKind.HEAVEN }, status: { not: 'DELISTED' } },
    include: {
      definition: { select: { code: true, name: true, description: true } },
      endpoint: { select: { healthStatus: true } },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const items = [];
  for (const o of offerings) {
    const latest = await prisma.loopRun.findFirst({
      where: { offeringId: o.id },
      orderBy: { startedAt: 'desc' },
      select: {
        status: true,
        startedAt: true,
        actualOutcome: true,
      },
    });

    const status = latest?.status ?? 'IDLE';
    const [successCount, failCount] = await Promise.all([
      prisma.loopRun.count({ where: { offeringId: o.id, status: LoopRunStatus.SUCCEEDED } }),
      prisma.loopRun.count({
        where: {
          offeringId: o.id,
          status: { in: [LoopRunStatus.FAILED, LoopRunStatus.INCONCLUSIVE] },
        },
      }),
    ]);
    const runCount = successCount + failCount + (o._count.runs - successCount - failCount);
    const actualOutcome = (latest?.actualOutcome as Record<string, unknown> | null) ?? null;
    const lastResult =
      typeof actualOutcome?.summary === 'string'
        ? (actualOutcome.summary as string)
        : status === 'IDLE'
          ? '尚未运行'
          : null;

    items.push({
      id: o.id,
      title: o.title,
      summary: o.summary,
      definitionCode: o.definition.code,
      trigger: TRIGGER_BY_CODE[o.definition.code] ?? '自动运行',
      stage: statusLabel(status),
      status,
      successCount,
      failCount,
      runCount,
      lastRunAt: latest?.startedAt ? (latest.startedAt as unknown as string) : null,
      lastResult,
      endpointHealth: o.endpoint?.healthStatus ?? null,
    });
  }
  return items;
}

function statusLabel(status: string): string {
  return (
    {
      IDLE: '待运行',
      TRIGGERED: '已触发',
      MATCHING: '匹配中',
      EXECUTING: '运行中',
      WAITING_HUMAN: '等待人工',
      VERIFYING: '核验中',
      SUCCEEDED: '已成功',
      FAILED: '失败',
      INCONCLUSIVE: '待确认',
      COMPENSATING: '补偿中',
      CLOSED: '已结束',
    }[status] ?? status
  );
}
