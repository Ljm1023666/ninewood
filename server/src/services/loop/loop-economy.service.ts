// 回域经济骨架 · 自然回 V3
// 详见 docs/specs/NATURAL-LOOP-V3-ADR.md §4
// 影子优先：只写 LoopEvent / 报价预览，不改 Order 钱包主路径。
import { prisma } from '../../lib/prisma.js'
import { LoopEventVisibility } from '@prisma/client'
import { loopRunService } from './loop-run.service.js'

export const LOOP_PLATFORM_FEE_RATE = 0.05
export const LOOP_MONITOR_FEE_CAP_RATE = 0.01

export type LoopPricePolicy = {
  platformFeeRate: number
  monitorFeeCapRate: number
  verificationFee: number
  currency: 'POINT'
}

export type LoopFeeQuote = {
  serviceAmount: number
  platformFee: number
  monitorFeeCap: number
  verificationFee: number
  totalPreview: number
  policy: LoopPricePolicy
  explanations: Array<{ code: string; label: string; amount: number; reason: string }>
}

const DEFAULT_POLICY: LoopPricePolicy = {
  platformFeeRate: LOOP_PLATFORM_FEE_RATE,
  monitorFeeCapRate: LOOP_MONITOR_FEE_CAP_RATE,
  verificationFee: 0,
  currency: 'POINT',
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

function parsePolicy(raw: unknown): LoopPricePolicy {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_POLICY }
  const o = raw as Record<string, unknown>
  return {
    platformFeeRate:
      typeof o.platformFeeRate === 'number' ? o.platformFeeRate : DEFAULT_POLICY.platformFeeRate,
    monitorFeeCapRate:
      typeof o.monitorFeeCapRate === 'number'
        ? o.monitorFeeCapRate
        : DEFAULT_POLICY.monitorFeeCapRate,
    verificationFee:
      typeof o.verificationFee === 'number' ? o.verificationFee : DEFAULT_POLICY.verificationFee,
    currency: 'POINT',
  }
}

/** 读取 offering 关联 endpoint 的 pricePolicyJson，缺省用平台默认。 */
export async function getOfferingPricePolicy(offeringId: string): Promise<LoopPricePolicy> {
  const offering = await prisma.loopOffering.findUnique({
    where: { id: offeringId },
    include: { endpoint: { select: { pricePolicyJson: true } } },
  })
  return parsePolicy(offering?.endpoint?.pricePolicyJson)
}

/**
 * 回域费用预览（不落账）。
 * 平台佣金 5%；接口监控额度上限 = 服务额 × 1%（含在佣金内，超额才另计——V3 只展示上限）。
 */
export async function quoteLoopFee(
  offeringId: string,
  serviceAmount: number,
): Promise<LoopFeeQuote> {
  if (!Number.isFinite(serviceAmount) || serviceAmount < 0) {
    throw Object.assign(new Error('serviceAmount 非法'), { status: 400 })
  }
  const policy = await getOfferingPricePolicy(offeringId)
  const platformFee = round(serviceAmount * policy.platformFeeRate)
  const monitorFeeCap = round(serviceAmount * policy.monitorFeeCapRate)
  const verificationFee = round(policy.verificationFee)
  const totalPreview = round(serviceAmount + platformFee + verificationFee)
  return {
    serviceAmount: round(serviceAmount),
    platformFee,
    monitorFeeCap,
    verificationFee,
    totalPreview,
    policy,
    explanations: [
      {
        code: 'SERVICE_AMOUNT',
        label: '服务金额',
        amount: round(serviceAmount),
        reason: '地回标价或双方约定金额。',
      },
      {
        code: 'PLATFORM_FEE',
        label: '平台佣金',
        amount: platformFee,
        reason: `默认 ${(policy.platformFeeRate * 100).toFixed(0)}%，含接口可用性监管成本。`,
      },
      {
        code: 'MONITOR_FEE_CAP',
        label: '监管算力额度上限',
        amount: monitorFeeCap,
        reason: `佣金内覆盖不超过服务额的 ${(policy.monitorFeeCapRate * 100).toFixed(0)}%；超额部分后续由供给方另付。`,
      },
      {
        code: 'VERIFICATION_FEE',
        label: '天回验证费',
        amount: verificationFee,
        reason: verificationFee > 0 ? '按契约收取的核验成本。' : '本方案当前不另收验证费。',
      },
    ],
  }
}

/**
 * 验证结论 → 结算资格事件（影子）。
 * PASSED → SETTLEMENT_ELIGIBLE；否则 SETTLEMENT_BLOCKED。
 */
export async function recordSettlementEligibility(
  loopRunId: string,
  offeringId: string,
  eligible: boolean,
): Promise<void> {
  await loopRunService.appendEvent(loopRunId, {
    type: eligible ? 'SETTLEMENT_ELIGIBLE' : 'SETTLEMENT_BLOCKED',
    actorRef: 'system:loop-economy',
    visibility: LoopEventVisibility.ACTOR,
    payload: {
      offeringId,
      eligible,
      reason: eligible
        ? '全部必要天回通过，允许进入结算（实际扣款由后续 ADR 接管）'
        : '天回核验未通过或无法判断，禁止结算；供给方不得自证成功',
    },
    idempotencyKey: `settlement:${loopRunId}`,
  })
}
