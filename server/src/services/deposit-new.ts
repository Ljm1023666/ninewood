/**
 * AI 2.5 新版押金服务 — 单体需求级别押金
 * 规则: 第 1 条免费, ≥2 条未完成需求时每条收 minPrice × 1%
 */

import { prisma } from '../lib/prisma'

export async function calculateDeposit(
  userId: string,
  minPrice: number,
): Promise<number> {
  const activeCount = await prisma.demand.count({
    where: {
      userId,
      status: { in: ['PENDING', 'ACTIVE', 'IN_PROGRESS'] },
    },
  })
  // 第一条免费
  if (activeCount < 1) return 0
  return Math.round(minPrice * 0.01 * 100) / 100
}

export async function checkFrozenBeforePublish(userId: string) {
  const frozenCount = await prisma.demand.count({
    where: { userId, status: 'FROZEN' },
  })
  if (frozenCount > 0) {
    throw new Error(
      `请先删除 ${frozenCount} 条冻结需求后再发布新需求`,
    )
  }
}

export async function refundDeposit(
  demandId: string,
  reason: 'COMPLETED' | 'WITHDRAWN' | 'DELETE_FROZEN',
) {
  const demand = await prisma.demand.findUnique({ where: { id: demandId } })
  if (!demand || demand.deposit <= 0) return 0

  let ratio: number
  switch (reason) {
    case 'COMPLETED':
      ratio = 1.0
      break
    case 'DELETE_FROZEN':
      ratio = 1.0
      break
    case 'WITHDRAWN':
      ratio = 0.9999
      break
    default:
      ratio = 0
  }

  return Math.round(demand.deposit * ratio * 100) / 100
}
