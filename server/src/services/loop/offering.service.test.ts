import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wave C · offering.service 单测（mock prisma）
 * 断言检索字段白名单：绝不返回 internalSuccessRate / verifier 机密配置。
 */
const m = vi.hoisted(() => ({
  loopOfferingFindMany: vi.fn(),
  loopOfferingFindUnique: vi.fn(),
  seedBuiltinLoops: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    loopOffering: {
      findMany: m.loopOfferingFindMany,
      findUnique: m.loopOfferingFindUnique,
    },
    capabilityEndpoint: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('./builtin-loops.js', () => ({
  seedBuiltinLoops: m.seedBuiltinLoops,
}));

import { listOfferings, retrieveOffering, ensureSystemOfferings } from './offering.service.js';

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.seedBuiltinLoops.mockResolvedValue({ definitions: 10, endpoints: 9, offerings: 9 });
  m.loopOfferingFindMany.mockResolvedValue([]);
});

describe('listOfferings (§3.3)', () => {
  it('返回公开字段，绝不暴露 internalSuccessRate', async () => {
    m.loopOfferingFindMany.mockResolvedValue([
      {
        id: 'o1',
        title: '自动生成检索路径',
        summary: 's',
        paths: ['tag:x'],
        dealRate: 0.8,
        avgDurationMs: 120,
        recentSuccessN: 8,
        recentTotalN: 10,
        requiresVerification: false,
        internalSuccessRate: 0.9, // 内部字段，必须被剥离
        endpoint: { healthStatus: 'ONLINE' },
        definition: { loopKind: 'EARTH', code: 'builtin.earth.demand.paths' },
      },
    ]);

    const items = await listOfferings();
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.endpoint.healthStatus).toBe('ONLINE');
    expect(JSON.stringify(item)).not.toContain('internalSuccessRate');
  });

  it('按 q / loopKind / paths 过滤', async () => {
    m.loopOfferingFindMany.mockResolvedValue([]);
    await listOfferings({ q: '路径', loopKind: 'EARTH' as any, paths: ['tag:x'], limit: 5 });
    const call = m.loopOfferingFindMany.mock.calls[0][0];
    expect(call.where.definition).toEqual({ loopKind: 'EARTH' });
    expect(call.where.OR).toEqual([
      { title: { contains: '路径' } },
      { summary: { contains: '路径' } },
    ]);
    expect(call.where.paths).toEqual({ hasSome: ['tag:x'] });
    expect(call.take).toBe(5);
  });
});

describe('retrieveOffering (E2 前置)', () => {
  const detailRow = {
    id: 'o1',
    title: 't',
    summary: null,
    paths: [],
    dealRate: null,
    avgDurationMs: null,
    recentSuccessN: 0,
    recentTotalN: 0,
    requiresVerification: false,
    internalSuccessRate: 0.95,
    endpoint: { healthStatus: 'ONLINE', hostMode: 'PLATFORM_HOSTED' },
    definition: { loopKind: 'HEAVEN', code: 'c', name: 'n', description: 'd' },
  };

  it('非 admin：剥离 internalSuccessRate', async () => {
    m.loopOfferingFindUnique.mockResolvedValue(detailRow);
    const r = await retrieveOffering('o1', false);
    expect(JSON.stringify(r)).not.toContain('internalSuccessRate');
    expect((r as any).endpoint.healthStatus).toBe('ONLINE');
  });

  it('admin：返回 internalSuccessRate', async () => {
    m.loopOfferingFindUnique.mockResolvedValue(detailRow);
    const r = await retrieveOffering('o1', true);
    expect((r as any).internalSuccessRate).toBe(0.95);
  });

  it('不存在返回 null', async () => {
    m.loopOfferingFindUnique.mockResolvedValue(null);
    expect(await retrieveOffering('x', false)).toBeNull();
  });
});

describe('ensureSystemOfferings', () => {
  it('复用 seed 并保证每条 SYSTEM builtin 有 ACTIVE offering', async () => {
    const r = await ensureSystemOfferings();
    expect(m.seedBuiltinLoops).toHaveBeenCalled();
    expect(r).toEqual({ definitions: 10, endpoints: 9, offerings: 9, contracts: 0 });
  });
});
