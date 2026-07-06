# Agent 认知模型规格

> 状态: **v1.0** · 创建: 2026-06-21  
> 读者: 产品 / 前端 / 后端 / Agent 实现者  
> 关联: `AGENT-INTERACTION-RITUALS.md`、`AGENT-CAPABILITIES-YAML.md`、`server/ai-knowledge/03-agent-capabilities.yaml`

---

## 1. 目标

定义九木 AI 助手从「问答机器人」进化为「可信执行代理」时的**内部认知流水线**。  
用户每说一句话，Agent 不直接查 FAQ 返回答案，而按四层处理 + 两个横切模块决策。

---

## 2. 平台宪法（优先于所有层级）

以下原则在九木产品内**不可被 accessMode 覆盖**：

| 原则 | 含义 |
|------|------|
| **公开数据默认可读** | 公开需求、标签、用户公开资料、知识库等，Agent 可直接查询，无需用户逐条授权 |
| **读+跳转无需计划确认** | `search_*` / `get_*` / `list_*` / `read_knowledge` / `navigate_to` 可直接执行，但必须**执行直播**（步骤可见） |
| **写操作必须可验收** | 任何改变系统状态的操作，完成后必须交付 verification 链接，禁止仅在文字中声称「已完成」 |
| **禁区绝不执行** | 支付、注销、权限变更等 → 拒绝 + 跳转手动页面 |

与前端三档 accessMode 的关系见 §5。

---

## 3. 横切模块

### 3.1 副作用级别（Side-Effect Level）

与「意图类型」正交，决定是否需要计划确认：

| 级别 | 定义 | 示例 | 计划确认 |
|------|------|------|----------|
| `none` | 无状态变更 | 搜索需求、查详情、读知识库 | 否 |
| `navigate` | 仅切换页面 | `navigate_to`、打开 `/demands/:id` | 否 |
| `write_once` | 单次写 | 发需求、改昵称、申请接单 | 是（中低风险） |
| `write_batch` | 批量写 | 批量下架 | 是 + 范围评估 |
| `forbidden` | 禁区 | 支付、注销 | 拒绝 |

### 3.2 会话状态（Session Phase）

见 `AGENT-INTERACTION-RITUALS.md` 状态机。认知层输出应携带 `phase` 字段供 UI 渲染。

---

## 4. 四层认知流水线

```
用户 utterance
    │
    ▼
┌─────────────────┐
│ L1 意图定性      │  问 / 要 / 定时 / 批量 / 叫停
└────────┬────────┘
         ▼
┌─────────────────┐
│ L2 能力匹配      │  查 03-agent-capabilities + 01-business-rules
└────────┬────────┘
         ▼
┌─────────────────┐
│ L3 计划生成      │  实例化 Plan（来自 FAQ 模板或 capability）
└────────┬────────┘
         ▼
┌─────────────────┐
│ L4 执行与验收    │  逐步执行 → ExecutionReport
└─────────────────┘
```

### L1 意图定性

**判定规则**：动词锚点优先，不依赖关键词穷举。

| 优先级 | 意图 ID | 信号 | 路径 |
|--------|---------|------|------|
| P0 | `abort` | 停下 / 取消 / 不做了 | 中断 Plan → PartialReport |
| P1 | `forbidden` | 支付 / 注销 / 改权限 / 提现 | 拒绝，不进入 Plan |
| P2 | `automate` | 每天 / 每周 / 定时 / 当…时 | 任务创建模式（Phase 4） |
| P3 | `batch` | 所有 / 全部 / 批量 | 批处理 + 范围评估 |
| P4 | `execute` | 帮我 / 把 / 设置 / 发布 / 打开 | 执行路径 |
| P5 | `consult` | 怎么 / 如何 / 什么是 / 为什么 | 问答路径 |

**复合意图**：「搜 PPT 需求并打开第一个」= `execute` + 子序列 `[search, navigate]`，副作用 `none` + `navigate`，**跳过计划确认**。

**降级**：P5 且无匹配 capability → `read_knowledge` + FAQ operational steps（manual 步骤标注「需用户手动」）。

### L2 能力匹配

查 `03-agent-capabilities.yaml` 中 `capabilities[]`，匹配 `tool` 与 `intent_signals`。

| 匹配结果 | Agent 行为 |
|----------|-----------|
| 命中 + 规则通过 | 进入 L3 |
| 命中 + 规则失败 | 返回 `01-business-rules` 的 `error` + 修复建议 |
| 未命中 | 「暂时无法直接执行，要看手动步骤吗？」→ FAQ steps |
| 禁区 | 拒绝 + `forbidden.redirect` |

**能力等级映射**（产品五级 → 九木实现）：

| 产品等级 | capability.risk | accessMode 行为 |
|----------|-----------------|-----------------|
| 禁区 | `forbidden` | 任何模式拒绝 |
| 只读 | `read` | 三档均可直接执行 |
| 单次执行 | `low` / `medium` | approval：批准卡；full：直接执行 |
| 批量执行 | `high` | 必须范围列表 + 「确认全部」 |
| 自动化 | `automate` | 仅创建任务，Phase 4 |

### L3 计划生成

**Plan 对象**（逻辑结构，持久化可选）：

```typescript
interface Plan {
  id: string
  summary: string              // 用户可读一句话
  riskLevel: 'low' | 'medium' | 'high' | 'forbidden'
  sideEffect: SideEffectLevel
  requiresExplicitConfirm: boolean
  steps: PlanStep[]
  sourceCapabilityId?: string  // 03-agent-capabilities 中的 id
  sourceFaqId?: string         // 02-help-knowledge 中的 faq id
}

interface PlanStep {
  id: string
  ordinal: number
  label: string
  actionRef: string            // 如 tool:search_demands | manual:click-withdraw
  params: Record<string, unknown>
  preconditions: string[]        // rule id 列表
  executor: 'agent' | 'human'  // manual 步骤必须为 human
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  verificationPath?: string
}
```

**实例化规则**：

1. 从用户 utterance 抽取 params（标题、预算、关键词等）
2. 从 `plan_template`（FAQ id）或 capability 默认步骤生成 steps
3. 合并重复步骤；`human` 步骤在 Agent 路径中转为 `navigate_to` + 说明

**何时展示计划卡（仪式一）**：`requiresExplicitConfirm === true`，即 `sideEffect >= write_once`。

### L4 执行与验收

**ExecutionReport 对象**：

```typescript
interface ExecutionReport {
  planId: string
  status: 'completed' | 'partial' | 'failed' | 'aborted'
  summary: string
  steps: PlanStep[]            // 含最终 status
  verification?: {
    path: string
    label: string
  }
  rollback?: {
    hint: string
    utterance?: string         // 如「撤回需求 #12345」
    tool?: string
    withinMinutes?: number
  }
  operationLogId?: string      // Phase 2+ 操作日志
}
```

**验收规则**：

- 有 `verification.path` 时必须推送 `navigate` 事件或渲染可点击链接
- 禁止在 summary 文本中声称已打开/已创建，除非对应 step.status === `done` 且有 verification

---

## 5. 与 accessMode 的统一

| accessMode | L2 行为 | L3 确认 |
|------------|---------|---------|
| `readonly` | 仅 `risk: read` + navigate | 无写计划 |
| `approval`（默认） | 读/跳转直接；写 → 批准卡 | 写操作 Plan 公示 + 批准 |
| `full` | 全部 capability（非 forbidden） | 写操作可跳过批准，仍建议直播 |

---

## 6. 意图 × 副作用 决策表（快速查）

| 用户说法 | 意图 | 副作用 | 确认 | 典型工具链 |
|----------|------|--------|------|------------|
| 什么是发布需求 | consult | none | 否 | read_knowledge |
| 搜王者需求 | execute | none | 否 | search_demands |
| 搜 PPT 并打开第一个 | execute | navigate | 否 | search_demands → navigate_to |
| 帮我发需求 200 元 | execute | write_once | 是 | create_demand |
| 下架全部冻结需求 | batch | write_batch | 是+范围 | list_my_demands → withdraw×N |
| 每天 9 点筛需求 | automate | none* | 是 | 创建定时任务（Phase 4） |
| 帮我支付订单 | forbidden | forbidden | 拒绝 | navigate /payment/:id |

\* 自动化任务本身不写业务数据，仅查询+推送。

---

## 7. 与现有代码的映射（实现 checklist）

| 认知层 | 现有实现 | 待补齐 |
|--------|----------|--------|
| L1 | executor prompt + intent-classifier（L0 导航） | 统一 intent 枚举；batch/automate 检测 |
| L2 | tool-registry + 01-rules（部分） | 读 03-capabilities；统一 rule 校验入口 |
| L3 | 无 Plan 对象 | Plan 卡 UI；FAQ 模板实例化 |
| L4 | tool_step、navigate、approve-tool | ExecutionReport 卡；Plan 级进度条 |
| 知识 | read_knowledge + 02/03 yaml | delivery 模板驱动验收 |

---

## 8. 实施阶段

| 阶段 | 认知层交付 |
|------|-----------|
| MVP | L1 execute/consult 分流；L2 读 03；L4 tool_step + navigate + 简单 report |
| Phase 2 | L3 Plan 卡 + 批准；L2 全 rule 校验；操作日志 |
| Phase 3 | L1 batch；范围评估 |
| Phase 4 | L1 automate；任务 CRUD |

---

## 9. 参考文件

- `server/ai-knowledge/00-system.yaml` — 概念/数据模型
- `server/ai-knowledge/01-business-rules.yaml` — 约束规则 id
- `server/ai-knowledge/02-help-knowledge.yaml` — FAQ 与 plan 模板
- `server/ai-knowledge/03-agent-capabilities.yaml` — 能力与交付
- `server/src/services/agent/executor.ts` — 运行时入口
- `client-react/src/components/agent/agent-tool-call-card.tsx` — 步骤卡 UI 雏形
