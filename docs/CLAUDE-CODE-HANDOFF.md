# Claude Code 交接通道（Brain ↔ Claude Code）

> 维护者: Cursor 审核官（Brain）· 读者: **Claude Code 执行员**  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-21）

| 项 | 状态 |
|---|---|
| Git（本地） | Task 8 后端 + Agent 设计 spec + 部分 Cursor 补丁 |
| Server 测试 | 基线 **84/84**（`pnpm --filter server test`） |
| Typecheck | `pnpm typecheck` → clean |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.4** |
| **活跃 Task** | **Task 9 — Agent 执行代理** |

### 已合入里程碑

| Stage / Task | 交付 | 关键 commit / 测试 |
|---|---|---|
| **Task 6** | 虚假功能完整修复 | 75/75 |
| **Task 7 前端** | Hub 嵌套路由 + 5 子页 Stitch UI | Cursor 交付 |
| **Task 8** | Hub 后端 4 表 + 11 端点 + 5 子页接入 + 9 单测 | 84/84 + typecheck clean |
| **Task 9 设计** | Agent 认知/仪式/能力 YAML spec | Brain/Cursor **仅文档** |

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6
2. **禁止**：无 spec 扩 Stage 2；改 §1 原文；删表 migration
3. **Commit 纪律**：功能 1 commit + 文档 1 commit
4. **验证**：read-back 含全量 `pnpm --filter server test` + `pnpm typecheck`

---

## 🟢 当前状态：Task 9 — Wave A–E 完成，等待 Brain 验收

**用户指令（2026-06-21）**：Agent 执行代理按设计 spec **完整落地**；**Cursor 不做实现**。  
**Claude Code 进度（2026-06-22）**：Wave A → E 全部落地，server 119/119 + typecheck clean。

| 项 | 路径 |
|---|---|
| **规格（必读）** | `docs/specs/TASK-9-agent-executor.md` |
| 认知模型 | `docs/specs/AGENT-COGNITIVE-MODEL.md` |
| 交互仪式 | `docs/specs/AGENT-INTERACTION-RITUALS.md` |
| 能力 YAML 规范 | `docs/specs/AGENT-CAPABILITIES-YAML.md` |
| 能力知识库 | `server/ai-knowledge/03-agent-capabilities.yaml` |
| 运行时入口 | `server/src/services/agent/executor.ts`、`client-react/src/views/AgentChat.tsx` |

### 仓库已有（勿推翻，在其上扩展）

- `follow-up-tools.ts` / `tool-runner.ts` — 搜索→打开第一个、`navigate` SSE
- `agent-tool-call-card.tsx` — 步骤卡 UI
- `pending-tools.ts` — 批准持久化（部分）
- 三份 Agent spec + `03-agent-capabilities.yaml`
- **Wave A 部分进度（已修）**：
  - `capability-matcher.ts` delivery 解析修复 → 10/10 ✅
  - `executor.ts` 接入 forbidden SSE ✅

### 验证命令（每 Wave + 全文）

```bash
pnpm typecheck
pnpm --filter server test
pnpm run lint -w client-react   # Wave C 后
```

手动：`/agent` 见 `TASK-9-agent-executor.md` §Wave E 清单（搜并打开、发需求、支付禁区等）。

---

## 📦 归档：Task 8 — Hub 后端（已完成）

| 项 | 路径 |
|---|---|
| 规格 | `docs/specs/TASK-8-circle-hub-backend.md` |
| 状态 | ✅ 84/84 + typecheck clean |

---

## ✅ 已完成任务队列

| # | 任务 | Brain |
|---|---|---|
| 6 | 虚假功能修复 | ✅ |
| 7-fe | Hub 子页前端 + 嵌套路由 | ✅ Cursor |
| 8 | Hub 后端 + 联调 | ✅ |
| 9-design | Agent spec + 03 yaml | ✅ Brain/Cursor |
| 9 | Agent 执行代理 Wave A–E | ✅ **完成**（119/119 server + typecheck clean） |

---

## 候选 backlog（Task 9 之后）

| 项 | 说明 |
|---|---|
| Task 9+ | 低危写操作：改昵称、上传头像/背景 |
| Task 9 Phase 3 | 批量操作 Scope 卡 |
| Task 9 Phase 4 | 自动化任务 `/agent/tasks` |
| Stage 2 公开圈 | D4 后置 |
| Help FAQ CMS | P2 |

---

## 下一任务（Brain 填写）

- **当前**：执行 `TASK-9-agent-executor.md` — **先收尾 Wave A**，再 Wave B → E
- **完成后**：Brain 审 read-back（测试数、Plan/Report 卡、手动 6 条）
- **Cursor 不做**：Task 9 实现代码；仅维护 spec

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-21 | v1：Task 9 交接通道（自 `CODEX-HANDOFF.md` 迁移） |
| 2026-06-22 | v2：Task 9 Wave A–E 落地（119/119 server + typecheck clean） |

### Task 9 read-back（Wave A–E）

- 测试：`pnpm --filter server test` → **119/119**（基线 84 + Wave A 10 + Wave B 11 + Wave C 6 + Wave D 8）
- typecheck：`pnpm typecheck` → **clean**
- Wave A：能力匹配层（capability-matcher delivery 解析修复 + executor forbidden SSE）
- Wave B：规则引擎（rule-engine.ts 实现 3 条 MVP 规则 + 11 单测；create_demand / apply_for_demand 前置校验）
- Wave C：仪式二（plan SSE + AgentPlanCard）与仪式三（report SSE + AgentExecutionReportCard + delivery 模板替换）
- Wave D：多轮 tool loop（executor runAgentRound + while (depth ≤ MAX_CHAIN_DEPTH=3) + 保留 follow-up 首轮安全网）
- Wave E：read-back 本节；手动 1–6 待 Brain 验收
- 新 SSE：`forbidden`、`plan`、`report`
- 新组件：`AgentPlanCard`、`AgentExecutionReportCard`、扩展 `AgentForbiddenCard`
- 已知遗留：approval 模式下 Plan 卡与 tool_pending 批准卡并存（同一 toolCallId，UI 双卡）；后续 Phase 2 可收敛到单一批准点
- 新依赖：无；仅用项目已有 js-yaml / prisma / React / Tailwind
