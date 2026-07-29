import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  offeringFindUnique: vi.fn(),
  eventFindFirst: vi.fn(),
  appendEvent: vi.fn(),
  debit: vi.fn(),
  credit: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    loopOffering: { findUnique: m.offeringFindUnique },
    loopEvent: { findFirst: m.eventFindFirst },
  },
}))

vi.mock('./loop-run.service.js', () => ({
  loopRunService: { appendEvent: m.appendEvent },
}))

vi.mock('../wallet.service.js', () => ({
  walletService: { debit: m.debit, credit: m.credit },
}))

import {
  quoteLoopFee,
  prepayLoopRun,
  finalizeLoopSettlement,
} from './loop-economy.service.js'

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset())
  m.offeringFindUnique.mockResolvedValue({
    endpoint: {
      pricePolicyJson: {
        platformFeeRate: 0.05,
        monitorFeeCapRate: 0.01,
        verificationFee: 1,
        claimedServiceAmount: 20,
        currency: 'POINT',
      },
      ownerType: 'USER',
      ownerId: 'provider-1',
    },
  })
  m.debit.mockResolvedValue({ debited: 11.5, balanceAfter: 100 })
  m.credit.mockResolvedValue({ credited: 10, balanceAfter: 110 })
  m.appendEvent.mockResolvedValue({})
  m.eventFindFirst.mockResolvedValue(null)
})

describe('loop-economy V4', () => {
  it('报价：20 + 5% + 验证费 1 = 22（整数点）', async () => {
    const q = await quoteLoopFee('off-1', 20)
    expect(q.platformFee).toBe(1)
    expect(q.verificationFee).toBe(1)
    expect(q.totalPreview).toBe(22)
  })

  it('预付：debit total 并写 SETTLEMENT_PREPAID', async () => {
    const r = await prepayLoopRun({
      loopRunId: 'run-1',
      offeringId: 'off-1',
      payerUserId: 'payer-1',
      serviceAmount: 20,
    })
    expect(r.action).toBe('prepaid')
    expect(m.debit).toHaveBeenCalledWith(
      'payer-1',
      22,
      expect.objectContaining({ operationKey: 'loopRun:run-1:prepay' }),
    )
    expect(m.appendEvent).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ type: 'SETTLEMENT_PREPAID' }),
    )
  })

  it('ELIGIBLE → 付给供给方 serviceAmount', async () => {
    m.eventFindFirst.mockImplementation(async ({ where }: { where: { type: string } }) => {
      if (where.type === 'SETTLEMENT_CAPTURED' || where.type === 'SETTLEMENT_REFUNDED') return null
      if (where.type === 'SETTLEMENT_PREPAID') {
        return {
          payload: {
            payerUserId: 'payer-1',
            providerUserId: 'provider-1',
            offeringId: 'off-1',
            quote: {
              serviceAmount: 20,
              platformFee: 1,
              verificationFee: 1,
              totalPreview: 22,
            },
          },
        }
      }
      if (where.type === 'SETTLEMENT_ELIGIBLE') return { id: 'e1' }
      return null
    })

    const r = await finalizeLoopSettlement('run-1')
    expect(r.action).toBe('captured')
    expect(m.credit).toHaveBeenCalledWith(
      'provider-1',
      20,
      expect.objectContaining({ operationKey: 'loopRun:run-1:pay-provider' }),
    )
  })

  it('BLOCKED → 退服务额+佣金，不付供给方', async () => {
    m.eventFindFirst.mockImplementation(async ({ where }: { where: { type: string } }) => {
      if (where.type === 'SETTLEMENT_CAPTURED' || where.type === 'SETTLEMENT_REFUNDED') return null
      if (where.type === 'SETTLEMENT_PREPAID') {
        return {
          payload: {
            payerUserId: 'payer-1',
            providerUserId: 'provider-1',
            offeringId: 'off-1',
            quote: {
              serviceAmount: 20,
              platformFee: 1,
              verificationFee: 1,
              totalPreview: 22,
            },
          },
        }
      }
      if (where.type === 'SETTLEMENT_BLOCKED') return { id: 'b1' }
      return null
    })

    const r = await finalizeLoopSettlement('run-1')
    expect(r.action).toBe('refunded')
    expect(m.credit).toHaveBeenCalledWith(
      'payer-1',
      21,
      expect.objectContaining({ operationKey: 'loopRun:run-1:refund' }),
    )
    expect(m.credit).not.toHaveBeenCalledWith('provider-1', expect.anything(), expect.anything())
  })

  it('无预付 → noop', async () => {
    const r = await finalizeLoopSettlement('run-free')
    expect(r.action).toBe('noop')
    expect(m.debit).not.toHaveBeenCalled()
    expect(m.credit).not.toHaveBeenCalled()
  })
})
