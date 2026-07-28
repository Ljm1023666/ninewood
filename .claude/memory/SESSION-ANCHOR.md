# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

按正确顺序推进交易可信度：本地迁移验证 → 幂等租约 → PG 守恒测试 → ADR 核对（仍 Proposed）→ **勿先上云端 migrate**。

## Done This Round

1. 本地 `nine_db@5433`：`20260728120000_order_transaction_trust` 已 deploy；BOM 修复；down.sql 回滚验证；干净重放成功
2. `idempotencyMiddleware` 挂载 prepay/cancel/confirm/partial/accept + admin dispute resolve
3. `pg-trust.integration.test.ts`：同 key 重放、异 key 并发单流水、租约接管、C1/C2/C4 守恒；CI 先 migrate deploy 再测
4. 前端 `idempotency.ts` + orderApi 资金写带 Idempotency-Key
5. ADR 仍为 **Proposed**，§11 未勾选

## Do NOT

- 不要对生产/云端执行 prisma migrate deploy（需备份与版本确认后再做）

## Next Steps

1. 产品勾选 ADR §11（含 WAITING_REVIEW 禁止 cancel 等）
2. 勾选后改 Accepted
3. 云端：备份 → 查 migrate status → 确认服务版本 → migrate deploy
