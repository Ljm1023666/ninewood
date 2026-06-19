# 九木平台 · Codex 执行规格与后续开发计划

> 版本: v1.5 · 创建: 2026-06-19 · 最近同步: 2026-06-19 (Stage 1.2 spec 批准 · CODEX-HANDOFF 建立)
> 定位: 承接 `DEVELOPMENT-GUIDE.md` 的现状分析，给出**可执行的推进路线**与**验收标准**。
> 关系: `DEVELOPMENT-GUIDE.md` 回答"需求是什么 / 实现到哪了"；本文档回答"接下来按什么顺序做、做完怎么算数"。
> 使用对象: 本文档写给 Codex 等代码执行员。执行员负责按本文档落地代码与测试，不重新解释产品方向，不扩大范围。

---

## 0. 如何使用本文档

1. 执行前先读 `DEVELOPMENT-GUIDE.md` §1（需求原文）和 §6（已决策），但**不要改 §1 原文**。
2. 第 1 节是**核对结论**：记录开发指导文档与代码的偏差（文档已出现过时之处）。
3. 第 2 节是**三阶段路线**：按优先级排序，每项带验收标准。Stage 0 / 1.1 / 1.3 已完成；**当前执行 Stage 1.2**（见 `docs/CODEX-HANDOFF.md`）。
4. 第 3 节是**阶段 0 执行规格**（归档参考）：Stage 0 已全部完成，勿再重复实现。
5. 第 4 节是**推进纪律**：基于仓库既有规则，避免返工。
6. 第 5 节是**风险登记**。

### Codex 执行边界

- **当前任务**：Stage 1.2 公益收尾（`docs/specs/STAGE-1.2-welfare.md` v1.0 · 已批准）。任务入口：`docs/CODEX-HANDOFF.md`。
- **测试策略**：沿用 Vitest + Prisma mock；Stage 1.2 允许 schema migration，仍不接真实测试库。
- **禁止扩大范围**：不做公开圈（Stage 2）、不改 socket 底层、不重写 welfare claim 为普通两段式（见 spec §8 backlog）、不做 stub 进 feat commit。
- **删旧押金边界**：阶段 0 最多删除/归档无引用的 `server/src/services/deposit.service.ts`；**不要删除** Prisma 里的 `Deposit` / `DepositDemand` 表，也不要生成删表 migration。
- **验证命令**：阶段 0 完成后运行 `pnpm --filter server test` 与 `pnpm typecheck`。

---

## 1. 核对结论（代码 vs 开发指导文档）

> 核对时间: 2026-06-19。原则: **以代码为准**，文档滞后处在此登记，落地后回写。

| 项 | 文档标注 | 代码实际 | 处理 |
|---|---|---|---|
| #2c 完成/接单后切断沟通 | 列为差距"尚未强制切断" | **已实现**：`closeAllCommForDemand` 已接入 4 处 | ✅ Stage 0 已补测试（`comm-close.test.ts`，7 个用例）|
| #3 认证者主动接受 | `PushPreference.autoAccept` 缺失 | 确认缺失（schema L656-663 无该字段） | 后期，阶段 1 |
| #5 旧押金 service | 待评估删除 | `deposit.service.ts` 已无引用，仅 `deposit-new.ts` 在用 | ✅ Stage 0 已落地：服务文件删除；`Deposit/DepositDemand` 表依决策 D1 保留 |
| #2a 冻结后窗口存续 | 代码中 `processDemandWindows` 仅命中冻结 + comm 超期，不动未到期 comm 窗口 | ✅ Stage 0 已补测试（`demand-window.test.ts`，5 个用例），不是阶段 1 功能落地 |
| #0.3 位置隐私 | 代码仅保存 `fuzzyLat/fuzzyLng`，响应中不包含精确坐标 | ✅ Stage 0 已补测试（`location-privacy.test.ts`，3 个用例），不是阶段 1 功能落地 |
### #2c 切断逻辑的真实落点（代码证据）

`closeAllCommForDemand(demandId, finalStatus, tx?)` 定义于 `server/src/services/comm.service.ts:104`，调用点：

- `acceptance.service.ts:36` — 需求方确认验收（完成）
- `acceptance.service.ts:127` — 验收另一路径
- `demand.service.ts:791` — 正式接单
- `pool.service.ts:241` — 卡池完成路径

**含义**：原文"需求被确认完成则强制切断沟通资格"在代码层已满足，真正缺口是**回归测试**，而非实现。

---

## 2. 三阶段推进路线

### 阶段 0 — 收尾固化（最高优先 · 低成本）
> **2026-06-19 全部完成**

目标：把"已实现但未被测试覆盖"的初期范围（1/2/4/6/7/10）锁死，防止后续改动回归。

| 任务 | 内容 | 验收标准 |
|---|---|---|
| 0.1 沟通切断测试 | 完成/接单后其他 `COMMUNICATING` 申请人被置终态 | ✅ 已完成：`comm-close.test.ts` 7 个用例通过 |
| 0.2 冻结窗口存续测试 | 冻结需求时不误杀已有效的 5 分钟沟通窗口 | ✅ 已完成：`demand-window.test.ts` 5 个用例通过 |
| 0.3 位置隐私测试 | 精确坐标永不出现在任何 API 响应 | ✅ 已完成：`location-privacy.test.ts` 3 个用例通过 |
| 0.4 债务清理 | 确认 `deposit.service.ts` 无引用后归档/删除 | ✅ 已完成：`deposit.service.ts` 已删；`Deposit/DepositDemand` 表依决策 D1 保留；typecheck 通过 |

完成判据：`pnpm --filter server test` 全绿；`pnpm typecheck` 通过。

建议顺序：0.1 → 0.2 → 0.3 → 0.4。每完成一项只改相关文件和对应文档状态，不混入阶段 1/2。

> Stage 0 已于 2026-06-19 全部完成；未越界动 socket/autoAccept/公益/公开圈/删 Prisma model/恢复旧 deposit API。

### 阶段 1 — 后期能力（初期范围稳定后）

| 任务 | 内容 | 改动面 | 验收标准 |
|---|---|---|---|
| 1.1 #3 认证者主动接受 | 决策调整：复用 `UserTag.autoReceive`（不新增 `PushPreference.autoAccept`）。`push-engine.ts` 增条件参数 `autoReceiveOnly` + `triggerAutoReceivePush`；`user-tag.ts` 加 `PATCH /:tagName/auto-receive`；`demand.service.create` 接入自动触发 | 1 service + 1 路由 + 1 service 钩子 + 12 个测试 | ✅ Stage 1.1 已完成：12 个用例 (auto-receive.test.ts A–L) 全绿；实现 100% 对齐 `docs/specs/STAGE-1.1-auto-receive.md`；未动 schema / `DemandPush` / socket 底层。V1–V10 验收全通过。
|  · **未来项（不在本期范围）**：认证撤销防漏推、重复推送防重、计数/进度接口 |
| 1.2 #11 公益收尾 | 资金池→政府拨付出账记录；补「选奖」奖励类型 | schema + welfare service + admin 路由 | 拨付出账可追溯 + 选奖路径可用 | 🟡 **Spec v1.0 已批准**（`docs/specs/STAGE-1.2-welfare.md`）；Codex 执行中，见 `docs/CODEX-HANDOFF.md` |
| 1.3 #4 timeLimit 接线 | 发布表单可选字段 + 超时验收提醒 | schema 已留字段 + UI + cron | 填写后到期触发提醒 | ✅ Stage 1.3 已完成：发布表单可选 timeLimitMinutes (15–10080) 换算为绝对 timeLimit；OrderDetail 展示剩余/超时；processTimeLimitReminders cron (60s) 按 Order 锚点扫描 IN_PROGRESS + timeLimit<=now，同 orderId 幂等发送 [TIME_LIMIT] SYSTEM 消息（**仅提醒、不改订单状态**）。7 个单测 (A–G) 全绿。 |

### 阶段 2 — 公开圈全套（明确后置 · 决策 D4）

公开圈申请审核、公众待办区、县→市→省→国升级链。**初期不做**，待阶段 0/1 稳定后再单独立项。不要提前动 `circle-enhanced` 的对外入口。

---

## 3. 阶段 0 执行规格

> 落点建议: `server/src/__tests__/`，沿用现有 `comm-integration.test.ts` 的写法。
> 测试风格: 使用 Vitest mock Prisma，直接测试 service/cron 函数。不要为了这些用例新建测试数据库。

### 3.1 完成/接单后切断（对应 0.1）

建议新增或扩展测试文件：`server/src/__tests__/comm-close.test.ts`。

#### 用例 A：`closeAllCommForDemand` 批量置终态

- Arrange：mock `prisma.demandApplicantV2.updateMany`
- Act：调用 `closeAllCommForDemand('demand-1', 'REJECTED')`
- Assert：`updateMany` 参数必须匹配：
  - `where.demandId === 'demand-1'`
  - `where.status.in === ['PENDING', 'COMMUNICATING']`
  - `data.status === 'REJECTED'`

#### 用例 B：正式接单时关闭其他申请人

- Arrange：mock `demand.service.acceptApplicant` 所需的 `prisma` 调用，构造申请人 A 被接单，另有申请人 B 正在 `COMMUNICATING`
- Act：调用 `acceptApplicant(demandId, applicantAId, publisherId)`
- Assert：
  - A 被更新为 `ACCEPTED`
  - `closeAllCommForDemand` 通过 `updateMany` 把同 demand 下 `PENDING/COMMUNICATING` 置为 `REJECTED`
  - 不要求实现 socket 实时广播；广播是阶段 1 之后的独立任务

#### 用例 C：确认验收后无沟通残留

- Arrange：mock `acceptanceService.confirmAcceptance` 所需 order/demand/user/wallet 调用
- Act：调用 `confirmAcceptance(orderId, requesterId)`
- Assert：事务中调用 `closeAllCommForDemand(order.demandId, 'REJECTED', tx)`，即该需求下不会保留 `PENDING/COMMUNICATING`

### 3.2 冻结窗口存续（对应 0.2）

建议新增测试文件：`server/src/__tests__/demand-window.test.ts`。

#### 用例 A：冻结需求不影响未来的沟通窗口

- Arrange：
  - mock `prisma.demand.updateMany` 返回 `{ count: 1 }`
  - mock `prisma.demandApplicantV2.updateMany` 返回 `{ count: 0 }`
- Act：调用 `processDemandWindows()`
- Assert：
  - 需求冻结查询只筛 `status in ['PENDING', 'ACTIVE']`、`visibleUntil <= now`、`acceptedProviderId: null`
  - 沟通超时查询只筛 `status: 'COMMUNICATING'` 且 `commDeadline <= now`
  - 不存在把未来 `commDeadline` 提前、清空或跟随需求冻结一起结束的逻辑

#### 用例 B：到期沟通窗口才置为 `TIMED_OUT`

- Arrange：mock `prisma.demandApplicantV2.updateMany`
- Act：调用 `processDemandWindows()`
- Assert：`updateMany.where.commDeadline.lte` 存在，且 `data.status === 'TIMED_OUT'`

### 3.3 位置隐私（对应 0.3）

建议新增测试文件：`server/src/__tests__/location-privacy.test.ts`。

#### 用例 A：发布时只落模糊坐标

- Arrange：mock `demand.service.create` 所需 Prisma 调用，传入精确 `lat/lng`
- Act：调用创建需求逻辑
- Assert：
  - 入库数据包含 `fuzzyLat/fuzzyLng`
  - 入库数据不包含可对外暴露的精确 `lat/lng`

#### 用例 B：搜索/详情响应不泄露精确坐标

- Arrange：mock 搜索/详情查询返回含 `fuzzyLat/fuzzyLng` 的需求
- Act：调用对应 service 或路由 handler
- Assert：序列化结果不包含精确 `lat` / `lng` 字段；仅允许 `fuzzyLat/fuzzyLng` 或距离字段。

### 3.4 旧押金 service 清理（对应 0.4）

执行前必须先搜索确认无引用：

```bash
rg "depositService|deposit\\.service" server/src server/prisma
```

允许动作：

- 若无业务引用，可删除 `server/src/services/deposit.service.ts`
- 保留 `server/src/services/deposit-new.ts`
- 保留 `server/src/routes/deposit.ts` 的 410 Gone 行为与对应测试

禁止动作：

- 不删除 `Deposit` / `DepositDemand` Prisma model
- 不生成删表 migration
- 不恢复旧 `/api/deposits/*` 行为

---

## 4. 推进纪律（基于仓库规则）

1. **以代码为准，回写文档**：每完成一项，同步更新 `DEVELOPMENT-GUIDE.md` §2 状态矩阵与版本记录。本文档第 1 节的偏差登记落地后划掉。
2. **§1 原文不可改**：实现争议回到 `DEVELOPMENT-GUIDE.md` §1 原文；§6 的 5 条决策可覆盖原文细节。
3. **支付抽象层不可绕过**（决策 D5）：所有资金流转经 `wallet.service`，开发期点数加减，上线只替换该层。新功能禁止直接写余额加减。
4. **增量实现**：每个任务独立可测、独立提交，不跨任务混改。
5. **Scope Lock**：仅 Windows 桌面宽屏，不引入移动端/触摸/PWA。
6. **阶段 1 需要单独规格**：`autoAccept`、公益拨付、`timeLimit` 都不能直接按本文档开工；先补 spec 再实现。

---

## 5. 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| 误删 `Deposit/DepositDemand` 表 | 历史数据不可追溯 | 阶段 0 禁止删表；只允许处理无引用的 `deposit.service.ts` |
| 文档持续滞后于代码 | 误把已实现项当待办 | 每个 PR 强制回写状态矩阵 |
| Redis 为可选依赖 | 缺失时缓存降级 | 已确认降级路径正常；本机 Redis 已装并自启 |
| Codex 误把路线图当实现规格 | 提前做阶段 1/2，扩大改动面 | 阶段 1 必须先有 `docs/specs/STAGE-*.md` + `CODEX-HANDOFF.md` 批准后再写代码 |

---

## 版本记录

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-06-19 | v1.0 | 基于 2026-06-19 代码核对，建立三阶段推进计划；登记 #2c 切断逻辑已实现（文档滞后）、`autoAccept` 缺失、旧 deposit service 无引用三项核对结论 |
| 2026-06-19 | v1.1 | 升级为 Codex 执行规格：明确当前只执行阶段 0、沿用 Vitest + Prisma mock 测试风格、禁止 socket/autoAccept/公益/公开圈扩范围、0.4 只删无引用 service 不删表，并补充阶段 0 逐项测试步骤与验证命令 |
| 2026-06-19 | v1.2 | Stage 0 全部完成：新增 3 个测试文件（comm-close.test.ts 7 个用例 + demand-window.test.ts 5 个用例 + location-privacy.test.ts 3 个用例，合计 15 个用例）；删除旧 deposit.service.ts；Deposit/DepositDemand 表保留（决策 D1）。pnpm --filter server test 18 文件 / 72 用例 全绿，pnpm typecheck clean。未越界进入阶段 1/2：未动 socket/autoAccept/公益抽成/公开圈全套/删 Prisma model/恢复旧 deposit API。DEVELOPMENT-GUIDE.md §2 状态矩阵同步到 2026-06-19。 |
| 2026-06-19 | v1.3 | Stage 1.1 落地：#3 主动接受采用"复用 `UserTag.autoReceive`"决策（不新增 `PushPreference.autoAccept`）。新增 `push-engine.ts` 条件参数 `autoReceiveOnly` + `triggerAutoReceivePush`、`user-tag.ts` PATCH 路由、`demand.service.create` 钩起自动推送、`auto-receive.test.ts` 12 个用例（A–L）。未动 schema / `DemandPush` / socket 底层；手动推送路径不变（条件参数防回归）。`pnpm --filter server test` 19 文件 / 84 用例 全绿，`tsc --noEmit` clean。§1.1 行 ✅。DEVELOPMENT-GUIDE.md v1.7 同步§3 #3 与§2 状态矩阵。未来项：认证撤销、重复推送防重、计数/进度接口。 |
| 2026-06-19 | v1.4 | Stage 1.3 落地：#4 timeLimit 接线（`docs/specs/STAGE-1.3-time-limit.md` v1.0 为准）。`POST /api/demands` 接受可选 `timeLimitMinutes`（>=15 且 <=10080）；`order.service.getById` 在 demand select 中返回 `timeLimit`；新增 `server/src/cron/time-limit-reminder.ts` 以 Order 为锚点（60s）扫描 IN_PROGRESS + timeLimit<=now，同 orderId 幂等发送两条 [TIME_LIMIT] SYSTEM 消息。表单（WorkspaceFields）、发布（DemandCreate）、订单详情（OrderDetail）均最小改动。7 个新单测（time-limit.test.ts A–G）全绿。`pnpm --filter server test -- time-limit` 7/7 passed；server + client tsc 均 clean。DEVELOPMENT-GUIDE.md v1.8 同步§3 #4 + §2 状态矩阵 + 版本记录。未动 schema / Stage 1.2/2 / socket 底层。 |
| 2026-06-19 | v1.5 | S1.3 合入 origin 后：新建 `docs/CODEX-HANDOFF.md`（Brain↔Codex 任务通道）；批准 `docs/specs/STAGE-1.2-welfare.md` v1.0（政府拨付 + 选奖）；§0 执行边界更新为 Stage 1.2；DEVELOPMENT-GUIDE §3 #2 / §4 扫尾（Stage 0 单测 ✅、下一批路线更新）。 |
