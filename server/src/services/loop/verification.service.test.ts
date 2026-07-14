import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wave E · verification.service.runForLoopRun 单测（mock prisma）
 * 覆盖：无契约 → SKIPPED；校验通过 → PASSED（双指标递增）；校验失败 → FAILED（仅 total 递增）
 * 验证失败/异常只记录，绝不抛错（宪法 #3）。
 */
const m = vi.hoisted(() => ({
  loopRunFindUnique: vi.fn(),
  verificationRunCreate: vi.fn(),
  loopOfferingUpdate: vi.fn(),
  loopOfferingFindUnique: vi.fn(),
  demandFindUnique: vi.fn(),
  loopDefinitionFindUnique: vi.fn(),
  loopRunCreate: vi.fn(),
  loopRunUpdate: vi.fn(),
  loopEventCreate: vi.fn(),
  loopLinkCreate: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    loopRun: { findUnique: m.loopRunFindUnique, create: m.loopRunCreate, update: m.loopRunUpdate },
    loopDefinition: { findUnique: m.loopDefinitionFindUnique },
    loopEvent: { create: m.loopEventCreate },
    loopLink: { create: m.loopLinkCreate },
    verificationRun: { create: m.verificationRunCreate },
    loopOffering: { update: m.loopOfferingUpdate, findUnique: m.loopOfferingFindUnique },
    demand: { findUnique: m.demandFindUnique },
  },
}));

vi.mock('../../path-search.js', () => ({
  resolveDemandPaths: vi.fn(),
}));

import { runForLoopRun } from './verification.service.js';

const contractOf = (code: string) => ({
  id: 'vc1',
  isRequired: true,
  verifierEndpoint: { code },
  verifierEndpointId: 'verifier-1',
});

function runWith(contracts: any[]) {
  return {
    id: 'run-1',
    demandId: 'd1',
    offeringId: 'off-1',
    inputJson: {},
    actualOutcome: null,
    correlationId: 'correlation-1',
    offering: { id: 'off-1', verificationContracts: contracts },
  };
}

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.verificationRunCreate.mockResolvedValue({});
  m.loopOfferingUpdate.mockResolvedValue({});
  m.loopOfferingFindUnique.mockResolvedValue({ recentSuccessN: 1, recentTotalN: 1 });
  m.loopDefinitionFindUnique.mockResolvedValue({ id: 'heaven-def' });
  m.loopRunCreate.mockResolvedValue({ id: 'heaven-run' });
  m.loopRunUpdate.mockResolvedValue({});
  m.loopEventCreate.mockResolvedValue({});
  m.loopLinkCreate.mockResolvedValue({});
});

describe('runForLoopRun (§6 Wave E)', () => {
  it('无 offering → SKIPPED 且不写 VerificationRun', async () => {
    m.loopRunFindUnique.mockResolvedValue({ id: 'run-1', offering: null });
    expect(await runForLoopRun('run-1')).toBe('SKIPPED');
    expect(m.verificationRunCreate).not.toHaveBeenCalled();
  });

  it('无 required 契约 → SKIPPED', async () => {
    m.loopRunFindUnique.mockResolvedValue(runWith([]));
    expect(await runForLoopRun('run-1')).toBe('SKIPPED');
    expect(m.verificationRunCreate).not.toHaveBeenCalled();
  });

  it('校验通过 → PASSED 且 recentSuccessN / recentTotalN 均递增', async () => {
    m.loopRunFindUnique.mockResolvedValue(runWith([contractOf('builtin.heaven.validate.demand_fields')]));
    m.loopRunFindUnique.mockResolvedValue({
      ...runWith([contractOf('builtin.heaven.validate.demand_fields')]),
      actualOutcome: { title: '论文', description: '写一篇', minPrice: 10 },
    });
    m.demandFindUnique.mockResolvedValue({ title: '论文', description: '写一篇', minPrice: 10 });

    const r = await runForLoopRun('run-1');
    expect(r).toBe('PASSED');
    expect(m.verificationRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PASSED', loopRunId: 'run-1' }),
      }),
    );
    const calls = m.loopOfferingUpdate.mock.calls.map((c: any) => c[0].data);
    expect(calls.some((d: any) => d.recentTotalN?.increment === 1)).toBe(true);
    expect(calls.some((d: any) => d.recentSuccessN?.increment === 1)).toBe(true);
  });

  it('校验失败 → FAILED 且 recentTotalN 增、recentSuccessN 不增（不抛错）', async () => {
    m.loopRunFindUnique.mockResolvedValue(runWith([contractOf('builtin.heaven.validate.demand_fields')]));
    m.loopRunFindUnique.mockResolvedValue({
      ...runWith([contractOf('builtin.heaven.validate.demand_fields')]),
      actualOutcome: { title: '', description: '', minPrice: -1 },
    });
    m.demandFindUnique.mockResolvedValue({ title: '', description: '', minPrice: -1 });

    const r = await runForLoopRun('run-1');
    expect(r).toBe('FAILED');
    expect(m.verificationRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', loopRunId: 'run-1' }),
      }),
    );
    const calls = m.loopOfferingUpdate.mock.calls.map((c: any) => c[0].data);
    expect(calls.some((d: any) => d.recentTotalN?.increment === 1)).toBe(true);
    expect(calls.some((d: any) => d.recentSuccessN?.increment === 1)).toBe(false);
  });
});
