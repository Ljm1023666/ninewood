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
  reference?: {
    referenceType?: string
    referenceId?: string
    memo?: string
    operationKey?: string
  },
) {
  if (reference?.operationKey) {
    const existing = await tx.walletLedger.findUnique({
      where: { operationKey: reference.operationKey },
      select: { id: true },
    })
    if (existing) return { skipped: true as const }
  }

  await tx.walletLedger.create({
    data: {
      userId,
      type,
      amount,
      balanceAfter,
      referenceType: reference?.referenceType ?? null,
      referenceId: reference?.referenceId ?? null,
      memo: reference?.memo ?? null,
      operationKey: reference?.operationKey ?? null,
    },
  })
  return { skipped: false as const }
}

async function readBalance(client: Tx, userId: string): Promise<number> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { points: true },
  })
  if (!user) throw Object.assign(new Error('用户不存在'), { status: 404 })
  return roundPoints(Number(user.points))
}

/** 原子入账 */
async function creditAtomic(
  client: Tx,
  userId: string,
  amount: number,
  meta?: {
    referenceType?: string
    referenceId?: string
    memo?: string
    operationKey?: string
  },
) {
  const amt = roundPoints(amount)
  if (amt <= 0) throw Object.assign(new Error('入账金额必须大于 0'), { status: 400 })

  if (meta?.operationKey) {
    const existing = await client.walletLedger.findUnique({
      where: { operationKey: meta.operationKey },
      select: { id: true, balanceAfter: true },
    })
    if (existing) {
      return { credited: amt, balanceAfter: roundPoints(Number(existing.balanceAfter)), skipped: true }
    }
  }

  try {
    const updated = await client.user.update({
      where: { id: userId },
      data: { points: { increment: amt } },
      select: { points: true },
    })
    const balanceAfter = roundPoints(Number(updated.points))
    await writeLedger(client, userId, 'CREDIT', amt, balanceAfter, meta)
    return { credited: amt, balanceAfter, skipped: false }
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2025'
    ) {
      throw Object.assign(new Error('用户不存在'), { status: 404 })
    }
    // 唯一约束冲突：整事务应回滚；此处向上抛出供外层 rollback 后只读重放
    throw e
  }
}

/** 原子扣款（余额不足时 updateMany count=0） */
async function debitAtomic(
  client: Tx,
  userId: string,
  amount: number,
  meta?: {
    referenceType?: string
    referenceId?: string
    memo?: string
    operationKey?: string
  },
) {
  const amt = roundPoints(amount)
  if (amt <= 0) throw Object.assign(new Error('扣款金额必须大于 0'), { status: 400 })

  if (meta?.operationKey) {
    const existing = await client.walletLedger.findUnique({
      where: { operationKey: meta.operationKey },
      select: { id: true, balanceAfter: true },
    })
    if (existing) {
      return { debited: amt, balanceAfter: roundPoints(Number(existing.balanceAfter)), skipped: true }
    }
  }

  const updated = await client.user.updateMany({
    where: { id: userId, points: { gte: amt } },
    data: { points: { decrement: amt } },
  })
  if (updated.count === 0) {
    const exists = await client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!exists) throw Object.assign(new Error('用户不存在'), { status: 404 })
    throw Object.assign(new Error('点数不足'), {
      status: 402,
      code: 'INSUFFICIENT_POINTS',
    })
  }

  const balanceAfter = await readBalance(client, userId)
  await writeLedger(client, userId, 'DEBIT', -amt, balanceAfter, meta)
  return { debited: amt, balanceAfter, skipped: false }
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

  /** 余额概览：可用余额、托管中、本月收支 */
  async getSummary(userId: string) {
    const [balance, heldAgg, ledgerRows] = await Promise.all([
      walletService.getBalance(userId),
      prisma.walletHold.aggregate({
        where: { userId, status: 'HELD' },
        _sum: { amount: true },
      }),
      prisma.walletLedger.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { amount: true },
      }),
    ])

    let monthlyIncome = 0
    let monthlyExpense = 0
    for (const row of ledgerRows) {
      const amt = Number(row.amount)
      if (amt > 0) monthlyIncome += amt
      else monthlyExpense += Math.abs(amt)
    }

    return {
      balance: roundPoints(balance),
      held: roundPoints(Number(heldAgg._sum.amount ?? 0)),
      monthlyIncome: roundPoints(monthlyIncome),
      monthlyExpense: roundPoints(monthlyExpense),
    }
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

      const opKey = `demand:${demandId}:hold`
      const existingLedger = await client.walletLedger.findUnique({
        where: { operationKey: opKey },
        select: { id: true },
      })
      if (existingLedger) {
        const balanceAfter = await readBalance(client, userId)
        return { held: amt, balanceAfter }
      }

      const updated = await client.user.updateMany({
        where: { id: userId, points: { gte: amt } },
        data: { points: { decrement: amt } },
      })
      if (updated.count === 0) {
        throw Object.assign(new Error('点数不足，无法发布需求'), {
          status: 402,
          code: 'INSUFFICIENT_POINTS',
        })
      }

      const balanceAfter = await readBalance(client, userId)

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
        operationKey: opKey,
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
        await client.user.update({
          where: { id: hold.userId },
          data: { points: { increment: released } },
        })
        const balanceAfter = await readBalance(client, hold.userId)
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
    meta?: {
      referenceType?: string
      referenceId?: string
      memo?: string
      operationKey?: string
    },
    tx?: Tx,
  ): Promise<{ credited: number; balanceAfter: number; skipped?: boolean }> {
    const run = async (client: Tx) => creditAtomic(client, userId, amount, meta)

    if (tx) return run(tx)
    return prisma.$transaction(run)
  },

  /** 扣款（补差价、服务费等，供后续结算使用） */
  async debit(
    userId: string,
    amount: number,
    meta?: {
      referenceType?: string
      referenceId?: string
      memo?: string
      operationKey?: string
    },
    tx?: Tx,
  ): Promise<{ debited: number; balanceAfter: number; skipped?: boolean }> {
    const run = async (client: Tx) => debitAtomic(client, userId, amount, meta)

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
    options?: { isWelfare?: boolean; skipServiceFee?: boolean },
    outerTx?: Tx,
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
    const skipServiceFee = options?.skipServiceFee === true

    const run = async (tx: Tx) => {
      const existingSettlement = await tx.settlement.findUnique({
        where: { demandId },
      })
      if (existingSettlement) {
        return {
          settlement: existingSettlement,
          breakdown: {
            minPrice: existingSettlement.minPrice,
            finalPrice: existingSettlement.finalPrice,
            serviceFee: existingSettlement.serviceFee,
            demanderPaid: existingSettlement.demanderPaid,
            providerReceived: existingSettlement.providerReceived,
            platformRevenue: existingSettlement.platformRevenue,
          },
        }
      }

      await walletService.consumeHold(demandId, tx)

      await walletService.credit(
        providerId,
        breakdown.providerReceived,
        {
          referenceType: 'DEMAND',
          referenceId: demandId,
          memo: '服务结算入账',
          operationKey: `demand:${demandId}:settle-provider`,
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
            operationKey: `demand:${demandId}:settle-extra`,
          },
          tx,
        )
      }

      if (serviceFee > 0 && !skipServiceFee) {
        await walletService.debit(
          demand.userId,
          serviceFee,
          {
            referenceType: 'DEMAND',
            referenceId: demandId,
            memo: isWelfare ? '激励服务费(10%,内测模拟)' : '平台服务费(5%)',
            operationKey: `demand:${demandId}:settle-fee`,
          },
          tx,
        )
      }

      if (isWelfare && serviceFee > 0 && !skipServiceFee) {
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
    }

    if (outerTx) return run(outerTx)
    return prisma.$transaction(run)
  },

  /**
   * 部分完成结算：拆分原 hold，禁止整笔吞托管后再对剩余需求二次 hold。
   * 见 docs/specs/ORDER-TRANSACTION-TRUST-ADR.md §4.3
   */
  async settlePartialWithRemainder(
    params: {
      demandId: string
      orderId: string
      proposedPrice: number
      agreedPriceBefore: number
      requesterId: string
      providerId: string
      skipServiceFee: boolean
      prepaidFeeOnAgreed?: number
      isWelfare?: boolean
    },
    outerTx?: Tx,
  ) {
    const run = async (tx: Tx) => {
      const {
        demandId,
        orderId,
        proposedPrice,
        agreedPriceBefore,
        requesterId,
        providerId,
        skipServiceFee,
        isWelfare = false,
      } = params
      const P = roundPoints(proposedPrice)
      const A = roundPoints(agreedPriceBefore)
      if (!(P > 0 && P < A)) {
        throw Object.assign(new Error('部分完成报价必须低于原约定价且大于 0'), { status: 400 })
      }

      const hold = await tx.walletHold.findUnique({ where: { demandId } })
      if (!hold || hold.status !== 'HELD') {
        throw Object.assign(new Error('原需求托管不存在或已释放'), { status: 409 })
      }
      const H = roundPoints(Number(hold.amount))

      const feeRate = isWelfare ? 0.1 : 0.05
      const feeP = roundPoints(P * feeRate)
      const feeA =
        params.prepaidFeeOnAgreed != null
          ? roundPoints(params.prepaidFeeOnAgreed)
          : roundPoints(A * feeRate)

      if (P > H) {
        await walletService.debit(
          requesterId,
          roundPoints(P - H),
          {
            referenceType: 'DEMAND',
            referenceId: demandId,
            memo: '部分完成补差价',
            operationKey: `demand:${demandId}:partial-extra`,
          },
          tx,
        )
      }

      await tx.walletHold.update({
        where: { id: hold.id },
        data: { status: 'CONSUMED', releasedAt: new Date() },
      })

      await walletService.credit(
        providerId,
        P,
        {
          referenceType: 'DEMAND',
          referenceId: demandId,
          memo: '部分完成结算入账',
          operationKey: `demand:${demandId}:settle-provider`,
        },
        tx,
      )

      const unused = roundPoints(Math.max(0, H - P))
      if (unused > 0) {
        await walletService.credit(
          requesterId,
          unused,
          {
            referenceType: 'DEMAND',
            referenceId: demandId,
            memo: '部分完成未用托管回吐',
            operationKey: `demand:${demandId}:partial-unused-release`,
          },
          tx,
        )
      }

      if (!skipServiceFee && feeP > 0) {
        await walletService.debit(
          requesterId,
          feeP,
          {
            referenceType: 'DEMAND',
            referenceId: demandId,
            memo: isWelfare ? '部分完成激励服务费' : '部分完成平台服务费',
            operationKey: `demand:${demandId}:settle-fee`,
          },
          tx,
        )
      } else if (skipServiceFee) {
        const refundFee = roundPoints(Math.max(0, feeA - feeP))
        if (refundFee > 0) {
          await walletService.credit(
            requesterId,
            refundFee,
            {
              referenceType: 'ORDER',
              referenceId: orderId,
              memo: '部分完成服务费多退',
              operationKey: `order:${orderId}:partial-fee-refund`,
            },
            tx,
          )
        }
      }

      const demanderPaid = roundPoints(P + (skipServiceFee ? 0 : feeP))
      const settlement = await tx.settlement.upsert({
        where: { demandId },
        create: {
          demandId,
          minPrice: H,
          finalPrice: P,
          serviceFee: feeP,
          demanderPaid,
          providerReceived: P,
          platformRevenue: feeP,
          depositReturned: unused,
          isWelfare,
        },
        update: {
          finalPrice: P,
          serviceFee: feeP,
          demanderPaid,
          providerReceived: P,
          platformRevenue: feeP,
          depositReturned: unused,
        },
      })

      const remainingPrice = roundPoints(Math.max(1, A - P))
      return {
        settlement,
        breakdown: {
          minPrice: H,
          finalPrice: P,
          serviceFee: feeP,
          demanderPaid,
          providerReceived: P,
          platformRevenue: feeP,
          depositReturned: unused,
        },
        remainingPrice,
        unusedReleased: unused,
      }
    }

    if (outerTx) return run(outerTx)
    return prisma.$transaction(run)
  },
}
