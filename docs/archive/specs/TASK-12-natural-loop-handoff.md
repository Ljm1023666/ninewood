# TASK-12 · 自然回（Loop）领域落地 Handoff

> **编写**：验收 AI（规划 / 事后验收） · **执行**：实施 AI · **日期**：2026-07-12  
> **读者**：实施 AI（按 Wave 顺序执行；验收 AI 按 §验收矩阵验收）  
> **用户转发口令**：见文末「一句话指令」  
> **前置**：安全止血 H1–H15 / C1–C4 已落地；`pnpm run typecheck` 与 `pnpm --filter server run test` 基线全绿（约 342 tests）  
> **包管理**：pnpm workspaces（禁止 `npm -w`）  
> **范围**：Windows 桌面 only；禁止 mobile breakpoint / touch / PWA

---

## 0. 一句话产品定义

**自然回** = 一个意图被触发后，经一个或多个能力接口执行，产出可验证结果并闭环的过程。  
Ninewood 要从「人和人撮合」演进为「人 / 系统 / AI / 设备都能发布、执行、验证解决方案的闭环市场」。

**大众文案**（UI 默认）：找服务 · 立即使用 · 自动处理 · 需要你确认 · 自动失败请人工介入  
**内部术语**（代码 / ADR / 注释 / 测试名）：自然回 · 天回 · 地回 · 人回 · 回实例 · 能力接口 · 验证契约 · 回事件 · 回间关系

禁止把「天回/地回/人回」硬塞进主导航或普通用户首页文案。

---

## 0.1 平台宪法（不可违反）

| # | 规则 |
|---|---|
| 1 | **调度器默认只读**：现有 `agent-task-scheduler` 仍只读+只推送；写操作必须走 Workflow / 用户确认 / 批准卡 |
| 2 | **日志 ≠ 通知**：每个回必有 `LoopEvent`；是否通知人由策略决定（充电宝老板不需要被通知） |
| 3 | **完成权不归供需双方单方面**：地回若声明客观结果，必须绑定至少一个检测天回；虚假完成不可只靠互评 |
| 4 | **人可干涉系统**：自动化失败可降级为人回；人永远可暂停自己的自动任务 |
| 5 | **影子优先**：Wave A–B 只加表/加事件，不拆现有 Demand/Order 主路径 |
| 6 | **Windows 桌面 only**；禁止 mobile 适配代码 |
| 7 | **不改** `docs/DEVELOPMENT-GUIDE.md` §1 原文 |
| 8 | **测试基线不可回退**；每 Wave 结束必须 `pnpm run typecheck` + 相关 vitest 全绿 |
| 9 | **不擅自扩大范围**：本 handoff 未列的天天回容灾、人人回合并店铺、真实第三方设备接入 → 标记 TODO，不实现 |
| 10 | **Commit**：仅当用户/验收方明确要求时才 commit；实施 AI 默认不 commit、不 push |

---

## 0.2 Brain 已拍板（无需再问用户）

| # | 决策 |
|---|------|
| 1 | 四种对接压缩为三类：`HUMAN`（人回）/ `EARTH`（地回=人↔接口）/ `HEAVEN`（天回=接口↔接口） |
| 2 | 「道回」不建表、不建枚举；仅作为策略/宪法层概念出现在 ADR |
| 3 | 「天地回/地人回/天人回/天天回…」不做成枚举膨胀；统一用 `LoopLink.relation` 描述回间关系 |
| 4 | MVP 先服务**现有需求卡片人回**；内置若干地回/天回作为工具，不解决全行业真实问题 |
| 5 | 需求者搜索目标：优先「经过验证的回/能力接口」，不是「服务者名片」 |
| 6 | 计费：地回可挂平台佣金 5%；接口托管/健康监测费用上限占佣金 1%（本 Task 只建模型字段，不接真实算力扣费） |
| 7 | 地回挂载两种模式：`EXTERNAL_API`（自托管接口）/ `PLATFORM_HOSTED`（部署在平台，本 Task 只建枚举+健康检查桩） |
| 8 | 成功率对外展示需「适配期」：初期只展示成交率；成功率仅平台内部；达标后再公开（本 Task 实现字段与规则，阈值可配置） |

---

## 1. 与现有代码的映射（实施前必读）

| 现有 | 回语义 | 动作 |
|------|--------|------|
| `Demand` + `Order` + `Message` + `Review` | **人回**主路径 | 保留；Wave B 影子关联 `loopRunId` |
| `UserTag` + `autoReceive` + `push-engine` | **地回雏形**（仍绑人） | 升级读模型 `CapabilityEndpoint`；表暂不删 |
| `AgentTask` + scheduler + `DEMAND_DIGEST` | **天回雏形**（只读） | 保留宪法；可注册新只读 TaskType |
| `path-search` + `Demand.paths` | **接口发现层雏形** | Wave D 扩展检索「回/能力」 |
| `WalletHold` / `Settlement` | 资源预留 / 回结果资金层 | 结算入口后续收敛（本 Task Wave C 只记事件，不改资金公式） |
| `Agent tools` + `approve-tool` | 回编排器 + 人确认 | 可新增 `search_loop_offerings` 只读工具 |

关键文件：

- `server/prisma/schema.prisma`
- `server/src/services/demand.service.ts`
- `server/src/services/order.service.ts`
- `server/src/services/wallet.service.ts`
- `server/src/services/push-engine.ts`
- `server/src/services/path-search.ts`
- `server/src/services/agent/tools.ts`
- `server/src/services/agent/task-types/index.ts`
- `server/src/cron/agent-task-scheduler.ts`
- `client-react/src/views/DemandCreate.tsx`
- `client-react/src/views/DemandDetail.tsx`
- `client-react/src/views/path-search/PathSearchPage.tsx`
- `client-react/src/components/layout/Sidebar.tsx`

---

## 2. 领域模型（Prisma）

迁移名建议：`YYYYMMDDHHMMSS_add_natural_loop_shadow`

### 2.1 枚举

```prisma
enum ParticipantKind {
  HUMAN
  INTERFACE
}

enum LoopKind {
  HUMAN   // 人 → 人
  EARTH   // 人 ↔ 接口
  HEAVEN  // 接口 → 接口
}

enum LoopExecutionMode {
  MANUAL
  AUTOMATED
  HYBRID
}

enum LoopRunStatus {
  TRIGGERED
  MATCHING
  EXECUTING
  WAITING_HUMAN
  VERIFYING
  SUCCEEDED
  FAILED
  INCONCLUSIVE
  COMPENSATING
  CLOSED
}

enum CapabilityHostMode {
  EXTERNAL_API
  PLATFORM_HOSTED
}

enum CapabilityHealth {
  ONLINE
  DEGRADED
  OFFLINE
  UNKNOWN
}

enum LoopLinkRelation {
  TRIGGER
  DELEGATE
  FALLBACK
  COMPENSATE
  SUPPLY
  OBSERVE
  VERIFY
}

enum LoopEventVisibility {
  SYSTEM_ONLY   // 仅日志
  ACTOR         // 参与方可见
  PUBLIC_METRIC // 可进入公开指标
}
```

### 2.2 表

#### `LoopDefinition`（模板）

```prisma
model LoopDefinition {
  id             String            @id @default(uuid())
  code           String            @unique  // e.g. builtin.demand.structure
  name           String
  description    String?
  loopKind       LoopKind
  initiatorKind  ParticipantKind
  receiverKind   ParticipantKind
  executionMode  LoopExecutionMode
  version        Int               @default(1)
  inputSchema    Json              @default("{}")
  outcomeSchema  Json              @default("{}")
  isBuiltin      Boolean           @default(false)
  isPublic       Boolean           @default(true)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  offerings      LoopOffering[]
  runs           LoopRun[]
}
```

#### `CapabilityEndpoint`（能力接口）

```prisma
model CapabilityEndpoint {
  id              String             @id @default(uuid())
  code            String             @unique
  name            String
  ownerType       String             // USER | SYSTEM | AGENT | ORGANIZATION
  ownerId         String?
  hostMode        CapabilityHostMode @default(EXTERNAL_API)
  executionMode   LoopExecutionMode  @default(HYBRID)
  paths           String[]           @default([])  // 复用 path 语义：tag:/cat:/rgn: ...
  inputSchema     Json               @default("{}")
  outputSchema    Json               @default("{}")
  healthStatus    CapabilityHealth   @default(UNKNOWN)
  healthCheckedAt DateTime?
  capacityJson    Json?
  pricePolicyJson Json?
  // 适配期：成功率仅内部；成交率可公开
  successRatePublic Boolean          @default(false)
  sourceUserTagId String?            // 从 UserTag 投影时保留溯源
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  offerings       LoopOffering[]
  verificationAsTarget VerificationContract[] @relation("VerifiedEndpoint")

  @@index([ownerType, ownerId])
  @@index([healthStatus])
  @@index([paths], type: Gin)
}
```

#### `LoopOffering`（可被需求者检索的「解决方案上架物」）

```prisma
model LoopOffering {
  id               String   @id @default(uuid())
  definitionId     String
  definition       LoopDefinition @relation(fields: [definitionId], references: [id], onDelete: Cascade)
  endpointId       String?
  endpoint         CapabilityEndpoint? @relation(fields: [endpointId], references: [id], onDelete: SetNull)
  title            String
  summary          String?
  paths            String[] @default([])
  status           String   @default("ACTIVE") // ACTIVE | PAUSED | DELISTED
  // 公开指标
  dealRate         Float?   // 成交率（用户见结果后付费概率）
  avgDurationMs    Int?
  recentSuccessN   Int      @default(0)
  recentTotalN     Int      @default(0)
  // 内部指标（API 对非 admin 不得返回）
  internalSuccessRate Float?
  requiresVerification Boolean @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  runs             LoopRun[]
  verificationContracts VerificationContract[]

  @@index([status])
  @@index([paths], type: Gin)
  @@index([definitionId])
}
```

#### `LoopRun`（一次实际回）

```prisma
model LoopRun {
  id              String        @id @default(uuid())
  definitionId    String
  definition      LoopDefinition @relation(fields: [definitionId], references: [id])
  offeringId      String?
  offering        LoopOffering?  @relation(fields: [offeringId], references: [id], onDelete: SetNull)
  loopKind        LoopKind
  status          LoopRunStatus @default(TRIGGERED)
  initiatorRef    String        // user:<id> | system:<code> | agent:<id>
  receiverRef     String?
  inputJson       Json          @default("{}")
  expectedOutcome Json          @default("{}")
  actualOutcome   Json?
  // 影子关联现有业务
  demandId        String?
  orderId         String?
  parentRunId     String?
  correlationId   String?
  startedAt       DateTime      @default(now())
  completedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  events          LoopEvent[]
  linksOut        LoopLink[]    @relation("LinkSource")
  linksIn         LoopLink[]    @relation("LinkTarget")
  verificationRuns VerificationRun[]

  @@index([demandId])
  @@index([orderId])
  @@index([status])
  @@index([loopKind, createdAt])
  @@index([correlationId])
}
```

#### `LoopEvent`

```prisma
model LoopEvent {
  id            String              @id @default(uuid())
  loopRunId     String
  loopRun       LoopRun             @relation(fields: [loopRunId], references: [id], onDelete: Cascade)
  type          String              // DEMAND_SHADOWED | ENDPOINT_MATCHED | ...
  actorRef      String
  visibility    LoopEventVisibility @default(SYSTEM_ONLY)
  payload       Json                @default("{}")
  idempotencyKey String?
  createdAt     DateTime            @default(now())

  @@unique([loopRunId, idempotencyKey])
  @@index([loopRunId, createdAt])
  @@index([type, createdAt])
}
```

#### `LoopLink`

```prisma
model LoopLink {
  id           String           @id @default(uuid())
  sourceRunId  String
  sourceRun    LoopRun          @relation("LinkSource", fields: [sourceRunId], references: [id], onDelete: Cascade)
  targetRunId  String
  targetRun    LoopRun          @relation("LinkTarget", fields: [targetRunId], references: [id], onDelete: Cascade)
  relation     LoopLinkRelation
  meta         Json?
  createdAt    DateTime         @default(now())

  @@index([sourceRunId])
  @@index([targetRunId])
  @@index([relation])
}
```

#### `VerificationContract` + `VerificationRun`

```prisma
model VerificationContract {
  id              String   @id @default(uuid())
  offeringId      String
  offering        LoopOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  verifierEndpointId String
  verifierEndpoint CapabilityEndpoint @relation("VerifiedEndpoint", fields: [verifierEndpointId], references: [id])
  claimSchema     Json     @default("{}")  // 地回宣传声明，如 { maxDuplication: 0.10 }
  isRequired      Boolean  @default(true)
  createdAt       DateTime @default(now())

  runs            VerificationRun[]

  @@unique([offeringId, verifierEndpointId])
}

model VerificationRun {
  id           String   @id @default(uuid())
  contractId   String
  contract     VerificationContract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  loopRunId    String
  loopRun      LoopRun  @relation(fields: [loopRunId], references: [id], onDelete: Cascade)
  status       String   // PASSED | FAILED | ERROR | SKIPPED
  resultJson   Json?
  createdAt    DateTime @default(now())

  @@index([loopRunId])
  @@index([contractId, createdAt])
}
```

---

## 3. 服务层 API 契约

新建目录：`server/src/services/loop/`

| 文件 | 职责 |
|------|------|
| `types.ts` | 共享类型 |
| `loop-kind.ts` | `(initiator,receiver) → LoopKind` |
| `loop-run.service.ts` | 创建/推进/关闭 LoopRun；写 LoopEvent |
| `capability.service.ts` | Endpoint CRUD；UserTag → Endpoint 投影 |
| `offering.service.ts` | Offering 检索/上架 |
| `verification.service.ts` | 绑定契约；执行验证桩 |
| `builtin-loops.ts` | 内置定义 seed |
| `shadow-hooks.ts` | Demand/Order 生命周期钩子 |

### 3.1 推导规则

```ts
export function deriveLoopKind(a: ParticipantKind, b: ParticipantKind): LoopKind {
  if (a === 'HUMAN' && b === 'HUMAN') return 'HUMAN'
  if (a === 'INTERFACE' && b === 'INTERFACE') return 'HEAVEN'
  return 'EARTH'
}
```

### 3.2 HTTP 路由

新建 `server/src/routes/loop.ts`，挂载：

```ts
app.use('/api/loops', loopRouter)
```

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/definitions` | optional | 列出公开/内置定义 |
| GET | `/offerings` | optional | 需求者检索解决方案（见 §5） |
| GET | `/offerings/:id` | optional | 详情；内部成功率字段需 admin |
| POST | `/runs` | auth | 手动启动一次回（MVP 少用） |
| GET | `/runs/:id` | auth | 参与方或 admin |
| GET | `/runs/:id/events` | auth | 默认不含 SYSTEM_ONLY（admin 可看全） |
| POST | `/capabilities` | auth | 服务者登记能力接口（MVP 简化） |
| GET | `/capabilities/me` | auth | 我的接口 |
| POST | `/admin/seed-builtins` | adminGate | 幂等种子 |

响应形状统一：`{ success, data, message? }`（跟现有 `utils/response.ts`）。

### 3.3 Offering 检索查询参数

```
GET /api/loops/offerings?q=&paths=tag:论文,cat:写作&loopKind=EARTH&limit=20
```

- `q`：走简化 resolve（可先 keyword contains title/summary；能接 path-search 更好）
- 返回字段（公开）：`id,title,summary,loopKind,paths,dealRate,avgDurationMs,recentSuccessN,recentTotalN,requiresVerification,endpoint.healthStatus`
- **禁止**返回：`internalSuccessRate`、verifier 内部配置密钥

---

## 4. 影子钩子（不改资金公式）

### 4.1 Demand 创建后

在 `demand.service.create` 成功返回前（推送之后、catch 隔离）：

1. 确保存在定义 `human.demand.fulfillment`（seed）
2. `LoopRun`：`loopKind=HUMAN`，`initiatorRef=user:<userId>`，`demandId=...`，`status=TRIGGERED`，`inputJson` 含 title/paths
3. `LoopEvent`：`DEMAND_SHADOWED`，`visibility=SYSTEM_ONLY`
4. 失败不影响 demand 创建（`.catch` 打日志）

### 4.2 acceptApplicant 成功后

1. 找到该 `demandId` 的开放 LoopRun（若无则补建）
2. 状态 → `EXECUTING`，`receiverRef=user:<providerId>`，写入 `orderId`
3. Event：`HUMAN_MATCHED`

### 4.3 order.confirm 成功后

1. LoopRun → `VERIFYING` 然后（MVP 无人回强制外检）→ `SUCCEEDED` → `CLOSED`
2. Event：`ORDER_SETTLED_SHADOW`，payload 含 settlement 摘要数字（非敏感）

### 4.4 withdraw / cancel

- Event：`LOOP_CANCELLED`，status → `CLOSED`（或 `FAILED` 若已部分执行；MVP 统一 CLOSED + payload.reason）

---

## 5. 内置回（必须 seed，幂等）

### 5.1 地回定义（服务现有人回）

| code | name | 说明 | executionMode |
|------|------|------|---------------|
| `builtin.earth.demand.structure` | 需求结构化 | 口语→字段（封装现有 analyze-demand 调用边界，不重写 LLM） | HYBRID |
| `builtin.earth.demand.paths` | 路径生成 | 字段→paths（调现有 derivePaths） | AUTOMATED |
| `builtin.earth.media.normalize` | 附件标准化 | MVP：只注册定义+桩 handler，返回 `{ ok:true, skipped:true }` | AUTOMATED |
| `builtin.earth.demand.card_cover` | 需求卡视觉 | MVP：桩 | AUTOMATED |

对应 `CapabilityEndpoint`：`ownerType=SYSTEM`，`hostMode=PLATFORM_HOSTED`，`healthStatus=ONLINE`。

### 5.2 天回定义（验证/监管桩）

| code | name | 说明 |
|------|------|------|
| `builtin.heaven.validate.demand_fields` | 需求字段验证器 | 校验 title/description/minPrice 规则 |
| `builtin.heaven.validate.paths` | 路径可检索性验证 | paths 非空且 codec 合法 |
| `builtin.heaven.validate.attachment_safety` | 附件安全 | MVP 桩：有扩展名白名单即 PASS |
| `builtin.heaven.validate.order_wallet_consistency` | 订单钱包一致性 | 读 Order+Settlement 是否存在；不改账 |
| `builtin.heaven.health.endpoint_ping` | 接口健康检查 | EXTERNAL_API 则 HTTP HEAD/GET 超时 3s；PLATFORM_HOSTED 直接 ONLINE |

### 5.3 执行器接口（代码）

```ts
// server/src/services/loop/executors/types.ts
export interface LoopExecutor {
  definitionCode: string
  execute(input: Record<string, unknown>, ctx: { userId?: string; loopRunId: string }): Promise<{
    status: 'SUCCEEDED' | 'FAILED' | 'INCONCLUSIVE'
    outcome: Record<string, unknown>
  }>
}
```

注册表模式对齐 `task-types`：`registerLoopExecutor` / `getLoopExecutor`。

Wave C 要求：至少实现  
`builtin.earth.demand.paths`、`builtin.heaven.validate.demand_fields`、`builtin.heaven.validate.paths`、`builtin.heaven.health.endpoint_ping` 四个真实逻辑；其余可桩但必须可调用且返回明确 `skipped` 或结果。

---

## 6. Wave 拆分（严格按序）

### Wave A · 领域落地与种子 【P0】

**做**：

1. Prisma schema + migration
2. `loop-kind.ts` + 单测
3. `builtin-loops.ts` 幂等 seed（admin 路由或 `pnpm --filter server` script）
4. ADR：`docs/specs/NATURAL-LOOP-ADR.md`（1–2 页：术语、宪法、与 Demand 关系）
5. 本 handoff 保持为权威执行文档

**不做**：改 DemandCreate UI；改结算；接外部设备。

**验证**：

```bash
pnpm --filter server exec prisma generate
pnpm --filter server run typecheck
pnpm --filter server run test -- loop-kind
pnpm run typecheck
```

**验收标准**：

- [ ] 新表存在且 migrate 可应用
- [ ] seed 两次结果幂等
- [ ] ADR 存在且含「大众文案 vs 内部术语」
- [ ] 基线测试不回退

---

### Wave B · 影子钩子 【P0】

**做**：

1. `loop-run.service.ts` create/appendEvent/transition
2. Demand create / acceptApplicant / order.confirm / withdraw 钩子（失败隔离）
3. `GET /api/loops/runs?demandId=`（auth，仅需求方/接单方/admin）
4. 单测：mock prisma，断言事件类型与 status 迁移

**不做**：前端展示回时间线（可 Wave D）；改 order 结算事务边界。

**验证**：

```bash
pnpm --filter server run test -- loop
pnpm --filter server run typecheck
```

**验收标准**：

- [ ] 创建需求后 DB 有对应 HUMAN LoopRun + `DEMAND_SHADOWED`
- [ ] 接单后 status=`EXECUTING` 且有 orderId
- [ ] 确认订单后 status 最终 `CLOSED` 或 `SUCCEEDED`→`CLOSED`
- [ ] 钩子抛错不影响原 API 200

---

### Wave C · 内置执行器 + 能力投影 【P0】

**做**：

1. Executor 注册表 + 四个真实执行器（§5.3）
2. `POST /api/loops/admin/run-builtin`（adminGate）或内部 service：对给定 demandId 跑 `paths` + `validate.*`
3. `capability.service.projectFromUserTag(userId)`：为每个 UserTag 建/更新 CapabilityEndpoint（paths 含 `tag:<tagName>` + 可选 rgn）
4. Offering：每个 SYSTEM builtin 建一条 ACTIVE LoopOffering
5. `GET /api/loops/offerings` 最小可用

**不做**：真实知网查重；真实收费监控扣费；PLATFORM_HOSTED 容器编排。

**验证**：

```bash
pnpm --filter server run test -- loop
pnpm --filter server run typecheck
```

**验收标准**：

- [ ] offerings 列表至少返回内置地回/天回条目
- [ ] 对样例 demand 跑 paths 执行器可更新/校验 paths
- [ ] UserTag 投影后 endpoint.paths 含对应 tag
- [ ] health ping：假 URL → DEGRADED/OFFLINE；PLATFORM_HOSTED → ONLINE

---

### Wave D · 需求者「找解决方案」入口 【P1】

**做**：

1. 前端页 `client-react/src/views/loop/LoopOfferingsPage.tsx`（或 path-search 旁 Tab）
2. 侧栏入口文案：**「找服务」**（不是「地回」）；`path: /loop-offerings` 或 `/services`
3. 卡片展示：标题、摘要、成功率公开字段/成交率、耗时、健康状态、「查看」 
4. 从 DemandCreate / DemandDetail 加次要入口：「看看可直接使用的服务」
5. Agent 只读工具 `search_loop_offerings`（requiresConfirmation=false）

**不做**：一键付钱调用外部地回；复杂筛选器大改版；移动端。

**验证**：

```bash
pnpm run typecheck
pnpm --filter client-react exec tsc --noEmit
# 手动：登录后打开「找服务」，能看到内置 offerings
```

**验收标准**：

- [ ] 侧栏无「天回/地回/人回」字样
- [ ] 页面能列出 Wave C 的 offerings
- [ ] Agent 工具可返回列表 JSON
- [ ] Windows 宽屏布局正常

---

### Wave E · 验证契约骨架 【P1】

**做**：

1. 为至少一个内置地回 Offering 绑定 `builtin.heaven.validate.demand_fields` 契约
2. `verification.service.runForLoopRun(loopRunId)`：执行 required contracts，写 VerificationRun
3. 人回影子闭环在 order.confirm 后可选调用（失败 → INCONCLUSIVE 事件，不阻断结算）
4. 指标更新：`recentTotalN++`；PASSED 则 `recentSuccessN++`；内部成功率更新；`successRatePublic` 默认 false
5. 单测覆盖 PASSED/FAILED

**不做**：举报分赃 30%；多供应商强制同一 verifier 的完整治理 UI；封禁流程。

**验收标准**：

- [ ] 契约可查询
- [ ] 跑验证产生 VerificationRun
- [ ] 公开 API 仍不泄露 internalSuccessRate
- [ ] 结算主路径不被验证失败阻断（仅事件）

---

### Wave F · 文档收口与回归 【P0】

**做**：

1. 更新 `docs/specs/NATURAL-LOOP-ADR.md` 增加「已实现 / 未实现」
2. 在 `.workbuddy/memory/` 或既有 MEMORY 追加一行进度（若目录存在）
3. 全量：

```bash
pnpm run typecheck
pnpm --filter server run test
```

4. 输出 `WAVE-REPORT.md` 片段（可写在 PR 描述或 `docs/specs/TASK-12-wave-report.md`）：每 Wave 文件列表 + 验收勾选

**验收标准**：

- [ ] 全量 typecheck 绿
- [ ] server test 不低于基线数量且全绿
- [ ] 未引入 mobile 相关代码
- [ ] 无秘密提交

---

## 7. 明确不做（防范围爆炸）

| 不做 | 原因 |
|------|------|
| 真实充电宝/硬件接入 | 需生态与硬件协议 |
| 知网查重真调用 | 合规与商务未就绪；用桩 |
| 拆掉 Demand/Order 表 | 风险过高 |
| 调度器自动 create_demand/apply | 违反 Agent 宪法 |
| 主导航哲学术语 | 产品策略 |
| 天天回配电容灾完整实现 | 仅 ADR 举例 |
| 人人回店铺合并 | 仅概念 |
| Electron 大改 | 无关 |

---

## 8. 验收矩阵（验收 AI 专用）

| ID | 检查项 | 方法 | 期望 |
|----|--------|------|------|
| A1 | migration 可 apply | prisma migrate / generate | 成功 |
| A2 | seed 幂等 | 连续两次 seed | 无重复 code |
| B1 | 发需求产生 LoopRun | API 或单测 | HUMAN + DEMAND_SHADOWED |
| B2 | 钩子失败隔离 | mock throw | Demand API 仍成功 |
| C1 | offerings ≥ 内置数 | GET | 200 且 length>0 |
| C2 | paths executor | 单测 | SUCCEEDED 或合法 outcome |
| D1 | 侧栏文案 | 读 Sidebar | 「找服务」类大众文案 |
| D2 | 无天地人导航 | rg 侧栏 | 无匹配 |
| E1 | VerificationRun | 单测 | PASSED/FAILED 可区分 |
| E2 | 内部指标隔离 | GET offering | 无 internalSuccessRate |
| F1 | typecheck | pnpm run typecheck | exit 0 |
| F2 | tests | vitest | 全绿且数量≥基线 |

任一 P0 项失败 → **打回实施 AI**，附复现步骤；P1 可记债但需在 wave-report 标明。

---

## 9. 实施 AI 工作流

1. 读完本文 + `NATURAL-LOOP-ADR.md`（若尚未创建则 Wave A 先写）
2. 按 Wave A→F 顺序；每 Wave 结束自跑验证命令
3. 发现冲突：优先「影子、不破坏主路径」；写入 wave-report「偏差」节
4. 不要擅自开始下一波未列功能
5. 完成后回复格式：

```
## TASK-12 交付
- Waves 完成：A/B/C/...
- 关键文件：...
- 验证命令与结果：...
- 已知限制：...
- 请验收 AI 按 §8 验收
```

---

## 10. 验收 AI（我）后续动作预告

用户通知验收后，我将：

1. 按 §8 矩阵逐项核验代码与测试
2. 抽查影子钩子是否污染主事务
3. 抽查文案层是否泄漏内部术语
4. 给出「通过 / 打回 / 带债通过」与优化补丁清单

---

## 附录 A · 术语速查

| 内部 | 含义 | 大众 |
|------|------|------|
| 自然回 | 闭环基本单位 | 一次完整服务 |
| 人回 | 人对人 | 找人帮忙 |
| 地回 | 人↔接口 | 立即使用 / 自动服务 |
| 天回 | 接口↔接口 | 系统自动处理 / 检测 |
| 能力接口 | 可调用的服务端点 | 服务 |
| 回上架物 Offering | 可被检索的解决方案 | 可用方案 |
| 验证契约 | 地回必须接受的检测 | 结果核验 |
| 回事件 | 轨迹 | （用户通常不可见） |
| 回间关系 Link | 触发/降级/验证等 | — |

## 附录 B · 一句话指令（用户只发这一句给实施 AI）

```
请严格按 docs/specs/TASK-12-natural-loop-handoff.md 从 Wave A 执行到 Wave F：只做文档列出的范围，遵守平台宪法与「影子优先」，每 Wave 自测 typecheck/相关 vitest，完成后按文档§9格式汇报交付；不要 commit/push，不要改 DEVELOPMENT-GUIDE§1，不要做移动端，不要把「天回/地回/人回」写进用户主导航文案。
```
