import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Stage 0.1: 验证完成 / 接单 / 超时自动验收后都会调用 closeAllCommForDemand 关闭同 demand 的其他申请人 */

const mocks = vi.hoisted(() => {
  // 集中关闭
  const closeUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  // acceptApplicant
  const acceptDemandFindUnique = vi.fn();
  const acceptApplicantFindUnique = vi.fn();
  const acceptTransaction = vi.fn();
  // confirmAcceptance / autoCompleteAcceptance
  const accOrderFindUnique = vi.fn();
  const accMessageCreate = vi.fn().mockResolvedValue({});
  const sharedTransaction = vi.fn();
  const accSettleDemand = vi.fn().mockResolvedValue({});
  return {
    closeUpdateMany,
    acceptDemandFindUnique, acceptApplicantFindUnique, acceptTransaction,
    accOrderFindUnique, accMessageCreate, sharedTransaction, accSettleDemand,
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    demandApplicantV2: { updateMany: mocks.closeUpdateMany, findUnique: mocks.acceptApplicantFindUnique },
    demand: { findUnique: mocks.acceptDemandFindUnique },
    order: { findUnique: mocks.accOrderFindUnique },
    message: { create: mocks.accMessageCreate },
    $transaction: mocks.sharedTransaction,
  },
}));

vi.mock('../services/wallet.service.js', () => ({
  walletService: { settleDemand: mocks.accSettleDemand },
}));

import { closeAllCommForDemand } from '../services/comm.service.js';
import { demandService } from '../services/demand.service.js';
import { acceptanceService } from '../services/acceptance.service.js';

describe('closeAllCommForDemand 集中关闭 (阶段 0.1)', () => {
  beforeEach(() => {
    mocks.closeUpdateMany.mockClear();
    mocks.closeUpdateMany.mockResolvedValue({ count: 2 });
  });

  it('Test A: 以 REJECTED 结束该 demand 下 PENDING/COMMUNICATING 申请', async () => {
    await closeAllCommForDemand('demand-1', 'REJECTED');
    expect(mocks.closeUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.closeUpdateMany.mock.calls[0][0]).toEqual({
      where: { demandId: 'demand-1', status: { in: ['PENDING', 'COMMUNICATING'] } },
      data: { status: 'REJECTED' },
    });
  });

  it('Test A2: 不传状态默认 REJECTED', async () => {
    await closeAllCommForDemand('demand-1');
    expect(mocks.closeUpdateMany.mock.calls[0][0].data).toEqual({ status: 'REJECTED' });
  });

  it('Test A3: 可传 WITHDRAWN 作为结束状态', async () => {
    await closeAllCommForDemand('demand-1', 'WITHDRAWN');
    expect(mocks.closeUpdateMany.mock.calls[0][0].data).toEqual({ status: 'WITHDRAWN' });
  });

  it('Test A4: 传入 tx 时 updateMany 走的是 tx 而不是 prisma', async () => {
    const tx: any = { demandApplicantV2: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    await closeAllCommForDemand('demand-1', 'REJECTED', tx);
    expect(tx.demandApplicantV2.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.closeUpdateMany).not.toHaveBeenCalled();
  });
});

describe('acceptApplicant 接单后关闭其他申请 (阶段 0.1)', () => {
  beforeEach(() => {
    mocks.acceptDemandFindUnique.mockReset();
    mocks.acceptApplicantFindUnique.mockReset();
    mocks.sharedTransaction.mockReset();
  });

  it('Test B: 接单后会在同一事务里把同 demand 的 PENDING/COMMUNICATING 都置为 REJECTED', async () => {
    mocks.acceptDemandFindUnique.mockResolvedValue({ id: 'd1', userId: 'pub-1' });
    mocks.acceptApplicantFindUnique.mockResolvedValue({ id: 'app-A', userId: 'user-A' });

    const calls: any[] = [];
    mocks.sharedTransaction.mockImplementation(async (cb: any) => {
      await cb({
        demand: { update: vi.fn().mockResolvedValue({}) },
        demandApplicantV2: {
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockImplementation(async (arg: any) => {
            calls.push(arg);
            return { count: 1 };
          }),
        },
      } as any);
    });

    await demandService.acceptApplicant('d1', 'app-A', 'pub-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      where: { demandId: 'd1', status: { in: ['PENDING', 'COMMUNICATING'] } },
      data: { status: 'REJECTED' },
    });
  });
});

describe('confirmAcceptance / autoCompleteAcceptance 验收后关闭其他申请 (阶段 0.1)', () => {
  beforeEach(() => {
    mocks.accOrderFindUnique.mockReset();
    mocks.sharedTransaction.mockReset();
    mocks.accMessageCreate.mockClear();
    mocks.accSettleDemand.mockClear();
  });

  const orderFixture = {
    id: 'order-1',
    demandId: 'd1',
    requesterId: 'pub-1',
    providerId: 'user-A',
    status: 'WAITING_REVIEW',
    agreedPrice: 100,
    demand: { isPublicWelfare: false },
  };

  it('Test C: confirmAcceptance 会在同一事务中调用 closeAllCommForDemand', async () => {
    mocks.accOrderFindUnique.mockResolvedValue(orderFixture);

    const calls: any[] = [];
    mocks.sharedTransaction.mockImplementation(async (cb: any) => {
      await cb({
        order: { update: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
        demandApplicantV2: {
          updateMany: vi.fn().mockImplementation(async (arg: any) => {
            calls.push(arg);
            return { count: 1 };
          }),
        },
      } as any);
    });

    await acceptanceService.confirmAcceptance('order-1', 'pub-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      where: { demandId: 'd1', status: { in: ['PENDING', 'COMMUNICATING'] } },
      data: { status: 'REJECTED' },
    });
  });

  it('Test C2: autoCompleteAcceptance 同样会关闭其他申请', async () => {
    mocks.accOrderFindUnique.mockResolvedValue(orderFixture);

    const calls: any[] = [];
    mocks.sharedTransaction.mockImplementation(async (cb: any) => {
      await cb({
        order: { update: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
        demandApplicantV2: {
          updateMany: vi.fn().mockImplementation(async (arg: any) => {
            calls.push(arg);
            return { count: 0 };
          }),
        },
      } as any);
    });

    await acceptanceService.autoCompleteAcceptance('order-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      where: { demandId: 'd1', status: { in: ['PENDING', 'COMMUNICATING'] } },
      data: { status: 'REJECTED' },
    });
  });
});
