# Task 10 · Agent 自动化任务（Claude Code 执行）

> 状态: **v1.0 · 待 Claude Code 执行** · 创建: 2026-06-22  
> 入口: `docs/CLAUDE-CODE-HANDOFF.md` Task 10  
> 读者: **Claude Code 执行员**（Cursor/Brain **不写实现代码**，仅维护 spec）  
> 前置: Task 9 ✅（149/149 server + typecheck clean）  
> 权威设计（必读）:
> - `docs/specs/AGENT-COGNITIVE-MODEL.md` §P2 automate、§Phase 4
> - `docs/specs/AGENT-INTERACTION-RITUALS.md` §7
> - `server/ai-knowledge/03-agent-capabilities.yaml` → `schedule_demand_digest`

---

## 0. 产品定义

**自动化** = 用户用自然语言定义「定时筛选 + 推送摘要」的常驻任务。

示例：「每小时帮我筛出含『王者荣耀』标签的新需求，推到消息中心和 Agent 结果箱。」

### 0.1 平台宪法（不可违反）

| 规则 | 说明 |
|------|------|
| **只读 + 只推送** | 调度器**永不**调用写工具（create/apply/withdraw/pay 等） |
| **显式确认** | 创建任务必经 Task Draft Card 确认，不可静默创建 |
| **用户可控** | 随时暂停、编辑、删除；列表展示「下次运行时间」 |
| **频率下限** | 最小粒度 **每小时**（不做分钟级 cron） |
| **配额** | 每用户最多 **5** 个活跃任务；单次摘要最多 **10** 条结果 |

### 0.2 Brain 已拍板（无需再问用户）

| # | 决策 |
|---|------|
| 1 | **可扩展任务类型框架** — MVP 只实现 `DEMAND_DIGEST`，但用注册表，后续加类型不改调度器 |
| 2 | 频率：`HOURLY` \| `DAILY` \| `WEEKLY` + 固定时刻（`atHour`/`atMinute`；WEEKLY 加 `weekday`） |
| 3 | 双通道推送：`MESSAGE`（消息中心 SYSTEM 消息）+ `AGENT_INBOX`（`AgentTaskRun` 结果箱） |
| 4 | 创建入口：**对话优先** — 自然语言 → 草稿卡 → 确认；`/agent/tasks` **仅管理**（无手动新建表单） |
| 5 | Windows 桌面 only；不做 mobile 断点 |
| 6 | 禁止改 `DEVELOPMENT-GUIDE.md` §1 原文 |
| 7 | Commit：每 Wave 1 feat commit；Wave F 1 doc commit |
| 8 | 验证：基线 **149/149 不可回退** + `pnpm typecheck` + Wave E 后 lint |

---

## 1. 架构

```
用户：「每小时筛王者需求…」
    │ L1 intent: automate
    ▼
draft_automation_task 工具（side_effect: none）
    │ 解析 → 任务草稿
    ▼ SSE: task_draft
AgentTaskDraftCard（确认 / 修改 / 取消）
    │ 确认
    ▼ POST /api/agent/tasks
AgentTask 表（enabled, schedule, filters, nextRunAt, deliveryChannels）
    ▲
    │ 每 60s 扫描 nextRunAt <= now
agent-task-scheduler (cron)
    │ registry[type].run() — 只读查询
    ▼
AgentTaskRun 记录 + 双通道投递
    ├─ MESSAGE: prisma.message SYSTEM（前缀 [AGENT_TASK]）
    └─ AGENT_INBOX: AgentTaskRun 即数据源
/agent/tasks 管理页 + /agent 结果箱角标
```

---

## 2. 数据模型（Prisma migration）

### 2.1 AgentTask

```prisma
model AgentTask {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name             String
  type             String   // 注册表键；MVP: "DEMAND_DIGEST"
  enabled          Boolean  @default(true)
  frequency        String   // HOURLY | DAILY | WEEKLY
  atHour           Int?     // DAILY/WEEKLY: 0-23
  atMinute         Int      @default(0)
  weekday          Int?     // WEEKLY: 1-7 (周一=1)
  filters          Json     // 类型私有参数（见 §3.2）
  deliveryChannels Json     // ["MESSAGE","AGENT_INBOX"] — 用 Json 数组
  lastRunAt        DateTime?
  nextRunAt        DateTime
  lastSummary      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  runs             AgentTaskRun[]

  @@index([userId])
  @@index([enabled, nextRunAt])
}
```

在 `User` model 增加：`agentTasks AgentTask[]`

### 2.2 AgentTaskRun

```prisma
model AgentTaskRun {
  id          String    @id @default(uuid())
  taskId      String
  task        AgentTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  runAt       DateTime  @default(now())
  status      String    // SUCCESS | EMPTY | ERROR
  resultCount Int       @default(0)
  summary     String    // Markdown 摘要
  payload     Json?     // 结构化结果 [{ id, title, path, price, ... }]
  readAt      DateTime? // AGENT_INBOX 已读时间（null=未读）
  createdAt   DateTime  @default(now())

  @@index([taskId, runAt])
  @@index([taskId, readAt])
}
```

### 2.3 migration 命名

建议：`YYYYMMDDHHMMSS_add_agent_tasks`

---

## 3. 任务类型注册表

**文件**：`server/src/services/agent/task-types/index.ts`

```ts
export interface AgentTaskType {
  id: string
  label: string
  /** 自然语言草稿解析辅助（可选正则） */
  intentSignals: RegExp[]
  validateFilters(filters: unknown): { ok: boolean; error?: string }
  /** 只读执行；返回摘要与结构化 payload */
  run(userId: string, filters: Record<string, unknown>): Promise<{
    count: number
    summary: string
    payload: unknown[]
  }>
}
```

调度器、API、executor **只**通过 `getTaskType(id)` / `listTaskTypes()` 访问，禁止硬编码 `if (type === 'DEMAND_DIGEST')`。

### 3.1 MVP 类型：DEMAND_DIGEST

| 项 | 值 |
|---|---|
| id | `DEMAND_DIGEST` |
| label | 需求筛选摘要 |
| filters schema | 对齐 `search_demands` 白名单参数 |

**filters 允许字段**（与 `tools.ts` search_demands 一致）：

```ts
{
  keyword?: string
  category?: string
  serviceType?: 'ONLINE' | 'OFFLINE'
  cityCode?: string
  minPrice?: number
  maxPrice?: number
  tagName?: string
  limit?: number  // 默认 10，最大 10（硬顶）
  createdWithinHours?: number  // 可选：仅 N 小时内发布（调度器 where createdAt gte）
}
```

**run 实现**：复用 `search_demands` 查询逻辑（抽共享函数到 `server/src/services/agent/demand-search.ts` 或等价），**禁止**在 run 内调 LLM。

**summary 格式**（Markdown，供消息中心 + 结果箱渲染）：

```markdown
## 需求筛选摘要 · {taskName}

共找到 **{count}** 条匹配需求：

1. [标题](path) — ¥{price} · {category}
2. ...
```

无结果时：`status: EMPTY`，summary 为「本次未找到匹配需求，筛选条件：…」。

### 3.2 预留类型（本 Task 不实现 run，仅注册表占位可选）

- `PRICE_WATCH` — 注释 `// TODO Task 11+` 即可，勿实现

---

## 4. 调度器

**文件**：`server/src/cron/agent-task-scheduler.ts`

### 4.1 注册

在 `server/src/cron/index.ts` 的 `startAllCronJobs()` 中调用 `startAgentTaskScheduler()`（间隔 **60_000ms**）。

### 4.2 扫描逻辑

1. `findMany({ where: { enabled: true, nextRunAt: { lte: now } }, take: 20 })`
2. 对每个 task：
   - 幂等：若 `lastRunAt` 与当前 `nextRunAt` 同槽（±30s）已处理则 skip
   - `registry[type].run(userId, filters)`
   - 写 `AgentTaskRun`（status/count/summary/payload）
   - 若 `deliveryChannels` 含 `MESSAGE` → 发 SYSTEM 消息（见 §5）
   - 更新 `lastRunAt`, `lastSummary`, `nextRunAt = computeNextRunAt(task)`
3. 错误：catch 单条，写 `AgentTaskRun status: ERROR`，**不** disable 任务

### 4.3 nextRunAt 计算

**文件**：`server/src/services/agent/task-schedule.ts`

| frequency | 规则 |
|-----------|------|
| HOURLY | 下一整点 + atMinute（若已过则 +1h） |
| DAILY | 下一日 atHour:atMinute（本地时区 Asia/Shanghai 或服务器本地，与现有 cron 一致） |
| WEEKLY | 下一匹配 weekday 的 atHour:atMinute |

从**计划时刻**推算，非 `now + interval`，避免漂移。

---

## 5. 双通道投递

### 5.1 MESSAGE（消息中心）

参照 `server/src/cron/time-limit-reminder.ts`：

```ts
await prisma.message.create({
  data: {
    fromUserId: userId,
    toUserId: userId,
    type: 'SYSTEM',
    content: `[AGENT_TASK] ${summary}`,
  },
})
```

前缀 `[AGENT_TASK]` 用于前端识别（可选：消息列表特殊样式）。

### 5.2 AGENT_INBOX

`AgentTaskRun` 即收件箱条目；`readAt === null` 计未读。

角标 API：`GET /api/agent/tasks/inbox/unread-count`

---

## 6. API 契约

**路由文件**：`server/src/routes/agent-tasks.ts`（或扩展现有 `agent.ts` 子路由 `/tasks`）

挂载：`app.use('/api/agent/tasks', authMiddleware, agentTasksRouter)`

| 方法 | 路径 | Body / Query | 响应 |
|------|------|--------------|------|
| GET | `/` | — | `{ tasks: AgentTask[] }` 含 nextRunAt、enabled |
| POST | `/` | CreateTaskDto | 201 `{ task }`；超 5 个 → 400 |
| GET | `/:id` | — | `{ task, recentRuns?: AgentTaskRun[] }` |
| PATCH | `/:id` | 部分字段 | `{ task }` |
| DELETE | `/:id` | — | 204 |
| POST | `/:id/run-now` | — | `{ run: AgentTaskRun }` 立即执行+投递 |
| GET | `/inbox` | `?limit=20&offset=0` | `{ runs: AgentTaskRun[], total }` |
| GET | `/inbox/unread-count` | — | `{ count: number }` |
| POST | `/inbox/:runId/read` | — | 标记已读 |

**CreateTaskDto**：

```ts
{
  name: string
  type: 'DEMAND_DIGEST'
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'
  atHour?: number
  atMinute?: number
  weekday?: number
  filters: Record<string, unknown>
  deliveryChannels?: ('MESSAGE' | 'AGENT_INBOX')[]  // 默认两者
}
```

校验：filters 走 `registry[type].validateFilters`；频率字段合法性；用户任务数 ≤ 5。

---

## 7. Agent 集成（Wave D）

### 7.1 L1 automate 意图

在 `capability-matcher` 或 executor 入口：用户消息匹配 `每天|每周|每小时|定时|早上.*筛选|自动.*筛` → 不走 forbidden，优先 `draft_automation_task`。

更新 `03-agent-capabilities.yaml` 中 `schedule_demand_digest`：
- `tool: draft_automation_task`
- `intent_signals` 增加：`每小时, 自动筛, 定时任务`

### 7.2 工具 draft_automation_task

```ts
{
  name: 'draft_automation_task',
  description: '根据用户自然语言起草自动化任务（定时筛选+推送）。不直接创建，需用户确认。',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      type: { type: 'string', enum: ['DEMAND_DIGEST'] },
      frequency: { type: 'string', enum: ['HOURLY', 'DAILY', 'WEEKLY'] },
      atHour: { type: 'number' },
      atMinute: { type: 'number' },
      weekday: { type: 'number' },
      filters: { type: 'object' },
      deliveryChannels: { type: 'array', items: { type: 'string' } },
    },
    required: ['name', 'type', 'frequency', 'filters'],
  },
  requiresConfirmation: false,  // 侧 effect none；确认由 Task Draft Card 完成
}
```

handler：校验 filters → 返回草稿 JSON（**不写库**）。

### 7.3 SSE 事件 task_draft

```ts
send('task_draft', {
  draftId: string,       // uuid，确认时带回
  name, type, frequency, atHour, atMinute, weekday,
  filters,
  deliveryChannels,
  humanSchedule: string, // 如「每天 09:00」「每周一 09:00」「每小时 :00」
  humanFilters: string,  // 如「标签含王者荣耀，24小时内发布」
})
```

**不发** `report` 卡（side_effect none）；确认后由前端 `POST /api/agent/tasks`，再 SSE `report` 或跳转提示。

### 7.4 executor 集成点

- LLM 在 automate 意图下调用 `draft_automation_task`
- tool-runner 执行后 `ctx.send('task_draft', ...)`
- **不**进入写操作 plan 流

---

## 8. 前端（Wave E）

### 8.1 路由

在 `client-react/src/router/index.tsx` 增加：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/agent/tasks` | `AgentTasksPage` | 任务管理（列表+启停+编辑抽屉+删除+立即运行） |
| `/agent/inbox` | `AgentTaskInboxPage` 或 tasks 页 Tab | 结果箱 |

侧栏 `AgentChat.tsx`「自动化」按钮 → `navigate('/agent/tasks')`。

### 8.2 组件

| 组件 | 路径 | 规格 |
|------|------|------|
| `AgentTaskDraftCard` | `components/agent/agent-task-draft-card.tsx` | `AGENT-INTERACTION-RITUALS.md` §7 |
| `AgentTasksPage` | `views/agent/AgentTasksPage.tsx` | 表格/卡片列表；**无**「手动新建」主按钮（可从空态引导回 `/agent` 对话） |
| `AgentTaskInbox` | 可嵌在 tasks 页 Tab | 未读标记；Markdown 渲染复用 `AgentMarkdown` |

### 8.3 API 客户端

`client-react/src/api/agent-tasks.ts` — 对接 §6 全部端点。

### 8.4 AgentChat 事件

监听 `task_draft` SSE → 渲染 `AgentTaskDraftCard`；确认 → `createAgentTask(draft)` → toast + 可选 navigate `/agent/tasks`。

### 8.5 样式

复用 `agent-codex.css` 现有 tool/report 卡视觉；Windows 宽屏 only。

---

## 9. 执行顺序（Wave A → F）

```
Wave A  Prisma AgentTask + AgentTaskRun + migration + task-types 注册表 + DEMAND_DIGEST validateFilters
Wave B  demand-search 抽取 + DEMAND_DIGEST.run + task-schedule.computeNextRunAt + 单测
Wave C  agent-task-scheduler + MESSAGE 投递 + AgentTaskRun 写入 + cron 注册 + 单测
Wave D  /api/agent/tasks CRUD + run-now + inbox + 单测
Wave E  draft_automation_task + task_draft SSE + capability 更新 + executor 集成 + 单测
Wave F  前端路由/页面/草稿卡/侧栏 + lint + 文档 read-back
```

每 Wave 结束：`pnpm typecheck && pnpm --filter server test`  
Wave F 额外：`pnpm --filter client-react run lint`（仅改动的 agent 文件无新增 error）

---

## 10. 测试清单（server）

| 文件 | 覆盖 |
|------|------|
| `agent-task-schedule.test.ts` | HOURLY/DAILY/WEEKLY nextRunAt |
| `agent-task-types.test.ts` | DEMAND_DIGEST validateFilters + run（mock prisma） |
| `agent-task-scheduler.test.ts` | 扫描、幂等、ERROR 不 disable |
| `agent-tasks-api.test.ts` | CRUD、配额 5、run-now、inbox unread |

目标：server test **≥ 165**（在 149 基线 +16 以上）

---

## 11. 手动验收（Wave F）

| # | 操作 | 期望 |
|---|------|------|
| 1 | `/agent` 说「每小时筛含王者的需求，推到消息中心」 | Task Draft Card → 确认 → 任务创建 |
| 2 | `/agent/tasks` | 列表见任务、nextRunAt、启停开关 |
| 3 | 点「立即运行」 | 两通道收到摘要（消息中心 + 结果箱） |
| 4 | 暂停任务 | nextRunAt 不再触发（或 enabled=false） |
| 5 | 删除任务 | 调度器不再执行 |
| 6 | 创建第 6 个任务 | API 400 配额 |
| 7 | 侧栏「自动化」 | 跳转 `/agent/tasks` |

---

## 12. 明确不在本 Task

- Phase 3 批量 Scope 卡（`batch_withdraw_demands` UI）
- `PRICE_WATCH` 类型实现
- 分钟级 / cron 表达式 UI
- 列表页「手动新建」表单（对话优先）
- 移动端适配
- Electron 托盘通知（可后续）

---

## 13. 关键文件索引

```
server/prisma/schema.prisma
server/src/services/agent/task-types/
server/src/services/agent/task-schedule.ts
server/src/services/agent/demand-search.ts   # 从 tools.ts 抽取
server/src/cron/agent-task-scheduler.ts
server/src/routes/agent-tasks.ts
server/src/services/agent/tools.ts           # draft_automation_task
server/src/services/agent/executor.ts
server/ai-knowledge/03-agent-capabilities.yaml
client-react/src/views/agent/AgentTasksPage.tsx
client-react/src/components/agent/agent-task-draft-card.tsx
client-react/src/api/agent-tasks.ts
client-react/src/views/AgentChat.tsx
docs/specs/AGENT-INTERACTION-RITUALS.md §7
```

---

## 14. read-back 模板（Claude Code 完成后粘贴到 CLAUDE-CODE-HANDOFF）

```markdown
### Task 10 read-back
- migration: ???
- 测试: pnpm --filter server test → ??/??
- typecheck: clean / 否
- Wave A–F: 完成项
- 新 API: /api/agent/tasks/*
- 新组件: AgentTaskDraftCard, AgentTasksPage, ...
- 手动 1–7: 通过 / 未通过
- 已知遗留: ...
```
