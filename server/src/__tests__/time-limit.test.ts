import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Stage 1.3: timeLimit 服务时限接线 + 到期提醒 cron
 * 7 个用例：A–G
 * 风格：Vitest + Prisma mock（同 Stage 0 / 1.1），不动真实数据库。
 */

const m = vi.hoisted(() => {
  // 接线（create）相关
  const demandCreate = vi.fn();
  const $transaction = vi.fn();
  const holdForDemand = vi.fn();
  const circleMemberFindUnique = vi.fn();
  const triggerAutoReceivePush = vi.fn();
  // cron（processTimeLimitReminders）相关
  const orderFindMany = vi.fn();
  const messageFindFirst = vi.fn();
  const messageCreateMany = vi.fn();
  return {
    demandCreate,
    $transaction,
    holdForDemand,
    circleMemberFindUnique,
    triggerAutoReceivePush,
    orderFindMany,
    messageFindFirst,
    messageCreateMany,
  };
});

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    // create
    demand: { create: m.demandCreate },
    $transaction: m.$transaction,
    circleMember: { findUnique: m.circleMemberFindUnique },
    // cron
    order: { findMany: m.orderFindMany },
    message: { findFirst: m.messageFindFirst, createMany: m.messageCreateMany },
  },
}));

vi.mock("../services/wallet.service.js", () => ({
  walletService: {
    calculateDeposit: vi.fn(() => 100),
    holdForDemand: m.holdForDemand,
  },
}));

vi.mock("../services/card-lifecycle.js", () => ({
  initLifecycle: vi.fn(() => ({ coverDeletedAt: null, detailDeletedAt: null, fullDeletedAt: null })),
}));

vi.mock("../services/deposit-new.js", () => ({
  checkFrozenBeforePublish: vi.fn(),
}));

vi.mock("../services/push-engine.js", () => ({
  triggerAutoReceivePush: m.triggerAutoReceivePush,
}));

vi.mock("../utils/location-fuzz.js", () => ({
  fuzzLocation: vi.fn((lat: number, lng: number) => ({ lat, lng })),
}));

import { processTimeLimitReminders } from "../cron/time-limit-reminder.js";
import { demandService } from "../services/demand.service.js";
import { createSchema } from "../routes/demand.js";

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
  expectedOutcome: "完成",
  visibilityWindow: 15,
  maxApplicants: 10,
  tagsConfirmed: false,
};

beforeEach(() => {
  m.demandCreate.mockReset();
  m.$transaction.mockReset();
  m.holdForDemand.mockReset();
  m.circleMemberFindUnique.mockReset();
  m.triggerAutoReceivePush.mockReset();
  m.orderFindMany.mockReset();
  m.messageFindFirst.mockReset();
  m.messageCreateMany.mockReset();

  m.holdForDemand.mockResolvedValue({});
  m.circleMemberFindUnique.mockResolvedValue(null);
  m.triggerAutoReceivePush.mockResolvedValue({ totalSent: 0 });

  m.$transaction.mockImplementation(async (cb: any) => {
    return cb({ demand: { create: m.demandCreate } });
  });
  m.demandCreate.mockResolvedValue({
    id: "d-new",
    userId: "u1",
    tagName: "水电",
    regionId: 100,
    tags: ["水电"],
  });

  m.orderFindMany.mockResolvedValue([]);
  m.messageFindFirst.mockResolvedValue(null);
  m.messageCreateMany.mockResolvedValue({ count: 0 });
});

describe("demandService.create 接线 timeLimitMinutes (阶段 1.3 A/B)", () => {
  it("Test A: create 传 timeLimitMinutes: 60 → demand.create.data.timeLimit ≈ now+60min (容差 5s)", async () => {
    const before = Date.now();
    await demandService.create({
      ...baseCreateParams,
      timeLimitMinutes: 60,
    } as any);
    const after = Date.now();

    expect(m.demandCreate).toHaveBeenCalledTimes(1);
    const data = m.demandCreate.mock.calls[0][0].data;
    expect(data.timeLimit).toBeInstanceOf(Date);

    const lo = before + 60 * 60_000 - 5_000;
    const hi = after + 60 * 60_000 + 5_000;
    const ts = data.timeLimit.getTime();
    expect(ts).toBeGreaterThanOrEqual(lo);
    expect(ts).toBeLessThanOrEqual(hi);
  });

  it("Test B: create 不传 timeLimitMinutes → timeLimit 为 null", async () => {
    await demandService.create(baseCreateParams as any);

    const data = m.demandCreate.mock.calls[0][0].data;
    expect(data.timeLimit).toBeNull();
  });
});

describe("createSchema 校验 timeLimitMinutes (阶段 1.3 C)", () => {
  it("Test C: create 传 timeLimitMinutes: 5 → Zod 抛错（min 15）", () => {
    expect(() =>
      createSchema.parse({
        ...baseCreateParams,
        timeLimitMinutes: 5,
      }),
    ).toThrow();
  });
});

describe("processTimeLimitReminders 扫描 + 幂等 (阶段 1.3 D/E/F/G)", () => {
  it("Test D: 命中 IN_PROGRESS + 过期 demand → 创建 2 条 SYSTEM 消息（requester + provider）", async () => {
    m.orderFindMany.mockResolvedValue([
      {
        id: "o1",
        requesterId: "u-req",
        providerId: "u-prov",
        demand: { id: "d1", title: "代打上分" },
      },
    ]);
    m.messageFindFirst.mockResolvedValue(null);

    const sent = await processTimeLimitReminders();

    expect(sent).toBe(1);
    expect(m.messageCreateMany).toHaveBeenCalledTimes(1);
    const created = m.messageCreateMany.mock.calls[0][0].data;
    expect(Array.isArray(created)).toBe(true);
    expect(created).toHaveLength(2);

    const contents = created.map((x: any) => x.content);
    const types = created.map((x: any) => x.type);
    const toUsers = created.map((x: any) => x.toUserId);
    expect(types.every((t: string) => t === "SYSTEM")).toBe(true);
    expect(contents.every((c: string) => c.startsWith("[TIME_LIMIT]"))).toBe(true);
    expect(toUsers).toEqual(expect.arrayContaining(["u-req", "u-prov"]));
    expect(created.every((x: any) => x.orderId === "o1")).toBe(true);
  });

  it("Test E: 同一 order 第二次跑 cron → 不再新增 [TIME_LIMIT] 消息（幂等）", async () => {
    m.orderFindMany.mockResolvedValue([
      {
        id: "o1",
        requesterId: "u-req",
        providerId: "u-prov",
        demand: { id: "d1", title: "代打上分" },
      },
    ]);
    m.messageFindFirst.mockResolvedValue({ id: "msg-old" });

    const sent = await processTimeLimitReminders();

    expect(sent).toBe(0);
    expect(m.messageCreateMany).not.toHaveBeenCalled();
  });

  it("Test F: demand 未过期（无候选） → 不发送", async () => {
    m.orderFindMany.mockResolvedValue([]);

    const sent = await processTimeLimitReminders();

    expect(sent).toBe(0);
    expect(m.messageFindFirst).not.toHaveBeenCalled();
    expect(m.messageCreateMany).not.toHaveBeenCalled();
  });

  it("Test G: demand 过期但 order.status !== 'IN_PROGRESS' → 不发送（order.findMany 已被 where.status 过滤）", async () => {
    m.orderFindMany.mockImplementation(async (args: any) => {
      expect(args.where.status).toBe("IN_PROGRESS");
      expect(args.where.demand.timeLimit).toEqual({ not: null, lte: expect.any(Date) });
      expect(args.where.demand.status).toBe("IN_PROGRESS");
      return [];
    });

    const sent = await processTimeLimitReminders();

    expect(sent).toBe(0);
    expect(m.messageCreateMany).not.toHaveBeenCalled();
  });
});