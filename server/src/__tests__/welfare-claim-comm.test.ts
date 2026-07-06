import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Stage 1.6: 公益 claim ↔ comm 双消息起算对齐
 * WC-A claim→PENDING / WC-B 409 / WC-C 400 / WC-D–F tryStartCommWindow / WC-G send 接线
 */

const m = vi.hoisted(() => {
  const demandFindUnique = vi.fn();
  const applicantFindFirst = vi.fn();
  const applicantFindMany = vi.fn();
  const applicantCreate = vi.fn();
  const applicantUpdate = vi.fn();
  const messageCount = vi.fn();
  const messageSend = vi.fn();

  return {
    demandFindUnique,
    applicantFindFirst,
    applicantFindMany,
    applicantCreate,
    applicantUpdate,
    messageCount,
    messageSend,
  };
});

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    demand: { findUnique: m.demandFindUnique },
    demandApplicantV2: {
      findFirst: m.applicantFindFirst,
      findMany: m.applicantFindMany,
      create: m.applicantCreate,
      update: m.applicantUpdate,
    },
    message: { count: m.messageCount },
  },
}));

vi.mock("../middleware/auth.js", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: req.headers["x-test-userid"] || "claimer-1" };
    next();
  },
}));

vi.mock("../services/message.service.js", () => ({
  messageService: {
    send: m.messageSend,
  },
}));

vi.mock("../middleware/upload.js", () => ({
  upload: { single: () => (_req: any, _res: any, next: any) => next() },
  verifyUpload: (_req: any, _res: any, next: any) => next(),
}));

import { welfareRouter } from "../routes/welfare.js";
import { messageRouter } from "../routes/message.js";
import * as commService from "../services/comm.service.js";

function welfareApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/welfare", welfareRouter);
  return app;
}

function messageApp() {
  const app = express();
  app.use(express.json());
  app.set("io", null);
  app.use("/api/messages", messageRouter);
  return app;
}

beforeEach(() => {
  m.demandFindUnique.mockReset();
  m.applicantFindFirst.mockReset();
  m.applicantFindMany.mockReset();
  m.applicantCreate.mockReset();
  m.applicantUpdate.mockReset();
  m.messageCount.mockReset();
  m.messageSend.mockReset();
  vi.restoreAllMocks();
});

describe("POST /api/welfare/claim (阶段 1.6 WC-A/B/C)", () => {
  it("WC-A: 合法公益 ACTIVE → PENDING，无 commStartAt/commDeadline", async () => {
    m.demandFindUnique.mockResolvedValue({
      id: "d1",
      isPublicWelfare: true,
      status: "ACTIVE",
    });
    m.applicantFindFirst.mockResolvedValue(null);
    m.applicantCreate.mockResolvedValue({
      id: "a1",
      demandId: "d1",
      userId: "claimer-1",
      status: "PENDING",
    });

    const res = await request(welfareApp())
      .post("/api/welfare/claim/d1")
      .set("x-test-userid", "claimer-1");

    expect(res.status).toBe(201);
    expect(m.applicantCreate).toHaveBeenCalledWith({
      data: {
        demandId: "d1",
        userId: "claimer-1",
        message: "激励认领（内测）",
        status: "PENDING",
      },
    });
    const createData = m.applicantCreate.mock.calls[0][0].data as Record<string, unknown>;
    expect(createData.commStartAt).toBeUndefined();
    expect(createData.commDeadline).toBeUndefined();
  });

  it("WC-B: 已有 PENDING/COMMUNICATING → 409，不 create", async () => {
    m.demandFindUnique.mockResolvedValue({
      id: "d1",
      isPublicWelfare: true,
      status: "ACTIVE",
    });
    m.applicantFindFirst.mockResolvedValue({ id: "existing", status: "PENDING" });

    const res = await request(welfareApp())
      .post("/api/welfare/claim/d1")
      .set("x-test-userid", "claimer-2");

    expect(res.status).toBe(409);
    expect(m.applicantCreate).not.toHaveBeenCalled();
  });

  it("WC-C: 非公益或非 ACTIVE → 400", async () => {
    m.demandFindUnique.mockResolvedValue({
      id: "d2",
      isPublicWelfare: false,
      status: "ACTIVE",
    });

    const res1 = await request(welfareApp())
      .post("/api/welfare/claim/d2")
      .set("x-test-userid", "claimer-1");
    expect(res1.status).toBe(400);
    expect(m.applicantCreate).not.toHaveBeenCalled();

    m.demandFindUnique.mockResolvedValue({
      id: "d3",
      isPublicWelfare: true,
      status: "FROZEN",
    });

    const res2 = await request(welfareApp())
      .post("/api/welfare/claim/d3")
      .set("x-test-userid", "claimer-1");
    expect(res2.status).toBe(400);
    expect(m.applicantCreate).not.toHaveBeenCalled();
  });
});

describe("tryStartCommWindow (阶段 1.6 WC-D/E/F)", () => {
  it("WC-D: 仅单方消息 → 不 update", async () => {
    const createdAt = new Date("2026-06-19T10:00:00Z");
    m.applicantFindMany.mockResolvedValue([
      {
        id: "a1",
        userId: "applicant-1",
        status: "PENDING",
        createdAt,
        commStartAt: null,
        demand: { id: "d1", userId: "publisher-1" },
      },
    ]);
    m.messageCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const result = await commService.tryStartCommWindow("applicant-1", "publisher-1");

    expect(result).toBeNull();
    expect(m.applicantUpdate).not.toHaveBeenCalled();
  });

  it("WC-E: 双方各 ≥1 条消息 → COMMUNICATING + 5min deadline", async () => {
    const createdAt = new Date("2026-06-19T10:00:00Z");
    m.applicantFindMany.mockResolvedValue([
      {
        id: "a1",
        userId: "applicant-1",
        status: "PENDING",
        createdAt,
        commStartAt: null,
        demand: { id: "d1", userId: "publisher-1" },
      },
    ]);
    m.messageCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const now = Date.now();
    m.applicantUpdate.mockImplementation(({ data }: { data: { commDeadline: Date } }) =>
      Promise.resolve({
        id: "a1",
        status: "COMMUNICATING",
        commStartAt: new Date(now),
        commDeadline: data.commDeadline,
      }),
    );

    const result = await commService.tryStartCommWindow("publisher-1", "applicant-1");

    expect(m.applicantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "a1" },
        data: expect.objectContaining({
          status: "COMMUNICATING",
          commStartAt: expect.any(Date),
          commDeadline: expect.any(Date),
        }),
      }),
    );
    const deadline = m.applicantUpdate.mock.calls[0][0].data.commDeadline as Date;
    expect(deadline.getTime()).toBeGreaterThanOrEqual(now + 5 * 60_000 - 2000);
    expect(deadline.getTime()).toBeLessThanOrEqual(now + 5 * 60_000 + 2000);
    expect(result?.status).toBe("COMMUNICATING");
  });

  it("WC-F: 已是 COMMUNICATING → 幂等返回，不 update", async () => {
    const existing = {
      id: "a1",
      userId: "applicant-1",
      status: "COMMUNICATING",
      commStartAt: new Date("2026-06-19T10:01:00Z"),
      createdAt: new Date("2026-06-19T10:00:00Z"),
      demand: { id: "d1", userId: "publisher-1" },
    };
    m.applicantFindMany.mockResolvedValue([existing]);

    const result = await commService.tryStartCommWindow("applicant-1", "publisher-1");

    expect(result).toBe(existing);
    expect(m.applicantUpdate).not.toHaveBeenCalled();
    expect(m.messageCount).not.toHaveBeenCalled();
  });
});

describe("POST /api/messages/send 接线 (阶段 1.6 WC-G)", () => {
  it("WC-G: send 成功后调用 tryStartCommWindow 一次", async () => {
    m.messageSend.mockResolvedValue({ id: "msg1", content: "hi" });
    const spy = vi.spyOn(commService, "tryStartCommWindow").mockResolvedValue(null);

    const res = await request(messageApp())
      .post("/api/messages/send")
      .set("x-test-userid", "user-a")
      .send({ toUserId: "user-b", content: "hello" });

    expect(res.status).toBe(201);
    expect(m.messageSend).toHaveBeenCalledWith("user-a", "user-b", "hello", undefined, "TEXT", undefined);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("user-a", "user-b");
  });
});
