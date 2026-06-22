# Claude Code 交接通道（Brain ↔ Claude Code）

> 维护者: Cursor 审核官（Brain）· 读者: **Claude Code 执行员**  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-22）

| 项 | 状态 |
|---|---|
| Git（本地） | Task 9 + Agent 回归补丁（knowledge / markdown / synthesis） |
| Server 测试 | **149/149**（`pnpm --filter server test`） |
| Typecheck | `pnpm typecheck` → clean |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.4** |
| **活跃 Task** | **Task 10 — Agent 自动化任务** |

### 已合入里程碑

| Stage / Task | 交付 | 测试 |
|---|---|---|
| **Task 6** | 虚假功能完整修复 | 75/75 |
| **Task 7 前端** | Hub 嵌套路由 + 5 子页 | Cursor |
| **Task 8** | Hub 后端 | 84/84 |
| **Task 9** | Agent 执行代理 Wave A–E + 回归 | 149/149 |

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6
2. **Task 10 授权**：**可增 Prisma 表** `AgentTask` + `AgentTaskRun` + migration
3. **禁止**：无 spec 扩 Stage 2；改 §1 原文；调度器调用写工具
4. **Commit 纪律**：每 Wave 1 feat commit；Wave F 1 doc commit
5. **验证**：read-back 含全量 `pnpm --filter server test` + `pnpm typecheck`

---

## 🟢 当前状态：Task 10 — Claude Code 立即执行

**用户指令（2026-06-22）**：自动化具体实现 — 可扩展任务框架 + 每小时/每天/每周 + 双通道推送 + 对话创建。

| 项 | 路径 |
|---|---|
| **规格（必读）** | `docs/specs/TASK-10-agent-automation.md` |
| 认知模型 §P2 | `docs/specs/AGENT-COGNITIVE-MODEL.md` |
| 交互仪式 §7 | `docs/specs/AGENT-INTERACTION-RITUALS.md` |
| 能力 YAML | `server/ai-knowledge/03-agent-capabilities.yaml` → `schedule_demand_digest` |
| cron 范式 | `server/src/cron/time-limit-reminder.ts` |
| 查询复用 | `server/src/services/agent/tools.ts` → `search_demands` |
| Agent 入口 | `server/src/services/agent/executor.ts`、`client-react/src/views/AgentChat.tsx` |

### Claude Code 启动提示（复制即用）

```
读 docs/CLAUDE-CODE-HANDOFF.md 与 docs/specs/TASK-10-agent-automation.md。
按 Wave A→F 执行：Prisma → 类型注册表 → 调度器 → API → Agent 草稿工具 → 前端。
平台宪法：自动化只读+只推送，永不调用写工具。
每 Wave 后 pnpm typecheck && pnpm --filter server test（基线 149/149 不可回退）。
Wave F 后 pnpm --filter client-react run lint（agent 相关文件）。
```

### Task 10 执行顺序

```
Wave A  AgentTask + AgentTaskRun + migration + task-types 注册表
Wave B  DEMAND_DIGEST.run + task-schedule + demand-search 抽取 + 单测
Wave C  agent-task-scheduler + 双通道投递 + cron 注册 + 单测
Wave D  /api/agent/tasks CRUD + inbox + 单测
Wave E  draft_automation_task + task_draft SSE + capability 更新
Wave F  前端 /agent/tasks + TaskDraftCard + 侧栏 + read-back
```

### 验证命令

```bash
pnpm typecheck
pnpm --filter server test
pnpm --filter client-react run lint   # Wave F 后
```

手动：见 `TASK-10-agent-automation.md` §11（7 条）。

---

## 📦 归档：Task 9 — Agent 执行代理（已完成）

| 项 | 状态 |
|---|---|
| 规格 | `docs/specs/TASK-9-agent-executor.md` v2.0 |
| 测试 | 149/149 + typecheck clean |
| 遗留 | approval 模式 Plan 卡与 tool_pending 双卡并存（可后续收敛） |

---

## ✅ 已完成任务队列

| # | 任务 | Brain |
|---|---|---|
| 6–8 | 见上 | ✅ |
| 9 | Agent 执行代理 | ✅ |
| 10 | Agent 自动化 | ⏳ **进行中** |

---

## 候选 backlog（Task 10 之后）

| 项 | 说明 |
|---|---|
| Task 9+ | 低危写操作：改昵称、上传头像 |
| Task 9 Phase 3 | 批量操作 Scope 卡 |
| Task 11 | `PRICE_WATCH` 自动化类型 |
| Stage 2 公开圈 | D4 后置 |
| Help FAQ CMS | P2 |

---

## 下一任务（Brain 填写）

- **当前**：Claude Code 执行 `TASK-10-agent-automation.md` Wave A → F
- **完成后**：Brain 审 read-back + 手动 §11 七条
- **Cursor 不做**：Task 10 实现代码；仅维护 spec

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-22 | v4：Task 10 完成 — Agent 自动化 Wave A–F 全部落地 |
| 2026-06-22 | v3：Task 10 启动 — Agent 自动化（Phase 4 落地） |
| 2026-06-22 | v2：Task 9 完成 + Agent 回归 149/149 |
| 2026-06-21 | v1：交接通道建立 |

### Task 10 read-back

- migration: `20260622022937_add_agent_tasks` (AgentTask + AgentTaskRun)
- 测试: `pnpm --filter server test` → **235/235**（基线 149 + 86 new）
- typecheck: clean
- Wave A–F: 全部完成
  - A: Prisma schema + migration + task-types 注册表 + DEMAND_DIGEST.validateFilters
  - B: demand-search 抽取 + DEMAND_DIGEST.run + task-schedule.computeNextRunAt/describeSchedule
  - C: agent-task-scheduler (60s 扫描 / 幂等 / ERROR 不 disable) + MESSAGE 投递 + cron 注册
  - D: /api/agent/tasks CRUD + run-now + inbox（配额 5；inbox 路由先于 /:id 注册）
  - E: draft_automation_task L1 + task_draft SSE + ToolContext.send + capability 更新
  - F: 前端 /agent/tasks 页 + AgentTaskDraftCard + AgentChat 监听 + 侧栏入口
- 新 API: `GET/POST /api/agent/tasks`、`GET/PATCH/DELETE /api/agent/tasks/:id`、`POST /:id/run-now`、`GET /inbox`、`GET /inbox/unread-count`、`POST /inbox/:runId/read`
- 新组件: `AgentTaskDraftCard`、`AgentTasksPage`（含 Inbox Tab）、`agent-tasks.ts` API 客户端
- Lint: 改动的 4 个文件 0 新增 error（client-react 历史脏文件 48 errors 与本 Task 无关）
- 平台宪法遵守: 调度器只读 + 只推送；草稿卡必经确认；DRAFT 不直接写库
- 已知遗留: inbox 路由顺序（先于 /:id）是显式约定，新人需读代码注释
- 手动 §11 七条: 待用户验收

### Task 9 read-back（归档）

- 测试：149/149 · typecheck clean
- 组件：AgentPlanCard、AgentExecutionReportCard、AgentMarkdown
- SSE：forbidden、plan、report、navigate、tool_step
