import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { orderRouter } from '../routes/order.js'

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: req.headers['x-test-user'] || 'u-req' }
    next()
  },
}))

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
  demandUpdate: vi.fn(),
  applicantUpdateMany: vi.fn(),
  messageCreate: vi.fn(),
  proposalUpdateMany: vi.fn(),
  transaction: vi.fn(),
  walletCredit: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique, updateMany: mocks.orderUpdateMany },
    demand: { update: mocks.demandUpdate },
    demandApplicantV2: { updateMany: mocks.applicantUpdateMany },
    message: { create: mocks.messageCreate },
    orderPartialProposal: { updateMany: mocks.proposalUpdateMany },
    $transaction: mocks.transaction,
  },
}))

vi.mock('../services/wallet.service.js', () => ({
  walletService: {
    credit: mocks.walletCredit,
    settleDemand: vi.fn(),
    consumeHold: vi.fn(),
  },
}))

vi.mock('../services/loop/shadow-hooks.js', () => ({
  shadowOnLoopCancelled: vi.fn().mockResolvedValue(undefined),
  shadowOnOrderConfirmed: vi.fn().mockResolvedValue(undefined),
}))

const app2 = express()
app2.use(express.json())
app2.use('/api/orders', orderRouter)

describe('orderApi.cancel integration', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m: any) => m.mockReset && m.mockReset())
    mocks.walletCredit.mockResolvedValue({ credited: 5, balanceAfter: 100 })
    mocks.proposalUpdateMany.mockResolvedValue({ count: 0 })
    mocks.transaction.mockImplementation(async (cb: any) =>
      cb({
        order: { findUnique: mocks.orderFindUnique, updateMany: mocks.orderUpdateMany },
        demand: { update: mocks.demandUpdate },
        demandApplicantV2: { updateMany: mocks.applicantUpdateMany },
        message: { create: mocks.messageCreate },
        orderPartialProposal: { updateMany: mocks.proposalUpdateMany },
      }),
    )
  })

  it('requester cancels IN_PROGRESS order -> CANCELLED + notify provider', async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 'o1',
      demandId: 'd1',
      requesterId: 'u-req',
      providerId: 'u-prov',
      status: 'IN_PROGRESS',
      agreedPrice: 100,
      paidAt: null,
      demand: { id: 'd1', minPrice: 100 },
    })
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 })
    mocks.messageCreate.mockResolvedValue({})

    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(200)
    expect(res.body?.data?.message).toBeDefined()
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: 'o1', requesterId: 'u-req', status: { in: ['IN_PROGRESS', 'PARTIAL_PENDING'] } },
      data: { status: 'CANCELLED' },
    })
    expect(mocks.messageCreate).toHaveBeenCalledTimes(1)
    expect(mocks.demandUpdate).toHaveBeenCalled()
  })

  it('non-requester gets 403', async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 'o1',
      demandId: 'd1',
      requesterId: 'someone-else',
      providerId: 'u-prov',
      status: 'IN_PROGRESS',
      agreedPrice: 100,
      demand: { id: 'd1', minPrice: 100 },
    })
    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(403)
  })

  it('COMPLETED order cannot be cancelled (400)', async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 'o1',
      demandId: 'd1',
      requesterId: 'u-req',
      providerId: 'u-prov',
      status: 'COMPLETED',
      agreedPrice: 100,
      demand: { id: 'd1', minPrice: 100 },
    })
    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(400)
  })

  it('WAITING_REVIEW cannot be cancelled (409)', async () => {
    mocks.orderFindUnique.mockResolvedValue({
      id: 'o1',
      demandId: 'd1',
      requesterId: 'u-req',
      providerId: 'u-prov',
      status: 'WAITING_REVIEW',
      agreedPrice: 100,
      demand: { id: 'd1', minPrice: 100 },
    })
    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(409)
  })
})
