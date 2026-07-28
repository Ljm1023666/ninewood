import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { roundPoints } from '../services/wallet.service.js'

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      userId: req.headers['x-test-user'] || 'missing',
      phone: '1',
      certLevel: 'NONE',
    }
    next()
  },
}))

import { orderRouter } from '../routes/order.js'

const DATABASE_URL = process.env.DATABASE_URL || ''
const RUN = process.env.RUN_PG_TRUST_TESTS === '1' || process.env.CI === 'true'

const prisma = new PrismaClient()

async function dbReady(): Promise<boolean> {
  if (!DATABASE_URL || !RUN) return false
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    await prisma.$queryRawUnsafe('SELECT 1 FROM "IdempotencyRecord" LIMIT 1')
    return true
  } catch {
    return false
  }
}

describe.runIf(RUN)('PG trust: idempotency + conservation', () => {
  let ready = false
  const app = express()
  app.use(express.json())
  app.use('/api/orders', orderRouter)

  const ids: { userIds: string[]; demandIds: string[]; orderIds: string[] } = {
    userIds: [],
    demandIds: [],
    orderIds: [],
  }

  beforeAll(async () => {
    ready = await dbReady()
    if (!ready) console.warn('[pg-trust] skip: DB not ready or migration missing')
  }, 30_000)

  afterAll(async () => {
    if (ready) {
      await prisma.orderPartialProposal
        .deleteMany({ where: { orderId: { in: ids.orderIds } } })
        .catch(() => {})
      await prisma.order.deleteMany({ where: { id: { in: ids.orderIds } } }).catch(() => {})
      await prisma.settlement.deleteMany({ where: { demandId: { in: ids.demandIds } } }).catch(() => {})
      await prisma.walletHold.deleteMany({ where: { demandId: { in: ids.demandIds } } }).catch(() => {})
      await prisma.walletLedger
        .deleteMany({
          where: {
            OR: [
              { referenceId: { in: [...ids.demandIds, ...ids.orderIds] } },
              { userId: { in: ids.userIds } },
            ],
          },
        })
        .catch(() => {})
      await prisma.demand.deleteMany({ where: { id: { in: ids.demandIds } } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } }).catch(() => {})
      await prisma.idempotencyRecord.deleteMany({ where: { userId: { in: ids.userIds } } }).catch(() => {})
    }
    await prisma.$disconnect()
  }, 60_000)

  it('同 key 重放 prepay 返回首次完整响应且仅一笔流水', async ({ skip }) => {
    if (!ready) return skip()
    const ctx = await seedOrder({ agreedPrice: 100, minPrice: 100 })
    const key = `prepay-${randomUUID()}`

    const r1 = await request(app)
      .post(`/api/orders/${ctx.orderId}/prepay`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', key)
    expect(r1.status).toBe(200)
    const body1 = r1.body

    const r2 = await request(app)
      .post(`/api/orders/${ctx.orderId}/prepay`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', key)
    expect(r2.status).toBe(200)
    expect(r2.body).toEqual(body1)

    const fees = await prisma.walletLedger.count({
      where: { operationKey: `order:${ctx.orderId}:prepay-fee` },
    })
    expect(fees).toBe(1)
  })

  it('不同 key 并发 prepay 只能产生一笔资金流水', async ({ skip }) => {
    if (!ready) return skip()
    const ctx = await seedOrder({ agreedPrice: 200, minPrice: 200 })

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/orders/${ctx.orderId}/prepay`)
        .set('x-test-user', ctx.requesterId)
        .set('Idempotency-Key', `k-a-${randomUUID()}`),
      request(app)
        .post(`/api/orders/${ctx.orderId}/prepay`)
        .set('x-test-user', ctx.requesterId)
        .set('Idempotency-Key', `k-b-${randomUUID()}`),
    ])

    expect([a.status, b.status].every((s) => s === 200)).toBe(true)
    const fees = await prisma.walletLedger.count({
      where: { operationKey: `order:${ctx.orderId}:prepay-fee` },
    })
    expect(fees).toBe(1)
  })

  it('IN_PROGRESS 租约过期后可超时接管且不双扣', async ({ skip }) => {
    if (!ready) return skip()
    const ctx = await seedOrder({ agreedPrice: 80, minPrice: 80 })
    const key = `lease-${randomUUID()}`
    await prisma.idempotencyRecord.create({
      data: {
        userId: ctx.requesterId,
        scope: 'ORDER_PREPAY',
        key,
        resourceId: ctx.orderId,
        status: 'IN_PROGRESS',
        leaseUntil: new Date(Date.now() - 60_000),
        leaseOwner: 'dead-worker',
        requestHash: 'x',
      },
    })

    const res = await request(app)
      .post(`/api/orders/${ctx.orderId}/prepay`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', key)
    expect(res.status).toBe(200)

    expect(
      await prisma.walletLedger.count({
        where: { operationKey: `order:${ctx.orderId}:prepay-fee` },
      }),
    ).toBe(1)

    const rec = await prisma.idempotencyRecord.findUnique({
      where: {
        userId_scope_key: { userId: ctx.requesterId, scope: 'ORDER_PREPAY', key },
      },
    })
    expect(rec?.status).toBe('SUCCEEDED')
  })

  it('C1 partial accept 未预付：余额+hold+入账守恒', async ({ skip }) => {
    if (!ready) return skip()
    const ctx = await seedOrder({ agreedPrice: 100, minPrice: 100 })
    await proposePartial(ctx, 40, '剩余打扫')

    const before = await fundSnapshot(ctx.requesterId, ctx.providerId)
    const res = await request(app)
      .post(`/api/orders/${ctx.orderId}/partial/accept`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', `acc-${randomUUID()}`)
    expect(res.status).toBe(200)
    if (res.body?.data?.remainingDemandId) ids.demandIds.push(res.body.data.remainingDemandId)

    const after = await fundSnapshot(ctx.requesterId, ctx.providerId)
    const platformDelta = roundPoints(after.platformFees - before.platformFees)
    const beforeTotal = roundPoints(before.requesterPoints + before.providerPoints + before.held)
    const afterTotal = roundPoints(
      after.requesterPoints + after.providerPoints + after.held + platformDelta,
    )
    expect(afterTotal).toBe(beforeTotal)
    expect(after.providerPoints - before.providerPoints).toBe(40)
    expect(
      await prisma.walletLedger.findUnique({
        where: { operationKey: `demand:${ctx.demandId}:partial-unused-release` },
      }),
    ).toBeTruthy()
  })

  it('C2 partial accept 已预付：服务费多退且守恒', async ({ skip }) => {
    if (!ready) return skip()
    const ctx = await seedOrder({ agreedPrice: 100, minPrice: 100 })
    await request(app)
      .post(`/api/orders/${ctx.orderId}/prepay`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', `pp-${randomUUID()}`)
    await proposePartial(ctx, 40, '剩余')

    const before = await fundSnapshot(ctx.requesterId, ctx.providerId)
    const res = await request(app)
      .post(`/api/orders/${ctx.orderId}/partial/accept`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', `acc2-${randomUUID()}`)
    expect(res.status).toBe(200)
    if (res.body?.data?.remainingDemandId) ids.demandIds.push(res.body.data.remainingDemandId)

    const feeRefund = await prisma.walletLedger.findUnique({
      where: { operationKey: `order:${ctx.orderId}:partial-fee-refund` },
    })
    expect(feeRefund).toBeTruthy()
    expect(Number(feeRefund!.amount)).toBe(3)

    const after = await fundSnapshot(ctx.requesterId, ctx.providerId)
    const platformDelta = roundPoints(after.platformFees - before.platformFees)
    const beforeTotal = roundPoints(before.requesterPoints + before.providerPoints + before.held)
    const afterTotal = roundPoints(
      after.requesterPoints + after.providerPoints + after.held + platformDelta,
    )
    expect(afterTotal).toBe(beforeTotal)
  })

  it('C4 prepay→cancel 守恒', async ({ skip }) => {
    if (!ready) return skip()
    const ctx = await seedOrder({ agreedPrice: 100, minPrice: 100 })
    const before = await fundSnapshot(ctx.requesterId, ctx.providerId)
    await request(app)
      .post(`/api/orders/${ctx.orderId}/prepay`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', `c4p-${randomUUID()}`)
    await request(app)
      .post(`/api/orders/${ctx.orderId}/cancel`)
      .set('x-test-user', ctx.requesterId)
      .set('Idempotency-Key', `c4c-${randomUUID()}`)
    const after = await fundSnapshot(ctx.requesterId, ctx.providerId)
    expect(after.requesterPoints).toBe(before.requesterPoints)
  })

  it('迁移兼容：operationKey 可空列存在', async ({ skip }) => {
    if (!ready) return skip()
    const cols = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM information_schema.columns
       WHERE table_schema='public' AND table_name='WalletLedger' AND column_name='operationKey'`,
    )) as Array<{ n: number }>
    expect(cols[0].n).toBe(1)
  })

  async function seedOrder(opts: { agreedPrice: number; minPrice: number }) {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10)
    const requester = await prisma.user.create({
      data: {
        phone: `13${suffix}`.slice(0, 11),
        passwordHash: 'x',
        nickname: 'trust-req',
        points: 100_000,
      },
    })
    const provider = await prisma.user.create({
      data: {
        phone: `15${suffix}`.slice(0, 11),
        passwordHash: 'x',
        nickname: 'trust-prov',
        points: 0,
      },
    })
    ids.userIds.push(requester.id, provider.id)

    const demand = await prisma.demand.create({
      data: {
        userId: requester.id,
        title: 'trust-demand',
        description: 'trust',
        minPrice: opts.minPrice,
        category: 'test',
        serviceType: 'ONLINE',
        status: 'IN_PROGRESS',
        acceptedProviderId: provider.id,
        expireAt: new Date(Date.now() + 86400000),
      },
    })
    ids.demandIds.push(demand.id)

    await prisma.user.update({
      where: { id: requester.id },
      data: { points: { decrement: opts.minPrice } },
    })
    await prisma.walletHold.create({
      data: {
        userId: requester.id,
        demandId: demand.id,
        amount: opts.minPrice,
        status: 'HELD',
      },
    })
    await prisma.walletLedger.create({
      data: {
        userId: requester.id,
        type: 'HOLD',
        amount: -opts.minPrice,
        balanceAfter: 100_000 - opts.minPrice,
        referenceType: 'DEMAND',
        referenceId: demand.id,
        memo: 'test hold',
        operationKey: `demand:${demand.id}:hold`,
      },
    })

    const order = await prisma.order.create({
      data: {
        demandId: demand.id,
        providerId: provider.id,
        requesterId: requester.id,
        agreedPrice: opts.agreedPrice,
        status: 'IN_PROGRESS',
      },
    })
    ids.orderIds.push(order.id)

    return {
      orderId: order.id,
      demandId: demand.id,
      requesterId: requester.id,
      providerId: provider.id,
    }
  }

  async function proposePartial(
    ctx: { orderId: string; providerId: string },
    price: number,
    description: string,
  ) {
    const res = await request(app)
      .post(`/api/orders/${ctx.orderId}/partial`)
      .set('x-test-user', ctx.providerId)
      .send({ newPrice: price, description })
    expect(res.status).toBe(200)
  }

  async function fundSnapshot(requesterId: string, providerId: string) {
    const [req, prov, heldAgg, feeDebits, feeCredits] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: requesterId }, select: { points: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: providerId }, select: { points: true } }),
      prisma.walletHold.aggregate({
        where: { userId: requesterId, status: 'HELD' },
        _sum: { amount: true },
      }),
      prisma.walletLedger.aggregate({
        where: {
          userId: requesterId,
          type: 'DEBIT',
          OR: [
            { operationKey: { endsWith: ':settle-fee' } },
            { operationKey: { endsWith: ':prepay-fee' } },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.walletLedger.aggregate({
        where: {
          userId: requesterId,
          type: 'CREDIT',
          OR: [
            { operationKey: { endsWith: ':partial-fee-refund' } },
            { operationKey: { endsWith: ':cancel-fee-refund' } },
            { operationKey: { endsWith: ':dispute-fee-refund' } },
          ],
        },
        _sum: { amount: true },
      }),
    ])
    const debited = Math.abs(Number(feeDebits._sum.amount || 0))
    const refunded = Number(feeCredits._sum.amount || 0)
    return {
      requesterPoints: roundPoints(Number(req.points)),
      providerPoints: roundPoints(Number(prov.points)),
      held: roundPoints(Number(heldAgg._sum.amount || 0)),
      // 平台净收入：已收服务费 − 已退服务费
      platformFees: roundPoints(debited - refunded),
    }
  }
})
