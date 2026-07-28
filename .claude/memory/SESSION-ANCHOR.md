# SESSION ANCHOR

## Current Intent（2026-07-28 自然回 V3 · 已验收并推送）

对照《回的理念》+ `NATURAL-LOOP-V3-ADR`：编排 / 真样板 / 开放供给 / 结算资格骨架已落地，并完成前后端测试与浏览器联调。

### 本轮闭环结论（愿景质问）

**V3 范围内：视为已实现。** 证据：
- 发现「需求就绪」→ 组合徽标「组合 · 2 步」+ DELEGATE 步骤
- 文本精简宣称 0.15 → SUCCEEDED + `SETTLEMENT_ELIGIBLE`；0.95 → FAILED + `SETTLEMENT_BLOCKED`
- 组合大回 API：`SUCCEEDED`，`linksOut: DELEGATE×2`，事件链含 `COMPOSE_*` + 结算资格
- `/loops/supply` 上架页可用；Hub「上架」Tab 宽度已加宽避免裁切
- 后端 loop 套件 **63** 通过；前端 loop 视图 **3** 通过；真库愿景集成测试通过

**V3 ADR 明确非目标（留给 V4，不算本轮失败）：** 真实扣款/分账、PLATFORM_HOSTED 用户部署、本地 LLM 字段适配、天天/地地直连。

### 关键修复

- 天回 `service_availability` 巡检原先只认 `getLoopExecutor`，把组合 recipe 标成 `UNKNOWN` 挤出推荐池 → 现同时认 `getRecipe`

### Next

1. V4：真实结算接管 `SETTLEMENT_*` 事件；举报分账
2. 可选：发现页路径解析对「需求就绪」给出更明确 path 提示（现靠文本匹配已可用）
3. 勿把无关液态玻璃 / path-search WIP 混进回体系提交

### Do NOT

- 不要为组合路径新增 Prisma 核心表
- 不要让地回自证 SUCCEEDED 绕过天回
- 不要在验证失败时改 Order/钱包主路径

## 既往 Intent（摘要）

- 液态玻璃 / LiquidMetal、路径检索仪表台样机等仍在工作区未一并提交。
