import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  order: {
    id: 'order-1',
    requesterId: 'requester-1',
    status: 'IN_PROGRESS',
    agreedPrice: 120,
    paidAt: null as Date | null,
    demand: { minPrice: 100, isPublicWelfare: false },
    partialProposals: [] as Array<{ id: string; proposedPrice: number }>,
  },
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: { order: { findUnique: vi.fn(async () => ({ ...state.order })) } },
}))

import { feeQuoteService } from './fee-quote.service.js'

describe('feeQuoteService', () => {
  beforeEach(() => {
    process.env.FEE_QUOTE_REQUIRED = '1'
    process.env.FEE_QUOTE_SECRET = 'test-secret'
    state.order.status = 'IN_PROGRESS'
    state.order.agreedPrice = 120
    state.order.paidAt = null
    state.order.partialProposals = []
  })

  it('prepay 报价只扣服务费，不重复扣托管本金', async () => {
    const quote = await feeQuoteService.get('order-1', 'requester-1', 'prepay')
    expect(quote.heldAmount).toBe(100)
    expect(quote.platformFee).toBe(6)
    expect(quote.totalDue).toBe(6)
    await expect(feeQuoteService.assertCurrent('order-1', 'requester-1', 'prepay', quote.quoteToken)).resolves.toBeUndefined()
  })

  it('报价后价格变化返回 FEE_QUOTE_CHANGED', async () => {
    const quote = await feeQuoteService.get('order-1', 'requester-1', 'prepay')
    state.order.agreedPrice = 130
    await expect(feeQuoteService.assertCurrent('order-1', 'requester-1', 'prepay', quote.quoteToken)).rejects.toMatchObject({
      status: 409,
      details: { code: 'FEE_QUOTE_CHANGED' },
    })
  })

  it('未确认报价不得执行资金操作', async () => {
    await expect(feeQuoteService.assertCurrent('order-1', 'requester-1', 'prepay')).rejects.toMatchObject({
      status: 409,
      details: { code: 'FEE_QUOTE_CHANGED' },
    })
  })

  it('部分完成展示未用托管与多收服务费退款', async () => {
    state.order.status = 'PARTIAL_PENDING'
    state.order.paidAt = new Date('2026-07-28T00:00:00Z')
    state.order.partialProposals = [{ id: 'proposal-1', proposedPrice: 80 }]
    const quote = await feeQuoteService.get('order-1', 'requester-1', 'partial_accept')
    expect(quote.totalDue).toBe(0)
    expect(quote.refundableAmount).toBe(22)
  })
})
