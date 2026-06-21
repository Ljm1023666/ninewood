# 虚假功能完整修复清单（Codex 执行规格）

> 状态: **v1.0 · 待执行** · 创建: 2026-06-21  
> 来源: 全库扫描（操作按钮 + 前后端连接 + 假数据/dashboard）  
> 读者: **Codex 执行员**（唯一任务来源见 `docs/CODEX-HANDOFF.md` Task 6）  
> 权威需求: `docs/DEVELOPMENT-GUIDE.md` §1 + §6（**禁止改 §1 原文**）

---

## 0. 如何使用

1. **严格按 Wave 顺序**执行：P0 → P1 → P2 → P3 → P4；同 Wave 内按 Task ID 升序。
2. 每项完成后勾选 `[ ]` → `[x]`，并在 read-back 中写明 commit hash。
3. **每个 Wave 至少 1 个 feat commit + 1 个 doc commit**（与 `CODEX-HANDOFF.md` 纪律一致）。
4. 验证命令（每项 Wave 结束必跑）：
   - `pnpm --filter server test`
   - `pnpm typecheck`
   - 若改前端交互：`pnpm --filter client-react run lint`（仅改动文件相关即可）
5. **范围锁定**（与 CLAUDE.md 一致）：
   - Windows 桌面 / Electron；**不做** mobile breakpoint、touch、PWA。
   - 不做 Stage 2 公开圈、不改 socket 底层。
   - **不删** Prisma `Deposit` / `DepositDemand` 表。
   - 开发期货币仍走 `wallet.service` 点数抽象（§6 决策 ⑤）；不接真实支付渠道。

---

## 1. 问题总览（按严重度）

| Wave | 主题 | Task 数 | 用户影响 |
|------|------|---------|----------|
| **P0** | 核心业务链（接单→订单→支付→履约） | 4 | 阻断主流程 |
| **P1** | 后端已有、前端未接 | 6 | 功能「存在但点不到」 |
| **P2** | 假数据 Dashboard | 4 | 误导运营/管理员 |
| **P3** | 空按钮 / 半实现交互 | 8 | 可点无效果 |
| **P4** | Legacy 清理 + 错误反馈 + 开发 Stub 规范 | 5 | 维护性 / 体验债 |

---

## 2. Wave P0 — 核心业务链（最高优先）

### FIX-P0-01 · V2 接单后自动创建 Order

- [ ] **状态**: 待做

**问题**  
`acceptApplicant` 仅更新 `demand` + `demandApplicantV2`，**不创建 `Order`**。前端 `orderApi.create` 从未调用。用户接受申请人后无法进入支付/履约页。

**范围**  
- `server/src/services/demand.service.ts` — `acceptApplicant`
- `server/src/services/order.service.ts` — 新增或改造 `createFromApplicantV2`
- `server/src/routes/order.ts` — 可选：支持 `applicantId`（V2）body 字段
- `client-react/src/api/order.ts`
- `client-react/src/views/DemandDetail.tsx` — `ApplicantListPanel.accept`

**后端要求**  
1. 在 `acceptApplicant` 同一 `$transaction` 内创建 `Order`：
   - `providerId` = applicant.userId
   - `requesterId` = demand.userId
   - `agreedPrice` = `demand.minPrice`（或 applicant 报价字段若 schema 有）
   - `status` = `IN_PROGRESS`
2. **废弃**对 `demandApplication` 的依赖；`order.service.create` 改为读 `demandApplicantV2` 且 `status === 'ACCEPTED'`，或拆成 `createFromApplicantV2(demandId, applicantId, userId)`。
3. **禁止**在 create 时把 demand 标为 `COMPLETED`（当前 legacy create 有 bug，应改为保持 `IN_PROGRESS`）。
4. 返回 `{ ok, acceptedUserId, orderId }`。

**前端要求**  
1. 接受成功后 toast + **跳转** `/payment/:orderId` 或展示「去支付」链到订单详情。
2. `IN_PROGRESS` 状态下需求详情展示订单入口（查 `GET /orders?demandId=` 或在 accept 响应带 orderId）。

**测试**  
- 新增 `server/src/__tests__/accept-applicant-order.test.ts`（≥4 用例）：
  - 接受后存在 Order且字段正确
  - 非发布者 403
  - 重复接受 400
  - 与 `closeAllCommForDemand` 仍兼容

**验收**  
- 手动：发布需求 → 服务者申请 → 发布者接受 → 进入支付页 → 订单列表可见。

**依赖**  
无（P0 第一项）

---

### FIX-P0-02 · prepay 接入 wallet 点数（替换纯 Stub）

- [ ] **状态**: 待做

**问题**  
`order.service.prepay` 只写 `paidAt`，返回 `'支付成功（模拟）'`，**未调用 `wallet.service`**，与 §6 决策 ⑤ 不符。

**范围**  
- `server/src/services/order.service.ts` — `prepay`
- `server/src/services/wallet.service.ts`（如需补方法）
- `client-react/src/views/Payment.tsx`
- `client-react/src/views/OrderDetail.tsx`

**后端要求**  
1. prepay 时按 `GET /orders/:id/pay-breakdown` 逻辑扣款/划转点数。
2. 余额不足返回 400 + 明确 message。
3. 响应文案改为「支付成功」或「点数已扣除」（**去掉「模拟」字样**，UI 改「开发期点数支付」说明即可）。

**测试**  
- 扩展 `server/src/__tests__/order.test.ts` 或新建 wallet+prepay 用例（mock wallet）。

**验收**  
- prepay 后 wallet 余额变化；Transaction 可追溯。

**依赖**  
FIX-P0-01

---

### FIX-P0-03 · confirm 走 settlement + wallet（替换 deposit 旧路径）

- [ ] **状态**: 待做

**问题**  
`order.service.confirm` 仍查 `depositDemand` 旧表退款，主流程应走 `wallet.service.settleDemand`。

**范围**  
- `server/src/services/order.service.ts` — `confirm`, `partialComplete`
- `server/src/services/wallet.service.ts`
- 相关测试

**后端要求**  
1. 验收确认时调用 `settleDemand`（5% 服务费规则已在 wallet）。
2. 保留对旧 deposit 的**只读兼容**（若存在则 log warn），但不作为主路径。

**测试**  
- confirm 用例：settleDemand 被调用、order → COMPLETED。

**验收**  
- 完整链路：accept → prepay → complete → confirm → 双方点数正确。

**依赖**  
FIX-P0-02

---

### FIX-P0-04 · 需求详情 IN_PROGRESS 态补全操作入口

- [ ] **状态**: 待做

**问题**  
接受后只显示「已有人接单，服务进行中」，**无订单/消息/支付入口**。

**范围**  
- `client-react/src/views/DemandDetail.tsx`

**前端要求**  
1. `IN_PROGRESS` 时展示：
   - 「查看订单」→ `/orders/:id`
   - 「联系对方」→ `/messages/...`（若已有会话 API）
2. 发布者/服务者角色区分按钮文案。

**验收**  
- 接受后无需手动输入 URL 即可进入履约。

**依赖**  
FIX-P0-01

---

## 3. Wave P1 — 后端已有、前端未接

### FIX-P1-01 · 公益中心：认领 + 完成

- [ ] **状态**: 待做

**问题**  
`POST /welfare/claim/:demandId`、`POST /welfare/complete/:demandId` 已实现，`WelfareCenter.tsx` 只有发布。

**范围**  
- `client-react/src/views/WelfareCenter.tsx`
- 可选：`client-react/src/api/welfare.ts`（新建模块）

**前端要求**  
1. 列表展示可认领公益需求（`GET` 现有或 `demandApi.list` + `isPublicWelfare` 过滤）。
2. 服务者：**认领** → 调 claim；发布者：**完成** → 弹窗选 random/choice + finalPrice → complete。
3. 认领后引导沟通/等待 `acceptApplicant`（D3 不变）。
4. 所有 `catch` 改 toast，禁止 noop。

**验收**  
- 公益发布 → 他人认领 → 双方消息 → 发布者 accept → 走 P0 订单链 → 发布者 complete → 奖励记录可见。

**依赖**  
FIX-P0-01（完成链路）

---

### FIX-P1-02 · Admin 争议列表与裁决 UI

- [ ] **状态**: 待做

**问题**  
`GET/POST /admin/disputes*` 存在；`disputeCount` 硬编码 0；前端无争议 Tab。

**范围**  
- `server/src/routes/admin.ts` — `disputeCount` 查 `order.status === 'DISPUTED'`
- `client-react/src/views/admin/` — 新建 `AdminDisputesTab.tsx` 或扩 `AdminOrdersTab`
- `client-react/src/views/AdminDashboard.tsx`
- `client-react/src/views/admin/use-admin-data.ts`

**后端要求**  
1. `disputeCount` 真实 count。
2. `resolve` 的 `refund` action：**区分**于 complete（至少 status / wallet 不同；若暂无法实现真退款，返回 501 并在 UI 禁用 refund 按钮，**禁止** silent 标 COMPLETED）。

**前端要求**  
1. 侧边栏「争议中」对应 `admin-section-disputes`。
2. 列表 + 「完成订单 / 退款（若后端支持）」按钮。

**测试**  
- admin dashboard count 用例；dispute resolve 分支测试。

**依赖**  
无

---

### FIX-P1-03 · 订单取消按钮

- [ ] **状态**: 待做

**问题**  
`POST /orders/:id/cancel` 存在；`orderApi` 无 `cancel`；UI 无入口。

**范围**  
- `client-react/src/api/order.ts`
- `client-react/src/views/OrderDetail.tsx`

**验收**  
- 双方可见条件下可取消；toast + 状态刷新。

**依赖**  
FIX-P0-01

---

### FIX-P1-04 · 自动接单开关（Settings）

- [ ] **状态**: 待做

**问题**  
`PATCH /user-tags/:tagName/auto-receive` 无前端。

**范围**  
- `client-react/src/api/user-tag.ts`
- `client-react/src/views/Settings.tsx` 或 Tag 管理页

**验收**  
- 切换开关后刷新仍保持；失败 toast。

**依赖**  
无

---

### FIX-P1-05 · 服务者认证 register 与 CertCenter 对齐

- [ ] **状态**: 待做

**问题**  
`certificationApi.register` 无页面；`CertCenter` 仅用 `upgradeCert`。

**范围**  
- `client-react/src/views/CertCenter.tsx`
- `client-react/src/api/certification.ts`

**要求**  
1. 厘清 `register` vs `upgradeCert` 产品语义（读 `certification.ts` 路由）。
2. 材料提交走真实 API；「认证材料」行可点击进入历史/详情。
3. 「抢单额度」行若仅为展示则**去掉箭头**；若应跳转则实现。

**验收**  
- 新服务者完整认证流程可走通。

**依赖**  
无

---

### FIX-P1-06 · Discover 服务者搜索：结果列表 + 跳转

- [ ] **状态**: 待做

**问题**  
Hero 搜索仅 toast 数量，不展示结果。

**范围**  
- `client-react/src/views/Discover.tsx`
- `server/src/routes/provider.ts` — 评估匿名 userId 问题

**后端要求**  
1. 搜索响应返回**可跳转**的 provider 标识（完整 userId 或专用 publicSlug）；登录用户可见 nickname。

**前端要求**  
1. 展示结果卡片列表；点击 → `/profile/:id` 或 Providers 详情。
2. 无结果时 inline 空态，不仅 toast。

**验收**  
- 输入标签 → 看到服务者 → 点击进入详情。

**依赖**  
无

---

## 4. Wave P2 — 假数据 Dashboard 替换

### FIX-P2-01 · TagStatsDashboard 去假数据

- [ ] **状态**: 待做

**问题**  
总览数字写死；分析指标加假基数；日志 Tab 用 `mockLogs`；设置 Tab 无保存；导出无 handler。

**范围**  
- `client-react/src/views/TagStatsDashboard.tsx`
- `server/src/routes/tag-stats.ts`（扩展 aggregate API 若需要）

**要求**  
1. **overview 四指标**：接 `GET /admin/dashboard` 或新建 `GET /tag-stats/overview`（userCount/orderCount/revenue 等）。
2. **分析 Tab 指标**：去掉 +12400/+3880 等基数，仅展示 API 真实值。
3. **日志 Tab**：接真实 audit 表或 **诚明显示**「暂无审计 API」空态，删除「实时监听中」误导文案。
4. **设置 Tab**：若无 API 则移除 Tab 或改为只读说明；禁止假输入框。
5. **导出**：实现 CSV 导出（前端从 stats 生成）或移除按钮。
6. 通知/头像：无功能则去掉 `cursor-pointer`。

**验收**  
- 刷新后数字与 DB 一致；无硬编码 12408/45091。

**依赖**  
无

---

### FIX-P2-02 · AdminSystemTab 接 /health API

- [ ] **状态**: 待做

**问题**  
CPU/内存/延迟/日志全部硬编码。

**范围**  
- `client-react/src/views/admin/AdminSystemTab.tsx`
- `server/src/routes/health.ts`
- 可选：挂载 `port-monitor-dashboard` 组件

**要求**  
1. 服务状态、延迟接 `GET /api/health/services`。
2. 无数据时显示 loading/空态，**禁止**假 METRICS。
3. 重启按钮若后端返回 `ok: false`，UI 标注「需手动重启」并 disable。

**验收**  
- 停 server 后 health 状态变化可反映（或明确 offline）。

**依赖**  
无

---

### FIX-P2-03 · Admin 二级导航锚点补全 + 订单筛选

- [ ] **状态**: 待做

**问题**  
sidebar 子项 id 与 DOM `admin-section-*` 不匹配；`AdminOrdersTab` 忽略 `activeItem`。

**范围**  
- `client-react/src/views/admin/AdminUsersTab.tsx` — 补 `admin-section-demanders/admins`
- `client-react/src/views/admin/AdminOrdersTab.tsx` — 按 status 过滤
- `client-react/src/components/ui/admin-sidebar.tsx`

**验收**  
- 点击「待处理/争议中」滚动到对应区块且列表过滤正确。

**依赖**  
FIX-P1-02（争议区块）

---

### FIX-P2-04 · AdminUsersTab 真实用户列表

- [ ] **状态**: 待做

**问题**  
搜索框无逻辑；显示「用户管理功能开发中」。

**范围**  
- `server/src/routes/admin.ts` — 确认或新增 `GET /admin/users?q=&role=`
- `client-react/src/views/admin/AdminUsersTab.tsx`

**验收**  
- 搜索 nickname/phone 有结果；分栏展示 providers/demanders。

**依赖**  
FIX-P2-03

---

## 5. Wave P3 — 空按钮与半实现交互

### FIX-P3-01 · Google 登录：隐藏或接 OAuth

- [ ] **状态**: 待做

**问题**  
按钮仅 `setError('Google 登录暂未开放')`。

**范围**  
- `client-react/src/views/Login.tsx`

**决策（本 spec 锁定）**  
- **初期方案**：移除 Google 按钮（或 `disabled` + tooltip「即将推出」），**禁止**可点报错。
- OAuth 接法列为 P4 可选，不在本 Task 强制。

**验收**  
- 登录页无误导可点 Google 按钮。

---

### FIX-P3-02 · AgentChat 对话重命名

- [ ] **状态**: 待做

**问题**  
编辑框不持久化。

**范围**  
- `client-react/src/views/AgentChat.tsx`
- `server/src/routes/agent.ts` — 确认 `PATCH /conversations/:id` 是否存在，无则补

**验收**  
- 重命名后刷新仍存在。

---

### FIX-P3-03 · 语音输入：禁用或真实现

- [ ] **状态**: 待做

**问题**  
Mic 仅 console.log + 假文本。

**范围**  
- `client-react/src/components/ui/prompt-input-box.tsx`

**决策（本 spec 锁定）**  
- **Windows 桌面**：若无 STT 后端，**隐藏 Mic 按钮**；不要发送 `[语音消息 - N秒]` 假消息。
- 文件校验失败改 toast（同文件）。

---

### FIX-P3-04 · CardPool 筛选：接入或移除

- [ ] **状态**: 待做

**问题**  
`<ComboboxDemo disabled />` 永久禁用。

**决策**  
- 接入 `demandApi.list` 真实筛选 **或** 移除筛选 UI（二选一，禁止长期 disabled demo）。

**范围**  
- `client-react/src/views/CardPool.tsx`

---

### FIX-P3-05 · 全局 catch noop → toast

- [ ] **状态**: 待做

**问题**  
失败静默，按钮像坏的。

**范围（至少）**  
- `new-group-dialog.tsx`
- `MyDemands.tsx`
- `CertCenter.tsx`
- `DemandDetail.tsx`（收藏）
- `TagStatsDashboard.tsx`
- `WelfareCenter.tsx`

**验收**  
- 上述路径失败均有 `toast(msg, 'error')`。

---

### FIX-P3-06 · demandApi.withdrawDemand 撤回按钮

- [ ] **状态**: 待做

**范围**  
- `client-react/src/views/MyDemands.tsx` 或 `DemandDetail.tsx`（发布者）

**验收**  
- 活跃需求可撤回；余额/refund 提示与后端一致。

---

### FIX-P3-07 · Electron 窗口控制接入

- [ ] **状态**: 待做

**问题**  
preload 已暴露 `electronAPI`，React 未用。

**范围**  
- `client-react/src/components/layout/` 标题栏或 `App.tsx`
- 读 `electron-secure-development` skill

**要求**  
- 仅在 `window.electronAPI` 存在时显示最小化/最大化/关闭。
- Web 浏览器环境无影响。

---

### FIX-P3-08 · Payment / OrderDetail 文案与 FAQ 同步

- [ ] **状态**: 待做

**范围**  
- `Payment.tsx`, `OrderDetail.tsx`
- `help-faq-data.ts` — 订单/create 流程描述

**要求**  
- 标题改为「点数支付」类文案；FAQ 与 P0 行为一致。

**依赖**  
FIX-P0-02, FIX-P0-01

---

## 6. Wave P4 — Legacy 清理与规范

### FIX-P4-01 · Legacy pool/snatch API 决策落地

- [ ] **状态**: 待做

**问题**  
`demandApi.snatch/acceptSnatch`、`poolApi` 大部分无 UI，与 V2 并存。

**决策（Brain 锁定）**  
1. **保留** V2：`requestDemand` / `acceptApplicant` / `getApplicantsV2`。  
2. **废弃入口**：从 `demand.ts` / `pool.ts` 移除或 `@deprecated` 注释；删除无引用 export。  
3. **MyBids** 若仅 legacy，改接 V2 或移除路由入口。  
4. **禁止** 同一需求两套接单语义并存。

**验收**  
- grep snatch/acceptSnatch 无活跃 UI；server 路由可保留但文档标 deprecated。

---

### FIX-P4-02 · 删除 dead code：`stores/tags.ts`

- [ ] **状态**: 待做

**问题**  
调用不存在的 `/tags/user*`；无任何 import。

**验收**  
- 文件删除或改为正确 API；typecheck clean。

---

### FIX-P4-03 · bid accept 路由（可选）

- [ ] **状态**: 待做 · **低优先**

**问题**  
`bidService.acceptBid` 会建单但无 HTTP 路由。

**决策**  
- 若 FIX-P4-01 废弃 bid 流：**删除** bid accept 服务或标 deprecated，不新增路由。  
- 若卡池竞价仍需要：补 `POST /demands/:id/bids/:bidId/accept` 并接 UI。

**默认**：随 P4-01 一并 **废弃**，不新做 UI。

---

### FIX-P4-04 · 开发 Stub 明示（captcha / SMS）

- [ ] **状态**: 待做

**范围**  
- `server/src/routes/captcha.ts`
- `server/src/services/auth.service.ts`
- `Login.tsx`

**要求**  
1. 仅 `NODE_ENV !== 'production'` 启用 dev-bypass / 响应内 code。  
2. production 配置下 bypass 必须 403。  
3. Login UI 开发模式小字提示「开发环境验证码见网络面板」（可选）。

---

### FIX-P4-05 · 孤儿 Demo 组件清理

- [ ] **状态**: 待做

**范围**  
- `comparison-table.tsx`, `credit-card-form.tsx`, `ChatTemplateDemoPage`, `animate-card-animation.tsx`  
- `port-monitor-dashboard.tsx` — 若 P2-02 已挂载则保留

**决策**  
- 无路由引用且含假数据：**移入 `archive/` 或删除 export**，避免误用。  
- `FiltersPreview` 保留（明确 preview 路由）。

---

## 7. 执行顺序（Codex 甘特）

```
P0-01 → P0-02 → P0-03 → P0-04   （订单主链，必须连续）
P1-01                              （依赖 P0）
P1-02, P1-04, P1-05, P1-06        （可并行）
P2-*                               （Dashboard，可与 P1 交错）
P3-05                              （noop toast，随时可插）
P3-01~04, P3-06~08
P4-*                               （最后清理）
```

**建议 commit 切分**  
| Commit | 内容 |
|--------|------|
| `feat(order): create order on V2 acceptApplicant` | P0-01 + 测试 |
| `feat(wallet): wire prepay and confirm settlement` | P0-02 + P0-03 |
| `feat(demand): in-progress order entrypoints` | P0-04 |
| `feat(welfare): claim and complete UI` | P1-01 |
| `feat(admin): disputes and real metrics` | P1-02 + P2-02~04 |
| `feat(settings): auto-receive and cert flows` | P1-04 + P1-05 |
| `feat(discover): provider search results` | P1-06 |
| `fix(ui): remove fake dashboards and dead buttons` | P2-01 + P3-* |
| `chore: legacy api cleanup` | P4-* |
| `docs: DEVELOPMENT-GUIDE v2.x sync` | 回写 §3 差距 |

---

## 8. 整包 Definition of Done

- [ ] P0 全部勾选；手动跑通「发布 → 申请 → 接受 → 支付 → 完成 → 确认」
- [ ] P1 全部勾选；公益认领/完成可演示
- [ ] P2 无硬编码监控数字；Admin/TagStats 诚实或有真实 API
- [ ] P3 无可点无效果按钮（Google/语音/导出/重命名要么实现要么移除）
- [ ] P4 legacy 决策已写入 `DEVELOPMENT-GUIDE.md` §3
- [ ] `pnpm --filter server test` 全绿（记录总数）
- [ ] `pnpm typecheck` clean
- [ ] `help-faq-data.ts` 与实现一致

---

## 9. 不在本清单内（明确排除）

| 项 | 原因 |
|----|------|
| Stage 2 公开圈 | D4 后置 |
| 真实微信/支付宝支付 | 上线前替换 wallet 层 |
| Google OAuth 完整接入 | 除非单独立项 |
| 删 Deposit/DepositDemand 表 | Brain 禁止 |
| Mobile 适配 | 范围锁定 |
| socket 广播重构 | ACTION-PLAN 禁止 |

---

## 10. 版本记录

| 日期 | 变更 |
|------|------|
| 2026-06-21 | v1.0 初版：27 项 Task，Wave P0–P4 |
