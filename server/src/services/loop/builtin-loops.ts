// 内置回定义种子 · 自然回（幂等）
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §5
import { prisma } from '../../lib/prisma.js';
import {
  LoopKind,
  ParticipantKind,
  LoopExecutionMode,
  CapabilityHostMode,
  CapabilityHealth,
} from '@prisma/client';

/** 人回影子模板 code：需求创建时自动关联的 LoopDefinition */
export const HUMAN_DEMAND_FULFILLMENT_CODE = 'human.demand.fulfillment';

export interface BuiltinDefinitionSpec {
  code: string;
  name: string;
  description?: string;
  loopKind: LoopKind;
  initiatorKind: ParticipantKind;
  receiverKind: ParticipantKind;
  executionMode: LoopExecutionMode;
  /** 是否生成 SYSTEM 能力接口 + 上架物（地回/天回工具）。人回模板不生成。 */
  hasEndpoint?: boolean;
  /** 上架物标题/摘要（当 hasEndpoint 时必填） */
  offeringTitle?: string;
  offeringSummary?: string;
  /** 测试期模拟指标（展示用；幂等 seed 会回写） */
  demoMetrics?: {
    dealRate: number;
    avgDurationMs: number;
    recentSuccessN: number;
    recentTotalN: number;
  };
}

/** 测试期演示指标：让列表/详情有可展示数字（非真实生产统计） */
const DEMO = {
  structure: { dealRate: 0.72, avgDurationMs: 1840, recentSuccessN: 86, recentTotalN: 100 },
  paths: { dealRate: 0.81, avgDurationMs: 420, recentSuccessN: 94, recentTotalN: 100 },
  media: { dealRate: 0.55, avgDurationMs: 3200, recentSuccessN: 41, recentTotalN: 68 },
  cover: { dealRate: 0.48, avgDurationMs: 5100, recentSuccessN: 29, recentTotalN: 52 },
  fields: { dealRate: 0.91, avgDurationMs: 180, recentSuccessN: 198, recentTotalN: 210 },
  pathValidate: { dealRate: 0.88, avgDurationMs: 95, recentSuccessN: 176, recentTotalN: 190 },
  attach: { dealRate: 0.79, avgDurationMs: 640, recentSuccessN: 112, recentTotalN: 130 },
  wallet: { dealRate: 0.96, avgDurationMs: 210, recentSuccessN: 240, recentTotalN: 248 },
  ping: { dealRate: 0.99, avgDurationMs: 48, recentSuccessN: 990, recentTotalN: 1000 },
} as const;

export const BUILTIN_DEFINITIONS: BuiltinDefinitionSpec[] = [
  {
    // 人回影子模板：需求创建时自动关联，不生成能力接口
    code: HUMAN_DEMAND_FULFILLMENT_CODE,
    name: '需求履约（人回）',
    description: '需求方发起、服务方承接的人际闭环影子模板（不生成能力接口）',
    loopKind: LoopKind.HUMAN,
    initiatorKind: ParticipantKind.HUMAN,
    receiverKind: ParticipantKind.HUMAN,
    executionMode: LoopExecutionMode.MANUAL,
    hasEndpoint: false,
  },

  // ── 地回（人 ↔ 接口） ────────────────────────────────────────────────
  {
    code: 'builtin.earth.demand.structure',
    name: '需求结构化',
    description: '口语→字段（轻量规则+可选 LLM 增强，提取标题/描述/预算/路径）',
    loopKind: LoopKind.EARTH,
    initiatorKind: ParticipantKind.HUMAN,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.HYBRID,
    hasEndpoint: true,
    offeringTitle: '需求智能结构化',
    offeringSummary: '把一段口语描述自动整理成标准需求字段，便于检索与接单。',
    demoMetrics: DEMO.structure,
  },
  {
    code: 'builtin.earth.demand.paths',
    name: '路径生成',
    description: '字段→paths（调现有 derivePaths）',
    loopKind: LoopKind.EARTH,
    initiatorKind: ParticipantKind.HUMAN,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '自动生成检索路径',
    offeringSummary: '根据需求字段自动生成可检索的 path（tag:/cat:/rgn:），提升曝光。',
    demoMetrics: DEMO.paths,
  },
  {
    code: 'builtin.earth.media.normalize',
    name: '附件标准化',
    description: '规范化附件清单：去查询参数、识别扩展名/MIME/类型、探测可达性',
    loopKind: LoopKind.EARTH,
    initiatorKind: ParticipantKind.HUMAN,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '附件标准化',
    offeringSummary: '统一附件格式与资源地址，便于展示与审核。',
    demoMetrics: DEMO.media,
  },
  {
    code: 'builtin.earth.demand.card_cover',
    name: '需求卡视觉',
    description: '依据标题生成确定性 SVG 封面（data URI），对需求运行时写回 coverImage',
    loopKind: LoopKind.EARTH,
    initiatorKind: ParticipantKind.HUMAN,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '需求卡封面生成',
    offeringSummary: '自动为需求卡生成封面视觉。',
    demoMetrics: DEMO.cover,
  },

  // ── 天回（接口 ↔ 接口，验证/监管桩） ──────────────────────────────────
  {
    code: 'builtin.heaven.validate.demand_fields',
    name: '需求字段验证器',
    description: '校验 title/description/minPrice 规则',
    loopKind: LoopKind.HEAVEN,
    initiatorKind: ParticipantKind.INTERFACE,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '需求字段合规校验',
    offeringSummary: '系统自动校验需求的标题/描述/最低价是否合规。',
    demoMetrics: DEMO.fields,
  },
  {
    code: 'builtin.heaven.validate.paths',
    name: '路径可检索性验证',
    description: 'paths 非空且 codec 合法',
    loopKind: LoopKind.HEAVEN,
    initiatorKind: ParticipantKind.INTERFACE,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '路径可检索性校验',
    offeringSummary: '系统自动校验需求的检索路径是否非空且编码合法。',
    demoMetrics: DEMO.pathValidate,
  },
  {
    code: 'builtin.heaven.validate.attachment_safety',
    name: '附件安全',
    description: '扩展名白名单/黑名单安全扫描，命中高危扩展名即 FAILED',
    loopKind: LoopKind.HEAVEN,
    initiatorKind: ParticipantKind.INTERFACE,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '附件安全扫描',
    offeringSummary: '系统自动对附件做安全扫描（扩展名白名单/黑名单）。',
    demoMetrics: DEMO.attach,
  },
  {
    code: 'builtin.heaven.validate.order_wallet_consistency',
    name: '订单钱包一致性',
    description: '读 Order+WalletLedger 比对 agreedPrice 与流水绝对值，只读不改账',
    loopKind: LoopKind.HEAVEN,
    initiatorKind: ParticipantKind.INTERFACE,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '订单-钱包一致性校验',
    offeringSummary: '系统自动校验订单与结算记录的一致性（只读，不改账）。',
    demoMetrics: DEMO.wallet,
  },
  {
    code: 'builtin.heaven.health.endpoint_ping',
    name: '接口健康检查',
    description: 'EXTERNAL_API 则 HTTP HEAD/GET 超时 3s；PLATFORM_HOSTED 直接 ONLINE',
    loopKind: LoopKind.HEAVEN,
    initiatorKind: ParticipantKind.INTERFACE,
    receiverKind: ParticipantKind.INTERFACE,
    executionMode: LoopExecutionMode.AUTOMATED,
    hasEndpoint: true,
    offeringTitle: '接口健康检查',
    offeringSummary: '系统自动对能力接口做健康检查，保障可用性。',
    demoMetrics: DEMO.ping,
  },
];

/**
 * 幂等种子：确保内置回定义 / 能力接口 / 上架物存在。
 * 重复执行不会产生重复 code（依赖 @unique code 的 upsert）；
 * 上架物按 (definitionId, title) 去重。
 */
export async function seedBuiltinLoops(): Promise<{
  definitions: number;
  endpoints: number;
  offerings: number;
}> {
  let defCount = 0;
  let epCount = 0;
  let offCount = 0;

  for (const spec of BUILTIN_DEFINITIONS) {
    const def = await prisma.loopDefinition.upsert({
      where: { code: spec.code },
      create: {
        code: spec.code,
        name: spec.name,
        description: spec.description ?? null,
        loopKind: spec.loopKind,
        initiatorKind: spec.initiatorKind,
        receiverKind: spec.receiverKind,
        executionMode: spec.executionMode,
        isBuiltin: true,
        isPublic: true,
      },
      update: {
        name: spec.name,
        description: spec.description ?? null,
        loopKind: spec.loopKind,
        initiatorKind: spec.initiatorKind,
        receiverKind: spec.receiverKind,
        executionMode: spec.executionMode,
      },
    });
    defCount++;

    if (!spec.hasEndpoint) continue;

    const endpoint = await prisma.capabilityEndpoint.upsert({
      where: { code: spec.code },
      create: {
        code: spec.code,
        name: spec.name,
        ownerType: 'SYSTEM',
        ownerId: null,
        hostMode: CapabilityHostMode.PLATFORM_HOSTED,
        executionMode: spec.executionMode,
        paths: [],
        healthStatus: CapabilityHealth.ONLINE,
        successRatePublic: false,
      },
      update: {
        name: spec.name,
        hostMode: CapabilityHostMode.PLATFORM_HOSTED,
        executionMode: spec.executionMode,
      },
    });
    epCount++;

    const metrics = spec.demoMetrics;
    const metricPatch = metrics
      ? {
          dealRate: metrics.dealRate,
          avgDurationMs: metrics.avgDurationMs,
          recentSuccessN: metrics.recentSuccessN,
          recentTotalN: metrics.recentTotalN,
          // 测试期：用样本成功率填内部字段，便于后续 admin 查看
          internalSuccessRate:
            metrics.recentTotalN > 0
              ? Math.round((metrics.recentSuccessN / metrics.recentTotalN) * 1000) / 1000
              : null,
        }
      : {};

    const existing = await prisma.loopOffering.findFirst({
      where: { definitionId: def.id, title: spec.offeringTitle! },
    });
    if (!existing) {
      await prisma.loopOffering.create({
        data: {
          definitionId: def.id,
          endpointId: endpoint.id,
          title: spec.offeringTitle!,
          summary: spec.offeringSummary ?? null,
          paths: [],
          status: 'ACTIVE',
          requiresVerification: false,
          ...metricPatch,
        },
      });
      offCount++;
    } else if (metrics) {
      // 幂等回写演示指标（测试期空表/零值可被刷新）
      await prisma.loopOffering.update({
        where: { id: existing.id },
        data: metricPatch,
      });
    }
  }

  return { definitions: defCount, endpoints: epCount, offerings: offCount };
}
