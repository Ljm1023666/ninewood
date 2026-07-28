/**
 * Phase 1B：主权接管 Demand 匹配（真实 PG）
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { matchAndPush } from '../services/push-engine.js'
import { userTagSourceRef } from '../services/notification-legacy-migration.js'

const DATABASE_URL = process.env.DATABASE_URL || ''
const RUN = process.env.RUN_PG_NOTIFICATION_TESTS === '1' || process.env.CI === 'true'

const prisma = new PrismaClient()

async function dbReady(): Promise<boolean> {
  if (!DATABASE_URL || !RUN) return false
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "NotificationSubscription" LIMIT 1')
    return true
  } catch {
    return false
  }
}

describe.runIf(RUN)('PG Phase 1B demand match takeover', () => {
  let ready = false
  const userIds: string[] = []
  const demandIds: string[] = []
  const prevFlag = process.env.NOTIFICATION_SOVEREIGNTY_ENABLED

  beforeAll(async () => {
    ready = await dbReady()
    process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '1'
  }, 30_000)

  afterAll(async () => {
    if (prevFlag === undefined) delete process.env.NOTIFICATION_SOVEREIGNTY_ENABLED
    else process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = prevFlag
    if (ready) {
      await prisma.message.deleteMany({ where: { toUserId: { in: userIds } } }).catch(() => {})
      await prisma.notificationDelivery.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.notificationSubscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.notificationPolicy.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.demand.deleteMany({ where: { id: { in: demandIds } } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
    await prisma.$disconnect()
  }, 60_000)

  async function createUser() {
    const id = randomUUID()
    userIds.push(id)
    await prisma.user.create({
      data: {
        id,
        phone: `1${id.replace(/-/g, '').slice(0, 10)}`,
        nickname: `p1b-${id.slice(0, 6)}`,
      },
    })
    return id
  }

  it('无订阅不投递；有 DEMAND_MATCHED 订阅则落库 Message 且幂等', async ({ skip }) => {
    if (!ready) return skip()
    const provider = await createUser()
    const owner = await createUser()
    const demandId = randomUUID()
    demandIds.push(demandId)

    await prisma.demand.create({
      data: {
        id: demandId,
        userId: owner,
        title: '修冰箱',
        description: '家电维修测试',
        minPrice: 100,
        category: 'service',
        serviceType: 'ONLINE',
        tagName: '家电维修',
        tags: ['家电维修'],
        regionId: null,
        expireAt: new Date(Date.now() + 86400000),
      },
    })

    const none = await matchAndPush(demandId, { tags: ['家电维修'] })
    expect(none.totalSent).toBe(0)
    expect(none.sovereignty).toBe(true)

    const tagId = randomUUID()
    await prisma.notificationSubscription.create({
      data: {
        userId: provider,
        category: 'USER_REQUESTED',
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: { tags: ['家电维修'] },
        sourceRef: userTagSourceRef(tagId),
      },
    })

    const first = await matchAndPush(demandId, { tags: ['家电维修'] })
    expect(first.totalSent).toBe(1)

    const msgs = await prisma.message.count({
      where: { toUserId: provider, type: 'SYSTEM' },
    })
    expect(msgs).toBe(1)

    const second = await matchAndPush(demandId, { tags: ['家电维修'] })
    expect(second.rejectReasons.DUPLICATE).toBeGreaterThan(0)
    expect(second.totalSent).toBe(0)

    const msgs2 = await prisma.message.count({
      where: { toUserId: provider, type: 'SYSTEM' },
    })
    expect(msgs2).toBe(1)
  })

  it('flag 关闭时不写 NotificationDelivery', async ({ skip }) => {
    if (!ready) return skip()
    process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '0'
    const owner = await createUser()
    const demandId = randomUUID()
    demandIds.push(demandId)
    await prisma.demand.create({
      data: {
        id: demandId,
        userId: owner,
        title: 'legacy',
        description: 'x',
        minPrice: 1,
        category: 'service',
        serviceType: 'ONLINE',
        expireAt: new Date(Date.now() + 86400000),
      },
    })
    const before = await prisma.notificationDelivery.count()
    const r = await matchAndPush(demandId, { tags: ['x'], autoReceiveOnly: true })
    expect(r.sovereignty).toBe(false)
    const after = await prisma.notificationDelivery.count()
    expect(after).toBe(before)
    process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '1'
  })
})
