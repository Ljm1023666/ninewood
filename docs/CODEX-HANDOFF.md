# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-19 · Task 1–5 已全部落地）

| 项 | 状态 |
|---|---|
| Git（本地） | Task 4 `7c5f3ee` · Task 5 doc（见最新 commit） |
| Server 测试 | `pnpm --filter server test` → **67/67**（10 文件） |
| Typecheck | `pnpm typecheck` → clean |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.3** |

### 已合入里程碑

| Stage | 交付 | 关键 commit / 测试 |
|---|---|---|
| **0** | comm-close / demand-window / location-privacy | — |
| **1.1** | autoReceive | 12 用例 |
| **1.3** | timeLimit | 7 用例 |
| **1.2** | 拨付 + 选奖 | `d00d7a5` · 9 用例 |
| **1.5** | 私人圈单测 | `985e109` · 6 用例 |
| **1.6** | claim↔comm | `7c5f3ee` · `welfare-claim-comm.test.ts` 7 用例 |

### 测试分布（67/67）

welfare 9 · **welfare-claim-comm 7** · comm-close 7 · auto-receive 12 · deposit 4 · order 7 · time-limit 7 · auth 3 · demand 2 · circle-private 6 · 其它 3

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6
2. **禁止**：无 spec 扩 Stage 2；改 §1 原文；stub 进 feat commit
3. **Commit 纪律**：功能 1 commit + 文档 1 commit
4. **验证**：read-back 含全量 `pnpm --filter server test`

---

## ✅ 已完成任务队列

| # | 任务 | commit | Brain |
|---|---|---|---|
| 1 | Stage 1.2 收尾 | `d00d7a5` | ✅ |
| 2 | Stage 1.2-doc | `3e5d547` | ✅ |
| 3 | Stage 1.5 私人圈 | `985e109` + `aef7170` | ✅ |
| 4 | Stage 1.6 claim↔comm | `7c5f3ee` | ✅ |
| 5 | Stage 1.6-doc | （doc commit） | ✅ |

---

## 🟡 当前状态：待机

**无活跃 Codex 任务。** 下一项需 Brain 批准新 spec。

### 候选 backlog

| 项 | 说明 |
|---|---|
| **Stage 2 公开圈** | D4 后置；需 `STAGE-2-*.md` |
| **#3 认证撤销防漏推** | §3 #3 未来项 |
| **#2c socket 广播切断** | 非初期 |
| **#12 活跃度 cron smoke** | Stage 1.5 可选项 |
| **`Deposit/DepositDemand` 表清理** | 禁止删表 migration |

---

## 下一任务（Brain 填写 · Codex 等待）

```markdown
<!-- 启动 Task 6 时填写 -->
任务名:
规格路径:
范围锁定:
验收:
```

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | v4：Task 4/5 排期 |
| 2026-06-19 | v5：Task 4–5 全部批准；基线 67/67；队列 → **待机** |
