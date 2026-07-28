import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '../lib/prisma.js'
import { calculateSettlement, calculateSettlementWelfare } from './settlement.js'

export type FeeQuoteAction = 'prepay' | 'confirm' | 'partial_accept' | 'cancel'

export type FeeBreakdown = {
  currency: 'POINT'
  serviceAmount: number
  platformFee: number
  verificationFee: number
  thirdPartyCost: number
  heldAmount: number
  refundableAmount: number
  totalDue: number
  feeRate: number
  pricingVersion: string
  explanations: Array<{
    code: string
    label: string
    amount: number
    refundable: boolean
    reason: string
  }>
}

export type FeeQuote = FeeBreakdown & {
  orderId: string
  action: FeeQuoteAction
  quoteToken: string
}

const PRICING_VERSION = 'order-v1-2026-07'

function round(value: number) {
  return Math.round(value * 100) / 100
}

function signingSecret() {
  return process.env.FEE_QUOTE_SECRET || process.env.JWT_SECRET || 'ninewood-local-fee-quote'
}

function sign(payload: string) {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url')
}

function quoteRequired() {
  if (process.env.FEE_QUOTE_REQUIRED === '0') return false
  if (process.env.FEE_QUOTE_REQUIRED === '1') return true
  return process.env.NODE_ENV === 'production'
}

async function loadQuoteState(orderId: string, userId: string, action: FeeQuoteAction) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      demand: { select: { minPrice: true, isPublicWelfare: true } },
      partialProposals: {
        where: { status: 'PENDING' },
        select: { id: true, proposedPrice: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!order) throw { status: 404, message: '订单不存在' }
  if (order.requesterId !== userId) throw { status: 403, message: '仅需求方可查看或确认费用' }

  const expectedStatus: Record<FeeQuoteAction, string[]> = {
    prepay: ['IN_PROGRESS', 'PARTIAL_PENDING'],
    confirm: ['WAITING_REVIEW'],
    partial_accept: ['PARTIAL_PENDING'],
    cancel: ['IN_PROGRESS', 'PARTIAL_PENDING'],
  }
  if (!expectedStatus[action].includes(order.status)) {
    throw { status: 400, message: '订单状态不允许此操作' }
  }

  const proposal = order.partialProposals[0]
  if (action === 'partial_accept' && !proposal) {
    throw { status: 400, message: '没有待确认的部分完成提议' }
  }
  return { order, proposal }
}

function canonical(state: Awaited<ReturnType<typeof loadQuoteState>>, action: FeeQuoteAction) {
  const { order, proposal } = state
  return [
    PRICING_VERSION,
    order.id,
    action,
    order.status,
    Number(order.agreedPrice).toFixed(2),
    Number(order.demand.minPrice).toFixed(2),
    order.demand.isPublicWelfare ? '1' : '0',
    order.paidAt?.toISOString() || '',
    proposal?.id || '',
    proposal ? Number(proposal.proposedPrice).toFixed(2) : '',
  ].join('|')
}

function breakdown(state: Awaited<ReturnType<typeof loadQuoteState>>, action: FeeQuoteAction): FeeBreakdown {
  const { order, proposal } = state
  const agreed = Number(order.agreedPrice)
  const held = Number(order.demand.minPrice)
  const isWelfare = order.demand.isPublicWelfare
  const feeRate = isWelfare ? 0.1 : 0.05
  const settled = isWelfare
    ? calculateSettlementWelfare(held, agreed, held)
    : calculateSettlement(held, agreed, held)
  const paidFee = Boolean(order.paidAt)
  let serviceAmount = agreed
  let platformFee = paidFee ? 0 : settled.serviceFee
  let heldAmount = held
  let refundableAmount = 0
  let totalDue = 0

  if (action === 'prepay') {
    platformFee = paidFee ? 0 : settled.serviceFee
    totalDue = platformFee
  } else if (action === 'confirm') {
    totalDue = round(Math.max(0, agreed - held) + platformFee)
  } else if (action === 'partial_accept') {
    serviceAmount = Number(proposal!.proposedPrice)
    const partialFee = round(serviceAmount * feeRate)
    platformFee = paidFee ? 0 : partialFee
    refundableAmount = round(Math.max(0, held - serviceAmount) + (paidFee ? Math.max(0, settled.serviceFee - partialFee) : 0))
    totalDue = round(Math.max(0, serviceAmount - held) + platformFee)
  } else {
    serviceAmount = 0
    platformFee = 0
    refundableAmount = paidFee ? settled.serviceFee : 0
    totalDue = 0
  }

  const feePurpose = isWelfare
    ? '按公益交易规则计取 10%，进入公益资金池。'
    : '仅在交易产生结果时按服务金额的 5% 维持平台运行。'

  return {
    currency: 'POINT',
    serviceAmount: round(serviceAmount),
    platformFee: round(platformFee),
    verificationFee: 0,
    thirdPartyCost: 0,
    heldAmount: round(heldAmount),
    refundableAmount: round(refundableAmount),
    totalDue: round(totalDue),
    feeRate,
    pricingVersion: PRICING_VERSION,
    explanations: [
      { code: 'SERVICE_AMOUNT', label: '服务金额', amount: round(serviceAmount), refundable: action === 'cancel', reason: '双方订单约定或已确认的部分完成金额。' },
      { code: 'PLATFORM_FEE', label: '平台手续费', amount: round(platformFee), refundable: action === 'prepay', reason: feePurpose },
      { code: 'VERIFICATION_FEE', label: '验证费', amount: 0, refundable: true, reason: '本次操作不收取验证费。' },
      { code: 'THIRD_PARTY_COST', label: '第三方成本', amount: 0, refundable: true, reason: '本次操作没有第三方成本。' },
      { code: 'HELD_AMOUNT', label: '已托管', amount: round(heldAmount), refundable: false, reason: action === 'cancel' ? '取消订单后需求重新开放，这笔托管继续用于原需求。' : '发布需求时已进入托管，不会在本次重复扣除。' },
      { code: 'REFUNDABLE_AMOUNT', label: '本次退还', amount: round(refundableAmount), refundable: true, reason: refundableAmount > 0 ? '操作完成后按当前规则自动退回。' : '本次没有新增退款。' },
    ],
  }
}

export const feeQuoteService = {
  async get(orderId: string, userId: string, action: FeeQuoteAction): Promise<FeeQuote> {
    const state = await loadQuoteState(orderId, userId, action)
    return { orderId, action, ...breakdown(state, action), quoteToken: sign(canonical(state, action)) }
  },

  async assertCurrent(orderId: string, userId: string, action: FeeQuoteAction, token?: string) {
    if (!token && !quoteRequired()) return
    if (!token) {
      throw { status: 409, message: '请先确认最新费用明细', details: { code: 'FEE_QUOTE_CHANGED' } }
    }
    const state = await loadQuoteState(orderId, userId, action)
    const expected = Buffer.from(sign(canonical(state, action)))
    const supplied = Buffer.from(token)
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw { status: 409, message: '费用或订单状态已变化，请重新确认', details: { code: 'FEE_QUOTE_CHANGED' } }
    }
  },
}
