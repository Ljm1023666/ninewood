/**
 * AI 2.8 交易服务 — 结算持久化 + 查询
 */
import { prisma } from '../lib/prisma.js'
import { calculateSettlement, calculateSettlementWelfare } from './settlement.js'

export const transactionService = {
  /** 创建结算记录（普通需求） */
  async createSettlement(demandId: string, finalPrice: number) {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: { applicantsV2: { where: { status: 'ACCEPTED' }, take: 1 } },
    })
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 })

    const minPrice = Number(demand.minPrice)
    const breakdown = calculateSettlement(minPrice, finalPrice, demand.deposit)

    return prisma.settlement.create({
      data: {
        demandId,
        minPrice: breakdown.minPrice,
        finalPrice: breakdown.finalPrice,
        serviceFee: breakdown.serviceFee,
        demanderPaid: breakdown.demanderPaid,
        providerReceived: breakdown.providerReceived,
        platformRevenue: breakdown.platformRevenue,
        depositReturned: breakdown.depositReturned,
        isWelfare: false,
      },
    })
  },

  /** 创建结算记录（公益需求） */
  async createWelfareSettlement(demandId: string, finalPrice: number) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } })
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 })

    const minPrice = Number(demand.minPrice)
    const breakdown = calculateSettlementWelfare(minPrice, finalPrice, demand.deposit)

    return prisma.settlement.create({
      data: {
        demandId,
        minPrice: breakdown.minPrice,
        finalPrice: breakdown.finalPrice,
        serviceFee: breakdown.serviceFee,
        demanderPaid: breakdown.demanderPaid,
        providerReceived: breakdown.providerReceived,
        platformRevenue: breakdown.platformRevenue,
        depositReturned: breakdown.depositReturned,
        isWelfare: true,
      },
    })
  },

  /** 获取需求结算明细 */
  async getByDemand(demandId: string) {
    const settlement = await prisma.settlement.findUnique({ where: { demandId } })
    if (!settlement) throw Object.assign(new Error('结算记录不存在'), { status: 404 })

    return {
      settlement,
      breakdown: {
        items: [
          { label: '最低报价托管', amount: settlement.minPrice, direction: 'PAY' },
          ...(settlement.finalPrice > settlement.minPrice
            ? [{ label: '差价补付', amount: settlement.finalPrice - settlement.minPrice, direction: 'PAY' }]
            : []),
          { label: '平台服务费', amount: settlement.serviceFee, direction: 'PAY' },
        ],
        summary: {
          demanderPaid: settlement.demanderPaid,
          providerReceived: settlement.providerReceived,
          platformRevenue: settlement.platformRevenue,
          depositReturned: settlement.depositReturned,
          netForDemander: -settlement.demanderPaid + settlement.depositReturned,
          netForProvider: settlement.providerReceived,
        },
      },
      timestamp: settlement.createdAt.toISOString(),
    }
  },

  /** 用户交易历史 */
  async getHistory(userId: string, page = 1, limit = 20) {
    // 用户作为需求者或服务者的所有结算
    const demandIds = await prisma.demand.findMany({
      where: {
        OR: [{ userId }, { acceptedProviderId: userId }],
        status: 'COMPLETED',
      },
      select: { id: true },
    })
    const ids = demandIds.map((d) => d.id)

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where: { demandId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.settlement.count({ where: { demandId: { in: ids } } }),
    ])

    const items = await Promise.all(
      settlements.map(async (s) => {
        const demand = await prisma.demand.findUnique({
          where: { id: s.demandId },
          select: { title: true, userId: true },
        })
        return {
          ...s,
          demandTitle: demand?.title || '(已删除)',
          role: demand?.userId === userId ? 'DEMANDER' : 'PROVIDER',
        }
      }),
    )

    return { items, total, page, totalPages: Math.ceil(total / limit) }
  },
}
