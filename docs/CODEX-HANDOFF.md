# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-19）

| 项 | 状态 |
|---|---|
| Git | `origin/master` 已含 Stage 0 / 1.1 / 1.3 + 文档扫尾 |
| Server 测试 | `pnpm --filter server test` → **45/45** |
| Typecheck | server + client `tsc --noEmit` clean |
| Schema | Stage 1.1 / 1.3 均为 0 schema；**Stage 1.2 允许 migration** |

### 已合入里程碑

- **Stage 0**：comm-close / demand-window / location-privacy 单测；删 `deposit.service.ts`
- **Stage 1.1**：autoReceive（`docs/specs/STAGE-1.1-auto-receive.md`）
- **Stage 1.3**：timeLimit（`f84e590` 功能 + 服务层从 dangling blob 恢复，非 stub）

---

## Brain 决策（无需再问用户）

1. **下一功能**：Stage 1.2 公益收尾（非 Stage 2 公开圈）
2. **规格**：`docs/specs/STAGE-1.2-welfare.md` — **Brain 已批准 v1.0**，可直接实现
3. **禁止**：stub 进 feat commit；并行 session 误删文件时 **先汇报再恢复 blob**，不要写占位 service
4. **Commit 纪律**：功能 1 commit + 文档 1 commit；不 amend 已 push 历史
5. **验证**：每轮 read-back 必须含 **全量** `pnpm --filter server test`，不得只报切片

---

## 🔴 当前任务：Stage 1.2（按 spec 执行）

**规格**：`docs/specs/STAGE-1.2-welfare.md`（v1.0 · 已批准）

**摘要**：

1. 新增 `WelfareDisbursement` 表 + 拨付 service + admin 路由（资金池出账可追溯）
2. `WelfareReward.rewardType` + 「选奖」分支（`choice` 模式）
3. Vitest mock 单测 ≥6 用例（见 spec §6）
4. 文档回写单独 commit（DEVELOPMENT-GUIDE §3 #11 + ACTION-PLAN §2 行 1.2）

**明确不做（本期）**：

- 公益 `claim` 重写成普通 `requestDemand` 路径（留 backlog，见 spec §8）
- 政府外部 API 对接、公开圈、socket 广播
- `DemandDetail` timeLimit 展示（S1.3 可选项，仍跳过）

**完成后 read-back 格式**：

```markdown
## git log --oneline -3
## 测试（全量 + welfare 切片）
## V1–V8 对照表（spec §7）
## 未做/未越界清单
```

Brain 收到 read-back 后复审；通过则 Brain push，失败则列 Critical 打回。

---

## 待机 / 阻塞处理

| 情况 | 动作 |
|---|---|
| spec 未批准 | 只读代码，不写业务；可修 typo / 文档滞后 |
| import 链断裂 | read-back 说明缺失文件，**不要** stub 进 feat |
| 与 parallel session 冲突 | stash 汇报，等 Brain 协调 |
| 测试非 45/45 | 不得声称完成 |

---

## 参考路径

```
docs/DEVELOPMENT-GUIDE.md      §1 原文 · §6 决策
docs/ACTION-PLAN.md            §2 阶段表
docs/specs/STAGE-1.1-auto-receive.md
docs/specs/STAGE-1.2-welfare.md   ← 当前
server/src/routes/welfare.ts
server/src/services/welfare-reward.ts
server/src/middleware/admin.ts
```

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | 初版：S1.3 合入后创建；下发 S1.2 v1.0 已批准任务 |
