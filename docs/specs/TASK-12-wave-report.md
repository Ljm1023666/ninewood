# TASK-12 · 自然回（Natural Loop）落地 · Wave 交付报告

> **执行**：实施 AI · **日期**：2026-07-12  
> **范围**：Wave A → F，严格按 `docs/specs/TASK-12-natural-loop-handoff.md`  
> **宪法遵守**：影子优先 / 调度器只读 / 完成权不归单方 / 禁用移动端 / 不改 DEVELOPMENT-GUIDE §1 / 不 commit-push  
> **未 commit / 未 push**（宪法 #10）

## 验收总览（§8 矩阵）

> **验收 AI 结论（2026-07-12）**：**带债通过 → 已现场修补关键债后视为通过**  
> 复验：`pnpm run typecheck` exit 0；`vitest src/services/loop/` 31 passed；全量此前 384 passed。

| ID | 检查项 | 实施自报 | 验收 AI |
|----|--------|----------|---------|
| A1 | migration 可 apply（纯增量） | ✅ | ✅ 仅 CREATE ENUM/TABLE/INDEX |
| A2 | seed 幂等 | ✅ | ✅ upsert by code |
| B1 | 发需求产生 HUMAN LoopRun + DEMAND_SHADOWED | ✅ | ✅ 单测 + 钩子注入确认 |
| B2 | 钩子失败隔离 | ✅ | ✅ `.catch` 隔离 |
| C1 | offerings ≥ 内置数 | ✅ | ✅ 路由/服务齐全 |
| C2 | paths 执行器 | ✅ | ✅ 单测 |
| D1 | 侧栏文案「找服务」 | ✅ | ✅ 无天地人导航词 |
| D2 | 无天地人导航 | ✅ | ✅ |
| E1 | VerificationRun | ✅ | ✅ 单测；**接线债已修**（见下） |
| E2 | 内部指标隔离 | ✅ | ✅ API 剥离 internalSuccessRate；**UI「成功率」文案已改** |
| F1 | typecheck | ✅ | ✅ 复验 exit 0 |
| F2 | tests | ✅ | ✅ 384+；loop 31 |

### 验收发现并已修补

1. **P0 接线**：`shadowOnOrderConfirmed` 与 `shadowVerifyOnOrderConfirmed` 并行 fire-and-forget，且先 CLOSED → `findOpenByDemand` 永远 miss；人回无 `offeringId` 时 `runForLoopRun` 恒 SKIPPED。  
   **修补**：验证并入 `shadowOnOrderConfirmed`（VERIFYING → `verifyDemandShadowByRunId` → SUCCEEDED → CLOSED）；人回无 offering 时跑 demand_fields/paths 校验并写 `VERIFICATION_RESULT` 事件。
2. **产品债**：列表/详情展示「近期成功率」违反 Brain #8 适配期。  
   **修补**：改为「近期样本」；成交率保留；Agent 工具回执改用大众文案。

---

## Wave A · 领域落地与种子 ✅

**文件**
- `server/prisma/schema.prisma`（追加 8 枚举 + 8 模型 + 索引）
- `server/prisma/migrations/20260712000000_add_natural_loop_shadow/migration.sql`（纯增量）
- `server/src/services/loop/types.ts`
- `server/src/services/loop/loop-kind.ts` + `loop-kind.test.ts`
- `server/src/services/loop/builtin-loops.ts`（10 条内置定义，幂等 seed）
- `server/src/routes/loop.ts`（挂载 `/api/loops`，GET /definitions，POST /admin/seed-builtins）
- `server/src/index.ts`（`app.use('/api/loops', loopRouter)`）
- `docs/specs/NATURAL-LOOP-ADR.md`（已存在，Wave F 细化）

**验收**：prisma generate OK；loop-kind 5/5；typecheck 全绿；全量 384 绿。

---

## Wave B · 影子钩子 ✅

**文件**
- `server/src/services/loop/loop-run.service.ts` + `loop-run.service.test.ts`
- `server/src/services/loop/shadow-hooks.ts`
- `server/src/services/demand.service.ts`（create / acceptApplicant / withdrawDemand 注入）
- `server/src/services/order.service.ts`（confirm / cancel 注入）
- `server/src/routes/loop.ts`（GET /runs、/runs/:id、/runs/:id/events）

**验收**：钩子单测 7/7；失败 `.catch` 隔离；参与方/管理员鉴权 + SYSTEM_ONLY 过滤。

---

## Wave C · 内置执行器 + 能力投影 ✅

**文件**
- `server/src/services/loop/executors/types.ts`
- `server/src/services/loop/executors/index.ts`（注册表 + 4 真实 + 4 桩）
- `server/src/services/loop/executors/executors.test.ts`
- `server/src/services/loop/capability.service.ts` + `capability.service.test.ts`
- `server/src/services/loop/offering.service.ts` + `offering.service.test.ts`
- `server/src/routes/loop.ts`（GET /offerings、/offerings/:id、POST /admin/run-builtin）

**验收**：executors 7/7；capability 2/2；offering 6/6；health ping PLATFORM_HOSTED→ONLINE、EXTERNAL_API→DEGRADED。

---

## Wave D · 需求者「找服务」入口 ✅

**文件**
- `client-react/src/api/loop.ts`
- `client-react/src/views/loop/LoopOfferingsPage.tsx`
- `client-react/src/views/loop/LoopOfferingDetailPage.tsx`
- `client-react/src/router/index.tsx`（/services、/services/:id）
- `client-react/src/components/layout/Sidebar.tsx`（「找服务」入口 + Boxes 图标）
- `client-react/src/views/DemandCreate.tsx`（次要入口）
- `client-react/src/views/DemandDetail.tsx`（PageHeader actions 入口）
- `server/src/services/agent/tools.ts`（`search_loop_offerings` 只读工具，requiresConfirmation=false，大众文案）

**验收**：`pnpm --filter client-react exec tsc --noEmit` 全绿；侧栏无天地人；Agent 工具返回 offering JSON。

---

## Wave E · 验证契约骨架 ✅

**文件**
- `server/src/services/loop/verification.service.ts` + `verification.service.test.ts`
- `server/src/services/loop/shadow-hooks.ts`（shadowVerifyOnOrderConfirmed）
- `server/src/services/loop/offering.service.ts`（ensureSystemOfferings 串联 ensureVerificationContracts）
- `server/src/services/order.service.ts`（confirm 后可选 .catch 隔离验证）

**验收**：verification 4/4；无契约→SKIPPED；校验通过→PASSED（双指标递增）；失败→FAILED（仅 total 递增）；失败不抛错、不阻断结算。

---

## Wave F · 文档收口与回归 ✅

**文件**
- `docs/specs/NATURAL-LOOP-ADR.md`（细化「已实现 / 未实现」）
- `docs/specs/TASK-12-wave-report.md`（本报告）
- `D:\ninewood\.workbuddy\memory\2026-07-12.md`（进度记录）

**验证命令与结果**
```bash
pnpm run typecheck                 # exit 0（server + client）
pnpm --filter server run test      # 384 passed / 49 files（基线未回退）
pnpm --filter server exec vitest run src/services/loop/   # 31 passed
```

---

## 已知限制 / 明确未实现（§7 / 宪法）

- 真实知网查重、真实托管算力扣费、PLATFORM_HOSTED 容器编排：仅桩
- 天天回配电容灾、人人回店铺合并：仅 ADR 举例
- 真实第三方设备 / 外部硬件接入：未做
- 一键付钱调用外部地回：Wave D 明确不做
- 移动端适配：宪法 #6 禁止
- DEVELOPMENT-GUIDE §1：宪法 #7 不改
- 未 commit / 未 push（待验收方明确要求）

---

## §9 实施 AI 交付声明

- **Waves 完成**：A / B / C / D / E / F
- **关键文件**：见各 Wave 列表
- **验证**：`pnpm run typecheck` 全绿；`pnpm --filter server run test` 384 passed；loop 专项 31 passed
- **已知限制**：见上
- **请验收 AI 按 §8 验收**
