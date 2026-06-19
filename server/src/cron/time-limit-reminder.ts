/**
 * Stage 1.3: 服务时限到期一次性提醒（系统站内消息）
 *
 * 扫描条件（同时满足）：
 *   1. Demand.status === 'IN_PROGRESS'
 *   2. Demand.timeLimit IS NOT NULL
 *   3. Demand.timeLimit <= now
 *   4. 存在关联 Order.status === 'IN_PROGRESS'（同一 demandId）
 *
 * 行为：向 requester / provider 各发一条以 `[TIME_LIMIT]` 开头的 SYSTEM 消息；
 * 幂等：同 orderId 已发过则跳过（cron 无 io，本期仅 DB 消息）。
 */

import { prisma } from '../lib/prisma.js'

/** cron 单批最大处理订单数，避免长事务 */
const BATCH_SIZE = 50

/** 提醒内容前缀，用于幂等去重 */
const TAG = '[TIME_LIMIT]'

export async function processTimeLimitReminders(): Promise<number> {
  const now = new Date()

  // 用 Order 作锚点：where 中嵌入 demand 条件，避免两次查询
  const orders = await prisma.order.findMany({
    where: {
      status: 'IN_PROGRESS',
      demand: {
        status: 'IN_PROGRESS',
        timeLimit: { not: null, lte: now },
      },
    },
    select: {
      id: true,
      requesterId: true,
      providerId: true,
      demand: { select: { id: true, title: true } },
    },
    take: BATCH_SIZE,
  })

  if (orders.length === 0) return 0

  let sent = 0
  for (const order of orders) {
    try {
      // 幂等：同 orderId 已有 [TIME_LIMIT] 消息则跳过
      const exists = await prisma.message.findFirst({
        where: {
          orderId: order.id,
          type: 'SYSTEM',
          content: { startsWith: TAG },
        },
        select: { id: true },
      })
      if (exists) continue

      const title = order.demand.title
      await prisma.message.createMany({
        data: [
          {
            fromUserId: order.requesterId,
            toUserId: order.requesterId,
            orderId: order.id,
            type: 'SYSTEM',
            content: `${TAG} 需求「${title}」的服务时限已到期，请与服务方确认完成情况或发起验收。`,
          },
          {
            fromUserId: order.providerId,
            toUserId: order.providerId,
            orderId: order.id,
            type: 'SYSTEM',
            content: `${TAG} 需求「${title}」的服务时限已到期，请标记完成或与需求方沟通。`,
          },
        ],
      })
      sent += 1
    } catch (err) {
      console.warn(`[time-limit-reminder] order ${order.id} failed:`, err)
    }
  }

  if (sent > 0) {
    console.log(`[time-limit-reminder] sent ${sent}/${orders.length} reminders`)
  }
  return sent
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startTimeLimitReminderCron(intervalMs = 60_000) {
  if (intervalId) return
  intervalId = setInterval(() => {
    processTimeLimitReminders().catch((err) =>
      console.error('[time-limit-reminder] cron error:', err),
    )
  }, intervalMs)
  console.log(`[time-limit-reminder] started (interval: ${intervalMs}ms)`)
}

export function stopTimeLimitReminderCron() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}