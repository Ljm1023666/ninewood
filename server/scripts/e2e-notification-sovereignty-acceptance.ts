/**
 * 本机端到端验收：NOTIFICATION_SOVEREIGNTY_ENABLED=1
 * 覆盖 Demand / AgentTask / 暂停 / 安静时段 / 每日上限 / 投递原因
 *
 * 用法：pnpm --filter server exec tsx scripts/e2e-notification-sovereignty-acceptance.ts
 * 只连本地 DATABASE_URL；不碰生产。
 */

import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { canTakeOverNotificationTraffic } from '../src/config/notification-sovereignty.js'
import { matchAndPush } from '../src/services/push-engine.js'
import { evaluateAndRecord } from '../src/services/notification-delivery.service.js'
import { evaluateNotificationDecision } from '../src/services/notification-decision.service.js'
import { maybeDeliverAgentTaskMessage } from '../src/cron/agent-task-scheduler.js'
import {
  agentTaskSourceRef,
  userTagSourceRef,
} from '../src/services/notification-legacy-migration.js'

process.env.NOTIFICATION_SOVEREIGNTY_ENABLED = '1'

const prisma = new PrismaClient()
const userIds: string[] = []
const demandIds: string[] = []
const failures: string[] = []

function assert(cond: unknown, msg: string) {
  if (!cond) failures.push(msg)
  else console.log('  OK', msg)
}

async function createUser(label: string) {
  const id = randomUUID()
  userIds.push(id)
  await prisma.user.create({
    data: {
      id,
      phone: `1${id.replace(/-/g, '').slice(0, 10)}`,
      nickname: `e2e-${label}-${id.slice(0, 4)}`,
    },
  })
  return id
}

async function createDemand(ownerId: string, title: string, tag: string) {
  const id = randomUUID()
  demandIds.push(id)
  await prisma.demand.create({
    data: {
      id,
      userId: ownerId,
      title,
      description: `${title} desc`,
      minPrice: 50,
      category: 'service',
      serviceType: 'ONLINE',
      tagName: tag,
      tags: [tag],
      expireAt: new Date(Date.now() + 86400000),
    },
  })
  return id
}

async function cleanup() {
  if (userIds.length) {
    await prisma.message.deleteMany({ where: { toUserId: { in: userIds } } }).catch(() => {})
    await prisma.notificationDelivery.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
    await prisma.notificationSubscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
    await prisma.notificationPolicy.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
    await prisma.agentTaskRun.deleteMany({ where: { task: { userId: { in: userIds } } } }).catch(() => {})
    await prisma.agentTask.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {})
    await prisma.demand.deleteMany({ where: { id: { in: demandIds } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
  }
}

async function main() {
  console.log('[e2e] flag takeover DEMAND_MATCHED=', canTakeOverNotificationTraffic('DEMAND_MATCHED'))
  console.log('[e2e] flag takeover ORDER_FUNDS=', canTakeOverNotificationTraffic('ORDER_FUNDS_CHANGED'))
  assert(canTakeOverNotificationTraffic('DEMAND_MATCHED') === true, 'flag=1 接管 DEMAND_MATCHED')
  assert(canTakeOverNotificationTraffic('ORDER_FUNDS_CHANGED') === false, 'flag=1 不接管交易必要')

  const owner = await createUser('owner')
  const provider = await createUser('provider')
  const agentUser = await createUser('agent')

  // ── 1) Demand：无订阅不投递 ──
  console.log('\n[1] Demand 无订阅')
  const d1 = await createDemand(owner, '无订阅需求', '家电维修')
  const rNone = await matchAndPush(d1, { tags: ['家电维修'] })
  assert(rNone.sovereignty === true, 'Demand 走主权路径')
  assert(rNone.totalSent === 0, '无订阅 totalSent=0')

  // ── 2) Demand：有订阅投递 + Message + 原因 ──
  console.log('\n[2] Demand 有订阅')
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
  const d2 = await createDemand(owner, '有订阅需求', '家电维修')
  const rHit = await matchAndPush(d2, { tags: ['家电维修'] })
  assert(rHit.totalSent === 1, '有订阅投递 1 人')
  const msgCount = await prisma.message.count({
    where: { toUserId: provider, type: 'SYSTEM', content: { contains: '[DEMAND_MATCH]' } },
  })
  assert(msgCount >= 1, '站内 Message 已落库')
  const deliv = await prisma.notificationDelivery.findFirst({
    where: { userId: provider, eventType: 'DEMAND_MATCHED', resourceId: d2, status: 'SENT' },
  })
  assert(!!deliv?.reasonCode && !!deliv?.reasonText, '投递含 reasonCode/reasonText')

  const rDup = await matchAndPush(d2, { tags: ['家电维修'] })
  assert((rDup.rejectReasons.DUPLICATE || 0) >= 1, '同 demand 幂等 DUPLICATE')
  assert(rDup.totalSent === 0, '幂等不再投递')

  // ── 3) 暂停非必要 ──
  console.log('\n[3] nonEssentialPaused')
  await prisma.notificationPolicy.upsert({
    where: { userId: provider },
    create: { userId: provider, nonEssentialPaused: true, dailyInterruptCap: 10 },
    update: { nonEssentialPaused: true, dailyInterruptCap: 10 },
  })
  const d3 = await createDemand(owner, '暂停后需求', '家电维修')
  const rPause = await matchAndPush(d3, { tags: ['家电维修'] })
  assert(rPause.totalSent === 0, '暂停后不投递')
  assert((rPause.rejectReasons.NON_ESSENTIAL_PAUSED || 0) >= 1, '原因 NON_ESSENTIAL_PAUSED')
  await prisma.notificationPolicy.update({
    where: { userId: provider },
    data: { nonEssentialPaused: false },
  })

  // ── 4) 安静时段 ──
  console.log('\n[4] quiet hours')
  await prisma.notificationPolicy.update({
    where: { userId: provider },
    data: {
      timezone: 'Asia/Shanghai',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      dailyInterruptCap: 10,
    },
  })
  const quietNow = new Date('2026-07-28T15:30:00.000Z') // 23:30 CST
  const quietDecision = await evaluateNotificationDecision(
    { prisma },
    {
      userId: provider,
      eventType: 'DEMAND_MATCHED',
      sourceRef: userTagSourceRef(tagId),
      filterContext: { tags: ['家电维修'] },
      now: quietNow,
    },
  )
  assert(quietDecision.deliver === true, '安静时段仍可站内/摘要投递')
  assert(quietDecision.suppressionCode === 'QUIET_HOURS' || quietDecision.mode === 'DIGEST', '安静时段 QUIET_HOURS/DIGEST')
  assert(quietDecision.deferWindows === true, '安静时段 deferWindows')
  assert(!!quietDecision.reasonCode && !!quietDecision.reasonText, '安静时段有原因文案')

  // 交易必要在安静时段仍站内
  const txQuiet = await evaluateNotificationDecision(
    { prisma },
    { userId: provider, eventType: 'ORDER_FUNDS_CHANGED', now: quietNow },
  )
  assert(txQuiet.deliver === true && txQuiet.channels.includes('IN_APP'), '交易必要安静时段仍站内')

  // ── 5) 每日上限 ──
  console.log('\n[5] dailyInterruptCap')
  await prisma.notificationPolicy.update({
    where: { userId: provider },
    data: {
      quietHoursStart: null,
      quietHoursEnd: null,
      dailyInterruptCap: 1,
      timezone: 'UTC',
      nonEssentialPaused: false,
    },
  })
  // 已有 SENT 投递占额度；再评一次应 DAILY_CAP
  const afterCap = await evaluateNotificationDecision(
    { prisma },
    {
      userId: provider,
      eventType: 'DEMAND_MATCHED',
      sourceRef: userTagSourceRef(tagId),
      filterContext: { tags: ['家电维修'] },
    },
  )
  assert(afterCap.deliver === false, '达上限不投递')
  assert(afterCap.suppressionCode === 'DAILY_CAP', '原因 DAILY_CAP')
  assert(!!afterCap.reasonText, 'DAILY_CAP 有 reasonText')

  // ── 6) AgentTask ──
  console.log('\n[6] AgentTask')
  await prisma.notificationPolicy.upsert({
    where: { userId: agentUser },
    create: { userId: agentUser, dailyInterruptCap: 10, nonEssentialPaused: false },
    update: { dailyInterruptCap: 10, nonEssentialPaused: false },
  })
  const taskId = randomUUID()
  await prisma.agentTask.create({
    data: {
      id: taskId,
      userId: agentUser,
      name: 'e2e digest',
      type: 'DEMAND_DIGEST',
      enabled: true,
      frequency: 'DAILY',
      atMinute: 0,
      filters: {},
      deliveryChannels: ['MESSAGE', 'AGENT_INBOX'],
      nextRunAt: new Date(Date.now() + 3600000),
    },
  })
  await prisma.notificationSubscription.create({
    data: {
      userId: agentUser,
      category: 'USER_REQUESTED',
      eventType: 'AGENT_TASK_RESULT',
      mode: 'IMMEDIATE',
      channels: ['IN_APP'],
      filters: { taskId },
      sourceRef: agentTaskSourceRef(taskId),
    },
  })
  const runId = randomUUID()
  await prisma.agentTaskRun.create({
    data: {
      id: runId,
      taskId,
      status: 'SUCCESS',
      resultCount: 1,
      summary: '找到 1 条机会',
      payload: [],
    },
  })
  await maybeDeliverAgentTaskMessage({
    userId: agentUser,
    taskId,
    taskName: 'e2e digest',
    summary: '找到 1 条机会',
    runId,
  })
  const agentMsg = await prisma.message.count({
    where: { toUserId: agentUser, type: 'SYSTEM', content: { contains: '[AGENT_TASK]' } },
  })
  assert(agentMsg >= 1, 'AgentTask 订阅后落库 Message')
  const agentDel = await prisma.notificationDelivery.findFirst({
    where: { userId: agentUser, eventType: 'AGENT_TASK_RESULT', resourceId: runId },
  })
  assert(!!agentDel?.reasonCode && !!agentDel?.reasonText, 'AgentTask 投递有原因')

  // 抑制：暂停后仍可记录运行，不发 Message
  await prisma.notificationPolicy.update({
    where: { userId: agentUser },
    data: { nonEssentialPaused: true },
  })
  const runId2 = randomUUID()
  await prisma.agentTaskRun.create({
    data: {
      id: runId2,
      taskId,
      status: 'SUCCESS',
      resultCount: 2,
      summary: '又找到 2 条',
      payload: [],
    },
  })
  const msgBefore = await prisma.message.count({ where: { toUserId: agentUser, type: 'SYSTEM' } })
  await maybeDeliverAgentTaskMessage({
    userId: agentUser,
    taskId,
    taskName: 'e2e digest',
    summary: '又找到 2 条',
    runId: runId2,
  })
  const msgAfter = await prisma.message.count({ where: { toUserId: agentUser, type: 'SYSTEM' } })
  assert(msgAfter === msgBefore, 'AgentTask 抑制不发 Message')
  const runStillOk = await prisma.agentTaskRun.findUnique({ where: { id: runId2 } })
  assert(runStillOk?.status === 'SUCCESS', '抑制不改 AgentTaskRun 成败')

  const suppressed = await evaluateAndRecord(prisma, {
    userId: agentUser,
    eventType: 'AGENT_TASK_RESULT',
    sourceRef: agentTaskSourceRef(taskId),
    resourceType: 'AgentTaskRun',
    resourceId: randomUUID(),
    filterContext: { taskId },
  })
  assert(suppressed.decision.suppressionCode === 'NON_ESSENTIAL_PAUSED', 'Agent 暂停抑制码')
  assert(!!suppressed.decision.reasonText, '抑制仍有 reasonText')

  // ── 汇总 ──
  console.log('\n========== E2E SUMMARY ==========')
  if (failures.length) {
    console.error('FAILED', failures.length)
    for (const f of failures) console.error(' -', f)
    process.exitCode = 1
  } else {
    console.log('ALL PASSED')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    await prisma.$disconnect()
  })
