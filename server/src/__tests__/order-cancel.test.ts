
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
  orderUpdate: vi.fn(),
  demandUpdate: vi.fn(),
  applicantUpdateMany: vi.fn(),
  messageCreate: vi.fn(),
  transaction: vi.fn(),
  walletCredit: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
    demand: { update: mocks.demandUpdate },
    demandApplicantV2: { updateMany: mocks.applicantUpdateMany },
    message: { create: mocks.messageCreate },
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

const app2 = express()
app2.use(express.json())
app2.use('/api/orders', orderRouter)

describe('orderApi.cancel integration', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m: any) => m.mockReset && m.mockReset())
    mocks.walletCredit.mockResolvedValue({ credited: 5, balanceAfter: 100 })
    mocks.transaction.mockImplementation(async (cb: any) =>
      cb({
        order: { update: mocks.orderUpdate },
        demand: { update: mocks.demandUpdate },
        demandApplicantV2: { updateMany: mocks.applicantUpdateMany },
        message: { create: mocks.messageCreate },
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
    mocks.orderUpdate.mockResolvedValue({})
    mocks.messageCreate.mockResolvedValue({})

    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(200)
    expect(res.body?.data?.message).toBeDefined()
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
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
})
