import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 天回自动运行单测（mock prisma + mock loop-run.service）
 * 断言 runHeavenCapability 会创建 HEAVEN LoopRun、写入 SUCCEEDED 终态，
 * 并回写 offering 的成功/总次数（+1）。
 */

const m = vi.hoisted(() => ({
  loopDefinitionFindUnique: vi.fn(),
  loopOfferingFindFirst: vi.fn(),
  loopOfferingFindMany: vi.fn(),
  loopOfferingUpdate: vi.fn(),
  loopRunFindFirst: vi.fn(),
  loopRunCount: vi.fn(),
  loopRunCreate: vi.fn(),
  loopRunUpdate: vi.fn(),
  loopEventCreate: vi.fn(),
  $queryRaw: vi.fn(),
  demandCount: vi.fn(),
  orderCount: vi.fn(),
  userCount: vi.fn(),
  circleCount: vi.fn(),
  capabilityEndpointUpdate: vi.fn(),
  capabilityEndpointFindMany: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: m.$queryRaw,
    demand: { count: m.demandCount },
    order: { count: m.orderCount },
    user: { count: m.userCount },
    circle: { count: m.circleCount },
    capabilityEndpoint: {
      update: m.capabilityEndpointUpdate,
      findMany: m.capabilityEndpointFindMany,
    },
    loopDefinition: { findUnique: m.loopDefinitionFindUnique },
    loopOffering: {
      findFirst: m.loopOfferingFindFirst,
      findMany: m.loopOfferingFindMany,
      update: m.loopOfferingUpdate,
    },
    loopRun: { findFirst: m.loopRunFindFirst, count: m.loopRunCount },
  },
}));

// 隔离 loop-run.service，避免递归触碰真实 prisma
vi.mock('./loop-run.service.js', () => ({
  loopRunService: {
    create: m.loopRunCreate,
    appendEvent: m.loopEventCreate,
    transition: m.loopRunUpdate,
  },
}));

import { runHeavenCapability, HEAVEN_CAPABILITIES, listHeavenCapabilities } from './heaven-runner.service.js';

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.loopDefinitionFindUnique.mockResolvedValue({ id: 'def-heaven' });
  m.loopOfferingFindFirst.mockResolvedValue({ id: 'off-heaven' });
  m.loopOfferingFindMany.mockResolvedValue([]);
  m.loopOfferingUpdate.mockResolvedValue({});
  m.loopRunFindFirst.mockResolvedValue(null);
  m.loopRunCount.mockResolvedValue(0);
  m.loopRunCreate.mockResolvedValue('run-heaven-1');
  m.loopRunUpdate.mockResolvedValue({});
  m.loopEventCreate.mockResolvedValue({});
  m.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  m.demandCount.mockResolvedValue(0);
  m.orderCount.mockResolvedValue(0);
  m.userCount.mockResolvedValue(0);
  m.circleCount.mockResolvedValue(0);
  m.capabilityEndpointUpdate.mockResolvedValue({});
  m.capabilityEndpointFindMany.mockResolvedValue([]);
});

describe('runHeavenCapability (天回核心)', () => {
  it('运行 system_health → 创建 HEAVEN LoopRun 并迁移到 SUCCEEDED', async () => {
    await runHeavenCapability('builtin.heaven.monitor.system_health');

    // 创建时 loopKind=HEAVEN、initiatorRef=system:<code>
    expect(m.loopRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        loopKind: 'HEAVEN',
        initiatorRef: 'system:builtin.heaven.monitor.system_health',
      }),
    );

    // transition(runId, status, ...) 存在终态 SUCCEEDED
    const terminalStatus = m.loopRunUpdate.mock.calls
      .map((c: any) => c[1])
      .filter((s: string) => s === 'SUCCEEDED')[0];
    expect(terminalStatus).toBe('SUCCEEDED');

    // 回写成功/总次数 +1
    expect(m.loopOfferingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'off-heaven' },
        data: expect.objectContaining({
          recentTotalN: { increment: 1 },
          recentSuccessN: { increment: 1 },
        }),
      }),
    );
  });

  it('未知 code → 抛 400（不静默吞错）', async () => {
    await expect(runHeavenCapability('no.such.code')).rejects.toMatchObject({ status: 400 });
  });

  it('能力运行抛错 → LoopRun 终态 FAILED，且 total+1 / success 不 +1', async () => {
    m.$queryRaw.mockRejectedValue(new Error('db down'));

    await runHeavenCapability('builtin.heaven.monitor.system_health');

    const terminalStatus = m.loopRunUpdate.mock.calls
      .map((c: any) => c[1])
      .filter((s: string) => s === 'FAILED')[0];
    expect(terminalStatus).toBe('FAILED');

    expect(m.loopOfferingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'off-heaven' },
        data: expect.objectContaining({ recentTotalN: { increment: 1 } }),
      }),
    );
    const updateData = m.loopOfferingUpdate.mock.calls[0][0].data as Record<string, unknown>;
    expect(updateData.recentSuccessN).toBeUndefined();
  });

  it('可用性巡检：组合大回（有 recipe、无 executor）仍标 ONLINE', async () => {
    m.capabilityEndpointFindMany.mockResolvedValue([
      {
        id: 'ep-compose',
        code: 'builtin.compose.demand_ready',
        hostMode: 'PLATFORM_HOSTED',
        healthStatus: 'UNKNOWN',
      },
      {
        id: 'ep-orphan',
        code: 'builtin.platform.orphan.no_runner',
        hostMode: 'PLATFORM_HOSTED',
        healthStatus: 'ONLINE',
      },
    ]);

    await runHeavenCapability('builtin.heaven.monitor.service_availability');

    expect(m.capabilityEndpointUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ep-compose' },
        data: expect.objectContaining({ healthStatus: 'ONLINE' }),
      }),
    );
    expect(m.capabilityEndpointUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ep-orphan' },
        data: expect.objectContaining({ healthStatus: 'UNKNOWN' }),
      }),
    );
  });
});

describe('天回能力清单完整性', () => {
  it('HEAVEN_CAPABILITIES 覆盖 11 项真实自动能力', () => {
    expect(HEAVEN_CAPABILITIES.length).toBe(11);
    const codes = HEAVEN_CAPABILITIES.map((c) => c.code);
    expect(codes).toContain('builtin.heaven.monitor.system_health');
    expect(codes).toContain('builtin.heaven.automation.tasks');
  });
});

describe('listHeavenCapabilities (聚合看板)', () => {
  it('从 offering 聚合出状态/计数/触发方式', async () => {
    m.loopOfferingFindMany.mockResolvedValue([
      {
        id: 'off-1',
        title: '系统健康监控',
        summary: 't',
        status: 'ACTIVE',
        recentTotalN: 5,
        recentSuccessN: 4,
        definition: { code: 'builtin.heaven.monitor.system_health', name: '系统健康监控', description: 'd' },
        endpoint: { healthStatus: 'ONLINE' },
        _count: { runs: 5 },
      },
    ]);
    m.loopRunFindFirst.mockResolvedValue({
      status: 'SUCCEEDED',
      startedAt: new Date('2026-07-12T10:00:00Z'),
      actualOutcome: { summary: '数据库与核心服务在线' },
    });
    m.loopRunCount
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);

    const items = await listHeavenCapabilities();
    expect(items.length).toBe(1);
    expect(items[0]).toMatchObject({
      id: 'off-1',
      title: '系统健康监控',
      definitionCode: 'builtin.heaven.monitor.system_health',
      status: 'SUCCEEDED',
      successCount: 4,
      failCount: 1,
      runCount: 5,
      endpointHealth: 'ONLINE',
    });
    expect(items[0].trigger).toBe('每 60 秒自动探测');
    expect(items[0].stage).toBe('已成功');
  });
});
