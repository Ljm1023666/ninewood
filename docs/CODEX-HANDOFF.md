# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-19 · Brain 审计）

| 项 | 状态 |
|---|---|
| Git | `origin/master` 含 Stage 0 / 1.1 / 1.3；**Stage 1.2 代码在工作区，未验收** |
| Server 测试 | `pnpm --filter server test` → **49/52**（`welfare-disbursement.test.ts` **3 失败**） |
| Typecheck | 待 Codex 每轮 read-back 自报 |
| Schema | `WelfareDisbursement` + `WelfareReward.rewardType/choiceLabel` 已在 schema；migration 待确认已 apply |

### 已合入里程碑

- **Stage 0**：comm-close / demand-window / location-privacy 单测；删 `deposit.service.ts`
- **Stage 1.1**：autoReceive（`docs/specs/STAGE-1.1-auto-receive.md`）
- **Stage 1.3**：timeLimit（`docs/specs/STAGE-1.3-time-limit.md`）

### Stage 1.2 代码现状（Brain 核对）

| 交付项 | 状态 |
|---|---|
| `welfare-disbursement.ts` + admin 路由 | ✅ 已有 |
| `welfare-reward.ts` choice 分支 | ✅ 已有 |
| `welfare.ts` complete body | ✅ 已有 |
| `welfare-disbursement.test.ts` | 🟡 **7 用例，3 失败**（见下） |
| V6 admin 403 单测 | 🔴 缺失 |
| `DEVELOPMENT-GUIDE` 回写 | 🔴 未做（§3 #11 仍写旧差距） |

**已知测试失败（修断言即可，勿改业务语义）**：

1. **Test A / D**：Prisma `create` 调用形如 `{ data: { ... } }`，测试用了 `objectContaining` 缺 `data` 包装 → 改为 `expect.objectContaining({ data: expect.objectContaining({...}) })`
2. **Test E**：`grantReward` random 路径可能不经过 `$transaction` 或 mock 的 `cb` 签名不对 → 读 `welfare-reward.ts:55+` 对齐 mock（`findUnique` 在 transaction 外时需单独 mock）

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6；执行顺序见本文「任务队列」
2. **禁止**：stub 进 feat commit；扩 Stage 2 公开圈；重写 welfare claim；改 §1 原文
3. **Commit 纪律**：功能 1 commit + 文档 1 commit；不 amend 已 push 历史
4. **验证**：每轮 read-back 含 **全量** `pnpm --filter server test`，不得只报切片
5. **文档是交付物**：Stage 1.2 不算完成，直到 `STAGE-1.2-doc-sync.md` 落地

---

## 🔴 当前任务队列（按顺序，不得跳步）

### Task 1 — Stage 1.2 收尾（代码 + 测试）

**规格**：`docs/specs/STAGE-1.2-welfare.md` v1.0

**必做**：

1. 修 `welfare-disbursement.test.ts` 至 **全绿**（含 Test A/D/E）
2. 补 **Test G / V6**：非 ADMIN 调 `POST /api/admin/welfare/disbursements` → 403（mock `adminMiddleware` 或路由层）
3. 确认 migration `welfare_disbursement_and_choice_reward` 存在且 `prisma generate` 通过
4. 全量 `pnpm --filter server test` + `pnpm typecheck`

**read-back 格式**：

```markdown
## git log --oneline -3
## 测试（全量：X/X + welfare 文件）
## V1–V8 对照表（spec §7）
## 未做/未越界清单
```

Brain 复审 Task 1 通过后，**再执行 Task 2**（不要合并为一个 commit 混 doc）。

---

### Task 2 — Stage 1.2-doc 开发指导回写

**规格**：`docs/specs/STAGE-1.2-doc-sync.md` v1.0（Brain 已批准）

**必做**：

1. 按 spec §1 更新 `DEVELOPMENT-GUIDE.md`（§2 #11、§3 #11、§4 下一批、§5 API、版本 v2.0）
2. 更新 `ACTION-PLAN.md` §2 行 1.2 → ✅
3. **仅 docs** 单独 commit

**read-back**：列出改动的章节标题 + §2 #11 新状态 + 版本号。

---

### Task 3 — Stage 1.5 私人圈单测（Task 2 完成后）

**规格**：`docs/specs/STAGE-1.5-private-circle-tests.md` v1.0（Brain 已批准）

**必做**：`circle-private.test.ts` ≥5 用例；docs commit（DEVELOPMENT-GUIDE §3 #12、v2.1）

**明确不做**：公开圈、circle-enhanced 入口暴露

---

## 待机 / 阻塞处理

| 情况 | 动作 |
|---|---|
| Task 1 测试非全绿 | 不得开始 Task 2 |
| spec 与代码冲突 | read-back 列差异，等 Brain 裁决；**不要**擅自改 §6 决策 |
| import 链断裂 | 汇报缺失文件，不要 stub |
| 与 parallel session 冲突 | stash 汇报，等 Brain 协调 |

---

## 参考路径

```
docs/DEVELOPMENT-GUIDE.md           §1 原文 · §2–§5 回写目标
docs/ACTION-PLAN.md                 §2 阶段表
docs/specs/STAGE-1.2-welfare.md     Task 1
docs/specs/STAGE-1.2-doc-sync.md    Task 2
docs/specs/STAGE-1.5-private-circle-tests.md   Task 3
server/src/services/welfare-disbursement.ts
server/src/__tests__/welfare-disbursement.test.ts
server/src/services/circle.service.ts
```

---

## DEVELOPMENT-GUIDE 对齐 backlog（Task 3 之后 · 仅 Brain 排期）

以下**不要** Codex 自行开工，等新 spec + handoff：

| 项 | 说明 |
|---|---|
| #11 claim ↔ comm 计时对齐 | STAGE-1.2 spec §8 backlog |
| #3 认证撤销防漏推 | DEVELOPMENT-GUIDE §3 #3 未来项 |
| #2c socket 广播切断 | 非初期；不改 socket 底层除非新 spec |
| Stage 2 公开圈全套 | 决策 D4 后置 |
| `Deposit/DepositDemand` 表清理 | 仅归档讨论，禁止删表 migration |

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | 初版：S1.2 v1.0 已批准 |
| 2026-06-19 | v2：Brain 审计 S1.2 半成品（52 测 3 败）；拆 Task 1/2/3；新增 `STAGE-1.2-doc-sync` + `STAGE-1.5-private-circle-tests`；明确 DEVELOPMENT-GUIDE 为对齐目标 |
