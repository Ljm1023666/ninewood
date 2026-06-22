import { describe, it, expect, beforeAll } from "vitest";
import {
  matchForbidden,
  matchCapabilities,
  getCapabilityById,
  getCapabilityByTool,
  listCapabilities,
  listForbidden,
  invalidateCapabilityCache,
} from "../services/agent/capability-matcher.js";

beforeAll(() => {
  // 强制加载 03 yaml
  invalidateCapabilityCache();
});

describe("capability-matcher", () => {
  it("loads forbidden entries from 03 yaml", () => {
    const list = listForbidden();
    expect(list.length).toBeGreaterThanOrEqual(3);
    const ids = list.map((f) => f.id);
    expect(ids).toContain("payment");
    expect(ids).toContain("account_delete");
    expect(ids).toContain("privilege_change");
  });

  it("loads capability entries from 03 yaml", () => {
    const list = listCapabilities();
    expect(list.length).toBeGreaterThanOrEqual(15);
    const ids = list.map((c) => c.id);
    expect(ids).toContain("read_knowledge");
    expect(ids).toContain("search_demands");
    expect(ids).toContain("create_demand");
    expect(ids).toContain("withdraw_demand");
  });

  it("matchForbidden hits payment signal", () => {
    const hit = matchForbidden("帮我支付订单");
    expect(hit).not.toBeNull();
    expect(hit!.entry.id).toBe("payment");
    expect(hit!.entry.redirect_pattern).toBe("/payment/{orderId}");
  });

  it("matchForbidden hits account_delete signal", () => {
    const hit = matchForbidden("我想注销账号");
    expect(hit).not.toBeNull();
    expect(hit!.entry.id).toBe("account_delete");
  });

  it("matchForbidden returns null for benign text", () => {
    expect(matchForbidden("今天天气不错")).toBeNull();
    expect(matchForbidden("帮我搜索需求")).toBeNull();
  });

  it("matchCapabilities scores consult intent highly on read_knowledge", () => {
    const matches = matchCapabilities("什么是发布需求");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.capability.id).toBe("read_knowledge");
  });

  it("matchCapabilities scores read tools on intent_signals", () => {
    const matches = matchCapabilities("我想看看我的订单");
    expect(matches.length).toBeGreaterThan(0);
    const top = matches[0]!.capability.id;
    expect(["list_my_orders", "list_my_demands"]).toContain(top);
  });

  it("getCapabilityById returns write capability with requires_confirm", () => {
    const cap = getCapabilityById("create_demand");
    expect(cap).not.toBeNull();
    expect(cap!.tool).toBe("create_demand");
    expect(cap!.side_effect).toBe("write_once");
    expect(cap!.requires_confirm).toBe(true);
    expect(cap!.rule_ids).toContain("PUBLISH_REQUIRES_VERIFIED");
  });

  it("getCapabilityByTool returns the capability bound to navigate_to", () => {
    const cap = getCapabilityByTool("navigate_to");
    expect(cap).not.toBeNull();
    expect(cap!.side_effect).toBe("navigate");
  });

  it("delivery template is parsed for write capabilities", () => {
    const cap = getCapabilityById("create_demand");
    expect(cap!.delivery.summary_template).toBeDefined();
    expect(cap!.delivery.summary_template).toContain("{id}");
    expect(cap!.delivery.verification).toBeDefined();
    expect(cap!.delivery.verification!.path).toBe("/demands/{id}");
  });
});
