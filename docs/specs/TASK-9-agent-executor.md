# Task 9 · Agent 执行代理落地（Claude Code 执行）

> 状态: **v2.0 · Wave A–E 已完成** · 更新: 2026-06-22  
> 入口: `docs/CLAUDE-CODE-HANDOFF.md` · read-back 见该文档 §Task 9 read-back  
> 读者: **Claude Code 执行员**（Cursor/Brain **不写实现代码**，仅维护 spec）  
> 权威设计（必读）:
> - `docs/specs/AGENT-COGNITIVE-MODEL.md`
> - `docs/specs/AGENT-INTERACTION-RITUALS.md`
> - `docs/specs/AGENT-CAPABILITIES-YAML.md`
> - `server/ai-knowledge/03-agent-capabilities.yaml`

---

## 0. 背景

产品要求：AI 助手从「FAQ 问答」进化为**可信执行代理**——能读公开数据、跳转页面、代用户执行写操作，且过程可见、结果可验收。

Brain 已完成**设计规格 + 能力知识库初稿**；Cursor 已做**部分运行时补丁**（非完整落地）：

| 已有（勿推翻，可扩展） | 路径 |
|------------------------|------|
| Agent 对话页 | `client-react/src/views/AgentChat.tsx` |
| 三档 accessMode | `client-react/src/types/agent-access.ts` |
| 工具注册 + executor | `server/src/services/agent/` |
| 步骤卡 UI 雏形 | `client-react/src/components/agent/agent-tool-call-card.tsx` |
| 搜索→打开第一个 follow-up | `server/src/services/agent/follow-up-tools.ts` |
| 工具批处理 + navigate SSE | `server/src/services/agent/tool-runner.ts` |
| 待批准持久化（部分） | `server/src/services/agent/pending-tools.ts` |
| 知识库 00–03 yaml | `server/ai-knowledge/` |

**本 Task 目标**：按三份 Agent spec **完整实现** Wave A–E；Wave F/G 为 Phase 3/4 预留，**本 Task 不做**。

### 0.1 当前进度（从此续做）

仓库已有部分 Wave A 进度，**勿重写**，先修失败项再继续：

| 项 | 状态 |
|---|---|
| `server/src/services/agent/capability-matcher.ts` | ✅ 已创建（手写 YAML 解析） |
| `server/src/__tests__/agent-capability.test.ts` | **9/10 通过** |
| `executor.ts` 接入 `matchForbidden` | ✅ |
| **阻塞** | `delivery template is parsed` 失败 — `create_demand.delivery.summary_template` 为 `undefined` |

**Claude Code 第一步**：

```bash
pnpm --filter server test -- agent-capability
```

修通全部 10 条后，按 Wave B → E 顺序继续；Wave A 其余项（`forbidden` SSE、`AgentForbiddenCard`）若未做则补全。

---

## 1. Brain 决策（无需再问用户）

| # | 决策 |
|---|------|
| 1 | **平台宪法**见 `AGENT-COGNITIVE-MODEL.md` §2：公开数据默认可读；读+跳转无需计划确认；写操作必须 verification；禁区拒绝 |
| 2 | Windows 桌面 only；不做 mobile 断点 |
| 3 | 禁止改 `DEVELOPMENT-GUIDE.md` §1 原文 |
| 4 | 本 Task **不要求** Prisma 新表（操作日志 Wave E 可用 JSON 字段或延后）；若加表需 spec 增量 |
| 5 | Commit：功能 1 commit + 文档 1 commit（更新 CLAUDE-CODE-HANDOFF Task 9 ✅） |
| 6 | 验证：`pnpm typecheck` + `pnpm --filter server test`（基线 **84/84 不可回退**）+ 手动 `/agent` 场景 |

---

## 2. 明确不在本 Task 范围

- Phase 3 批量操作 UI（`AgentScopeCard`）— 仅预留 capability 条目，不实现
- Phase 4 自动化任务 CRUD + `/agent/tasks` 路由
- 改昵称 / 上传头像 / 背景图工具（MVP 原设计 Phase 1 低危写操作 — **下一 Task**）
- Help FAQ CMS
- 移动端 / PWA

---

## 3. 执行顺序（Claude Code Wave A → E）

```
Wave A  能力匹配层：读 03 yaml + matchCapability + forbidden 拒绝
Wave B  规则引擎：L2 执行前校验 01-business-rules rule_ids
Wave C  计划与仪式：Plan 卡 + 写操作确认；Report 卡 + delivery 模板
Wave D  执行循环：多轮 tool loop（MAX_CHAIN_DEPTH）；统一 navigate 事件
Wave E  测试 + read-back 文档
```

每 Wave 结束跑 `pnpm typecheck`；Wave E 跑全量 server test。

---

## Wave A · 能力匹配层

### A.1 新建服务

建议文件：`server/src/services/agent/capability-matcher.ts`

- 解析 `server/ai-knowledge/03-agent-capabilities.yaml`（可用 `js-yaml` 或手写轻量解析，与 knowledge-loader 路径一致）
- 导出：
  - `matchCapabilities(utterance: string): MatchedCapability[]`
  - `matchForbidden(utterance: string): ForbiddenHit | null`
  - `getCapabilityById(id: string)`
  - `getCapabilityByTool(toolName: string)`

### A.2 集成 executor

- L2：用户消息进入后，**先** `matchForbidden` → 命中则 SSE `forbidden` + 结束（不调用 LLM 写工具）
- 咨询意图仍走 LLM + `read_knowledge`
- 可选：将匹配到的 capability id 注入 system prompt 片段（轻量）

### A.3 SSE 事件（新增）

| 事件 | payload | 前端 |
|------|---------|------|
| `forbidden` | `{ message, redirect?, label? }` | `AgentForbiddenCard` |
| `plan` | Plan 对象 JSON | `AgentPlanCard`（Wave C） |
| `report` | ExecutionReport JSON | `AgentExecutionReportCard`（Wave C） |

`navigate` / `tool_step` / `tool_pending` 已有，保持兼容。

### A.4 DoD

- 用户说「帮我支付」→ forbidden 卡 + 跳转 orders/payment 提示，**不** create 工具
- `read_knowledge` 仍可查 03 文件内容（已被 knowledge-loader 索引）

---

## Wave B · 规则引擎

### B.1 新建服务

建议文件：`server/src/services/agent/rule-engine.ts`

- 读 `01-business-rules.yaml` 的 `rules_*` 条目
- 输入：`rule_ids[]` + `{ userId, ...context }`
- 输出：`{ ok: boolean, failedRuleId?, error? }`

**MVP 实现策略**（按 spec 允许简化）：

- 对 create_demand / apply_for_demand 等，至少实现：
  - `PUBLISH_REQUIRES_VERIFIED`
  - `PUBLISH_REQUIRES_NO_FROZEN`
  - `SELF_APPLY_FORBIDDEN`
- 其余 rule_id 可先 stub 为 pass，但在代码注释标明 TODO

### B.2 集成点

- `create_demand` / `apply_for_demand` 等写工具 **执行前**（含 approve-tool 路径）调用 rule_engine
- 失败时不执行工具，SSE `tool_result` success:false + 业务 error 文案

### B.3 DoD

- 未认证用户 Agent 代发需求 → 规则错误，非 500
- 单元测试 ≥ 3 条：`server/src/__tests__/agent-rules.test.ts`

---

## Wave C · 计划公示 + 交付验收（三仪式 UI）

### C.1 后端

- 写操作（`side_effect: write_once`，见 03 yaml）在 **执行工具前**：
  1. 构建 Plan（实例化 params，引用 `plan_template` faq id 可选）
  2. SSE `plan` 事件
  3. `phase: awaiting_confirm` — 等待用户确认（见 C.2）

- 用户确认后（新 API 或复用 approve 流）→ 进入 Executing

- 全部 Step 完成后：
  - 读 capability.delivery 模板，替换 `{id}` `{path}` `{count}` 等
  - SSE `report` 事件
  - `auto_navigate: true` 时额外 `navigate`

**新 API 建议**：

```
POST /api/agent/conversations/:id/confirm-plan
Body: { planId, confirmed: boolean, paramOverrides?: object }
```

持久化：Plan 可存 conversation metadata 或 assistant message JSON。

### C.2 前端组件（`client-react/src/components/agent/`）

| 组件 | 规格 |
|------|------|
| `AgentPlanCard` | `AGENT-INTERACTION-RITUALS.md` §3 |
| `AgentExecutionReportCard` | 同文档 §5 |
| `AgentForbiddenCard` | 同文档 §8.2 |
| `AgentPlanProgress` | 多步进度条（可选 Wave C 简化为 Step 卡数量） |

集成 `AgentChat.tsx`：

- 监听 `plan` / `report` / `forbidden` SSE
- 写操作：**先 Plan 卡**，确认后再出现 tool 执行卡
- 只读链：**无 Plan 卡**，保留 `AgentToolCallCard` + `navigate`

### C.3 与现有 approve-tool 关系

- **approval accessMode** + 写工具：
  - 目标态：Plan 确认 → 工具执行（full 模式跳过 Plan 批准但仍要 Report）
  - 过渡：保留 `tool_pending` 批准卡直至 Plan 流稳定；勿双重要求用户点两次（Plan 确认后 full 执行，approval 模式 Plan 确认 = 批准）

### C.4 DoD

- 「帮我发王者代练需求 200 元 3 天」→ Plan 卡 → 确认 → 直播 → Report 含 `/demands/:id` 链接
- 「搜 PPT 并打开第一个」→ **无** Plan 卡 → 2 步 tool 卡 → navigate → Report 含链接
- 总结文本**不得**在 navigate 前声称「已打开」

---

## Wave D · 多轮 Tool Loop

### D.1 问题

当前 executor 仅 **一轮** LLM tool call + `continueWithToolResults`（无 tools 的总结）。导致模型说「帮你打开」但未调用 `navigate_to`。

`follow-up-tools.ts` 仅覆盖「搜索并打开第一个」。

### D.2 要求

- 实现 **agent loop**（最多 `MAX_CHAIN_DEPTH = 3`）：
  1. LLM + tools → 执行 tools
  2. 将 tool_calls + tool results 按 OpenAI 格式 append 到 messages
  3. 再次 LLM + tools，直到无 tool_calls 或达 depth
- 最后一轮仅文本时流式输出，**替代**现有无 tools 的 `continueWithToolResults`（或仅在没有 loop 时 fallback）

### D.3 保留 follow-up

- `inferFollowUpTools` 作为 **deterministic 安全网**（搜索+打开第一个），在 loop 结束后若仍未 navigate 且意图匹配则补跑

### D.4 DoD

- 单测或集成测试：mock LLM 第二轮返回 navigate_to 时，前端收到 `navigate` 事件
- 手动：「搜 PPT 需求并打开第一个」稳定跳转（不依赖 follow-up 单独修复也能工作更佳）

---

## Wave E · 测试与 read-back

### E.1 测试

新增 `server/src/__tests__/agent-*.test.ts`：

| 文件 | 覆盖 |
|------|------|
| `agent-capability.test.ts` | matchForbidden, matchCapabilities |
| `agent-rules.test.ts` | 至少 3 条 business rules |
| `agent-follow-up.test.ts` | search_and_open_first 推断 |
| `agent-plan-delivery.test.ts` | delivery 模板占位符替换 |

目标：server test **≥ 90**（在 84 基线上 +6 以上）

### E.2 手动验收清单

| # | 操作 | 期望 |
|---|------|------|
| 1 | 什么是发布需求 | read_knowledge / 文字回答，无写 |
| 2 | 搜 PPT 并打开第一个 | 搜索 + 跳转详情页 |
| 3 | 帮我发需求（未认证账号） | 规则拒绝 |
| 4 | 帮我支付 | forbidden 卡 |
| 5 | approval 模式发需求 | Plan → 确认 → Report + 链接 |
| 6 | 刷新对话 | pending 批准仍可点（若仍有 tool_pending 路径） |

### E.3 文档

- 更新 `docs/CLAUDE-CODE-HANDOFF.md`：Task 9 ✅、测试数、关键文件列表
- **不要**改三份 Agent spec 的语义，仅可补「实现备注」小节

---

## 4. 关键文件索引

```
server/ai-knowledge/03-agent-capabilities.yaml
server/src/services/agent/executor.ts
server/src/services/agent/tool-runner.ts
server/src/services/agent/follow-up-tools.ts
server/src/services/agent/pending-tools.ts
server/src/services/agent/knowledge-loader.ts
server/src/routes/agent.ts
client-react/src/views/AgentChat.tsx
client-react/src/components/agent/
client-react/src/types/agent-tool-call.ts
docs/specs/AGENT-*.md
```

---

## 5. 常见陷阱

1. **双历史栈 / 子页导航** — Agent 页无关，勿改 `subpage-nav.ts` 除非必要  
2. **只读模式禁用全部 tools** — 已修复为仅禁写；勿回退  
3. **总结轮声称已执行** — 无 `navigate` / 无 Report 时禁止  
4. **Windows 路径** — 上传目录用项目既有 multer 惯例  
5. **03 yaml 与 tools.ts 不一致** — 改 capability 时同步 `AGENT_TOOL_LABELS`

---

## 6. read-back 模板（完成后粘贴到 CLAUDE-CODE-HANDOFF）

```markdown
### Task 9 read-back
- 测试: pnpm --filter server test → ??/??
- typecheck: clean / 否
- Wave A–E: 完成项列表
- 新 API: ...
- 新组件: AgentPlanCard, AgentExecutionReportCard, ...
- 手动: 1–6 通过 / 未通过项
- 已知遗留: ...
```
