import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wave C · capability.service.projectFromUserTag 单测（mock prisma）
 * 断言 UserTag → CapabilityEndpoint 投影，paths 含 tag:<tagName> + 可选 rgn。
 */
const m = vi.hoisted(() => ({
  userTagFindMany: vi.fn(),
  capabilityEndpointFindUnique: vi.fn(),
  capabilityEndpointCreate: vi.fn(),
  capabilityEndpointUpdate: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    userTag: { findMany: m.userTagFindMany },
    capabilityEndpoint: {
      findUnique: m.capabilityEndpointFindUnique,
      create: m.capabilityEndpointCreate,
      update: m.capabilityEndpointUpdate,
    },
  },
}));

import { projectFromUserTag } from './capability.service.js';

beforeEach(() => {
  Object.values(m).forEach((f: any) => f.mockReset());
  m.capabilityEndpointFindUnique.mockResolvedValue(null);
  m.capabilityEndpointCreate.mockResolvedValue({});
  m.capabilityEndpointUpdate.mockResolvedValue({});
});

describe('projectFromUserTag (§5.3)', () => {
  it('为每个 tag 投影 endpoint，paths 含 tag:<tagName> + 可选 rgn', async () => {
    m.userTagFindMany.mockResolvedValue([
      { id: 't1', tagName: '论文', regionId: 31 },
      { id: 't2', tagName: '陪聊', regionId: null },
    ]);

    const r = await projectFromUserTag('u1');

    expect(r.total).toBe(2);
    expect(r.created).toBe(2);
    expect(m.capabilityEndpointCreate).toHaveBeenCalledTimes(2);

    const calls = m.capabilityEndpointCreate.mock.calls.map((c: any) => c[0].data);
    expect(calls[0].paths).toEqual(['tag:论文', 'rgn:31']);
    expect(calls[1].paths).toEqual(['tag:陪聊']);
    // 读模型升级：ownerType=USER 且保留溯源
    calls.forEach((d: any) => {
      expect(d.ownerType).toBe('USER');
      expect(d.ownerId).toBe('u1');
      expect(d.sourceUserTagId).toBeTruthy();
    });
  });

  it('已存在则 update 而非 create（幂等）', async () => {
    m.userTagFindMany.mockResolvedValue([{ id: 't1', tagName: '论文', regionId: null }]);
    m.capabilityEndpointFindUnique.mockResolvedValue({ code: 'usertag:u1:论文' });

    const r = await projectFromUserTag('u1');
    expect(r.created).toBe(0);
    expect(r.updated).toBe(1);
    expect(m.capabilityEndpointCreate).not.toHaveBeenCalled();
    expect(m.capabilityEndpointUpdate).toHaveBeenCalledTimes(1);
  });
});
