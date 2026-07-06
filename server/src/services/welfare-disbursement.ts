/**
 * Stage 1.2: 激励池 → 平台账户拨付 service
 *
 * 合规说明（内测期 v0.1）：
 * - 本服务在产品上对应"激励中心"页面，原"公益资金池→政府拨付"流程在内测期被
 *   替换为"激励池→平台账户"占位流程，仅用于演示。
 * - 公测/商业化前必须重新设计：若要做真实公益资金拨付，需对接具有公开募捐资格的
 *   慈善组织并取得相应资质；当前代码仅供内测演示使用。
 *
 * 规则:
 *  - amount 必须 > 0 且 <= 池余额(精度 round 2 位)
 *  - 事务内:创建 WelfareDisbursement + 池 balance/totalOutflow 减扣
 *  - 列表按 createdAt desc,带 regionId 索引
 */

import { prisma } from '../lib/prisma.js'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export const welfareDisbursementService = {
  /**
   * 登记拨付(从 WelfareFundPool 出账)
   * 抛错:
   *  - 404 池不存在
   *  - 400 amount <= 0 或 amount > balance 或 poolId 无效
   */
  async recordDisbursement(params: {
    regionId: number
    amount: number
    recipientOrg: string
    memo?: string
    operatorId: string
  }) {
    const { regionId, amount, recipientOrg, memo, operatorId } = params

    if (!recipientOrg || recipientOrg.trim().length === 0) {
      throw Object.assign(new Error('recipientOrg 不能为空'), { status: 400 })
    }
    const amt = round2(Number(amount))
    if (!Number.isFinite(amt) || amt <= 0) {
      throw Object.assign(new Error('amount 必须大于 0'), { status: 400 })
    }

    return prisma.$transaction(async (tx) => {
      const pool = await tx.welfareFundPool.findUnique({ where: { regionId } })
      if (!pool) {
        throw Object.assign(new Error('资金池不存在'), { status: 404 })
      }
      if (amt > round2(Number(pool.balance))) {
        throw Object.assign(
          new Error(`拨付金额 ${amt} 超过池余额 ${pool.balance}`),
          { status: 400 },
        )
      }

      const newBalance = round2(Number(pool.balance) - amt)
      const newTotalOutflow = round2(Number(pool.totalOutflow) + amt)

      const disbursement = await tx.welfareDisbursement.create({
        data: {
          regionId,
          amount: amt,
          recipientOrg: recipientOrg.trim(),
          memo: memo?.trim() || null,
          operatorId,
        },
      })
      await tx.welfareFundPool.update({
        where: { regionId },
        data: { balance: newBalance, totalOutflow: newTotalOutflow },
      })

      return disbursement
    })
  },

  /** 列表(按 regionId 过滤,createdAt desc) */
  async listDisbursements(regionId: number, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.welfareDisbursement.findMany({
        where: { regionId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.welfareDisbursement.count({ where: { regionId } }),
    ])
    return {
      items: items.map((d) => ({ ...d, amount: Number(d.amount) })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  },
}