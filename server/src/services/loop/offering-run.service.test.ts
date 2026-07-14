import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * runOffering（用户侧「运行此能力」）单测 · mock prisma + executors
 * 覆盖：无执行器诚实 skipped / 对需求运行 + 归属校验 / 非 owner 403 / 无输入 400。
 */
const m = vi.hoisted(() => ({
  loopOfferingFindUnique: vi.fn(),
  loopDefinitionFindUnique: vi.fn(),
  loopRunCreate: vi.fn(),
  loopRunUpdate: vi.fn(),
  loopEventCreate: vi.fn(),
  demandFindUnique: vi.fn(),
  getLoopExecutor: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    loopOffering: { findUnique: m.loopOfferingFindUnique },
    loopDefinition: { findUnique: m.loopDefinitionFindUnique },
    loopRun: { create: m.loopRunCreate, update: m.loopRunUpdate },
    loopEvent: { create: m.loopEventCreate },
    demand: { findUnique: m.demandFindUnique },
  },
}));

vi.mock('./executors/index.js', () => ({
  getLoopExecutor: m.getLoopExecutor,
}));

vi.mock('./builtin-loops.js', () => ({ seedBuiltinLoops: vi.fn() }));
vi.mock('./verification.service.js', () => ({
  ensureVerificationContracts: vi.fn().mockResolvedValue({ contracts: 0 }),
}));

import { runOffering } from './offering.service.js';

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.loopDefinitionFindUnique.mockResolvedValue({ id: 'def1' });
  m.loopRunCreate.mockResolvedValue({ id: 'run1' });
  m.loopRunUpdate.mockResolvedValue({});
  m.loopEventCreate.mockResolvedValue({});
});

describe('runOffering', () => {
  it('无真实执行器 → 不再伪装，直接报 500', async () => {
    m.loopOfferingFindUnique.mockResolvedValue({
      id: 'o1',
      definition: { code: 'builtin.earth.demand.structure', loopKind: 'EARTH', name: '结构化' },
      endpoint: { id: 'e1', hostMode: 'PLATFORM_HOSTED' },
    });
    m.getLoopExecutor.mockReturnValue(undefined);

    await expect(runOffering('o1', 'u1', { input: { title: '论文', description: '写提纲', minPrice: 500 } })).rejects.toMatchObject({ status: 500 });
  });

  it('对需求运行：传入 demandId + endpointId，返回真实结果', async () => {
    m.loopOfferingFindUnique.mockResolvedValue({
      id: 'o1',
      definition: { code: 'builtin.earth.demand.paths', loopKind: 'EARTH', name: '路径' },
      endpoint: { id: 'e1', hostMode: 'PLATFORM_HOSTED' },
    });
    const fakeExec = {
      definitionCode: 'builtin.earth.demand.paths',
      execute: vi.fn().mockResolvedValue({ status: 'SUCCEEDED', outcome: { paths: ['tag:论文'], count: 1, wroteBack: true } }),
    };
    m.getLoopExecutor.mockReturnValue(fakeExec);
    m.demandFindUnique.mockResolvedValue({ userId: 'u1' });

    const r = await runOffering('o1', 'u1', { demandId: 'd1' });
    expect(r.ran).toBe(true);
    expect(r.preview).toBe(false);
    expect(r.status).toBe('SUCCEEDED');
    expect(fakeExec.execute).toHaveBeenCalledWith(
      expect.objectContaining({ demandId: 'd1', endpointId: 'e1' }),
      expect.anything(),
    );
  });

  it('非需求 owner → 403', async () => {
    m.loopOfferingFindUnique.mockResolvedValue({
      id: 'o1',
      definition: { code: 'builtin.earth.demand.paths', loopKind: 'EARTH' },
      endpoint: { id: 'e1' },
    });
    m.getLoopExecutor.mockReturnValue({ execute: vi.fn() });
    m.demandFindUnique.mockResolvedValue({ userId: 'other' });

    await expect(runOffering('o1', 'u1', { demandId: 'd1' })).rejects.toMatchObject({ status: 403 });
  });

  it('既无 demandId 也无 input → 400', async () => {
    m.loopOfferingFindUnique.mockResolvedValue({
      id: 'o1',
      definition: { code: 'x', loopKind: 'HEAVEN' },
      endpoint: { id: 'e1' },
    });
    m.getLoopExecutor.mockReturnValue({ execute: vi.fn() });

    await expect(runOffering('o1', 'u1', {})).rejects.toMatchObject({ status: 400 });
  });
});
