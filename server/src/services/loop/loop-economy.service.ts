// 回域经济 · 自然回 V3 骨架 + V4 真实预付/捕获/退款
// 详见 docs/specs/NATURAL-LOOP-V3-ADR.md §4、docs/specs/NATURAL-LOOP-V4-ADR.md
// 旁路 Demand/Order：只用 wallet debit/credit + LoopEvent，禁止 settleDemand。
import { prisma } from '../../lib/prisma.js'
import { LoopEventVisibility, Prisma } from '@prisma/client'
import { loopRunService } from './loop-run.service.js'
import { walletService } from '../wallet.service.js'

export const LOOP_PLATFORM_FEE_RATE = 0.05
export const LOOP_MONITOR_FEE_CAP_RATE = 0.01

export type LoopPricePolicy = {
  platformFeeRate: number
  monitorFeeCapRate: number
  verificationFee: number
  claimedServiceAmount: number | null
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

export type LoopSettlementResult = {
  action: 'noop' | 'prepaid' | 'captured' | 'refunded'
  quote?: LoopFeeQuote
  providerUserId?: string | null
}

const DEFAULT_POLICY: LoopPricePolicy = {
  platformFeeRate: LOOP_PLATFORM_FEE_RATE,
  monitorFeeCapRate: LOOP_MONITOR_FEE_CAP_RATE,
  verificationFee: 0,
  claimedServiceAmount: null,
  currency: 'POINT',
}

/** User.points 为 Int：回域费用一律取整点，避免 Prisma 截断半点 */
function round(n: number) {
  return Math.round(n)
}

function parsePolicy(raw: unknown): LoopPricePolicy {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_POLICY }
  const o = raw as Record<string, unknown>
  const claimed =
    typeof o.claimedServiceAmount === 'number' && Number.isFinite(o.claimedServiceAmount)
      ? o.claimedServiceAmount
      : null
  return {
    platformFeeRate:
      typeof o.platformFeeRate === 'number' ? o.platformFeeRate : DEFAULT_POLICY.platformFeeRate,
    monitorFeeCapRate:
      typeof o.monitorFeeCapRate === 'number'
        ? o.monitorFeeCapRate
        : DEFAULT_POLICY.monitorFeeCapRate,
    verificationFee:
      typeof o.verificationFee === 'number' ? o.verificationFee : DEFAULT_POLICY.verificationFee,
    claimedServiceAmount: claimed,
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
 * 平台佣金 5%；接口监控额度上限 = 服务额 × 1%（含在佣金内）。
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

/** 解析付费运行金额：显式 serviceAmount > 标价 claimedServiceAmount > 0 */
export async function resolveBillableServiceAmount(
  offeringId: string,
  explicit?: number,
): Promise<number> {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return round(explicit)
  }
  const policy = await getOfferingPricePolicy(offeringId)
  return policy.claimedServiceAmount != null && policy.claimedServiceAmount > 0
    ? round(policy.claimedServiceAmount)
    : 0
}

/**
 * 验证结论 → 结算资格事件。
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
        ? '全部必要天回通过，允许进入结算'
        : '天回核验未通过或无法判断，禁止结算；供给方不得自证成功',
    },
    idempotencyKey: `settlement:${loopRunId}`,
  })
}

async function findEvent(loopRunId: string, type: string) {
  return prisma.loopEvent.findFirst({
    where: { loopRunId, type },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * 付费运行预付：从需求方扣 total，写 SETTLEMENT_PREPAID。
 * 余额不足抛 402；幂等 key = loopRun:{id}:prepay。
 */
export async function prepayLoopRun(params: {
  loopRunId: string
  offeringId: string
  payerUserId: string
  serviceAmount: number
}): Promise<LoopSettlementResult> {
  const existing = await findEvent(params.loopRunId, 'SETTLEMENT_PREPAID')
  if (existing) {
    return {
      action: 'prepaid',
      quote: (existing.payload as { quote?: LoopFeeQuote } | null)?.quote,
    }
  }

  const quote = await quoteLoopFee(params.offeringId, params.serviceAmount)
  if (quote.totalPreview <= 0) {
    return { action: 'noop', quote }
  }

  const offering = await prisma.loopOffering.findUnique({
    where: { id: params.offeringId },
    include: { endpoint: { select: { ownerType: true, ownerId: true } } },
  })
  const providerUserId =
    offering?.endpoint?.ownerType === 'USER' ? offering.endpoint.ownerId : null

  await walletService.debit(params.payerUserId, quote.totalPreview, {
    referenceType: 'loopRun',
    referenceId: params.loopRunId,
    memo: `地回预付 ${quote.serviceAmount}+佣金${quote.platformFee}+验证${quote.verificationFee}`,
    operationKey: `loopRun:${params.loopRunId}:prepay`,
  })

  await loopRunService.appendEvent(params.loopRunId, {
    type: 'SETTLEMENT_PREPAID',
    actorRef: 'system:loop-economy',
    visibility: LoopEventVisibility.ACTOR,
    payload: {
      offeringId: params.offeringId,
      payerUserId: params.payerUserId,
      providerUserId,
      quote,
    } as Prisma.InputJsonValue,
    idempotencyKey: `settlement-prepay:${params.loopRunId}`,
  })

  return { action: 'prepaid', quote, providerUserId }
}

/**
 * 根据资格事件完成捕获或退款。无预付则 noop。
 * - ELIGIBLE → 付给 USER 供给方 serviceAmount
 * - BLOCKED / 无资格且要求退款 → 退 service+platform（保留验证费）或全额
 */
export async function finalizeLoopSettlement(
  loopRunId: string,
  opts?: { fullRefund?: boolean },
): Promise<LoopSettlementResult> {
  const captured = await findEvent(loopRunId, 'SETTLEMENT_CAPTURED')
  if (captured) return { action: 'captured' }
  const refunded = await findEvent(loopRunId, 'SETTLEMENT_REFUNDED')
  if (refunded) return { action: 'refunded' }

  const prepaid = await findEvent(loopRunId, 'SETTLEMENT_PREPAID')
  if (!prepaid) return { action: 'noop' }

  const payload = (prepaid.payload ?? {}) as {
    payerUserId?: string
    providerUserId?: string | null
    quote?: LoopFeeQuote
    offeringId?: string
  }
  const quote = payload.quote
  const payerUserId = payload.payerUserId
  if (!quote || !payerUserId) return { action: 'noop' }

  const eligibleEv = await findEvent(loopRunId, 'SETTLEMENT_ELIGIBLE')
  const blockedEv = await findEvent(loopRunId, 'SETTLEMENT_BLOCKED')
  const eligible = Boolean(eligibleEv) && !opts?.fullRefund

  if (eligible) {
    const providerUserId = payload.providerUserId ?? null
    if (providerUserId && quote.serviceAmount > 0) {
      await walletService.credit(providerUserId, quote.serviceAmount, {
        referenceType: 'loopRun',
        referenceId: loopRunId,
        memo: '地回服务款（天回已通过）',
        operationKey: `loopRun:${loopRunId}:pay-provider`,
      })
    }
    await loopRunService.appendEvent(loopRunId, {
      type: 'SETTLEMENT_CAPTURED',
      actorRef: 'system:loop-economy',
      visibility: LoopEventVisibility.ACTOR,
      payload: {
        offeringId: payload.offeringId,
        providerUserId,
        paidToProvider: providerUserId ? quote.serviceAmount : 0,
        platformRetained: round(quote.platformFee + quote.verificationFee),
        quote,
        reason: providerUserId
          ? '天回通过，服务款已付给供给方'
          : '天回通过；SYSTEM 供给方无用户账户，服务款留平台',
      } as Prisma.InputJsonValue,
      idempotencyKey: `settlement-capture:${loopRunId}`,
    })
    return { action: 'captured', quote, providerUserId }
  }

  // 失败 / 未核验：退款
  const refundAmount = opts?.fullRefund || !blockedEv
    ? quote.totalPreview
    : round(quote.serviceAmount + quote.platformFee)

  if (refundAmount > 0) {
    await walletService.credit(payerUserId, refundAmount, {
      referenceType: 'loopRun',
      referenceId: loopRunId,
      memo: opts?.fullRefund
        ? '地回未完成核验，全额退回预付'
        : '天回未通过，退回服务额与平台佣金（验证费不退）',
      operationKey: `loopRun:${loopRunId}:refund`,
    })
  }

  await loopRunService.appendEvent(loopRunId, {
    type: 'SETTLEMENT_REFUNDED',
    actorRef: 'system:loop-economy',
    visibility: LoopEventVisibility.ACTOR,
    payload: {
      offeringId: payload.offeringId,
      refundAmount,
      keptVerificationFee: opts?.fullRefund ? 0 : quote.verificationFee,
      quote,
      reason:
        opts?.fullRefund || !blockedEv
          ? '执行失败或未产生核验结论，预付全额退回'
          : '天回核验未通过，供给方不得收款；验证费由需求方承担',
    } as Prisma.InputJsonValue,
    idempotencyKey: `settlement-refund:${loopRunId}`,
  })

  return { action: 'refunded', quote }
}
