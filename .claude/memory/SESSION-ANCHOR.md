# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

交易可信度 ADR 已按 5 项设计阻断修订，**仍为 Proposed，第 11 节全部未勾选，禁止 Accepted / 禁止改业务代码**。

## Changes Made

- 修订 `docs/specs/ORDER-TRANSACTION-TRUST-ADR.md`（回应 B1–B5）
- 本轮**仅文档**；无 Prisma / 服务 / 前端实现

## Decisions（修订后要点）

- B1：禁止 partial 直接 `settleDemand`；新增 `settlePartialWithRemainder`；剩余价 `R=max(1,A-P)`；未用托管回吐；预付服务费多退；守恒式 §4.3.5 + 用例 C1–C5
- B2：`operationKey` 冲突 → 整事务回滚后只读重放，禁止同事务 catch-and-continue
- B3：幂等 `leaseUntil` + 超时接管；FAILED/SUCCEEDED 独立短事务落库
- B4：prepay 允许 `IN_PROGRESS|PARTIAL_PENDING`；`WAITING_REVIEW`+cancel **推荐禁止**，待产品勾选
- B5：§4.5 前端 key 契约（生成/重试复用/重发换新）为生产强制 header 前置条件

## Active Issues

- 第 11 节（含 11.2 阻断补齐项）均未勾选
- P0 / 发现页等改动分 commit、Docker 验收仍待办

## Next Steps

1. 产品评审：剩余价口径、`WAITING_REVIEW` 是否禁止 cancel
2. 工程/前端确认：§5.3 租约、§4.5 幂等助手、§9.4 CI
3. 全部勾选后改 Accepted，再开实现 PR
