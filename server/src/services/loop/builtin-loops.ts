// 内置回定义种子 · 自然回（幂等）
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §5
import { prisma } from '../../lib/prisma.js';
import {
  LoopKind,
  ParticipantKind,
  LoopExecutionMode,
  CapabilityHostMode,
  CapabilityHealth,
  Prisma,
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
  capabilityPaths?: string[];
  inputSchema?: Record<string, unknown>;
  outcomeSchema?: Record<string, unknown>;
  verifierCode?: string;
}

const TEXT_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 2, description: '需求标题' },
    description: { type: 'string', minLength: 2, description: '自然语言需求描述' },
    minPrice: { type: 'number', minimum: 0, description: '最低预算' },
  },
  anyOf: [{ required: ['title'] }, { required: ['description'] }],
  additionalProperties: true,
} as const;

const STRUCTURED_OUTCOME_SCHEMA = {
  type: 'object',
  required: ['title', 'description', 'paths'],
  properties: {
    title: { type: 'string', minLength: 2 },
    description: { type: 'string', minLength: 2 },
    minPrice: { type: ['number', 'null'], minimum: 0 },
    paths: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: true,
} as const;

const PATH_OUTCOME_SCHEMA = {
  type: 'object',
  required: ['paths', 'count'],
  properties: {
    paths: { type: 'array', minItems: 1, items: { type: 'string', minLength: 3 } },
    count: { type: 'integer', minimum: 1 },
  },
  additionalProperties: true,
} as const;

// 旧版 seed 曾持续写入这些演示统计。仅当整组数值仍与已知演示元组完全一致时清理，
// 避免覆盖已经产生的真实运行数据；清理后后续 seed 不再写入任何指标。
const LEGACY_DEMO_METRICS: Record<string, [number, number, number, number]> = {
  'builtin.earth.demand.structure': [0.72, 1840, 86, 100],
  'builtin.earth.demand.paths': [0.81, 420, 94, 100],
  'builtin.earth.media.normalize': [0.55, 3200, 41, 68],
  'builtin.earth.demand.card_cover': [0.48, 5100, 29, 52],
  'builtin.heaven.validate.demand_fields': [0.91, 180, 198, 210],
  'builtin.heaven.validate.paths': [0.88, 95, 176, 190],
  'builtin.heaven.validate.attachment_safety': [0.79, 640, 112, 130],
  'builtin.heaven.validate.order_wallet_consistency': [0.96, 210, 240, 248],
  'builtin.heaven.health.endpoint_ping': [0.99, 48, 990, 1000],
};

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
    capabilityPaths: ['intent:需求整理', 'tag:需求结构化', 'cat:平台工具'],
    inputSchema: TEXT_INPUT_SCHEMA,
    outcomeSchema: STRUCTURED_OUTCOME_SCHEMA,
    verifierCode: 'builtin.heaven.validate.demand_fields',
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
    capabilityPaths: ['intent:路径生成', 'tag:路径', 'tag:检索', 'cat:平台工具'],
    inputSchema: TEXT_INPUT_SCHEMA,
    outcomeSchema: PATH_OUTCOME_SCHEMA,
    verifierCode: 'builtin.heaven.validate.paths',
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
    capabilityPaths: ['intent:附件处理', 'tag:附件', 'cat:平台工具'],
    inputSchema: { type: 'object', properties: { mediaUrls: { type: 'array', items: { type: 'string' } } }, required: ['mediaUrls'], additionalProperties: true },
    outcomeSchema: { type: 'object', additionalProperties: true },
    verifierCode: 'builtin.heaven.validate.attachment_safety',
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
    capabilityPaths: ['intent:封面生成', 'tag:封面', 'tag:图片', 'cat:平台工具'],
    inputSchema: TEXT_INPUT_SCHEMA,
    outcomeSchema: { type: 'object', additionalProperties: true },
    verifierCode: 'builtin.heaven.validate.demand_fields',
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
        inputSchema: (spec.inputSchema ?? {}) as Prisma.InputJsonValue,
        outcomeSchema: (spec.outcomeSchema ?? {}) as Prisma.InputJsonValue,
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
        inputSchema: (spec.inputSchema ?? {}) as Prisma.InputJsonValue,
        outcomeSchema: (spec.outcomeSchema ?? {}) as Prisma.InputJsonValue,
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
        paths: spec.capabilityPaths ?? [],
        inputSchema: (spec.inputSchema ?? {}) as Prisma.InputJsonValue,
        outputSchema: (spec.outcomeSchema ?? {}) as Prisma.InputJsonValue,
        healthStatus: CapabilityHealth.ONLINE,
        successRatePublic: false,
      },
      update: {
        name: spec.name,
        hostMode: CapabilityHostMode.PLATFORM_HOSTED,
        executionMode: spec.executionMode,
        paths: spec.capabilityPaths ?? [],
        inputSchema: (spec.inputSchema ?? {}) as Prisma.InputJsonValue,
        outputSchema: (spec.outcomeSchema ?? {}) as Prisma.InputJsonValue,
      },
    });
    epCount++;

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
          paths: spec.capabilityPaths ?? [],
          status: 'ACTIVE',
          requiresVerification: spec.loopKind === LoopKind.EARTH,
        },
      });
      offCount++;
    } else {
      const legacy = LEGACY_DEMO_METRICS[spec.code];
      const clearLegacyMetrics = legacy
        && existing.dealRate === legacy[0]
        && existing.avgDurationMs === legacy[1]
        && existing.recentSuccessN === legacy[2]
        && existing.recentTotalN === legacy[3]
        ? {
            dealRate: null,
            avgDurationMs: null,
            recentSuccessN: 0,
            recentTotalN: 0,
            internalSuccessRate: null,
          }
        : {};
      await prisma.loopOffering.update({
        where: { id: existing.id },
        data: {
          paths: spec.capabilityPaths ?? [],
          requiresVerification: spec.loopKind === LoopKind.EARTH,
          ...clearLegacyMetrics,
        },
      });
    }
  }

  return { definitions: defCount, endpoints: epCount, offerings: offCount };
}
