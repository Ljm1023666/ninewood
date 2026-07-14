# ADR · 自然回（Natural Loop）领域模型

> **状态**：Accepted（产品决策） / Implementation = TASK-12  
> **日期**：2026-07-12  
> **相关**：`docs/specs/TASK-12-natural-loop-handoff.md`

## 背景

Ninewood 当前以 Demand/Order/Message 完成「人对人」撮合。用户意图是：对接对象从「人」扩展到「系统 / AI / 设备接口」，需求者搜索「经过验证的解决方案闭环」，而非仅服务者名片。

## 决策

1. **自然回**是平台原子单位：触发 → 执行 → 可验证结果 → 闭环。
2. 三类回：`HUMAN`（人↔人）、`EARTH`（人↔接口）、`HEAVEN`（接口↔接口）。「道回」仅作宪法/策略隐喻，不建模。
3. 复合关系（触发、降级、验证、补偿等）用 `LoopLink.relation`，不膨胀枚举成「天地回/天人回…」。
4. **影子优先**：Demand/Order 主路径保留；LoopRun 并行记账，钩子失败不得阻断业务 API。
5. **双语文案**：代码/ADR 用天地人；UI 用「找服务 / 立即使用 / 自动处理 / 需要你确认」。
6. **完成权**：宣称客观结果的地回必须绑定检测天回；供需双方不能单方面伪造完成。
7. **Agent 宪法不变**：调度器默认只读；写操作走确认/工作流。

## 后果

- 新增影子表：`LoopDefinition` / `CapabilityEndpoint` / `LoopOffering` / `LoopRun` / `LoopEvent` / `LoopLink` / `VerificationContract` / `VerificationRun`。
- MVP 内置地回/天回服务现有需求卡片；真实第三方设备与查重 API 不在首期。
- 成功率指标默认内部；成交率可公开；达标后再 `successRatePublic=true`。

## 已实现 / 未实现（TASK-12 落地）

> 宪法红线全程遵守：影子优先、调度器只读、完成权不归单方、移动端禁止、不改 DEVELOPMENT-GUIDE §1。

### Wave A · 领域落地与种子 ✅
- Prisma 影子模型（8 枚举 + 8 表）+ 纯增量 migration（无破坏性 DDL）
- `loop-kind.ts` 推导（人+人/接口+接口/人↔接口 → 人回/天回/地回）
- `builtin-loops.ts` 10 条内置定义，**幂等 seed**（loopDefinition by code；offering by (definitionId, title)）
- 本 ADR + handoff 已文档化

### Wave B · 影子钩子 ✅
- `loop-run.service`：create / appendEvent / transition（终态写 completedAt）/ findOpenByDemand / listByDemand / getById / getEvents（SYSTEM_ONLY 对非 admin 过滤）
- Demand.create / acceptApplicant / order.confirm / withdraw / cancel 全注入 `.catch` 隔离钩子
- `GET /runs`、`/runs/:id`、`/runs/:id/events`（参与方/管理员鉴权）

### Wave C · 内置执行器 + 能力投影 ✅
- Executor 注册表（`registerLoopExecutor` / `getLoopExecutor`，对齐 task-types）
- 4 个真实执行器：`paths`（回写 demand.paths）、`validate.demand_fields`、`validate.paths`（codec 校验）、`health.endpoint_ping`（PLATFORM_HOSTED→ONLINE / EXTERNAL_API→HEAD 超时 3s）
- 4 个桩执行器（明确返回 `skipped`）：media.normalize / demand.card_cover / attachment_safety / order_wallet_consistency
- `capability.service.projectFromUserTag`：UserTag → CapabilityEndpoint（paths 含 `tag:<tagName>` + 可选 `rgn`）
- `offering.service.listOfferings` / `retrieveOffering`：公开字段白名单，**永不返回 internalSuccessRate**
- `GET /offerings` + `GET /offerings/:id`；`POST /admin/run-builtin`
- 每条 SYSTEM builtin 均有一条 ACTIVE LoopOffering

### Wave D · 需求者「找服务」入口 ✅
- `LoopOfferingsPage`（/services）：搜索 + 类型筛选 + 卡片（成交率/耗时/健康/需核验/路径）
- 详情页 `/services/:id`
- 侧栏入口「**找服务**」（无任何天地人术语）
- DemandCreate / DemandDetail 次要入口「看看可直接使用的服务」
- Agent 只读工具 `search_loop_offerings`（requiresConfirmation=false，文案用大众术语）

### Wave E · 验证契约骨架 ✅
- `verification.service.runForLoopRun`：执行 required 契约，逐条写 VerificationRun（失败/异常只记录，绝不抛错阻断）
- `ensureVerificationContracts`：把 `validate.demand_fields` 绑到 ≥1 个 EARTH offering（幂等）
- 指标更新：recentTotalN++、PASSED→recentSuccessN++、internalSuccessRate 重算；successRatePublic 默认 false
- order.confirm 后可选 `.catch` 隔离调用（失败 → 仅 VERIFICATION_RESULT 事件，不阻断结算）

### 未实现（按 §7 / 宪法，明确标记 TODO）
- 真实知网查重调用（仅桩）
- 真实托管算力扣费 / PLATFORM_HOSTED 容器编排
- 天天回配电容灾、人人回店铺合并（仅 ADR 举例）
- 真实第三方设备 / 外部硬件接入
- 一键付钱调用外部地回（Wave D 明确不做）
- 移动端适配（宪法 #6 明文禁止）
- DEVELOPMENT-GUIDE §1 原文（宪法 #7 不改）


## 不做

见 TASK-12 §7。
