# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

后端向行业标准推进：P0 已合并；交易可信度核心已按 ADR **推荐默认**落地一版；仍未宣称 Accepted / 行业完备。

## Changes Made（已推送 origin/master）

- `74e010f` P0 安全止血 + ORDER-TRANSACTION-TRUST ADR
- `bdce2f4` 发现页 UI / 字体
- `9003b8b` Socket 私信走 messageService；部分完成提议/确认/拒绝/撤回；prepay/cancel 条件更新；`operationKey`；migration `20260728120000_order_transaction_trust`

## Decisions

- `WAITING_REVIEW` **禁止 cancel**（ADR 推荐默认，产品未正式勾选第 11 节）
- 剩余价 `R = max(1, A - P)`；`settlePartialWithRemainder` 拆分 hold
- ADR 仍为 Proposed；实现已先行对齐推荐项，待产品补勾选后改 Accepted

## Active Issues / 距行业标准缺口

- Idempotency-Key 中间件 + 租约表尚未接线到路由
- 真实 PostgreSQL 并发双扣/守恒 CI（C1–C5）未建
- 邮箱验证码仍只打日志；上传 500MB；双向评价；多实例 cron 锁
- 生产 Docker 镜像本机仍无 CLI 未验证
- 云端需跑 migration：`20260728120000_order_transaction_trust`

## Next Steps

1. 云端/本地 DB 执行 prisma migrate
2. 实现 Idempotency-Key 中间件并挂 prepay/cancel/confirm/partial/accept
3. 补真实 PG 并发与守恒测试
4. 产品勾选 ADR §11 后改 Accepted
