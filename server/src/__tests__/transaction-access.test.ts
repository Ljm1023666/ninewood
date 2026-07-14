import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionService } from '../services/transaction.service.js'
import { prisma } from '../lib/prisma.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    demand: { findUnique: vi.fn() },
    settlement: { findUnique: vi.fn() },
  },
}))

describe('transactionService.getByDemand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('拒绝非参与方查看结算', async () => {
    vi.mocked(prisma.demand.findUnique).mockResolvedValue({
      userId: 'owner-1',
      acceptedProviderId: 'provider-1',
    } as any)

    await expect(
      transactionService.getByDemand('demand-1', 'stranger'),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('允许需求方查看', async () => {
    vi.mocked(prisma.demand.findUnique).mockResolvedValue({
      userId: 'owner-1',
      acceptedProviderId: 'provider-1',
    } as any)
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({
      demandId: 'demand-1',
      minPrice: 100,
      finalPrice: 100,
      serviceFee: 5,
      demanderPaid: 105,
      providerReceived: 95,
      platformRevenue: 5,
      depositReturned: 0,
      createdAt: new Date('2026-01-01'),
    } as any)

    const result = await transactionService.getByDemand('demand-1', 'owner-1')
    expect(result.settlement.demandId).toBe('demand-1')
  })
})
