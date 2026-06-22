import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Wave B · 规则引擎单测
 * 覆盖 03 yaml 落地到 rule-engine 的 3 条 MVP 规则
 *   - PUBLISH_REQUIRES_VERIFIED
 *   - PUBLISH_REQUIRES_NO_FROZEN
 *   - SELF_APPLY_FORBIDDEN
 * + stub pass 行为（未知 rule_id 不阻断）
 */

const m = vi.hoisted(() => {
  const userFindUnique = vi.fn();
  const demandCount = vi.fn();
  const demandFindUnique = vi.fn();
  return { userFindUnique, demandCount, demandFindUnique };
});

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: m.userFindUnique },
    demand: { count: m.demandCount, findUnique: m.demandFindUnique },
  },
}));

import { checkRules, checkRulesForTool } from "../services/agent/rule-engine.js";
import { invalidateCapabilityCache, getCapabilityById } from "../services/agent/capability-matcher.js";

beforeEach(() => {
  m.userFindUnique.mockReset();
  m.demandCount.mockReset();
  m.demandFindUnique.mockReset();
  invalidateCapabilityCache();
});

describe("rule-engine · PUBLISH_REQUIRES_VERIFIED", () => {
  it("rejects user with certLevel=NONE", async () => {
    m.userFindUnique.mockResolvedValueOnce({ certificationLevel: "NONE" });
    const cap = getCapabilityById("create_demand")!;
    const r = await checkRules(cap, { userId: "u1" });
    expect(r.ok).toBe(false);
    expect(r.failedRuleId).toBe("PUBLISH_REQUIRES_VERIFIED");
    expect(r.error).toContain("实名认证");
  });

  it("passes for user with certLevel=INTERMEDIATE", async () => {
    m.userFindUnique.mockResolvedValueOnce({ certificationLevel: "INTERMEDIATE" });
    m.demandCount.mockResolvedValueOnce(0);
    const cap = getCapabilityById("create_demand")!;
    const r = await checkRules(cap, { userId: "u1" });
    expect(r.ok).toBe(true);
  });

  it("fails when user record not found", async () => {
    m.userFindUnique.mockResolvedValueOnce(null);
    const cap = getCapabilityById("create_demand")!;
    const r = await checkRules(cap, { userId: "ghost" });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("USER_NOT_FOUND");
  });
});

describe("rule-engine · PUBLISH_REQUIRES_NO_FROZEN", () => {
  it("rejects user with FROZEN demand", async () => {
    m.userFindUnique.mockResolvedValueOnce({ certificationLevel: "INTERMEDIATE" });
    m.demandCount.mockResolvedValueOnce(1);
    const cap = getCapabilityById("create_demand")!;
    const r = await checkRules(cap, { userId: "u1" });
    expect(r.ok).toBe(false);
    expect(r.failedRuleId).toBe("PUBLISH_REQUIRES_NO_FROZEN");
  });

  it("passes when no FROZEN demand", async () => {
    m.userFindUnique.mockResolvedValueOnce({ certificationLevel: "INTERMEDIATE" });
    m.demandCount.mockResolvedValueOnce(0);
    const cap = getCapabilityById("create_demand")!;
    const r = await checkRules(cap, { userId: "u1" });
    expect(r.ok).toBe(true);
  });
});

describe("rule-engine · SELF_APPLY_FORBIDDEN", () => {
  it("rejects self-apply", async () => {
    m.demandFindUnique.mockResolvedValueOnce({ userId: "u1" });
    const cap = getCapabilityById("apply_for_demand")!;
    const r = await checkRules(cap, { userId: "u1", toolArgs: { demandId: "d1" } });
    expect(r.ok).toBe(false);
    expect(r.failedRuleId).toBe("SELF_APPLY_FORBIDDEN");
  });

  it("passes for other users' demand", async () => {
    m.demandFindUnique.mockResolvedValueOnce({ userId: "u2" });
    const cap = getCapabilityById("apply_for_demand")!;
    const r = await checkRules(cap, { userId: "u1", toolArgs: { demandId: "d1" } });
    expect(r.ok).toBe(true);
  });

  it("skips when demandId not provided", async () => {
    const cap = getCapabilityById("apply_for_demand")!;
    const r = await checkRules(cap, { userId: "u1", toolArgs: {} });
    expect(r.ok).toBe(true);
  });
});

describe("rule-engine · stub pass for unknown rule_ids", () => {
  it("unknown rule_id is treated as pass", async () => {
    m.userFindUnique.mockResolvedValueOnce({ certificationLevel: "INTERMEDIATE" });
    m.demandCount.mockResolvedValueOnce(0);
    const cap = getCapabilityById("create_demand")!;
    // 强制注入未实现 rule
    const r = await checkRules(
      { id: "x", rule_ids: ["SNATCH_REQUIRES_CERT", "TITLE_LENGTH"] },
      { userId: "u1" },
    );
    expect(r.ok).toBe(true);
  });
});

describe("rule-engine · checkRulesForTool routing", () => {
  it("routes unknown tool to ok (no rules)", async () => {
    const r = await checkRulesForTool("read_knowledge", { userId: "u1" });
    expect(r.ok).toBe(true);
  });

  it("routes create_demand to its rule set", async () => {
    m.userFindUnique.mockResolvedValueOnce({ certificationLevel: "NONE" });
    const r = await checkRulesForTool("create_demand", { userId: "u1" });
    expect(r.ok).toBe(false);
    expect(r.failedRuleId).toBe("PUBLISH_REQUIRES_VERIFIED");
  });
});
