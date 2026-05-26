/**
 * AI 2.8 公益随机奖励服务
 * 规则: 公益资金池余额 → 随机红包，池空 → 精神奖励
 */
import { prisma } from '../lib/prisma.js'

const SPIRITUAL_BADGES = [
  '公益之星',
  '爱心使者',
  '社区贡献者',
  '温暖之手',
  '善行先锋',
]

export const welfareRewardService = {
  /** 完成公益需求后发放奖励 */
  async grantReward(demandId: string, providerId: string, regionId: number) {
    const pool = await prisma.welfareFundPool.findUnique({ where: { regionId } })

    // 池子有余额 → 随机红包
    if (pool && pool.balance > 0) {
      const maxReward = Math.min(pool.balance, 200) // 单次最高 200
      const amount = Math.round((Math.random() * maxReward * 100)) / 100

      if (amount > 0) {
        await prisma.$transaction([
          prisma.welfareReward.create({
            data: { demandId, providerId, amount, fundPoolId: pool.id },
          }),
          prisma.welfareFundPool.update({
            where: { regionId },
            data: {
              balance: { decrement: amount },
              totalOutflow: { increment: amount },
            },
          }),
        ])
        return { type: 'monetary' as const, amount, badge: null }
      }
    }

    // 池子空 → 精神奖励
    const badge = SPIRITUAL_BADGES[Math.floor(Math.random() * SPIRITUAL_BADGES.length)]
    await prisma.welfareReward.create({
      data: {
        demandId,
        providerId,
        amount: 0,
        isSpiritual: true,
        badge,
      },
    })
    return { type: 'spiritual' as const, amount: 0, badge }
  },

  /** 获取用户的奖励历史 */
  async getUserRewards(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.welfareReward.findMany({
        where: { providerId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.welfareReward.count({ where: { providerId: userId } }),
    ])

    const totalEarned = await prisma.welfareReward.aggregate({
      where: { providerId: userId, isSpiritual: false },
      _sum: { amount: true },
    })

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totalEarned: totalEarned._sum.amount || 0,
      badges: items.filter((r) => r.badge).map((r) => r.badge),
    }
  },
}
