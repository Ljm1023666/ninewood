import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wave B · 影子钩子单测（mock prisma）
 * 断言事件类型与 status 迁移；并验证钩子抛错可被调用方 .catch 隔离。
 */

const m = vi.hoisted(() => ({
  loopDefinitionFindUnique: vi.fn(),
  loopRunCreate: vi.fn(),
  loopRunUpdate: vi.fn(),
  loopRunFindFirst: vi.fn(),
  loopEventCreate: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    loopDefinition: { findUnique: m.loopDefinitionFindUnique },
    loopRun: {
      create: m.loopRunCreate,
      update: m.loopRunUpdate,
      findFirst: m.loopRunFindFirst,
    },
    loopEvent: { create: m.loopEventCreate },
  },
}));

// confirm 钩子内串联验证；单测隔离，避免拉真实 executor/prisma
vi.mock('./verification.service.js', () => ({
  verifyDemandShadowByRunId: vi.fn().mockResolvedValue(undefined),
  verifyDemandShadow: vi.fn().mockResolvedValue(undefined),
}));

import {
  shadowOnDemandCreated,
  shadowOnApplicantAccepted,
  shadowOnOrderConfirmed,
  shadowOnLoopCancelled,
} from './shadow-hooks.js';
import { verifyDemandShadowByRunId } from './verification.service.js';

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.loopDefinitionFindUnique.mockResolvedValue({ id: 'def-1' });
  m.loopRunCreate.mockResolvedValue({ id: 'run-1' });
  m.loopRunUpdate.mockResolvedValue({});
  m.loopRunFindFirst.mockResolvedValue(null);
  m.loopEventCreate.mockResolvedValue({});
});

describe('shadowOnDemandCreated (§4.1)', () => {
  it('创建 HUMAN LoopRun(TRIGGERED) 且写入 DEMAND_SHADOWED 事件', async () => {
    const runId = await shadowOnDemandCreated({
      id: 'd1',
      userId: 'u1',
      title: '代取快递',
      paths: ['tag:快递'],
    });

    expect(runId).toBe('run-1');
    expect(m.loopRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'TRIGGERED',
          loopKind: 'HUMAN',
          initiatorRef: 'user:u1',
          demandId: 'd1',
        }),
      }),
    );
    expect(m.loopEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'DEMAND_SHADOWED',
          visibility: 'SYSTEM_ONLY',
          loopRunId: 'run-1',
        }),
      }),
    );
  });
});

describe('shadowOnApplicantAccepted (§4.2)', () => {
  it('已存在开放回 → EXECUTING 且写入 HUMAN_MATCHED（带 orderId/receiverRef）', async () => {
    m.loopRunFindFirst.mockResolvedValue({ id: 'run-open' });

    await shadowOnApplicantAccepted('d1', 'u-req', 'u-prov', 'o1');

    expect(m.loopRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-open' },
        data: expect.objectContaining({
          status: 'EXECUTING',
          receiverRef: 'user:u-prov',
          orderId: 'o1',
        }),
      }),
    );
    expect(m.loopEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'HUMAN_MATCHED', visibility: 'ACTOR' }),
      }),
    );
  });

  it('无开放回 → 补建后 EXECUTING', async () => {
    m.loopRunFindFirst.mockResolvedValue(null);

    await shadowOnApplicantAccepted('d1', 'u-req', 'u-prov', 'o1');

    expect(m.loopRunCreate).toHaveBeenCalledTimes(1);
    expect(m.loopRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTING' }) }),
    );
  });
});

describe('shadowOnOrderConfirmed (§4.3 + Wave E)', () => {
  it('VERIFYING → 验证 → SUCCEEDED → CLOSED 且写入 ORDER_SETTLED_SHADOW', async () => {
    m.loopRunFindFirst.mockResolvedValue({ id: 'run-open' });

    await shadowOnOrderConfirmed('d1', 'o1', { price: 100, serviceFee: 5 });

    expect(m.loopEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'ORDER_SETTLED_SHADOW' }),
      }),
    );
    // 验证必须在 CLOSED 之前串联调用（避免与并行 hook 竞态）
    expect(verifyDemandShadowByRunId).toHaveBeenCalledWith('run-open');
    const statuses = m.loopRunUpdate.mock.calls.map((c: any) => c[0].data.status);
    expect(statuses).toEqual(['VERIFYING', 'SUCCEEDED', 'CLOSED']);
  });

  it('无关联回 → 静默跳过（不抛错）', async () => {
    m.loopRunFindFirst.mockResolvedValue(null);
    await expect(shadowOnOrderConfirmed('d1', 'o1', { price: 1, serviceFee: 0 })).resolves.toBeUndefined();
    expect(m.loopRunUpdate).not.toHaveBeenCalled();
  });
});

describe('shadowOnLoopCancelled (§4.4)', () => {
  it('写入 LOOP_CANCELLED 且 CLOSED', async () => {
    m.loopRunFindFirst.mockResolvedValue({ id: 'run-open' });

    await shadowOnLoopCancelled('d1', 'WITHDRAWN');

    expect(m.loopEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'LOOP_CANCELLED' }),
      }),
    );
    expect(m.loopRunUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-open' },
        data: expect.objectContaining({ status: 'CLOSED' }),
      }),
    );
  });
});

describe('失败隔离（宪法：影子优先）', () => {
  it('loopRun.create 抛错 → 钩子 reject，由调用方 .catch 隔离不阻断主路径', async () => {
    m.loopRunCreate.mockRejectedValue(new Error('db down'));
    await expect(
      shadowOnDemandCreated({ id: 'd1', userId: 'u1', title: 't', paths: [] }),
    ).rejects.toThrow('db down');
  });
});
