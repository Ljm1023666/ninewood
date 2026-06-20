import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Stage 1.5: 私人圈回归测试
 * 6 用例:PC-A create / PC-B joinByCode 有效 / PC-C joinByCode 无效 / PC-D 已在圈 / PC-E joinPublic 拒 PRIVATE / PC-F getMyCircles
 * 风格:Vitest + Prisma mock(同 Stage 0/1.1/1.2)
 */

const m = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const circleCreate = vi.fn();
  const circleFindUnique = vi.fn();
  const circleFindMany = vi.fn();
  const circleUpdate = vi.fn();
  const circleMemberCreate = vi.fn();
  const circleMemberFindUnique = vi.fn();
  const circleMemberFindMany = vi.fn();

  return {
    userFindUnique,
    circleCreate,
    circleFindUnique,
    circleFindMany,
    circleUpdate,
    circleMemberCreate,
    circleMemberFindUnique,
    circleMemberFindMany,
  };
});

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: m.userFindUnique },
    circle: {
      create: m.circleCreate,
      findUnique: m.circleFindUnique,
      findMany: m.circleFindMany,
      update: m.circleUpdate,
    },
    circleMember: {
      create: m.circleMemberCreate,
      findUnique: m.circleMemberFindUnique,
      findMany: m.circleMemberFindMany,
    },
  },
}));

import { circleService } from "../services/circle.service.js";

beforeEach(() => {
  m.userFindUnique.mockReset();
  m.circleCreate.mockReset();
  m.circleFindUnique.mockReset();
  m.circleFindMany.mockReset();
  m.circleUpdate.mockReset();
  m.circleMemberCreate.mockReset();
  m.circleMemberFindUnique.mockReset();
  m.circleMemberFindMany.mockReset();
});

describe("circleService.create 私人圈创建 (阶段 1.5 PC-A)", () => {
  it("PC-A: create(userId, {name}) → type=PRIVATE, inviteCode 8 位, owner 自动入圈, memberCount=1", async () => {
    m.userFindUnique.mockResolvedValue({ id: "u1", coverUrl: "cover.png" });
    m.circleCreate.mockResolvedValue({
      id: "c1",
      name: "我家附近",
      type: "PRIVATE",
      ownerId: "u1",
      inviteCode: "ABCD1234",
      memberCount: 1,
    });
    m.circleMemberCreate.mockResolvedValue({ circleId: "c1", userId: "u1", role: "OWNER" });

    const result = await circleService.create("u1", { name: "我家附近" });

    expect(result.id).toBe("c1");
    expect(result.type).toBe("PRIVATE");
    // circle.create 必传:ownerId, type=PRIVATE, memberCount=1, inviteCode 8 位
    expect(m.circleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "我家附近",
          type: "PRIVATE",
          ownerId: "u1",
          memberCount: 1,
          inviteCode: expect.stringMatching(/^[A-F0-9]{8}$/),
        }),
      }),
    );
    // 创建者作为 OWNER 入圈
    expect(m.circleMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ circleId: "c1", userId: "u1", role: "OWNER" }),
      }),
    );
  });
});

describe("circleService.joinByCode 邀请码加入 (阶段 1.5 PC-B/C/D)", () => {
  it("PC-B: joinByCode 有效码 → 新建 MEMBER, memberCount increment", async () => {
    m.circleFindUnique.mockResolvedValue({
      id: "c1",
      name: "我家附近",
      type: "PRIVATE",
      ownerId: "u-owner",
      inviteCode: "ABCD1234",
      memberCount: 5,
    });
    m.circleMemberFindUnique.mockResolvedValue(null);
    m.circleMemberCreate.mockResolvedValue({ circleId: "c1", userId: "u2", role: "MEMBER" });
    m.circleUpdate.mockResolvedValue({ id: "c1", memberCount: 6 });

    const result = await circleService.joinByCode("u2", "abcd1234");

    // 服务端 toUpperCase 后用 inviteCode 查询
    expect(m.circleFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inviteCode: "ABCD1234" } }),
    );
    // 新建 MEMBER
    expect(m.circleMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ circleId: "c1", userId: "u2", role: "MEMBER" }),
      }),
    );
    // memberCount +1
    expect(m.circleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ memberCount: { increment: 1 } }),
      }),
    );
    expect(result.message).toBeDefined();
  });

  it("PC-C: joinByCode 无效码 → 404", async () => {
    m.circleFindUnique.mockResolvedValue(null);

    await expect(circleService.joinByCode("u2", "BADCODE1")).rejects.toMatchObject({ status: 404 });
    expect(m.circleMemberCreate).not.toHaveBeenCalled();
    expect(m.circleUpdate).not.toHaveBeenCalled();
  });

  it("PC-D: joinByCode 用户已在圈 → 409", async () => {
    m.circleFindUnique.mockResolvedValue({
      id: "c1",
      type: "PRIVATE",
      inviteCode: "ABCD1234",
      memberCount: 5,
    });
    m.circleMemberFindUnique.mockResolvedValue({ circleId: "c1", userId: "u2", role: "MEMBER" });

    await expect(circleService.joinByCode("u2", "ABCD1234")).rejects.toMatchObject({ status: 409 });
    expect(m.circleMemberCreate).not.toHaveBeenCalled();
    expect(m.circleUpdate).not.toHaveBeenCalled();
  });
});

describe("circleService.joinPublic 公开加入 (阶段 1.5 PC-E)", () => {
  it("PC-E: joinPublic 命中 PRIVATE 圈 → 400,提示走邀请码", async () => {
    m.circleFindUnique.mockResolvedValue({
      id: "c1",
      name: "我家附近",
      type: "PRIVATE",
      ownerId: "u-owner",
    });

    await expect(circleService.joinPublic("u2", "c1")).rejects.toMatchObject({ status: 400 });
    expect(m.circleMemberCreate).not.toHaveBeenCalled();
    expect(m.circleUpdate).not.toHaveBeenCalled();
  });
});

describe("circleService.getMyCircles 我的圈 (阶段 1.5 PC-F)", () => {
  it("PC-F: getMyCircles → 返回用户的 memberships(带 coverUrl 回退)", async () => {
    m.circleMemberFindMany.mockResolvedValue([
      {
        circleId: "c1",
        userId: "u1",
        role: "OWNER",
        joinedAt: new Date(),
        circle: {
          id: "c1",
          name: "我家附近",
          type: "PRIVATE",
          ownerId: "u1",
          coverUrl: null,
          memberCount: 1,
          activeScore: 0,
          status: "ACTIVE",
          _count: { members: 1 },
          owner: { id: "u1", nickname: "nick", avatarUrl: "a.png", coverUrl: "owner-cover.png" },
        },
      },
    ]);

    const result = await circleService.getMyCircles("u1");

    expect(m.circleMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("OWNER");
    // coverUrl 回退:circle.coverUrl 为空 → 用 owner.coverUrl
    expect(result[0].circle.coverUrl).toBe("owner-cover.png");
  });
});
