# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-19 · Task 1–3 已全部落地）

| 项 | 状态 |
|---|---|
| Git（本地） | Task 1–3 已 commit：`d00d7a5` · `3e5d547` · `985e109` · `aef7170` |
| Server 测试 | `pnpm --filter server test` → **60/60**（9 文件） |
| Typecheck | `pnpm typecheck` → clean |
| Schema | `WelfareDisbursement` + migration `20260619120000_welfare_disbursement_and_choice_reward` 已落地 |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.1**（§3 #11/#12、§4 下一批已同步） |

### 已合入里程碑

| Stage | 交付 | 关键 commit / 测试 |
|---|---|---|
| **0** | comm-close / demand-window / location-privacy 单测；删 `deposit.service.ts` | — |
| **1.1** | autoReceive | `docs/specs/STAGE-1.1-auto-receive.md` |
| **1.3** | timeLimit | `docs/specs/STAGE-1.3-time-limit.md` |
| **1.2** | 拨付 + 选奖 + admin 403 | `d00d7a5` · `welfare-disbursement.test.ts` 9 用例 |
| **1.2-doc** | DEVELOPMENT-GUIDE v2.0 | `3e5d547` |
| **1.5** | 私人圈回归单测 | `985e109` · `circle-private.test.ts` 6 用例 PC-A–F |
| **1.5-doc** | DEVELOPMENT-GUIDE v2.1 + hygiene | `aef7170` |

### 测试分布（60/60）

welfare 9 · comm-close 7 · auto-receive 12 · deposit 4 · order 7 · time-limit 7 · auth 3 · demand 2 · **circle-private 6** · 其它 3

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6；执行顺序见本文「任务队列」
2. **禁止**：stub 进 feat commit；无 spec 扩 Stage 2 公开圈；重写 welfare claim；改 §1 原文
3. **Commit 纪律**：功能 1 commit + 文档 1 commit；不 amend 已 push 历史
4. **验证**：每轮 read-back 含 **全量** `pnpm --filter server test`，不得只报切片
5. **文档是交付物**：Stage 落地不算完成，直到对应 doc-sync spec 落地

---

## ✅ 已完成任务队列（2026-06-19 三任务闭环）

| # | 任务 | 规格 | commit | Brain |
|---|---|---|---|---|
| 1 | Stage 1.2 收尾 | `STAGE-1.2-welfare.md` | `d00d7a5` | ✅ 批准 |
| 2 | Stage 1.2-doc | `STAGE-1.2-doc-sync.md` | `3e5d547` | ✅ 批准 |
| 3 | Stage 1.5 私人圈单测 | `STAGE-1.5-private-circle-tests.md` | `985e109` + `aef7170` | ✅ 批准 |

**不要**重复执行上述任务，除非 Brain 显式 reopen。

---

## 🟡 当前状态：待机

**无活跃 Codex 任务。** 下一项需 Brain 批准新 spec 并更新本文「下一任务」节后再开工。

### 候选 backlog（仅 Brain 排期 · 禁止 Codex 自行开工）

| 优先级 | 项 | 说明 |
|---|---|---|
| — | **Stage 2 公开圈** | 决策 D4 后置；需新 `STAGE-2-*.md` spec |
| — | **#11 claim ↔ comm 计时对齐** | `STAGE-1.2-welfare.md` §8 backlog |
| — | **#3 认证撤销防漏推** | DEVELOPMENT-GUIDE §3 #3 未来项 |
| — | **#2c socket 广播切断** | 非初期；不改 socket 底层除非新 spec |
| — | **`Deposit/DepositDemand` 表清理** | 仅归档讨论，禁止删表 migration |
| — | **#12 活跃度 cron 验证** | `circle-activity` smoke 用例（Stage 1.5 spec §0 可选项，未做） |

---

## 下一任务（Brain 填写 · Codex 等待）

```markdown
<!-- Brain 启动 Task 4 时在此填写，并 bump 本文版本记录 -->
任务名:
规格路径:
范围锁定:
验收:
```

---

## 阻塞处理

| 情况 | 动作 |
|---|---|
| 测试非全绿 | 不得开始新 Stage；read-back 附失败用例名 |
| spec 与代码冲突 | read-back 列差异，等 Brain 裁决；**不要**擅自改 §6 决策 |
| import 链断裂 | 汇报缺失文件，不要 stub |
| 与 parallel session 冲突 | stash 汇报，等 Brain 协调 |

---

## 参考路径

```
docs/DEVELOPMENT-GUIDE.md           §1 原文 · §2–§5 回写目标
docs/ACTION-PLAN.md                   §2 阶段表 · §0 执行边界
docs/specs/STAGE-1.2-welfare.md       Task 1（已完成）
docs/specs/STAGE-1.2-doc-sync.md      Task 2（已完成）
docs/specs/STAGE-1.5-private-circle-tests.md   Task 3（已完成）
server/src/__tests__/welfare-disbursement.test.ts
server/src/__tests__/circle-private.test.ts
server/src/services/circle.service.ts
server/src/services/welfare-disbursement.ts
```

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | 初版：S1.2 v1.0 已批准 |
| 2026-06-19 | v2：Brain 审计 S1.2 半成品（52 测 3 败）；拆 Task 1/2/3 |
| 2026-06-19 | v3：Task 1–3 全部批准；基线 60/60；队列 → **待机**；backlog 表保留 |
