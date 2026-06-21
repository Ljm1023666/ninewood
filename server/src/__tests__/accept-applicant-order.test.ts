import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

/**
 * Task 6.1 P0-01 补充：acceptApplicant 同事务创建 Order 行为验证
 */

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: req.headers['x-test-user'] || 'pub-1' }
    next()
  },
}))

const mocks = vi.hoisted(() => ({
  demandFindUnique: vi.fn(),
  applicantFindUnique: vi.fn(),
  orderFindFirst: vi.fn(),
  orderCreate: vi.fn(),
  applicantV2FindFirst: vi.fn(),
  applicantV2Update: vi.fn(),
  demandUpdate: vi.fn(),
  messageCreate: vi.fn(),
  transaction: vi.fn(),
  closeComm: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    demand: { findUnique: mocks.demandFindUnique, update: mocks.demandUpdate },
    demandApplicantV2: {
      findUnique: mocks.applicantFindUnique,
      update: mocks.applicantV2Update,
      findFirst: mocks.applicantV2FindFirst,
    },
    order: { findFirst: mocks.orderFindFirst, create: mocks.orderCreate },
    message: { create: mocks.messageCreate },
    $transaction: mocks.transaction,
  },
}))

vi.mock('../services/comm.service.js', () => ({
  closeAllCommForDemand: mocks.closeComm,
  extendComm: vi.fn(),
  canViewDemand: vi.fn(() => true),
  tryStartCommWindow: vi.fn(),
}))

import { demandRouter } from '../routes/demand.js'
import { demandService } from '../services/demand.service.js'

const app = express()
app.use(express.json())
app.use('/api/demands', demandRouter)

describe('acceptApplicant 同事务创建 Order (Task 6.1 P0-01 补充)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m: any) => m.mockReset && m.mockReset())
    mocks.applicantV2FindFirst.mockResolvedValue(null)
    mocks.orderFindFirst.mockResolvedValue(null)
    mocks.orderCreate.mockResolvedValue({ id: 'order-new' })
    mocks.messageCreate.mockResolvedValue({})
    mocks.demandUpdate.mockResolvedValue({ id: 'd1', title: 'T' })
    mocks.applicantV2Update.mockResolvedValue({})
    mocks.closeComm.mockResolvedValue({ count: 0 })
    mocks.transaction.mockImplementation(async (cb: any) => cb({
      demand: { update: mocks.demandUpdate },
      demandApplicantV2: { update: mocks.applicantV2Update },
      order: { create: mocks.orderCreate },
      message: { create: mocks.messageCreate },
    }))
  })

  it('A: 发布者接受 PENDING 申请 -> 创建 Order(agreedPrice=minPrice, IN_PROGRESS) 与 SYSTEM 消息', async () => {
    mocks.demandFindUnique.mockResolvedValue({ id: 'd1', userId: 'pub-1', minPrice: 100 })
    mocks.applicantFindUnique.mockResolvedValue({ id: 'app-A', userId: 'user-A', demandId: 'd1', status: 'PENDING' })

    const res = await request(app)
      .post('/api/demands/d1/accept/app-A')
      .set('x-test-user', 'pub-1')

    expect(res.status).toBe(200)
    expect(res.body?.data?.orderId).toBe('order-new')
    expect(res.body?.data?.acceptedUserId).toBe('user-A')
    expect(res.body?.data?.ok).toBe(true)
    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          demandId: 'd1',
          providerId: 'user-A',
          requesterId: 'pub-1',
          agreedPrice: 100,
          status: 'IN_PROGRESS',
        }),
      }),
    )
    expect(mocks.messageCreate).toHaveBeenCalledTimes(1)
    expect(mocks.closeComm).toHaveBeenCalledWith('d1', 'REJECTED', expect.anything())
  })

  it('B: 非发布者接受 -> 403', async () => {
    mocks.demandFindUnique.mockResolvedValue({ id: 'd1', userId: 'someone-else', minPrice: 100 })
    mocks.applicantFindUnique.mockResolvedValue({ id: 'app-A', userId: 'user-A', demandId: 'd1', status: 'PENDING' })

    const res = await request(app)
      .post('/api/demands/d1/accept/app-A')
      .set('x-test-user', 'pub-1')

    expect(res.status).toBe(403)
  })

  it('C: 已存在同 demand 的 Order -> 400', async () => {
    mocks.demandFindUnique.mockResolvedValue({ id: 'd1', userId: 'pub-1', minPrice: 100 })
    mocks.applicantFindUnique.mockResolvedValue({ id: 'app-C', userId: 'user-C', demandId: 'd1', status: 'PENDING' })
    mocks.orderFindFirst.mockResolvedValue({ id: 'order-existing' })

    await expect(demandService.acceptApplicant('d1', 'app-C', 'pub-1')).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/已生成订单/),
    })
  })

  it('D: 已有其他 ACCEPTED 申请 -> 400', async () => {
    mocks.demandFindUnique.mockResolvedValue({ id: 'd1', userId: 'pub-1', minPrice: 100 })
    mocks.applicantFindUnique.mockResolvedValue({ id: 'app-B', userId: 'user-B', demandId: 'd1', status: 'PENDING' })
    mocks.applicantV2FindFirst.mockResolvedValue({ id: 'app-A', status: 'ACCEPTED' })

    await expect(demandService.acceptApplicant('d1', 'app-B', 'pub-1')).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/正式接单/),
    })
  })
})
