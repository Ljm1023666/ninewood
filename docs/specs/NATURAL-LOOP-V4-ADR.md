# ADR · 自然回 V4：地回付费运行（预付 / 捕获 / 退款）

> **状态**：Accepted  
> **日期**：2026-07-29  
> **前置**：`docs/specs/NATURAL-LOOP-V3-ADR.md`  
> **最高产品准则**：`docs/回的理念.md`  
> **资金守恒对照**：`docs/specs/ORDER-TRANSACTION-TRUST-ADR.md`（本 ADR **不复用** Demand/Order 结算机）

## 背景

V3 已完成验证门闩与报价预览：天回通过写 `SETTLEMENT_ELIGIBLE`，失败写 `SETTLEMENT_BLOCKED`。对照理念「天回未通过则供给方不得收款」，仍缺真实点数流转。

现有 `settleDemand` / `WalletHold` / `Settlement` 全部绑定 `demandId`，若强行复用会污染订单守恒与幂等键。

## 决策

### 1. LoopRun 级账本，旁路人回订单

- 使用 `walletService.debit` / `credit` + `WalletLedger.operationKey`。
- `referenceType = 'loopRun'`，`referenceId = loopRunId`。
- **禁止**对地回付费运行调用 `settleDemand`、创建 `WalletHold(demandId)`、写入 `Settlement`。

### 2. 费用与触发

- 标价来自 `CapabilityEndpoint.pricePolicyJson.claimedServiceAmount`（可被请求体 `serviceAmount` 覆盖）。
- 运行默认 **免费试跑**（`billable !== true`）；仅 `billable: true` 时预付。
- 报价公式与 V3 一致：`total = service + platformFee(5%) + verificationFee`。

### 3. 状态机

```
create LoopRun
  →（billable）debit 需求方 total → SETTLEMENT_PREPAID
  → 执行地回 → 天回核验 → SETTLEMENT_ELIGIBLE | SETTLEMENT_BLOCKED
  → ELIGIBLE：credit 供给方 serviceAmount → SETTLEMENT_CAPTURED
     （平台佣金与验证费留在体系内；SYSTEM 供给方跳过 payout）
  → BLOCKED：credit 需求方 (service + platformFee) → SETTLEMENT_REFUNDED
     （验证费按理念由需求方承担；供给方不得收款）
  → 执行失败且未进入核验：credit 需求方 total（全额退）→ SETTLEMENT_REFUNDED
```

### 4. 组合大回

- 仅对**父运行**预付/结算一次；子步可写资格事件，但无 `SETTLEMENT_PREPAID` 则 `finalize` 为空操作。

### 5. 幂等

| 操作 | operationKey |
|------|----------------|
| 预付 | `loopRun:{id}:prepay` |
| 付给供给方 | `loopRun:{id}:pay-provider` |
| 退款 | `loopRun:{id}:refund` |

事件幂等键：`settlement-prepay|capture|refund:{loopRunId}`。

## 非目标

- 举报 30% 分账、封禁工作流。
- PLATFORM_HOSTED 用户部署与算力超额另计。
- 把地回嵌进人回订单验收流。
- 天天/地地直连。

## 后果

- 扩展 `loop-economy.service.ts`；`runOffering` / `runRecipe` 接入预付与 finalize。
- 前端详情增加「付费运行」与结算流水展示。
- 内置样板 `text.condense` 可带演示标价；免费试跑仍默认可用。
