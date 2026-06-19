/**
 * AI 2.5 紧急窗口定时任务 — 每 30 秒扫描
 * 1. 超时冻结 (ACTIVE + visibleUntil <= now)
 * 2. 沟通超时 (COMMUNICATING + commDeadline <= now)
 */

import { prisma } from '../lib/prisma'

export async function processDemandWindows() {
  const now = new Date()

  // 1. 超时冻结
  const frozen = await prisma.demand.updateMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      visibleUntil: { lte: now },
      acceptedProviderId: null,
    },
    data: { status: 'FROZEN', frozenAt: now },
  })

  // 2. 沟通超时
  const timedOut = await prisma.demandApplicantV2.updateMany({
    where: {
      status: 'COMMUNICATING',
      commDeadline: { lte: now },
    },
    data: { status: 'TIMED_OUT' },
  })

  if (frozen.count > 0 || timedOut.count > 0) {
    console.log(
      `[demand-window] frozen: ${frozen.count}, timedOut: ${timedOut.count}`,
    )
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startDemandWindowCron(intervalMs = 30000) {
  if (intervalId) return
  intervalId = setInterval(processDemandWindows, intervalMs)
  console.log(`[demand-window] started (interval: ${intervalMs}ms)`)
}

export function stopDemandWindowCron() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
