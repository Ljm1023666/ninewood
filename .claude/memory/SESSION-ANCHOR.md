# SESSION ANCHOR

## Current Intent（2026-07-29 自然回 V4 · 付费运行）

在 V3 验证门闩之上，落地地回 **预付 → 天回裁决 → 捕获/退款**（旁路 Demand/Order 结算机）。

### 权威文档

- 理念：`docs/回的理念.md`
- V3：`docs/specs/NATURAL-LOOP-V3-ADR.md`
- **V4（新）**：`docs/specs/NATURAL-LOOP-V4-ADR.md`

### 已完成

- `loop-economy`：`prepayLoopRun` / `finalizeLoopSettlement`；整数点（`User.points` 为 Int）
- `runOffering` / `runRecipe`：`billable` + `serviceAmount`；事件 `SETTLEMENT_PREPAID|CAPTURED|REFUNDED`
- 文本精简样板标价 20+1+1；免费试跑仍默认
- 前端：免费试跑 / 付费运行；运行详情展示真实结算流水
- 测试：loop 套件 **68** 通过（含真库 V4 资金断言）

### Next

1. 浏览器付费运行验收（需本地 API 起来后）
2. USER 供给方 payout 联调（上架 EXTERNAL_API + ownerId）
3. V4.1：举报 30% 分账、验证失败供给方倒赔验证费
4. 勿混入无关液态玻璃 WIP

### Do NOT

- 禁止对地回付费调用 `settleDemand` / `WalletHold(demandId)` / `Settlement`
- 禁止地回自证 SUCCEEDED 绕过天回再入账
- BLOCKED 时禁止 credit 供给方
