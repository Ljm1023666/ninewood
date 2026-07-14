import { prisma } from '../lib/prisma.js'
import { isMinor } from './compliance-age.js'

/** 未成年人单笔托管/支付上限（点数，1 点 = 1 元） */
export const MINOR_SINGLE_TX_LIMIT = 200
/** 未成年人每日累计支出上限 */
export const MINOR_DAILY_TX_LIMIT = 500

export async function assertMinorCanSpend(
  userId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { birthday: true },
  })
  if (!user?.birthday || !isMinor(user.birthday)) return

  if (amount > MINOR_SINGLE_TX_LIMIT) {
    throw {
      status: 403,
      message: `未成年人单笔限额 ${MINOR_SINGLE_TX_LIMIT} 点，请由监护人协助操作或降低金额`,
    }
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const agg = await prisma.walletLedger.aggregate({
    where: {
      userId,
      createdAt: { gte: startOfDay },
      amount: { lt: 0 },
    },
    _sum: { amount: true },
  })
  const spentToday = Math.abs(Number(agg._sum.amount ?? 0))
  if (spentToday + amount > MINOR_DAILY_TX_LIMIT) {
    throw {
      status: 403,
      message: `未成年人每日支出限额 ${MINOR_DAILY_TX_LIMIT} 点，今日剩余 ${Math.max(0, MINOR_DAILY_TX_LIMIT - spentToday)} 点`,
    }
  }
}
