import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Stage 1.2: 公益收尾单测
 * >=6 用例:V1 migration / V2 可追溯 / V3 不超池 / V4 选奖 / V5 random 不回归 / V6 admin 鉴权
 * 风格:Vitest + Prisma mock(同 Stage 0/1.1)
 */

const m = vi.hoisted(() => {
  // 拨付 service
  const welfareDisbursementCreate = vi.fn();
  const welfareFundPoolFindUnique = vi.fn();
  const welfareFundPoolUpdate = vi.fn();
  const welfareDisbursementFindMany = vi.fn();
  const welfareDisbursementCount = vi.fn();

  // 奖励 service
  const welfareRewardCreate = vi.fn();

  // 公共
  const prisma = {
    welfareDisbursement: {
      create: welfareDisbursementCreate,
      findMany: welfareDisbursementFindMany,
      count: welfareDisbursementCount,
    },
    welfareFundPool: {
      findUnique: welfareFundPoolFindUnique,
      update: welfareFundPoolUpdate,
    },
    welfareReward: {
      create: welfareRewardCreate,
    },
    $transaction: vi.fn(),
  };

  return {
    prisma,
    welfareDisbursementCreate,
    welfareFundPoolFindUnique,
    welfareFundPoolUpdate,
    welfareDisbursementFindMany,
    welfareDisbursementCount,
    welfareRewardCreate,
  };
});

vi.mock("../lib/prisma.js", () => ({ prisma: m.prisma }));

// 鉴权中间件 mock:V6 测试用
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      userId: req.headers["x-test-userid"] || "u1",
      phone: "13800000000",
      certLevel: "ADVANCED",
    };
    next();
  },
}));

vi.mock("../middleware/admin.js", () => ({
  adminMiddleware: (req: any, res: any, next: any) => {
    if (req.user?.userId === "admin-1") return next();
    res.status(403).json({ code: 403, message: "无权访问", timestamp: Date.now() });
  },
}));

import { welfareDisbursementService } from "../services/welfare-disbursement.js";
import { welfareRewardService } from "../services/welfare-reward.js";
import { adminRouter } from "../routes/admin.js";

beforeEach(() => {
  m.welfareDisbursementCreate.mockReset();
  m.welfareFundPoolFindUnique.mockReset();
  m.welfareFundPoolUpdate.mockReset();
  m.welfareDisbursementFindMany.mockReset();
  m.welfareDisbursementCount.mockReset();
  m.welfareRewardCreate.mockReset();
  m.prisma.$transaction.mockReset();
});

describe("welfareDisbursementService.recordDisbursement (阶段 1.2 A/B/C)", () => {
  it("Test A: 池 balance=1000,拨付 300 → balance=700,totalOutflow+=300,记录落库", async () => {
    m.welfareFundPoolFindUnique.mockResolvedValue({ regionId: 100, balance: 1000, totalOutflow: 0 });
    // recordDisbursement 用 callback 形式的 $transaction
    m.prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        welfareFundPool: { findUnique: m.welfareFundPoolFindUnique, update: m.welfareFundPoolUpdate },
        welfareDisbursement: { create: m.welfareDisbursementCreate },
      };
      return cb(tx);
    });
    m.welfareDisbursementCreate.mockResolvedValue({ id: "d1", regionId: 100, amount: 300 });
    m.welfareFundPoolUpdate.mockResolvedValue({});

    const result = await welfareDisbursementService.recordDisbursement({
      regionId: 100, amount: 300, recipientOrg: "民政局", operatorId: "u1",
    });

    expect(result).toEqual({ id: "d1", regionId: 100, amount: 300 });
    // 关键:create 的实际入参被 { data: { ... } } 包裹
    expect(m.welfareDisbursementCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ regionId: 100, amount: 300, recipientOrg: "民政局" }) }),
    );
    expect(m.welfareFundPoolUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { regionId: 100 },
        data: expect.objectContaining({ balance: 700, totalOutflow: 300 }),
      }),
    );
  });

  it("Test B: 拨付 amount=1500 > balance=1000 → throw 400", async () => {
    m.welfareFundPoolFindUnique.mockResolvedValue({ regionId: 100, balance: 1000, totalOutflow: 0 });
    m.prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        welfareFundPool: { findUnique: m.welfareFundPoolFindUnique, update: m.welfareFundPoolUpdate },
        welfareDisbursement: { create: m.welfareDisbursementCreate },
      };
      return cb(tx);
    });

    await expect(
      welfareDisbursementService.recordDisbursement({
        regionId: 100, amount: 1500, recipientOrg: "X", operatorId: "u1",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(m.welfareDisbursementCreate).not.toHaveBeenCalled();
    expect(m.welfareFundPoolUpdate).not.toHaveBeenCalled();
  });

  it("Test C: 拨付 amount=0 → throw 400", async () => {
    await expect(
      welfareDisbursementService.recordDisbursement({
        regionId: 100, amount: 0, recipientOrg: "X", operatorId: "u1",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(m.welfareDisbursementCreate).not.toHaveBeenCalled();
  });
});

describe("welfareRewardService.grantReward choice 分支 (阶段 1.2 D/E)", () => {
  it("Test D: mode=choice + choiceLabel → 落库 rewardType=choice,不扣池,id 落库", async () => {
    // choice 路径不走 $transaction,直接 create
    m.welfareRewardCreate.mockResolvedValue({ id: "wr1", demandId: "d1", providerId: "u1", amount: 0, rewardType: "choice", choiceLabel: "见义勇为证书" });

    const result = await welfareRewardService.grantReward("d1", "u1", 100, {
      mode: "choice",
      choiceLabel: "见义勇为证书",
    });

    expect(result.type).toBe("choice");
    expect(result.badge).toBe("见义勇为证书");
    expect(result.amount).toBe(0);
    expect(result.id).toBe("wr1");
    // 关键:create 实际入参被 { data: { ... } } 包裹
    expect(m.welfareRewardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          demandId: "d1",
          providerId: "u1",
          amount: 0,
          isSpiritual: false,
          rewardType: "choice",
          choiceLabel: "见义勇为证书",
        }),
      }),
    );
    // choice 路径不应触发 $transaction
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("Test D-edge: mode=choice 但缺 choiceLabel → throw 400", async () => {
    await expect(
      welfareRewardService.grantReward("d1", "u1", 100, { mode: "choice" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(m.welfareRewardCreate).not.toHaveBeenCalled();
  });

  it("Test E: 默认(random) + 池有余额 200 → 随机红包路径,rewardType=random", async () => {
    // random monetary 路径:
    // 1) findUnique 在事务外
    m.welfareFundPoolFindUnique.mockResolvedValue({
      id: "pool-1",
      regionId: 100,
      balance: 200,
      totalOutflow: 0,
    });
    // 2) 数组形式 $transaction
    m.welfareRewardCreate.mockResolvedValue({
      id: "wr2",
      demandId: "d1",
      providerId: "u1",
      amount: 100,
      rewardType: "random",
    });
    m.welfareFundPoolUpdate.mockResolvedValue({});
    m.prisma.$transaction.mockImplementation(async (ops: any[]) => {
      // 数组形式:遍历执行每个 op,回填结果
      const results: any[] = [];
      for (const op of ops) {
        if (op && op.data && op.data.rewardType === "random") {
          results.push(await m.welfareRewardCreate(op));
        } else if (op && op.where && op.data && "balance" in op.data) {
          results.push(await m.welfareFundPoolUpdate(op));
        } else {
          results.push({});
        }
      }
      return results;
    });

    // 强制 Math.random 返回 0.5 → amount = round(0.5 * min(200, 200) * 100) / 100 = 100
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = await welfareRewardService.grantReward("d1", "u1", 100);

    expect(result.type).toBe("monetary");
    expect(result.amount).toBeGreaterThan(0);
    // 关键:create 实际入参被 { data: { ... } } 包裹
    expect(m.welfareRewardCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ demandId: "d1", providerId: "u1", amount: 100, fundPoolId: "pool-1", rewardType: "random" }),
      }),
    );
    // pool.update 也走事务数组,data 用 decrement/increment 表达式
    expect(m.welfareFundPoolUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { regionId: 100 },
        data: expect.objectContaining({
          balance: { decrement: 100 },
          totalOutflow: { increment: 100 },
        }),
      }),
    );
    spy.mockRestore();
  });
});

describe("welfareDisbursementService.listDisbursements (阶段 1.2 F)", () => {
  it("Test F: listDisbursements(regionId) → 返回该 region 记录 + 分页", async () => {
    m.welfareDisbursementFindMany.mockResolvedValue([
      { id: "d1", regionId: 100, amount: 300, recipientOrg: "X" },
      { id: "d2", regionId: 100, amount: 200, recipientOrg: "Y" },
    ]);
    m.welfareDisbursementCount.mockResolvedValue(2);

    const result = await welfareDisbursementService.listDisbursements(100, 1, 20);

    expect(m.welfareDisbursementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { regionId: 100 },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.items[0]!.amount).toBe(300);
  });
});

describe("admin /api/admin/welfare/disbursements 鉴权 (阶段 1.2 G / V6)", () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/admin", adminRouter);
    return app;
  };

  it("Test G: 非 ADMIN 调 POST /api/admin/welfare/disbursements → 403", async () => {
    // 非 ADMIN(由 adminMiddleware mock 拒绝)
    const res = await request(buildApp())
      .post("/api/admin/welfare/disbursements")
      .set("x-test-userid", "u1")
      .send({ regionId: 100, amount: 300, recipientOrg: "民政局" });

    expect(res.status).toBe(403);
    // 鉴权失败:service 不会被调用
    expect(m.welfareDisbursementCreate).not.toHaveBeenCalled();
    expect(m.welfareFundPoolUpdate).not.toHaveBeenCalled();
  });

  it("Test G-admin: ADMIN 调 POST → service 正常执行,不返回 403", async () => {
    // 准备 service 的 $transaction(callback) mock
    m.welfareFundPoolFindUnique.mockResolvedValue({ regionId: 100, balance: 1000, totalOutflow: 0 });
    m.prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        welfareFundPool: { findUnique: m.welfareFundPoolFindUnique, update: m.welfareFundPoolUpdate },
        welfareDisbursement: { create: m.welfareDisbursementCreate },
      };
      return cb(tx);
    });
    m.welfareDisbursementCreate.mockResolvedValue({ id: "d1", regionId: 100, amount: 300 });
    m.welfareFundPoolUpdate.mockResolvedValue({});

    const res = await request(buildApp())
      .post("/api/admin/welfare/disbursements")
      .set("x-test-userid", "admin-1")
      .send({ regionId: 100, amount: 300, recipientOrg: "民政局" });

    expect(res.status).toBe(201);
    expect(m.welfareDisbursementCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ regionId: 100, amount: 300, recipientOrg: "民政局" }) }),
    );
  });
});
