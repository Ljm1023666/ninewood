
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { orderRouter } from '../routes/order.js'
import { prisma } from '../lib/prisma.js'

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: req.headers['x-test-user'] || 'u-req' }
    next()
  },
}))

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  walletHoldFindUnique: vi.fn(),
  walletHoldUpdate: vi.fn(),
  userUpdate: vi.fn(),
  messageCreate: vi.fn(),
  depositDemandFindFirst: vi.fn(),
  depositUpdate: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate, findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    walletHold: { findUnique: mocks.walletHoldFindUnique, update: mocks.walletHoldUpdate },
    user: { update: mocks.userUpdate },
    message: { create: mocks.messageCreate },
    depositDemand: { findFirst: mocks.depositDemandFindFirst },
    deposit: { update: mocks.depositUpdate },
  },
}))

vi.mock('../services/wallet.service.js', () => ({
  walletService: {
    settleDemand: vi.fn().mockResolvedValue({ settlement: {}, breakdown: { serviceFee: 0 } }),
    consumeHold: vi.fn().mockResolvedValue({ consumed: 100 }),
  },
}))

const app2 = express()
app2.use(express.json())
app2.use('/api/orders', orderRouter)

describe('orderApi.cancel integration', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m: any) => m.mockReset && m.mockReset())
  })

  it('requester cancels IN_PROGRESS order -> CANCELLED + notify provider', async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: 'o1', demandId: 'd1', requesterId: 'u-req', providerId: 'u-prov', status: 'IN_PROGRESS' })
    mocks.depositDemandFindFirst.mockResolvedValue(null)
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
  })

  it('non-requester gets 403', async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: 'o1', demandId: 'd1', requesterId: 'someone-else', providerId: 'u-prov', status: 'IN_PROGRESS' })
    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(403)
  })

  it('COMPLETED order cannot be cancelled (400)', async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: 'o1', demandId: 'd1', requesterId: 'u-req', providerId: 'u-prov', status: 'COMPLETED' })
    const res = await request(app2)
      .post('/api/orders/o1/cancel')
      .set('x-test-user', 'u-req')
    expect(res.status).toBe(400)
  })
})
