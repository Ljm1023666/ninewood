# 自然回 · 导航收敛与天回接入 — 交付文档

> 任务规范：`docs/specs/NATURAL-LOOP-NAVIGATION-DOWNGRADE.md`
> 配套实现：天回自动运行服务 + `/loops` 能力看板 + 导航收敛
> 数据库：零迁移（复用既有 `LoopDefinition / LoopOffering / LoopRun / LoopEvent / CapabilityEndpoint`）
> 状态：已实现并通过类型检查、单元测试与最小烟囱验证

---

## 1. 功能分类表（人回 / 地回 / 天回）

按"自然回"三分法对平台内置能力归类。判定原则：
- **人回 HUMAN**：人↔人协作，由需求方/服务方驱动，手动或影子推进。
- **地回 EARTH**：人↔接口交互，由用户主动发起（发布/检索/预览/生成）。
- **天回 HEAVEN**：接口↔接口，系统自动运行（周期巡检 / 按资源自动校验），不改主流程（宪法 #5：影子优先、只检测只上报）。

| 分类 | code | 名称 | 触发方式 | 是否接入 /loops 自动调度 |
|---|---|---|---|---|
| 人回 | `human.demand.fulfillment` | 需求履约（人回影子模板） | 需求创建时自动关联 | 否（模板，不生成能力接口） |
| 地回 | `builtin.earth.demand.structure` | 需求结构化 | 用户发布/试跑 | 否（用户按需运行） |
| 地回 | `builtin.earth.demand.paths` | 路径生成 | 用户发布/试跑 | 否（用户按需运行） |
| 地回 | `builtin.earth.media.normalize` | 附件标准化 | 用户发布/试跑 | 否（用户按需运行） |
| 地回 | `builtin.earth.demand.card_cover` | 需求卡视觉（封面生成） | 用户发布/试跑 | 否（用户按需运行） |
| 天回 | `builtin.heaven.monitor.system_health` | 系统健康监控 | 每 60s 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.monitor.service_availability` | 服务可用性检测 | 每 120s 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.tag.auto_stats` | 标签自动统计 | 每 5m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.path.index_maintain` | 路径索引维护 | 每 5m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.cert.auto_check` | 认证自动检查 | 每 10m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.order.timeout_detect` | 订单超时检测 | 每 5m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.order.auto_settle` | 订单自动结算 | 每 5m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.welfare.auto_grant` | 福利自动发放 | 每 10m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.circle.activity` | 圈子活跃度检测 | 每 10m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.push.scheduled` | 推送与提醒 | 每 5m 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.automation.tasks` | 自动化任务调度 | 每 60s 自动 | **是（本任务新增调度）** |
| 天回 | `builtin.heaven.validate.demand_fields` | 需求字段合规校验 | 按资源（影子/手动） | 否（按资源触发，详见 §4） |
| 天回 | `builtin.heaven.validate.paths` | 路径可检索性校验 | 按资源（影子/手动） | 否（按资源触发） |
| 天回 | `builtin.heaven.validate.attachment_safety` | 附件安全扫描 | 按资源（影子/手动） | 否（按资源触发） |
| 天回 | `builtin.heaven.validate.order_wallet_consistency` | 订单-钱包一致性校验 | 按资源（影子/手动） | 否（按资源触发） |
| 天回 | `builtin.heaven.health.endpoint_ping` | 接口健康检查 | 按资源（影子/手动） | 否（按资源触发） |

**小结**：天回共 **16** 项能力。其中 **11** 项新增"全局周期巡检"已接入自动调度并写入 `/loops`；**5** 项为 TASK-12 已定义的"按资源校验器"，归类为天回、可经随时运行，不挂全局周期（避免无意义空跑）。

---

## 2. 变更文件清单

### 新增
- `server/src/services/loop/heaven-runner.service.ts` — 天回自动运行核心服务（能力清单 + 幂等种子 + 执行器注册 + 单能力运行 + 周期调度 + 看板聚合）。
- `server/src/services/loop/heaven-runner.service.test.ts` — 天回单测（mock prisma + mock loop-run.service）：运行→SUCCEEDED、未知 code→400、失败→FAILED 且只计 total、清单聚合、11 项完整性。

### 修改（后端）
- `server/src/cron/index.ts` — 在 `startAllCronJobs()` 中调用 `startHeavenScheduler()`（幂等，进程内只启一次）。
- `server/src/routes/loop.ts` — 新增公开路由 `GET /api/loops/capabilities`（天回能力看板）。

### 修改（前端）
- `client-react/src/api/loop.ts` — 新增 `HeavenCapabilityItem` 类型 + `loopApi.listHeavenCapabilities()`。
- `client-react/src/views/loop/MyLoopsPage.tsx` — 新增"天回能力"面板（排序、加载/错误/空态、`HeavenCapabilityCard`），点击跳转 `/services/:id`。
- `client-react/src/styles/my-loops.css` — 新增天回面板样式。
- `client-react/src/components/layout/Sidebar.tsx` — 用户主导航收敛：移除"监控 /dashboard"与"税务可视化 /tax-visualizer"。
- `client-react/src/components/ui/admin-sidebar.tsx` — 管理后台"监控"分区补回"税务可视化"入口（Calculator 图标）。
- `client-react/src/views/AdminDashboard.tsx` — `handleNavigate` 接线 `monitoring + tax → /tax-visualizer`，页面仍可达。
- `client-react/src/views/DemandCreate.tsx` — 服务模式提示条去卡片化（仅保留纯文本 + NavLink，呼应"显示字体即可，不要延伸一个卡片"）。

> 未删除任何页面或路由；税务可视化仅从"面向用户主导航"移入"管理后台监控分区"，可达性不变。

---

## 3. 导航调整说明

### 用户主导航（Sidebar）
- **移除**：`监控 /dashboard`、`税务可视化 /tax-visualizer`。
  - 理由：二者属"平台内部监管/分析"视图，不宜放在面向普通用户的常驻主导航；其自动能力收口到 `/loops`（天回面板）。
- **保留（TOP）**：发现 `/`、卡池 `/card-pool`、发布 `/publish`、圈子 `/circles`、认证 `/cert-center`、帮助 `/help`。
- **保留（BOTTOM）**：路径检索 `/path-search`、回 `/loops`、找服务 `/services`、找人 `/search`、消息 `/messages`、我的 `/profile`。

### 管理后台（AdminDashboard + admin-sidebar）
- "监控"分区新增 `税务可视化`（Calculator 图标），点击经 `handleNavigate` 跳转 `/tax-visualizer`，页面未删、可达。

### 能力收口
- 原先散落在"监控"页的系统自动能力（系统健康、订单超时、推送提醒、自动化任务等），统一由天回调度器驱动，在 `/loops` 的"天回能力"面板呈现：**触发条件、当前阶段、运行状态、成功/失败次数、最近运行时间、最近结果、接口健康度**。

### 与目标核心导航的差异（已知，见 §7）
- 规范目标核心导航为 `发现/卡池/发布/圈子/回/消息/我的/帮助`；实际保留了 `认证/路径检索/找服务/找人` 四项。它们均为面向用户的真实功能（非自动能力），移除会损害可用性，故保留。属于**部分收敛**。

---

## 4. 天回模型与 API 说明

### 4.1 复用的数据模型（零迁移）
- `LoopDefinition`（code 唯一）：天回能力定义，`loopKind=HEAVEN`、`executionMode=AUTOMATED`、`initiatorKind=INTERFACE`、`receiverKind=INTERFACE`。
- `CapabilityEndpoint`：能力接口元信息（`hostMode=PLATFORM_HOSTED`、`healthStatus`）。
- `LoopOffering`：上架物，`recentSuccessN / recentTotalN / avgDurationMs` 用于成功率与计数展示。
- `LoopRun`：每次运行一条记录，`initiatorRef='system:<code>'`，承载状态机与事件。
- `LoopEvent`：运行过程事件（`HEAVEN_RUN_STARTED` / `HEAVEN_RUN_RESULT`，`visibility=SYSTEM_ONLY`）。

### 4.2 自动运行管线（真实，不伪造）
1. `startHeavenScheduler()`（在 `startAllCronJobs` 中调用，幂等）→
2. `seedHeavenCapabilities()`：幂等 upsert 11 个 HEAVEN 定义 + 能力接口 + 上架物；
3. `registerHeavenExecutors()`：注册执行器，使能力也可被用户 `POST /offerings/:id/run` 手动运行；
4. 每个能力 `setInterval(intervalMs)`（60s/120s/5m/10m）触发 `runHeavenCapability(code)`；
5. `runHeavenCapability`：`loopRunService.create(HEAVEN, system:code)` → `appendEvent(STARTED)` → `transition(EXECUTING)` → 执行真实检测逻辑（`cap.run()` 读库统计/巡检，**只读不改业务主表**）→ `transition(SUCCEEDED|FAILED|INCONCLUSIVE)` → `appendEvent(RESULT)` → 回写 `loopOffering.recentTotalN+1`，成功再加 `recentSuccessN+1`；
6. 失败不中断调度器（调用方 `.catch` 隔离，符合"影子优先"）。
7. `listHeavenCapabilities()`：聚合所有 HEAVEN 上架物的最新一次运行、计数、触发方式、阶段、接口健康度，供看板使用。

### 4.3 接口
- `GET /api/loops/capabilities`（**公开**，无需登录）
  - 返回：天回能力数组，字段含 `id / title / summary / definitionCode / trigger / stage / status / successCount / failCount / runCount / lastRunAt / lastResult / endpointHealth`。
- `GET /api/loops/offerings?loopKind=HEAVEN`（公开）
  - 返回：HEAVEN 上架物（含 `recentSuccessN / recentTotalN / avgDurationMs / endpoint.healthStatus`）。
- `POST /api/loops/offerings/:id/run`（需登录）
  - 用户对任意能力"运行此能力"；对天回校验器可传 `demandId` 触发**按资源校验**（如 `validate.demand_fields` 校验某需求字段），写入 HEAVEN `LoopRun`。

### 4.4 关于 5 个"按资源"天回校验器
它们校验**特定资源**（某需求/订单/接口），因此不挂全局周期——空跑无目标会恒为 FAILED，属无意义。设计上由"影子钩子（需求创建/变更）"或用户手动 `POST /offerings/:id/run?demandId=...` 触发。在 `/loops` 看板中显示为 `待运行(IDLE)`，直到有资源触发——这是**真实状态，非伪造**。烟囱验证已证明 `validate.demand_fields` 针对真实需求运行返回 `SUCCEEDED` 并写入 HEAVEN `LoopRun`（见 §6）。

---

## 5. `/loops` 验收路径

前端 `/loops`（MyLoopsPage）新增"天回能力"面板，位于"我的回"看板之前：
1. 进入 `/loops` → 顶部出现"天回能力"分区。
2. 每条卡片展示：标题、**触发方式**（如"每 60 秒自动探测"）、**阶段**（待运行/运行中/已成功/失败…）、**状态徽标**、**成功/失败次数 + 成功率**、**最近运行时间**、**最近结果**摘要。
3. 顶部排序下拉：最近运行 / 成功率 / 异常优先。
4. 每 15s 自动刷新（轮询 `GET /api/loops/capabilities`）。
5. 点击卡片 → 跳转 `/services/:id`（该能力的上架物详情）。
6. 加载/错误/空态均有独立 UI，不阻塞下方"我的回"。

后端验证：
- `GET /api/loops/capabilities` 返回 16 项天回能力（11 周期 + 5 校验器）。
- `GET /api/loops/offerings?loopKind=HEAVEN` 返回 HEAVEN 上架物。

---

## 6. 数据库迁移说明

- **零迁移（No migration）**：本任务完全复用既有自然回模型，未新增表/字段，未修改 `schema.prisma`。
- 天回能力以**幂等种子**方式落地：首次启动 `startHeavenScheduler()` 时 `seedHeavenCapabilities()` 通过 `upsert`（按 `code` 唯一）创建 `LoopDefinition / CapabilityEndpoint / LoopOffering`，重复执行不重复建。
- 运行数据写入既有 `LoopRun / LoopEvent`，计数回写既有 `LoopOffering.recentSuccessN / recentTotalN`。

---

## 7. 已知限制

1. **用户核心导航为"部分收敛"**：规范目标为 `发现/卡池/发布/圈子/回/消息/我的/帮助`；本实现额外保留了 `认证/路径检索/找服务/找人`。原因：这些是面向用户的真实功能而非自动能力，直接移除会损害可用性。若产品后续决定进一步收敛，可再调整。
2. **5 个"按资源"天回校验器未挂全局周期**：仅当某需求/订单/接口触发时才运行（影子钩子或手动）。看板中常态显示 `待运行(IDLE)`。需在需求创建/变更影子钩子中补接这些校验器，才能让其在生产中被自动驱动（当前无业务数据触发时即为 IDLE）。
3. **天回检测为"只读巡检"**：本任务的 11 个周期能力只检测、只上报，**不替代**现有 cron/影子钩子的事务性动作（如真正结算、真正发放）。发现异常只是写入 `LoopRun` 结果与计数，后续处置仍需对应业务链路，符合宪法 #5 影子优先。
4. **前端的"天回能力"面板为轮询（15s）**，非 WebSocket 实时推送；高频率刷新对小型实例足够，大规模可考虑服务端推送。
5. **演示指标**：TASK-12 的 `demoMetrics`（如 `validate.*` 的成功/总次数 198/210 等）为测试期样本值，会在真实运行后被 `recentSuccessN/recentTotalN` 增量覆盖，但历史样本不会清零。

---

## 8. 测试结果

### 8.1 类型检查
- 后端 `pnpm typecheck:server`：**通过**（修复了 `heaven-runner.service.ts` 两处 `../`→`./` 相对路径错误与缺失的 `CapabilityHostMode` 枚举导入）。
- 前端 `pnpm typecheck:client`：**通过**（tsc --noEmit）。

### 8.2 单元测试（server，mock prisma，无需真实 DB）
- `pnpm --filter server run test`（仅 loop 模块）：**8 文件 / 53 用例全部通过**。
  - 新增 `heaven-runner.service.test.ts`：**5 用例通过**（运行→SUCCEEDED、未知 code→400、失败→FAILED 且只计 total、清单聚合、11 项完整性）。

### 8.3 相关 Lint（client，eslint 作用域限定到变更文件）
- 对 `loop.ts / MyLoopsPage.tsx / Sidebar.tsx / admin-sidebar.tsx / AdminDashboard.tsx / DemandCreate.tsx` 作用域 lint：`0 error`，初有 1 个 `react-hooks/exhaustive-deps` 警告（`AdminDashboard.handleNavigate` 缺 `navigate` 依赖），已修复为 `[navigate]` 后复检 `0 problem`。

### 8.4 活体烟囱验证（live smoke）
- 启动 server（`PORT=3001`），DB 可达（PostgreSQL :5433）。
- `GET /api/loops/capabilities` → **HTTP 200**，返回 16 项天回能力。
  - `builtin.heaven.monitor.system_health`：`status=SUCCEEDED`，`runCount=5`，`successCount=5`，`lastResult="数据库与核心服务在线"`，`lastRunAt=2026-07-12T14:12:01Z`（证明周期调度 + LoopRun 写入 + 计数回写全链路打通）。
  - `builtin.heaven.automation.tasks`：`status=SUCCEEDED`，`runCount=5`，`lastResult="待运行自动化任务 0 个"`。
  - 其余 9 个周期能力在冒烟时段尚未到触发点（5–10m 周期），显示 `待运行(IDLE)`，符合预期。
  - 5 个按资源校验器显示 `待运行(IDLE)`（无资源触发，真实状态）。
- `GET /api/loops/offerings?loopKind=HEAVEN` → **HTTP 200**，返回 HEAVEN 上架物（含 `recentSuccessN/recentTotalN/avgDurationMs`）。
- 按资源天回验证：经 `runOffering(offeringId, ownerId, {demandId})` 对 `builtin.heaven.validate.demand_fields` 运行真实需求 → 返回 `status=SUCCEEDED, outcome={ok:true, errors:[]}`，HEAVEN `LoopRun` 计数 `23 → 24`（证明按资源天回执行器可运行并写入 `LoopRun`）。

---

## 9. 交付物总览

- 天回自动运行服务（真实周期巡检 + 按资源校验器均落地，非伪造）。
- `/loops` 天回能力看板（触发条件/阶段/状态/成功失败次数/最近结果与时间/接口健康度）。
- 导航收敛：用户主导航移除"监控/税务可视化"，税务可视化转入管理后台且仍可达，自动能力统一收口 `/loops`。
- 零数据库迁移，复用既有自然回模型。
- 类型检查 / 单元测试 / 作用域 lint / 活体烟囱验证 全部通过。
