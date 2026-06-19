import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Stage 1.1: autoReceive \u63a8\u9001\u6d4b\u8bd5\u77e9\u9635
 * 12 \u4e2a\u7528\u4f8b\uff1aA\u2013L
 * \u9075\u5faa Stage 0 \u98ce\u683c\uff1aVitest + Prisma mock\uff0c\u4e0d\u52a8\u771f\u5b9e\u6570\u636e\u5e93\u3002
 */

const m = vi.hoisted(() => {
  const demandCreate = vi.fn();
  const $transaction = vi.fn();
  const holdForDemand = vi.fn();
  const demandFindUnique = vi.fn();
  const userTagFindMany = vi.fn();
  const userTagFindUnique = vi.fn();
  const userTagUpdate = vi.fn();
  const userFindUnique = vi.fn();
  const pushPreferenceFindUnique = vi.fn();
  const calculateDeposit = vi.fn(() => 100);
  const circleMemberFindUnique = vi.fn();
  const emit = vi.fn();
  const toFn = vi.fn(() => ({ emit }));
  return {
    demandCreate, $transaction, holdForDemand, demandFindUnique,
    userTagFindMany, userTagFindUnique, userTagUpdate,
    userFindUnique, pushPreferenceFindUnique, calculateDeposit,
    circleMemberFindUnique, emit, toFn,
  };
});

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    demand: { create: m.demandCreate, findUnique: m.demandFindUnique },
    $transaction: m.$transaction,
    userTag: {
      findMany: m.userTagFindMany,
      findUnique: m.userTagFindUnique,
      update: m.userTagUpdate,
    },
    user: { findUnique: m.userFindUnique },
    pushPreference: { findUnique: m.pushPreferenceFindUnique },
    circleMember: { findUnique: m.circleMemberFindUnique },
  },
}));

vi.mock("../services/wallet.service.js", () => ({
  walletService: {
    calculateDeposit: m.calculateDeposit,
    holdForDemand: m.holdForDemand,
  },
}));

vi.mock("../utils/location-fuzz.js", () => ({
  fuzzLocation: vi.fn((lat: number, lng: number) => ({ lat, lng })),
}));

vi.mock("../services/card-lifecycle.js", () => ({
  initLifecycle: vi.fn(() => ({ coverDeletedAt: null, detailDeletedAt: null, fullDeletedAt: null })),
}));

vi.mock("../services/deposit-new.js", () => ({
  checkFrozenBeforePublish: vi.fn(),
}));

const mockIo: any = { to: m.toFn };
import { triggerAutoReceivePush, matchAndPush } from "../services/push-engine.js";
import { demandService } from "../services/demand.service.js";
import { userTagRouter } from "../routes/user-tag.js";
import { authMiddleware } from "../middleware/auth.js";

vi.mock("../middleware/auth.js", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: req.headers["x-test-userid"] || "u1", phone: "13800000000", certLevel: "ADVANCED" };
    next();
  },
}));

const baseDemand = {
  id: "d1",
  title: "t",
  tagName: "水电",
  regionId: 100,
  tags: ["水电"],
};

const baseCreateParams = {
  userId: "u1",
  title: "t",
  description: "d",
  minPrice: 100,
  category: "c",
  serviceType: "ONLINE" as any,
  expireAt: new Date(Date.now() + 60000).toISOString(),
  tagName: "水电",
  regionId: 100,
  tags: ["水电"],
};

beforeEach(() => {
  m.demandCreate.mockReset();
  m.$transaction.mockReset();
  m.holdForDemand.mockReset();
  m.demandFindUnique.mockReset();
  m.userTagFindMany.mockReset();
  m.userTagFindUnique.mockReset();
  m.userTagUpdate.mockReset();
  m.userFindUnique.mockReset();
  m.pushPreferenceFindUnique.mockReset();
  m.calculateDeposit.mockReset();
  m.circleMemberFindUnique.mockReset();
  m.emit.mockReset();
  m.toFn.mockClear();
  m.calculateDeposit.mockReturnValue(100);
  m.holdForDemand.mockResolvedValue({});
  m.circleMemberFindUnique.mockResolvedValue(null);
  m.$transaction.mockImplementation(async (cb: any) => {
    return cb({
      demand: { create: m.demandCreate },
    });
  });
  m.demandCreate.mockResolvedValue({ id: "d-new", userId: "u1", tagName: "水电", regionId: 100, tags: ["水电"] });
  m.demandFindUnique.mockResolvedValue(baseDemand);
  m.userTagFindMany.mockResolvedValue([{ userId: "u-prov-1" }]);
  m.pushPreferenceFindUnique.mockResolvedValue(null);
});

describe("triggerAutoReceivePush 集中触发 (阶段 1.1)", () => {
  it("Test A: autoReceive=true + certified + tag 匹配 -> 推送", async () => {
    m.userTagFindMany.mockResolvedValue([{ userId: "u-prov-1" }]);
    m.pushPreferenceFindUnique.mockResolvedValue(null);
    const result = await triggerAutoReceivePush("d1", mockIo);
    expect(m.userTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "IDLE",
          autoReceive: true,
          tagName: { in: ["水电"] },
          regionId: { in: [100] },
        }),
      }),
    );
    expect(m.emit).toHaveBeenCalledWith(
      "push:new_demand",
      expect.objectContaining({ demandId: "d1" }),
    );
    expect(result.totalSent).toBe(1);
  });

  it("Test B: 非 certified -> 不推送，不走 socket emit", async () => {
    m.userTagFindMany.mockResolvedValue([]);
    const result = await triggerAutoReceivePush("d1", mockIo);
    // TD-1: 即使 0 命中，where 形状仍须包含 autoReceive=true
    expect(m.userTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IDLE',
          autoReceive: true,
          tagName: { in: ['水电'] },
          regionId: { in: [100] },
        }),
      }),
    );
    expect(m.emit).not.toHaveBeenCalled();
    expect(result.totalSent).toBe(0);
  });

  it("Test C: autoReceive=false -> 不推送", async () => {
    m.userTagFindMany.mockResolvedValue([]);
    m.pushPreferenceFindUnique.mockResolvedValue(null);
    const result = await triggerAutoReceivePush("d1", mockIo);
    // TD-1: trigger 层始终以 autoReceive=true 查询；0 命中由 UserTag.autoReceive=false 自然排除
    expect(m.userTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IDLE',
          autoReceive: true,
          tagName: { in: ['水电'] },
          regionId: { in: [100] },
        }),
      }),
    );
    expect(result.totalSent).toBe(0);
  });

  it("Test D: tag 不匹配 -> 不推送", async () => {
    m.userTagFindMany.mockResolvedValue([]);
    m.pushPreferenceFindUnique.mockResolvedValue(null);
    const result = await triggerAutoReceivePush("d1", mockIo);
    // TD-1: 0 命中由 where.tagName.in=['水电'] 与 UserTag.tagName 无交集产生
    expect(m.userTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IDLE',
          autoReceive: true,
          tagName: { in: ['水电'] },
          regionId: { in: [100] },
        }),
      }),
    );
    expect(result.totalSent).toBe(0);
  });

  it("Test E: tag 匹配但 regionId 不一致 -> 不推送", async () => {
    m.demandFindUnique.mockResolvedValue({ ...baseDemand, regionId: 999 });
    m.userTagFindMany.mockResolvedValue([]);
    m.pushPreferenceFindUnique.mockResolvedValue(null);
    const result = await triggerAutoReceivePush("d1", mockIo);
    // TD-1: regionId=999 时 where.regionId.in 必为 [999]
    expect(m.userTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IDLE',
          autoReceive: true,
          tagName: { in: ['水电'] },
          regionId: { in: [999] },
        }),
      }),
    );
    expect(result.totalSent).toBe(0);
  });

  it("Test F: UserTag.status=BUSY -> 不推送", async () => {
    m.userTagFindMany.mockResolvedValue([]);
    m.pushPreferenceFindUnique.mockResolvedValue(null);
    const result = await triggerAutoReceivePush("d1", mockIo);
    // TD-1: BUSY 由 where.status: 'IDLE' 在查询层直接排除
    expect(m.userTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IDLE',
          autoReceive: true,
          tagName: { in: ['水电'] },
          regionId: { in: [100] },
        }),
      }),
    );
    expect(result.totalSent).toBe(0);
  });

  it("Test G: PushPreference 全局关闭 -> 不推送", async () => {
    m.userTagFindMany.mockResolvedValue([{ userId: "u-prov-1" }]);
    m.pushPreferenceFindUnique.mockResolvedValue({ receivePushes: false });
    const result = await triggerAutoReceivePush("d1", mockIo);
    expect(m.emit).not.toHaveBeenCalled();
    expect(result.totalSent).toBe(0);
  });
});

describe("matchAndPush 防回归 (阶段 1.1)", () => {
  it("Test L: 手动推送（不传 autoReceiveOnly）能命中 autoReceive=false 的 IDLE 服务者", async () => {
    m.userTagFindMany.mockResolvedValue([{ userId: "u-prov-1" }]);
    m.pushPreferenceFindUnique.mockResolvedValue(null);
    const result = await matchAndPush("d1", {
      tags: ["水电"],
      regions: [100],
    }, mockIo);
    const callArgs = m.userTagFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty("autoReceive");
    expect(result.totalSent).toBe(1);
  });
});

describe("demand.service.create 钩起 autoReceive 推送 (Test H/I)", () => {
  it("Test H: create 交付后会调用 triggerAutoReceivePush，demand 不受推送失败影响", async () => {
    await demandService.create(baseCreateParams as any, mockIo);
    expect(m.userTagFindMany).toHaveBeenCalled();
    expect(m.emit).toHaveBeenCalledWith(
      "push:new_demand",
      expect.objectContaining({ demandId: "d-new" }),
    );
  });

  it("Test I: create 时 triggerAutoReceivePush 抛出错误，demand 创建仍然成功", async () => {
    m.userTagFindMany.mockImplementation(() => { throw new Error("boom"); });
    const result = await demandService.create(baseCreateParams as any, mockIo);
    expect(result).toBeDefined();
    expect(result.id).toBe("d-new");
  });
});

describe("PATCH /api/user-tags/:tagName/auto-receive (Test J/K)", () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/user-tags", userTagRouter);
    return app;
  };

  it("Test J: 身份不符（certificationLevel=NONE 且 UserTag.certified 不为 true）-> 返 403", async () => {
    m.userTagFindUnique.mockResolvedValue({ id: "ut1", userId: "u1", tagName: "水电", certified: false, autoReceive: false });
    m.userFindUnique.mockResolvedValue({ certificationLevel: "NONE" });
    const res = await request(buildApp())
      .patch("/api/user-tags/水电/auto-receive")
      .set("x-test-userid", "u1")
      .send({ autoReceive: true });
    expect(res.status).toBe(403);
  });

  it("Test K: PATCH 后 GET 风格的 UserTag 包含新值", async () => {
    m.userTagFindUnique.mockResolvedValue({ id: "ut1", userId: "u1", tagName: "水电", certified: true, autoReceive: false });
    m.userTagUpdate.mockResolvedValue({ id: "ut1", userId: "u1", tagName: "水电", certified: true, autoReceive: true });
    const res = await request(buildApp())
      .patch("/api/user-tags/水电/auto-receive")
      .set("x-test-userid", "u1")
      .send({ autoReceive: true });
    expect(res.status).toBe(200);
    expect(m.userTagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { autoReceive: true },
      }),
    );
  });
});