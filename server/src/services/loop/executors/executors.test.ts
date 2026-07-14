import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wave C · 内置执行器单测（mock prisma + resolveDemandPaths + fetch）
 * 覆盖四个真实执行器：paths / validate.demand_fields / validate.paths / health.endpoint_ping
 */
const m = vi.hoisted(() => ({
  demandFindUnique: vi.fn(),
  demandUpdate: vi.fn(),
  capabilityEndpointFindUnique: vi.fn(),
  capabilityEndpointUpdate: vi.fn(),
  resolveDemandPaths: vi.fn(),
  orderFindMany: vi.fn(),
  walletLedgerAggregate: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    demand: { findUnique: m.demandFindUnique, update: m.demandUpdate },
    capabilityEndpoint: {
      findUnique: m.capabilityEndpointFindUnique,
      update: m.capabilityEndpointUpdate,
    },
    order: { findMany: m.orderFindMany },
    walletLedger: { aggregate: m.walletLedgerAggregate },
  },
}));

vi.mock('../../path-search.js', () => ({
  resolveDemandPaths: m.resolveDemandPaths,
}));

import { getLoopExecutor } from './index.js';

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.resolveDemandPaths.mockReturnValue(['tag:论文']);
  m.demandUpdate.mockResolvedValue({});
  m.capabilityEndpointUpdate.mockResolvedValue({});
  m.orderFindMany.mockResolvedValue([]);
  m.walletLedgerAggregate.mockResolvedValue({ _sum: { amount: 0 } });
});

describe('builtin.earth.demand.paths (C2)', () => {
  it('SUCCEEDED 并回写 demand.paths', async () => {
    m.demandFindUnique.mockResolvedValue({
      category: '写作',
      taxonomyLeafId: null,
      serviceType: 'ONLINE',
      minPrice: 100,
      regionId: 31,
      isCertifiedOnly: false,
      tags: ['论文'],
      tagsConfirmed: false,
      title: '写一篇论文',
      description: 'd',
      paths: [],
    });
    const exec = getLoopExecutor('builtin.earth.demand.paths')!;
    const r = await exec.execute({ demandId: 'd1' }, { loopRunId: '' });
    expect(r.status).toBe('SUCCEEDED');
    expect(r.outcome).toMatchObject({ paths: ['tag:论文'] });
    expect(m.demandUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1' }, data: { paths: ['tag:论文'] } }),
    );
  });

  it('自由输入 fields（无 demandId）→ 真实计算且不回写库', async () => {
    const exec = getLoopExecutor('builtin.earth.demand.paths')!;
    const r = await exec.execute(
      { fields: { title: '写一篇论文', description: 'd', minPrice: 100, category: '写作', tags: ['论文'] } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    expect(r.outcome).toMatchObject({ paths: ['tag:论文'], wroteBack: false });
    expect(m.demandUpdate).not.toHaveBeenCalled();
    expect(m.resolveDemandPaths).toHaveBeenCalledWith(
      expect.objectContaining({ title: '写一篇论文', category: '写作' }),
      expect.anything(),
    );
  });
});

describe('builtin.heaven.validate.demand_fields', () => {
  it('字段合法 → SUCCEEDED', async () => {
    m.demandFindUnique.mockResolvedValue({ title: '论文', description: '写一篇', minPrice: 10 });
    const r = await getLoopExecutor('builtin.heaven.validate.demand_fields')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
  });

  it('字段非法 → FAILED', async () => {
    m.demandFindUnique.mockResolvedValue({ title: '', description: '', minPrice: -1 });
    const r = await getLoopExecutor('builtin.heaven.validate.demand_fields')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('FAILED');
    expect((r.outcome as any).errors.length).toBeGreaterThan(0);
  });

  it('自由输入 fields 合法 → SUCCEEDED', async () => {
    const r = await getLoopExecutor('builtin.heaven.validate.demand_fields')!.execute(
      { fields: { title: '论文', description: '写一篇', minPrice: 10 } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
  });

  it('自由输入 fields 非法 → FAILED', async () => {
    const r = await getLoopExecutor('builtin.heaven.validate.demand_fields')!.execute(
      { fields: { title: '', description: '', minPrice: -1 } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('FAILED');
  });
});

describe('builtin.heaven.validate.paths', () => {
  it('paths 合法 codec → SUCCEEDED', async () => {
    m.demandFindUnique.mockResolvedValue({ paths: ['tag:论文', 'cat:写作'] });
    const r = await getLoopExecutor('builtin.heaven.validate.paths')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
  });

  it('paths 空 → FAILED', async () => {
    m.demandFindUnique.mockResolvedValue({ paths: [] });
    const r = await getLoopExecutor('builtin.heaven.validate.paths')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('FAILED');
  });
});

describe('builtin.heaven.health.endpoint_ping (C1 健康)', () => {
  it('PLATFORM_HOSTED → ONLINE 且更新 endpoint', async () => {
    m.capabilityEndpointFindUnique.mockResolvedValue({ id: 'ep1', hostMode: 'PLATFORM_HOSTED' });
    const r = await getLoopExecutor('builtin.heaven.health.endpoint_ping')!.execute(
      { endpointId: 'ep1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    expect((r.outcome as any).healthStatus).toBe('ONLINE');
    expect(m.capabilityEndpointUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ep1' },
        data: expect.objectContaining({ healthStatus: 'ONLINE' }),
      }),
    );
  });

  it('EXTERNAL_API + 假 URL → DEGRADED', async () => {
    m.capabilityEndpointFindUnique.mockResolvedValue({ id: 'ep2', hostMode: 'EXTERNAL_API' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ENOTFOUND')));
    const r = await getLoopExecutor('builtin.heaven.health.endpoint_ping')!.execute(
      { endpointId: 'ep2', url: 'http://127.0.0.1:9/ping' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    expect((r.outcome as any).healthStatus).toBe('DEGRADED');
    vi.unstubAllGlobals();
  });
});

describe('builtin.earth.demand.card_cover (真实实现)', () => {
  it('对需求运行 → 生成 dataUri 并写回 coverImage', async () => {
    m.demandFindUnique.mockResolvedValue({
      title: '论文提纲撰写',
      description: 'd',
      mediaUrls: ['a.jpg'],
    });
    const r = await getLoopExecutor('builtin.earth.demand.card_cover')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    const o = r.outcome as any;
    expect(o.dataUri).toMatch(/^data:image\/svg\+xml,/);
    expect(o.wroteBack).toBe(true);
    expect(o.title).toEqual(['论文提纲撰写']);
    expect(m.demandUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1' }, data: { coverImage: o.dataUri } }),
    );
  });

  it('自由输入 fields → 生成封面但不写库', async () => {
    const r = await getLoopExecutor('builtin.earth.demand.card_cover')!.execute(
      { fields: { title: '测试需求' } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    const o = r.outcome as any;
    expect(o.dataUri).toMatch(/^data:image\/svg\+xml,/);
    expect(o.wroteBack).toBe(false);
    expect(m.demandUpdate).not.toHaveBeenCalled();
  });
});

describe('builtin.earth.media.normalize (真实实现)', () => {
  it('规范化扩展名/类型，并标记不支持格式', async () => {
    const r = await getLoopExecutor('builtin.earth.media.normalize')!.execute(
      { fields: { mediaUrls: ['http://x.com/a.JPG?token=1', 'script.exe', '/local/b.png'] } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    const o = r.outcome as any;
    expect(o.normalized).toHaveLength(3);
    const jpg = o.normalized.find((e: any) => e.ext === 'jpg');
    expect(jpg.url).toBe('http://x.com/a.JPG');
    expect(jpg.supported).toBe(true);
    expect(jpg.url).not.toContain('?');
    const exe = o.normalized.find((e: any) => e.ext === 'exe');
    expect(exe.supported).toBe(false);
    expect(o.summary.unsupported).toBe(1);
  });
});

describe('builtin.heaven.validate.attachment_safety (真实实现)', () => {
  it('命中高危扩展名 → FAILED 且 blocked 标注', async () => {
    const r = await getLoopExecutor('builtin.heaven.validate.attachment_safety')!.execute(
      { fields: { mediaUrls: ['pic.png', 'evil.exe', 'weird.xyz'] } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('FAILED');
    const o = r.outcome as any;
    expect(o.ok).toBe(false);
    expect(o.blocked).toHaveLength(1);
    expect(o.blocked[0].ext).toBe('exe');
    expect(o.flagged).toHaveLength(1);
    expect(o.safeCount).toBe(1);
  });

  it('全为安全格式 → SUCCEEDED', async () => {
    const r = await getLoopExecutor('builtin.heaven.validate.attachment_safety')!.execute(
      { fields: { mediaUrls: ['a.png', 'b.pdf', 'c.mp4'] } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    expect((r.outcome as any).ok).toBe(true);
  });
});

describe('builtin.heaven.validate.order_wallet_consistency (真实实现)', () => {
  it('无订单 → INCONCLUSIVE', async () => {
    m.orderFindMany.mockResolvedValue([]);
    const r = await getLoopExecutor('builtin.heaven.validate.order_wallet_consistency')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('INCONCLUSIVE');
    expect((r.outcome as any).checked).toBe(0);
  });

  it('金额与流水一致 → SUCCEEDED', async () => {
    m.orderFindMany.mockResolvedValue([{ id: 'o1', agreedPrice: 100, status: 'PAID' }]);
    m.walletLedgerAggregate.mockResolvedValue({ _sum: { amount: -100 } });
    const r = await getLoopExecutor('builtin.heaven.validate.order_wallet_consistency')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    const o = r.outcome as any;
    expect(o.orders[0].consistent).toBe(true);
    expect(o.checked).toBe(1);
  });

  it('金额与流水不一致 → FAILED', async () => {
    m.orderFindMany.mockResolvedValue([{ id: 'o1', agreedPrice: 100, status: 'PAID' }]);
    m.walletLedgerAggregate.mockResolvedValue({ _sum: { amount: -90 } });
    const r = await getLoopExecutor('builtin.heaven.validate.order_wallet_consistency')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('FAILED');
    expect((r.outcome as any).orders[0].consistent).toBe(false);
  });
});

describe('builtin.earth.demand.structure (真实实现)', () => {
  it('自由输入 description → 提取标题/预算/路径，不写库', async () => {
    const r = await getLoopExecutor('builtin.earth.demand.structure')!.execute(
      { fields: { description: '想找人帮忙写论文提纲，预算五百左右，最好在佛山' } },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    const o = r.outcome as any;
    expect(o.title).toContain('论文');
    expect(o.minPrice).toBe(500);
    expect(o.paths).toContain('tag:论文');
    expect(o.paths).toContain('rgn:佛山');
    expect(o.wroteBack).toBe(false);
    expect(m.demandUpdate).not.toHaveBeenCalled();
  });

  it('对需求运行 → 读需求描述并写回字段', async () => {
    m.demandFindUnique.mockResolvedValue({
      title: '旧标题',
      description: '需要做一个 PPT，预算 300 元',
      minPrice: 0,
    });
    const r = await getLoopExecutor('builtin.earth.demand.structure')!.execute(
      { demandId: 'd1' },
      { loopRunId: '' },
    );
    expect(r.status).toBe('SUCCEEDED');
    const o = r.outcome as any;
    expect(o.wroteBack).toBe(true);
    expect(m.demandUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'd1' },
        data: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          minPrice: 300,
        }),
      }),
    );
  });
});
