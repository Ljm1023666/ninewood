import { describe, it, expect } from "vitest";
import {
  userWantsOpenFirstDemand,
  inferFollowUpTools,
  extractNavigatePath,
} from "../services/agent/follow-up-tools.js";

describe("userWantsOpenFirstDemand", () => {
  it("matches common open-first patterns", () => {
    expect(userWantsOpenFirstDemand("搜 PPT 并打开第一个")).toBe(true);
    expect(userWantsOpenFirstDemand("打开第一个需求")).toBe(true);
    expect(userWantsOpenFirstDemand("搜一下并打开第一条")).toBe(true);
  });

  it("returns false for plain search", () => {
    expect(userWantsOpenFirstDemand("搜一下需求")).toBe(false);
    expect(userWantsOpenFirstDemand("看看我的需求")).toBe(false);
  });
});

describe("inferFollowUpTools", () => {
  it("appends navigate_to after search_demands when intent matches", () => {
    const executed = [
      {
        name: "search_demands",
        arguments: { keyword: "PPT" },
        result: {
          success: true,
          data: [{ id: "abc-1", title: "PPT" }],
          message: "found",
        },
      },
    ];
    const out = inferFollowUpTools("搜 PPT 并打开第一个", executed);
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe("navigate_to");
    expect(out[0]!.arguments.path).toBe("/demands/abc-1");
  });

  it("does nothing when already navigated", () => {
    const executed = [
      {
        name: "search_demands",
        arguments: { keyword: "PPT" },
        result: {
          success: true,
          data: [{ id: "abc-1" }],
          message: "found",
        },
      },
      {
        name: "navigate_to",
        arguments: { path: "/demands/abc-1" },
        result: { success: true, data: { path: "/demands/abc-1" }, message: "ok" },
      },
    ];
    expect(inferFollowUpTools("搜 PPT 并打开第一个", executed)).toHaveLength(0);
  });

  it("does nothing when search returned empty", () => {
    const executed = [
      {
        name: "search_demands",
        arguments: { keyword: "PPT" },
        result: { success: true, data: [], message: "empty" },
      },
    ];
    expect(inferFollowUpTools("搜 PPT 并打开第一个", executed)).toHaveLength(0);
  });
});

describe("extractNavigatePath", () => {
  it("extracts /path from data", () => {
    expect(
      extractNavigatePath({
        success: true,
        data: { path: "/demands/x" },
        message: "",
      }),
    ).toBe("/demands/x");
  });

  it("rejects non-leading-slash", () => {
    expect(
      extractNavigatePath({ success: true, data: { path: "demands" }, message: "" }),
    ).toBeNull();
  });

  it("rejects unsuccessful results", () => {
    expect(
      extractNavigatePath({ success: false, data: { path: "/x" }, message: "fail" }),
    ).toBeNull();
  });
});