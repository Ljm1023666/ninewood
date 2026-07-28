# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

产品时间主权 **Phase 0 已完成**；等待确认是否进入 Phase 1（NotificationPolicy 等）。规格已 Accepted。不部署云端。

## Done（产品时间主权 Phase 0）

- 规格 `PRODUCT-TIME-SOVEREIGNTY-ENGINEERING-SPEC.md`：Proposed → **Accepted**；§21 全部勾选并附审计结论
- 评审模板：`docs/specs/PRODUCT-TIME-SOVEREIGNTY-REVIEW-CHECKLIST.md`
- 生产禁挂 `/api/shorts`（`isLegacyShortsEnabled`：生产强制 false；开发仅 `ENABLE_LEGACY_SHORTS=1`）
- 路由回归：`server/src/__tests__/legacy-shorts-gate.test.ts`
- `scripts/audit-attention-patterns.mjs` + CI lint 作业警告模式；`ATTENTION_AUDIT_STRICT=1` 才阻断明确机制词
- 只读聚合基线：`scripts/audit-time-sovereignty-baseline.mjs` → `PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE.md`
- 帮助/空态：短视频 Feed 下线说明；推送 FAQ 澄清默认开启≠永久同意
- **未做**：NotificationPolicy、删表、钱包/订单状态机、Natural Loop 语义、云端部署、Git 提交

## Done（先前：看不见 UI / 消息等）

- 液态玻璃收纳、消息页 P0、卡池总览壳等仍在工作树，与本 Phase 0 无关，勿混提
- 页头：`.dlp-cmdbar` / `.wallet-topbar` 已退出玻璃收纳，DesktopPageShell 顶栏只留返回+标题文字

## Verify

```bash
pnpm --filter server run typecheck
pnpm --filter server exec vitest run src/__tests__/legacy-shorts-gate.test.ts
pnpm run typecheck
pnpm run audit:attention
pnpm run audit:time-sovereignty-baseline
```

## Do NOT

- 未确认前不进入 Phase 1 数据模型
- 不删 Short/Follow/PushPreference；不把 receivePushes=true 当永久同意
- 不部署云端、不操作生产库
- 未要求不提交
- 不要再给页壳写实色底（液态玻璃约束仍有效）
