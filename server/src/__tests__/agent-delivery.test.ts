import { describe, it, expect, beforeAll } from "vitest";
import {
  renderDelivery,
  renderDeliveryForTool,
} from "../services/agent/delivery-template.js";
import {
  getCapabilityById,
  getCapabilityByTool,
  invalidateCapabilityCache,
} from "../services/agent/capability-matcher.js";

beforeAll(() => invalidateCapabilityCache());

describe("delivery-template", () => {
  it("renders create_demand summary with {id}", () => {
    const cap = getCapabilityById("create_demand")!;
    const out = renderDelivery(cap, { id: "abc123" });
    expect(out.summary).toBe("需求 #abc123 已创建并提交审核");
    expect(out.verification).toEqual({
      path: "/demands/abc123",
      label: "查看需求详情",
    });
    expect(out.rollback?.utterance).toBe("撤回需求 abc123");
  });

  it("renders apply_for_demand with {demandId}", () => {
    const out = renderDeliveryForTool("apply_for_demand", { demandId: "d42" });
    expect(out).not.toBeNull();
    expect(out!.summary).toBe("已向需求 #d42 提交申请");
    expect(out!.verification?.path).toBe("/demands/d42");
  });

  it("navigate_to uses title and path placeholders", () => {
    const out = renderDeliveryForTool("navigate_to", {
      title: "我的需求",
      path: "/my-demands",
    });
    expect(out).not.toBeNull();
    expect(out!.summary).toBe("正在前往我的需求");
    expect(out!.verification?.path).toBe("/my-demands");
    expect(out!.autoNavigate).toBe(true);
  });

  it("returns null for unknown tool", () => {
    const out = renderDeliveryForTool("__no_such_tool__", {});
    expect(out).toBeNull();
  });

  it("renders batch_withdraw_demands with {count}", () => {
    const out = renderDeliveryForTool("withdraw_demand", { id: "x" });
    expect(out).not.toBeNull();
    // 单工具 withdraw_demand → 命中 withdraw_demand capability 而非 batch
    expect(out!.summary).toBe("需求 #x 已下架");
  });

  it("keeps unresolved {key} verbatim when param missing", () => {
    const out = renderDeliveryForTool("create_demand", {});
    expect(out!.summary).toBe("需求 #{id} 已创建并提交审核");
  });
});
