# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-21 · Task 6 启动）

| 项 | 状态 |
|---|---|
| Git（本地） | 含 card-pool 3D 画廊等 feat（见 `git log -5`） |
| Server 测试 | 执行前自测 `pnpm --filter server test` |
| Typecheck | 执行前自测 `pnpm typecheck` |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.3** |
| **活跃 Task** | **Task 6 — 虚假功能完整修复** |

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

## 🟢 当前状态：Task 6 执行中

**唯一任务来源**：`docs/specs/FAKE-FEATURES-REPAIR-BACKLOG.md`（v1.0）

按 Wave **P0 → P1 → P2 → P3 → P4** 顺序执行；每项勾选清单并 read-back commit。

### 批量执行模式（用户已授权 · 一次性跑完）

**不要**每 Wave 停下来等 Brain 确认。在**同一会话内**连续完成清单 **FIX-P0-01 → FIX-P4-05 全部 27 项**，最后只交 **一次 read-back**。

执行纪律：

1. 顺序仍遵守 P0→P4；P0-01~04 必须连续（订单主链）。
2. 中间可多次 commit（建议按 backlog §7 切分），**不要**等用户回复。
3. 遇 spec 未覆盖的分歧：按 backlog §9「不在清单内」排除；**禁止**扩 Stage 2 / mobile / 删表。
4. 全部完成后：
   - 在 `FAKE-FEATURES-REPAIR-BACKLOG.md` 勾选所有 `[x]`
   - 更新 `DEVELOPMENT-GUIDE.md` §3 差距（doc commit）
   - 运行 `pnpm --filter server test` + `pnpm typecheck` + `pnpm --filter client-react run lint`（若有前端改动）
5. **最终 read-back 模板**（一次性粘贴给用户/Cursor）：

```markdown
## Task 6 Read-back

- Commits: <hash 列表>
- Server test: <N/N>
- Typecheck: pass/fail
- 清单 §8 DoD: <逐项 ✅/❌>
- 未做项及原因: <若有>
- 手动验证备注: <申请→接受→支付→完成→确认 等>
```

**Brain（Cursor）** 在用户贴 read-back 后做终审核：对照清单逐项、跑测试、查 diff，不通过则列修复项交回 Codex。

### 候选 backlog（Task 6 之后）

| 项 | 说明 |
|---|---|
| **Stage 2 公开圈** | D4 后置；需 `STAGE-2-*.md` |
| **#3 认证撤销防漏推** | §3 #3 未来项 |
| **Google OAuth** | 若 Task 6 P3-01 仅隐藏按钮，可单独立项 |
| **`Deposit/DepositDemand` 表清理** | 禁止删表 migration |

---

## Task 6（已批准 · Codex 执行）

```markdown
任务名: 虚假功能完整修复（Fake Features Repair）
规格路径: docs/specs/FAKE-FEATURES-REPAIR-BACKLOG.md
范围锁定:
  - 必须修 P0 订单主链 + P1 前后端断连
  - 禁止 Stage 2 / mobile / 删 Deposit 表 / socket 重构
  - 开发期支付走 wallet 点数，不接真实渠道
验收:
  - 清单 §8 Definition of Done 全部勾选
  - pnpm --filter server test 全绿 + pnpm typecheck clean
  - 手动：申请→接受→支付→完成→确认 可跑通
```

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | v4：Task 4/5 排期 |
| 2026-06-19 | v5：Task 4–5 全部批准；基线 67/67；队列 → **待机** |
| 2026-06-21 | v6：Task 6 启动 — `FAKE-FEATURES-REPAIR-BACKLOG.md` |
