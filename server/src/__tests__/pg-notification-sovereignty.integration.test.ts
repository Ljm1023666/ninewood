/**
 * 通知主权 Phase 1A：真实 PostgreSQL 集成测试（N1–N9 数据/决策相关）。
 * 需 DATABASE_URL + 已 migrate；设 RUN_PG_NOTIFICATION_TESTS=1 或 CI=true。
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import {
  evaluateNotificationDecision,
} from '../services/notification-decision.service.js'
import {
  evaluateAndRecord,
  previewNotificationDecision,
} from '../services/notification-delivery.service.js'

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

import { notificationPolicyRouter } from '../routes/notification-policy.js'

const DATABASE_URL = process.env.DATABASE_URL || ''
const RUN = process.env.RUN_PG_NOTIFICATION_TESTS === '1' || process.env.CI === 'true'

const prisma = new PrismaClient()

async function dbReady(): Promise<boolean> {
  if (!DATABASE_URL || !RUN) return false
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    await prisma.$queryRawUnsafe('SELECT 1 FROM "NotificationPolicy" LIMIT 1')
    return true
  } catch {
    return false
  }
}

describe.runIf(RUN)('PG notification sovereignty Phase 1A', () => {
  let ready = false
  const userIds: string[] = []
  const app = express()
  app.use(express.json())
  app.use('/api/notifications', notificationPolicyRouter)

  beforeAll(async () => {
    ready = await dbReady()
    if (!ready) console.warn('[pg-notification] skip: DB not ready or migration missing')
  }, 30_000)

  afterAll(async () => {
    if (ready && userIds.length) {
      await prisma.notificationDelivery.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.notificationSubscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.notificationPolicy.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.pushPreference.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
    await prisma.$disconnect()
  }, 60_000)

  async function createUser(suffix = '') {
    const id = randomUUID()
    userIds.push(id)
    const phone = `1${id.replace(/-/g, '').slice(0, 10)}`
    await prisma.user.create({
      data: {
        id,
        phone,
        nickname: `n-sov-${suffix || id.slice(0, 6)}`,
      },
    })
    return id
  }

  it('N1: 新用户无非必要订阅 → 不投递', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n1')
    const d = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'DEMAND_MATCHED', filterContext: { tags: ['家电维修'] } },
    )
    expect(d.deliver).toBe(false)
    expect(d.suppressionCode).toBe('NOT_SUBSCRIBED')
    expect(d.reasonCode).toBeTruthy()
    expect(d.reasonText).toBeTruthy()
  })

  it('N2: 交易必要通知不受每日上限影响', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n2')
    await prisma.notificationPolicy.create({
      data: { userId, dailyInterruptCap: 0, timezone: 'UTC' },
    })
    // 塞满非必要投递记录
    await prisma.notificationDelivery.create({
      data: {
        userId,
        eventType: 'DEMAND_MATCHED',
        category: 'USER_REQUESTED',
        reasonCode: 'x',
        reasonText: 'x',
        channel: 'IN_APP',
        status: 'SENT',
      },
    })
    const d = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'ORDER_FUNDS_CHANGED' },
    )
    expect(d.deliver).toBe(true)
    expect(d.channels).toContain('IN_APP')
    expect(d.reasonCode).toBe('TRANSACTIONAL_REQUIRED')
  })

  it('N3: 显式订阅匹配；FILTER_MISS', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n3')
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: { tags: ['家电维修'], regionIds: [330100] },
        sourceRef: '',
      },
    })
    const hit = await evaluateNotificationDecision(
      { prisma },
      {
        userId,
        eventType: 'DEMAND_MATCHED',
        filterContext: { tags: ['家电维修'], regionIds: [330100], price: 100 },
      },
    )
    expect(hit.deliver).toBe(true)
    expect(hit.reasonCode).toBe('SUBSCRIBED_MATCH')

    const miss = await evaluateNotificationDecision(
      { prisma },
      {
        userId,
        eventType: 'DEMAND_MATCHED',
        filterContext: { tags: ['搬家'], regionIds: [330100] },
      },
    )
    expect(miss.deliver).toBe(false)
    expect(miss.suppressionCode).toBe('FILTER_MISS')
  })

  it('N4: 安静时段即时机会 → QUIET_HOURS / digest', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n4')
    await prisma.notificationPolicy.create({
      data: {
        userId,
        timezone: 'Asia/Shanghai',
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        dailyInterruptCap: 10,
      },
    })
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP', 'WINDOWS'],
        filters: {},
        sourceRef: '',
      },
    })
    const now = new Date('2026-07-28T15:30:00.000Z') // 23:30 CST
    const d = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'DEMAND_MATCHED', now, filterContext: {} },
    )
    expect(d.deliver).toBe(true)
    expect(d.mode).toBe('DIGEST')
    expect(d.suppressionCode).toBe('QUIET_HOURS')
    expect(d.deferWindows).toBe(true)

    const tx = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'ORDER_FUNDS_CHANGED', now },
    )
    expect(tx.deliver).toBe(true)
    expect(tx.channels).toContain('IN_APP')
    expect(tx.deferWindows).toBe(true)
  })

  it('N5: 每日上限', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n5')
    await prisma.notificationPolicy.create({
      data: { userId, dailyInterruptCap: 1, timezone: 'UTC' },
    })
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: {},
        sourceRef: '',
      },
    })
    await evaluateAndRecord(prisma, { userId, eventType: 'DEMAND_MATCHED', filterContext: {} })
    const second = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'DEMAND_MATCHED', filterContext: {} },
    )
    expect(second.deliver).toBe(false)
    expect(second.suppressionCode).toBe('DAILY_CAP')
  })

  it('N6: 订阅过期', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n6')
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: {},
        sourceRef: '',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    })
    const d = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'DEMAND_MATCHED', filterContext: {} },
    )
    expect(d.suppressionCode).toBe('EXPIRED')
  })

  it('N7: taskQuiet → TASK_QUIET', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n7')
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'LOOP_RUN_RESULT',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: {},
        sourceRef: 'run-1',
      },
    })
    const d = await evaluateNotificationDecision(
      { prisma },
      {
        userId,
        eventType: 'LOOP_RUN_RESULT',
        sourceRef: 'run-1',
        taskQuiet: true,
      },
    )
    expect(d.suppressionCode).toBe('TASK_QUIET')
  })

  it('N8: 每个决策都有 reasonCode/reasonText', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n8')
    const d = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'OPPORTUNITY_DIGEST' },
    )
    expect(d.reasonCode.length).toBeGreaterThan(0)
    expect(d.reasonText.length).toBeGreaterThan(0)
  })

  it('N9: 暂停全部非必要通知', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('n9')
    await prisma.notificationPolicy.create({
      data: { userId, nonEssentialPaused: true },
    })
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'DIGEST',
        eventType: 'OPPORTUNITY_DIGEST',
        mode: 'DIGEST',
        channels: ['IN_APP'],
        filters: {},
        sourceRef: '',
      },
    })
    const d = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'OPPORTUNITY_DIGEST' },
    )
    expect(d.suppressionCode).toBe('NON_ESSENTIAL_PAUSED')
    const tx = await evaluateNotificationDecision(
      { prisma },
      { userId, eventType: 'SECURITY_ALERT' },
    )
    expect(tx.deliver).toBe(true)
  })

  it('preview 无副作用', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('pv')
    const before = await prisma.notificationDelivery.count({ where: { userId } })
    await previewNotificationDecision(prisma, {
      userId,
      eventType: 'DEMAND_MATCHED',
    })
    const after = await prisma.notificationDelivery.count({ where: { userId } })
    expect(after).toBe(before)
  })

  it('API: 不能读写他人订阅；非法 eventType 拒绝', async ({ skip }) => {
    if (!ready) return skip()
    const a = await createUser('a')
    const b = await createUser('b')
    const created = await request(app)
      .post('/api/notifications/subscriptions')
      .set('x-test-user', a)
      .send({
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: { tags: ['x'] },
      })
    expect(created.status).toBe(201)
    const subId = created.body.data.id

    const steal = await request(app)
      .put(`/api/notifications/subscriptions/${subId}`)
      .set('x-test-user', b)
      .send({ mode: 'OFF' })
    expect(steal.status).toBe(404)

    const bad = await request(app)
      .post('/api/notifications/subscriptions')
      .set('x-test-user', a)
      .send({
        eventType: 'BUY_ADS_NOW',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
      })
    expect(bad.status).toBe(400)

    const badTz = await request(app)
      .put('/api/notifications/policy')
      .set('x-test-user', a)
      .send({ timezone: 'Mars/Phobos', dailyInterruptCap: 3 })
    expect(badTz.status).toBe(400)

    const badCap = await request(app)
      .put('/api/notifications/policy')
      .set('x-test-user', a)
      .send({ dailyInterruptCap: 999 })
    expect(badCap.status).toBe(400)

    const badQuiet = await request(app)
      .put('/api/notifications/policy')
      .set('x-test-user', a)
      .send({ quietHoursStart: '25:00', quietHoursEnd: '07:00' })
    expect(badQuiet.status).toBe(400)
  })

  it('并发创建同一订阅不产生重复', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('dup')
    const payload = {
      eventType: 'CIRCLE_DIGEST',
      mode: 'DIGEST',
      channels: ['IN_APP'],
      sourceRef: 'circle-1',
    }
    const [r1, r2] = await Promise.all([
      request(app).post('/api/notifications/subscriptions').set('x-test-user', userId).send(payload),
      request(app).post('/api/notifications/subscriptions').set('x-test-user', userId).send(payload),
    ])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([201, 409])
    const count = await prisma.notificationSubscription.count({
      where: { userId, eventType: 'CIRCLE_DIGEST', sourceRef: 'circle-1' },
    })
    expect(count).toBe(1)
  })

  it('PushPreference 仍可读写（兼容未破坏）', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('pp')
    const pref = await prisma.pushPreference.create({
      data: { userId, receivePushes: true, excludeKeywords: ['a'] },
    })
    expect(pref.receivePushes).toBe(true)
    const again = await prisma.pushPreference.findUnique({ where: { userId } })
    expect(again?.excludeKeywords).toEqual(['a'])
  })

  it('API preview 端点无副作用', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser('apipv')
    const res = await request(app)
      .post('/api/notifications/preview')
      .set('x-test-user', userId)
      .send({ eventType: 'DEMAND_MATCHED' })
    expect(res.status).toBe(200)
    expect(res.body.data.sideEffect.deliveryCountBefore).toBe(
      res.body.data.sideEffect.deliveryCountAfter,
    )
    expect(res.body.data.decision.reasonCode).toBeTruthy()
  })
})
