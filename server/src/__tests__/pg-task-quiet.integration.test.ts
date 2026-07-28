/**
 * Phase 2：Task Quiet / CompletionSummary（Q1–Q5、Q8）+ A2 空查询
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { quietTask, isResourceQuieted } from '../services/task-quiet.service.js'
import { evaluateNotificationDecision } from '../services/notification-decision.service.js'
import { mapLoopStatusToOutcome } from '../services/task-quiet.types.js'

const DATABASE_URL = process.env.DATABASE_URL || ''
const RUN = process.env.RUN_PG_NOTIFICATION_TESTS === '1' || process.env.CI === 'true'

const prisma = new PrismaClient()

async function dbReady(): Promise<boolean> {
  if (!DATABASE_URL || !RUN) return false
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "TaskQuietRecord" LIMIT 1')
    return true
  } catch {
    return false
  }
}

describe('task-quiet types (unit)', () => {
  it('mapLoopStatusToOutcome', () => {
    expect(mapLoopStatusToOutcome('SUCCEEDED')).toBe('SUCCEEDED')
    expect(mapLoopStatusToOutcome('FAILED')).toBe('FAILED')
    expect(mapLoopStatusToOutcome('INCONCLUSIVE')).toBe('INCONCLUSIVE')
    expect(mapLoopStatusToOutcome('CLOSED')).toBe('SUCCEEDED')
  })
})

describe.runIf(RUN)('PG Phase 2 Task Quiet', () => {
  let ready = false
  const userIds: string[] = []
  const resourceIds: string[] = []
  const prevQuiet = process.env.TASK_QUIET_ENABLED

  beforeAll(async () => {
    ready = await dbReady()
    process.env.TASK_QUIET_ENABLED = '1'
  }, 30_000)

  afterAll(async () => {
    if (prevQuiet === undefined) delete process.env.TASK_QUIET_ENABLED
    else process.env.TASK_QUIET_ENABLED = prevQuiet
    if (ready) {
      await prisma.notificationDelivery.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.notificationSubscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
      await prisma.taskQuietRecord.deleteMany({
        where: { OR: [{ userId: { in: userIds } }, { resourceId: { in: resourceIds } }] },
      }).catch(() => {})
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
        nickname: `p2-${id.slice(0, 6)}`,
      },
    })
    return id
  }

  it('Q1/Q8: LoopRun Quiet 生成 CompletionSummary，无下一步时 nextRequiredAction=null', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser()
    const runId = randomUUID()
    resourceIds.push(runId)

    const summary = await quietTask({
      resourceType: 'LOOP_RUN',
      resourceId: runId,
      outcomeStatus: 'SUCCEEDED',
      outcomeSummary: '回运行已 SUCCEEDED',
      userId,
      nextRequiredAction: null,
    })
    expect(summary.outcomeStatus).toBe('SUCCEEDED')
    expect(summary.nextRequiredAction).toBeNull()
    expect(summary.alreadyQuiet).toBe(false)
    expect(await isResourceQuieted({ resourceId: runId })).toBe(true)
  })

  it('Q2: INCONCLUSIVE 带明确下一步，不伪装成功', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser()
    const runId = randomUUID()
    resourceIds.push(runId)
    const summary = await quietTask({
      resourceType: 'LOOP_RUN',
      resourceId: runId,
      outcomeStatus: 'INCONCLUSIVE',
      outcomeSummary: '回运行已 INCONCLUSIVE',
      userId,
      nextRequiredAction: { label: '查看详情或重试', action: 'VIEW_DETAIL' },
    })
    expect(summary.outcomeStatus).toBe('INCONCLUSIVE')
    expect(summary.nextRequiredAction?.action).toBe('VIEW_DETAIL')
  })

  it('Q3/Q4: Order/Demand Quiet 停止订阅与待发；Q5 幂等', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser()
    const orderId = randomUUID()
    const demandId = randomUUID()
    resourceIds.push(orderId, demandId)

    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: {},
        sourceRef: `order:${orderId}`,
      },
    })
    await prisma.notificationDelivery.create({
      data: {
        userId,
        eventType: 'DEMAND_MATCHED',
        category: 'USER_REQUESTED',
        reasonCode: 'TEST',
        reasonText: 'queued',
        channel: 'IN_APP',
        status: 'QUEUED',
        resourceType: 'Demand',
        resourceId: demandId,
      },
    })

    const first = await quietTask({
      resourceType: 'ORDER',
      resourceId: orderId,
      outcomeStatus: 'SUCCEEDED',
      outcomeSummary: '订单已完成',
      userId,
      nextRequiredAction: null,
    })
    expect(first.alreadyQuiet).toBe(false)
    expect(first.notificationsStopped.length).toBeGreaterThan(0)

    const sub = await prisma.notificationSubscription.findFirst({
      where: { userId, sourceRef: `order:${orderId}` },
    })
    expect(sub?.mode).toBe('OFF')

    const second = await quietTask({
      resourceType: 'ORDER',
      resourceId: orderId,
      outcomeStatus: 'SUCCEEDED',
      outcomeSummary: '订单已完成',
      userId,
      nextRequiredAction: null,
    })
    expect(second.alreadyQuiet).toBe(true)

    await quietTask({
      resourceType: 'DEMAND',
      resourceId: demandId,
      outcomeStatus: 'WITHDRAWN',
      outcomeSummary: '需求已撤回',
      userId,
      nextRequiredAction: null,
    })
    const queued = await prisma.notificationDelivery.count({
      where: { resourceId: demandId, status: 'QUEUED' },
    })
    expect(queued).toBe(0)
  })

  it('Quiet 后决策抑制非必要通知（TASK_QUIET）', async ({ skip }) => {
    if (!ready) return skip()
    const userId = await createUser()
    const runId = randomUUID()
    resourceIds.push(runId)
    await quietTask({
      resourceType: 'LOOP_RUN',
      resourceId: runId,
      outcomeStatus: 'SUCCEEDED',
      outcomeSummary: 'done',
      userId,
      nextRequiredAction: null,
    })
    await prisma.notificationSubscription.create({
      data: {
        userId,
        category: 'USER_REQUESTED',
        eventType: 'LOOP_RUN_RESULT',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters: {},
        sourceRef: `loop_run:${runId}`,
      },
    })
    const decision = await evaluateNotificationDecision(
      { prisma },
      {
        userId,
        eventType: 'LOOP_RUN_RESULT',
        sourceRef: `loop_run:${runId}`,
        resourceId: runId,
      },
    )
    expect(decision.deliver).toBe(false)
    expect(decision.suppressionCode).toBe('TASK_QUIET')
  })
})
