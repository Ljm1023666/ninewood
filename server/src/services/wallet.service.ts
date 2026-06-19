/**
 * 点数钱包 — 开发期模拟货币（1 点 = 1 元）
 * 业务方只调本服务；上线前替换为真实支付实现，调用方无需改动。
 */

import { Prisma, WalletLedgerType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'

export const DEFAULT_USER_POINTS = config.defaultUserPoints

export type HoldReleaseReason = 'COMPLETED' | 'WITHDRAWN' | 'DELETE_FROZEN'

type Tx = Prisma.TransactionClient

export function roundPoints(n: number): number {
  return Math.round(n * 100) / 100
}

/** 托管款退还比例（见 DEVELOPMENT-GUIDE 决策） */
export function refundRatio(reason: HoldReleaseReason): number {
  switch (reason) {
    case 'COMPLETED':
      return 1.0
    case 'WITHDRAWN':
      return 0.9999
    case 'DELETE_FROZEN':
      return 0.95
    default:
      return 0
  }
}

export function computeRefundAmount(held: number, reason: HoldReleaseReason): number {
  return roundPoints(held * refundRatio(reason))
}

async function writeLedger(
  tx: Tx,
  userId: string,
  type: WalletLedgerType,
  amount: number,
  balanceAfter: number,
  reference?: { referenceType?: string; referenceId?: string; memo?: string },
) {
  await tx.walletLedger.create({
    data: {
      userId,
      type,
      amount,
      balanceAfter,
      referenceType: reference?.referenceType ?? null,
      referenceId: reference?.referenceId ?? null,
      memo: reference?.memo ?? null,
    },
  })
}

export const walletService = {
  /** 每条需求押金 = 全额最低报价 */
  calculateDeposit(minPrice: number): number {
    return roundPoints(minPrice)
  },

  async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    })
    if (!user) throw Object.assign(new Error('用户不存在'), { status: 404 })
    return Number(user.points)
  },

  async getLedger(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.walletLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.walletLedger.count({ where: { userId } }),
    ])
    return {
      items: items.map((row) => ({
        ...row,
        amount: Number(row.amount),
        balanceAfter: Number(row.balanceAfter),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  },

  /** 发布需求：全额最低报价托管（扣点数） */
  async holdForDemand(
    userId: string,
    demandId: string,
    amount: number,
    tx?: Tx,
  ): Promise<{ held: number; balanceAfter: number }> {
    const run = async (client: Tx) => {
      const amt = roundPoints(amount)
      if (amt <= 0) {
        throw Object.assign(new Error('托管金额必须大于 0'), { status: 400 })
      }

      const user = await client.user.findUnique({
        where: { id: userId },
        select: { points: true },
      })
      if (!user) throw Object.assign(new Error('用户不存在'), { status: 404 })

      const balance = Number(user.points)
      if (balance < amt) {
        throw Object.assign(new Error('点数不足，无法发布需求'), {
          status: 402,
          code: 'INSUFFICIENT_POINTS',
        })
      }

      const balanceAfter = roundPoints(balance - amt)
      await client.user.update({
        where: { id: userId },
        data: { points: balanceAfter },
      })

      await client.walletHold.create({
        data: {
          userId,
          demandId,
          amount: amt,
          status: 'HELD',
        },
      })

      await writeLedger(client, userId, 'HOLD', -amt, balanceAfter, {
        referenceType: 'DEMAND',
        referenceId: demandId,
        memo: '发布需求托管最低报价',
      })

      return { held: amt, balanceAfter }
    }

    if (tx) return run(tx)
    return prisma.$transaction(run)
  },

  /** 释放托管（撤回 / 删冻结 / 完成退还等） */
  async releaseHold(
    demandId: string,
    reason: HoldReleaseReason,
    tx?: Tx,
  ): Promise<{ released: number; ratio: number }> {
    const run = async (client: Tx) => {
      const hold = await client.walletHold.findUnique({ where: { demandId } })
      if (!hold || hold.status !== 'HELD') {
        return { released: 0, ratio: 0 }
      }

      const held = Number(hold.amount)
      const ratio = refundRatio(reason)
      const released = computeRefundAmount(held, reason)

      if (released > 0) {
        const user = await client.user.findUnique({
          where: { id: hold.userId },
          select: { points: true },
        })
        const balanceAfter = roundPoints(Number(user!.points) + released)
        await client.user.update({
          where: { id: hold.userId },
          data: { points: balanceAfter },
        })
        await writeLedger(client, hold.userId, 'RELEASE', released, balanceAfter, {
          referenceType: 'DEMAND',
          referenceId: demandId,
          memo: `释放托管 (${reason})`,
        })
      }

      await client.walletHold.update({
        where: { id: hold.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      })

      return { released, ratio }
    }

    if (tx) return run(tx)
    return prisma.$transaction(run)
  },

  /** 入账（结算给服务者等，供后续 M2 完成结算使用） */
  async credit(
    userId: string,
    amount: number,
    meta?: { referenceType?: string; referenceId?: string; memo?: string },
    tx?: Tx,
  ): Promise<{ credited: number; balanceAfter: number }> {
    const run = async (client: Tx) => {
      const amt = roundPoints(amount)
      if (amt <= 0) throw Object.assign(new Error('入账金额必须大于 0'), { status: 400 })

      const user = await client.user.findUnique({
        where: { id: userId },
        select: { points: true },
      })
      if (!user) throw Object.assign(new Error('用户不存在'), { status: 404 })

      const balanceAfter = roundPoints(Number(user.points) + amt)
      await client.user.update({
        where: { id: userId },
        data: { points: balanceAfter },
      })
      await writeLedger(client, userId, 'CREDIT', amt, balanceAfter, meta)
      return { credited: amt, balanceAfter }
    }

    if (tx) return run(tx)
    return prisma.$transaction(run)
  },

  /** 扣款（补差价、服务费等，供后续结算使用） */
  async debit(
    userId: string,
    amount: number,
    meta?: { referenceType?: string; referenceId?: string; memo?: string },
    tx?: Tx,
  ): Promise<{ debited: number; balanceAfter: number }> {
    const run = async (client: Tx) => {
      const amt = roundPoints(amount)
      if (amt <= 0) throw Object.assign(new Error('扣款金额必须大于 0'), { status: 400 })

      const user = await client.user.findUnique({
        where: { id: userId },
        select: { points: true },
      })
      if (!user) throw Object.assign(new Error('用户不存在'), { status: 404 })

      const balance = Number(user.points)
      if (balance < amt) {
        throw Object.assign(new Error('点数不足'), {
          status: 402,
          code: 'INSUFFICIENT_POINTS',
        })
      }

      const balanceAfter = roundPoints(balance - amt)
      await client.user.update({
        where: { id: userId },
        data: { points: balanceAfter },
      })
      await writeLedger(client, userId, 'DEBIT', -amt, balanceAfter, meta)
      return { debited: amt, balanceAfter }
    }

    if (tx) return run(tx)
    return prisma.$transaction(run)
  },

  /** 完成结算：消费托管并按 breakdown 分配点数 */
  async consumeHold(demandId: string, tx?: Tx): Promise<{ consumed: number }> {
    const run = async (client: Tx) => {
      const hold = await client.walletHold.findUnique({ where: { demandId } })
      if (!hold || hold.status !== 'HELD') {
        return { consumed: 0 }
      }
      const consumed = Number(hold.amount)
      await client.walletHold.update({
        where: { id: hold.id },
        data: { status: 'CONSUMED', releasedAt: new Date() },
      })
      return { consumed }
    }
    if (tx) return run(tx)
    return prisma.$transaction(run)
  },

  async settleDemand(
    demandId: string,
    finalPrice: number,
    options?: { isWelfare?: boolean },
  ) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        applicantsV2: { where: { status: 'ACCEPTED' }, take: 1 },
      },
    })
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 })
    const providerId =
      demand.acceptedProviderId ?? demand.applicantsV2[0]?.userId
    if (!providerId) {
      throw Object.assign(new Error('未找到接单服务者'), { status: 400 })
    }

    const minPrice = Number(demand.minPrice)
    const isWelfare = options?.isWelfare ?? demand.isPublicWelfare ?? false
    const { calculateSettlement, calculateSettlementWelfare } = await import(
      './settlement.js'
    )
    const breakdown = isWelfare
      ? calculateSettlementWelfare(minPrice, finalPrice, minPrice)
      : calculateSettlement(minPrice, finalPrice, minPrice)

    const extra = roundPoints(Math.max(0, finalPrice - minPrice))
    const serviceFee = breakdown.serviceFee

    return prisma.$transaction(async (tx) => {
      await walletService.consumeHold(demandId, tx)

      await walletService.credit(
        providerId,
        breakdown.providerReceived,
        {
          referenceType: 'DEMAND',
          referenceId: demandId,
          memo: '服务结算入账',
        },
        tx,
      )

      if (extra > 0) {
        await walletService.debit(
          demand.userId,
          extra,
          {
            referenceType: 'DEMAND',
            referenceId: demandId,
            memo: '结算补差价',
          },
          tx,
        )
      }

      if (serviceFee > 0) {
        await walletService.debit(
          demand.userId,
          serviceFee,
          {
            referenceType: 'DEMAND',
            referenceId: demandId,
            memo: isWelfare ? '公益服务费(10%)' : '平台服务费(5%)',
          },
          tx,
        )
      }

      if (isWelfare && serviceFee > 0) {
        const regionId = demand.regionId ?? 0
        await tx.welfareFundPool.upsert({
          where: { regionId },
          update: {
            balance: { increment: serviceFee },
            totalInflow: { increment: serviceFee },
          },
          create: {
            regionId,
            balance: serviceFee,
            totalInflow: serviceFee,
          },
        })
      }

      const settlement = await tx.settlement.upsert({
        where: { demandId },
        create: {
          demandId,
          minPrice: breakdown.minPrice,
          finalPrice: breakdown.finalPrice,
          serviceFee: breakdown.serviceFee,
          demanderPaid: breakdown.demanderPaid,
          providerReceived: breakdown.providerReceived,
          platformRevenue: breakdown.platformRevenue,
          depositReturned: 0,
          isWelfare,
        },
        update: {
          finalPrice: breakdown.finalPrice,
          serviceFee: breakdown.serviceFee,
          demanderPaid: breakdown.demanderPaid,
          providerReceived: breakdown.providerReceived,
          platformRevenue: breakdown.platformRevenue,
          depositReturned: 0,
        },
      })

      return { settlement, breakdown }
    })
  },
}
