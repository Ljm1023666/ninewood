import { prisma } from '../lib/prisma.js';

export const depositService = {
  async createDeposit(userId: string, demandIds: string[]) {
    const demands = await prisma.demand.findMany({
      where: { id: { in: demandIds }, userId, status: 'PENDING' },
      select: { id: true, minPrice: true },
    });
    if (demands.length !== demandIds.length) {
      throw { status: 400, message: '部分需求不存在或不属于你' };
    }

    const totalMinPrice = demands.reduce((sum: number, d: any) => sum + Number(d.minPrice), 0);
    const depositAmount = Math.round(totalMinPrice * 0.01 * 100) / 100;

    if (depositAmount < 0.01) throw { status: 400, message: '最低报酬过低，无法计算押金' };

    const existing = await prisma.deposit.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (existing) throw { status: 409, message: '已有未完结的押金记录' };

    return prisma.deposit.create({
      data: {
        userId,
        amount: depositAmount,
        demandRelations: {
          create: demands.map((d: any) => ({ demandId: d.id })),
        },
      },
    });
  },

  async getMyDeposits(userId: string) {
    const deposits = await prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        demandRelations: {
          select: { demandId: true },
        },
      },
    });

    return {
      totalHeld: deposits.filter((d: any) => d.status === 'PENDING').reduce((s: number, d: any) => s + Number(d.amount), 0),
      totalRefunded: deposits.filter((d: any) => d.status === 'REFUNDED').reduce((s: number, d: any) => s + Number(d.amount), 0),
      totalForfeited: deposits.filter((d: any) => d.status === 'FORFEITED').reduce((s: number, d: any) => s + Number(d.amount), 0),
      deposits: deposits.map((d: any) => ({
        id: d.id,
        userId: d.userId,
        amount: Number(d.amount),
        demandIds: d.demandRelations.map((r: any) => r.demandId),
        status: d.status,
        createdAt: d.createdAt,
      })),
    };
  },

  async refundDeposit(depositId: string, userId: string) {
    const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw { status: 404, message: '押金记录不存在' };
    if (deposit.userId !== userId) throw { status: 403, message: '无权操作' };
    if (deposit.status !== 'PENDING') throw { status: 400, message: '押金状态不允许退还' };

    return prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'REFUNDED' },
    });
  },
};
