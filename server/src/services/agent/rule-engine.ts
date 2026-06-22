import { prisma } from '../../lib/prisma.js';
import { listCapabilities } from './capability-matcher.js';
import type { Capability } from './capability-matcher.js';

/** 规则执行结果 */
export interface RuleResult {
  ok: boolean;
  failedRuleId?: string;
  /** 面向用户的错误文案（fail 时的 ToolResult.message） */
  error?: string;
  /** 错误 code（ToolResult.error） */
  code?: string;
}

/** 规则执行上下文（按需提供） */
export interface RuleContext {
  userId: string;
  /** 调用方传入的 tool 参数（如 demandId、demandUserId 等） */
  toolArgs?: Record<string, unknown>;
}

// ── 规则实现 ────────────────────────────────────────────────────────────────

/** PUBLISH_REQUIRES_VERIFIED：发布需求需实名认证（certLevel != 'NONE'） */
async function checkPublishRequiresVerified(ctx: RuleContext): Promise<RuleResult> {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { certificationLevel: true },
  })
  if (!user) {
    return { ok: false, failedRuleId: 'PUBLISH_REQUIRES_VERIFIED', code: 'USER_NOT_FOUND', error: '用户不存在' }
  }
  if (user.certificationLevel === 'NONE' || !user.certificationLevel) {
    return { ok: false, failedRuleId: 'PUBLISH_REQUIRES_VERIFIED', code: 'NOT_VERIFIED', error: '请先完成实名认证再发布需求。' }
  }
  return { ok: true }
}

/** PUBLISH_REQUIRES_NO_FROZEN：账户存在 FROZEN 状态需求时禁止发布新需求 */
async function checkPublishRequiresNoFrozen(ctx: RuleContext): Promise<RuleResult> {
  const frozenCount = await prisma.demand.count({
    where: { userId: ctx.userId, status: 'FROZEN' },
  })
  if (frozenCount > 0) {
    return {
      ok: false,
      failedRuleId: 'PUBLISH_REQUIRES_NO_FROZEN',
      code: 'FROZEN_DEMAND_EXISTS',
      error: '您的账户存在已冻结的需求，无法发布新需求。请联系平台处理。',
    }
  }
  return { ok: true }
}

/** SELF_APPLY_FORBIDDEN：不能申请自己的需求 */
async function checkSelfApplyForbidden(ctx: RuleContext): Promise<RuleResult> {
  const demandId = ctx.toolArgs?.demandId as string | undefined
  if (!demandId) return { ok: true } // 缺参数时跳过（由工具本身抛错）
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { userId: true },
  })
  if (!demand) return { ok: true } // 不存在的需求由工具处理
  if (demand.userId === ctx.userId) {
    return {
      ok: false,
      failedRuleId: 'SELF_APPLY_FORBIDDEN',
      code: 'SELF_APPLY',
      error: '不能申请自己发布的需求。',
    }
  }
  return { ok: true }
}

type RuleImpl = (ctx: RuleContext) => Promise<RuleResult>;

const RULE_IMPLS: Record<string, RuleImpl> = {
  PUBLISH_REQUIRES_VERIFIED: checkPublishRequiresVerified,
  PUBLISH_REQUIRES_NO_FROZEN: checkPublishRequiresNoFrozen,
  SELF_APPLY_FORBIDDEN: checkSelfApplyForbidden,
  // TODO(Wave B+): 实现 SNATCH_REQUIRES_CERT / SNATCH_REQUIRES_CREDITS /
  // CERTIFIED_ONLY_APPLY / TITLE_LENGTH / DESCRIPTION_LENGTH / BUDGET_RANGE /
  // EXPIRE_DAYS / DUPLICATE_APPLY / MAX_APPLICANTS_REACHED。当前 stub pass
  // （由工具 handler 内的内联校验兜底）。
}

/**
 * 执行 capability 声明的 rule_ids 列表，按顺序短路。
 * 未实现的 rule_id 视为 pass（stub）。
 */
export async function checkRules(
  capability: Pick<Capability, 'id' | 'rule_ids'>,
  ctx: RuleContext,
): Promise<RuleResult> {
  const ids = capability.rule_ids ?? []
  for (const id of ids) {
    const impl = RULE_IMPLS[id]
    if (!impl) {
      // 未实现 → stub pass
      continue
    }
    const r = await impl(ctx)
    if (!r.ok) return r
  }
  return { ok: true }
}

/**
 * 按 tool 名称查找对应 capability 并跑规则。
 * 工具未在 03 yaml 登记（罕见，例如来自插件）时返回 ok=true。
 */
export async function checkRulesForTool(
  toolName: string,
  ctx: RuleContext,
): Promise<RuleResult> {
  const cap = listCapabilities().find((c) => c.tool === toolName)
  if (!cap) return { ok: true }
  return checkRules(cap, ctx)
}
