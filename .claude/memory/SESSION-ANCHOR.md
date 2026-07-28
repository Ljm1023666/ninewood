# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

交易可信度：**工程侧已具备产品签字条件**；ADR 保持 `Proposed`；**不扩功能、不上云端 migrate**，等待产品评审勾选 §11。

## Engineering Ready（证据）

- 实现提交：`b922fba`（前序核心 `9003b8b`）
- 本地迁移 + 回滚验证完成；云端未动
- PG trust：同 key 重放、异 key 并发、租约接管、C1/C2/C4 守恒
- 前端幂等助手已接资金写接口

## Product Review Checklist（ADR §11.1–11.2）

- [ ] 剩余需求仅 partial accept 后创建
- [ ] `PARTIAL_PENDING` 允许 cancel / dispute
- [ ] 生产强制 Idempotency-Key
- [ ] operationKey 无跨操作冲突
- [ ] 前后端同窗口发布
- [ ] 网络重试复用原 key；用户重发才换新

## Do NOT

- 不改 ADR 为 Accepted（除非产品勾选完成）
- 不对云端执行 `prisma migrate deploy`
- 不继续扩交易/支付功能

## After Sign-off

1. §11 勾选 → Accepted + 接受日期 + `b922fba`
2. 云端备份 → migrate status → 部署迁移 → 同窗口发前后端
3. 测试账号小额 prepay/cancel/partial accept + 账本冒烟
