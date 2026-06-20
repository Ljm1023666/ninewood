# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-19 · Task 1–3 已落地 · Task 4 待执行）

| 项 | 状态 |
|---|---|
| Git（本地） | 含 `96fac8f` hygiene；Task 1–3：`d00d7a5` · `3e5d547` · `985e109` · `aef7170` · `96fac8f` |
| Server 测试 | `pnpm --filter server test` → **60/60**（9 文件） |
| Typecheck | `pnpm typecheck` → clean |
| 已知代码债 | `welfare/claim` 预写 `COMMUNICATING`；`tryStartCommWindow` **无调用点**（Task 4 修） |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.2**（§3 #11 仍标 claim↔comm backlog，Task 5 修） |

### 已合入里程碑

| Stage | 交付 | 关键 commit / 测试 |
|---|---|---|
| **0** | comm-close / demand-window / location-privacy | — |
| **1.1** | autoReceive | `STAGE-1.1-auto-receive.md` |
| **1.3** | timeLimit | `STAGE-1.3-time-limit.md` |
| **1.2** | 拨付 + 选奖 | `d00d7a5` · 9 用例 |
| **1.5** | 私人圈单测 | `985e109` · `circle-private.test.ts` 6 用例 |
| **hygiene** | handoff 待机 | `96fac8f` |

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6；执行顺序见「任务队列」
2. **禁止**：stub 进 feat commit；无 spec 扩 Stage 2；改 §1 原文；改 socket `io.emit` 块
3. **Commit 纪律**：Task 4 功能 1 commit + Task 5 文档 1 commit
4. **验证**：每轮 read-back 含 **全量** `pnpm --filter server test`
5. **D3 不变**：公益仍两段式；Task 4 只对齐 **comm 计时**，不重写 claim 为 `requestDemand`

---

## ✅ 已完成任务（Task 1–3）

| # | 任务 | commit | Brain |
|---|---|---|---|
| 1 | Stage 1.2 收尾 | `d00d7a5` | ✅ |
| 2 | Stage 1.2-doc | `3e5d547` | ✅ |
| 3 | Stage 1.5 私人圈单测 | `985e109` + `aef7170` | ✅ |

---

## 🔴 当前任务队列（按顺序，不得跳步）

### Task 4 — Stage 1.6 公益 claim ↔ comm 对齐（代码 + 测试）

**规格**：`docs/specs/STAGE-1.6-welfare-claim-comm.md` v1.0（Brain 已批准）

**必做**：

1. `welfare.ts` claim → **`PENDING`**，去掉预写 `commStartAt`/`commDeadline`
2. `POST /api/messages/send` 成功后 **`await tryStartCommWindow(from, to)`**
3. 新增 `server/src/__tests__/welfare-claim-comm.test.ts`（≥6：WC-A–F）
4. 全量 `pnpm --filter server test` + `pnpm typecheck`
5. **仅 feat** 单独 commit（**不要**改 DEVELOPMENT-GUIDE）

**read-back**：git log · 全量测试 · V1–V7 · 未越界清单

Brain 复审 Task 4 通过后 → **Task 5**

---

### Task 5 — Stage 1.6-doc 开发指导回写

**规格**：`docs/specs/STAGE-1.6-doc-sync.md` v1.0（Brain 已批准）

**必做**：`DEVELOPMENT-GUIDE` v2.3 + `ACTION-PLAN` v2.0；**仅 docs** 单独 commit

---

## 待机 backlog（Task 5 之后 · 仅 Brain 排期）

| 项 | 说明 |
|---|---|
| Stage 2 公开圈 | D4 后置；需 `STAGE-2-*.md` |
| #3 认证撤销防漏推 | §3 #3 未来项 |
| #2c socket 广播切断 | 非初期 |
| #12 活跃度 cron smoke | Stage 1.5 可选项 |
| `Deposit/DepositDemand` 表 | 禁止删表 migration |

---

## 阻塞处理

| 情况 | 动作 |
|---|---|
| Task 4 非全绿 | 不得开始 Task 5 |
| spec 与代码冲突 | read-back 列差异，等 Brain 裁决 |
|  tempted 改 requestDemand / 多人 claim | **停止** — 违反 spec §0 |

---

## 参考路径

```
docs/specs/STAGE-1.6-welfare-claim-comm.md    Task 4
docs/specs/STAGE-1.6-doc-sync.md              Task 5
server/src/routes/welfare.ts                  claim handler
server/src/routes/message.ts                  POST /send
server/src/services/comm.service.ts           tryStartCommWindow
server/src/__tests__/welfare-disbursement.test.ts   mock 风格参考
```

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | v3：Task 1–3 闭环，待机 |
| 2026-06-19 | v4：Brain 批准 Task 4/5（Stage 1.6 claim↔comm）；队列激活 |
