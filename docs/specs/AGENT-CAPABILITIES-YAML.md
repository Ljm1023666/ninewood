# Agent 能力知识库 YAML 规格

> 状态: **v1.0** · 创建: 2026-06-21  
> 文件: `server/ai-knowledge/03-agent-capabilities.yaml`  
> 关联: `AGENT-COGNITIVE-MODEL.md`、`AGENT-INTERACTION-RITUALS.md`

---

## 1. 目的

将 `02-help-knowledge.yaml` 中偏「人类操作说明」的 FAQ，升级为 Agent 可执行的**能力矩阵 + 交付模板**。  
Agent 在 L2 能力匹配时优先读本文件；FAQ 仍负责概念解释与 manual 步骤。

---

## 2. 文件位置与加载

- 路径: `server/ai-knowledge/03-agent-capabilities.yaml`
- 加载: `knowledge-loader.ts` 自动扫描目录内所有 `.yaml`（无需改代码即可被索引）
- 检索: `read_knowledge` 工具按关键词命中；后续可增加 `match_capability(query)` 专用工具

**与现有文件分工**：

| 文件 | 层级 | 消费者 |
|------|------|--------|
| `00-system.yaml` | 概念（数据模型） | 校验、解释枚举 |
| `01-business-rules.yaml` | 约束 | L2 规则引擎 |
| `02-help-knowledge.yaml` | 概念 + manual 操作 | 咨询、降级 manual |
| `03-agent-capabilities.yaml` | 操作 + 交付 | L2/L3/L4 执行 |

---

## 3. 顶层结构

```yaml
meta:
  version: "1.0"
  platform_constitution: [...]   # 与认知模型 §2 一致

forbidden:                       # 禁区清单
  - id: payment
    signals: [支付, 付款, 转账]
    redirect: /payment/{orderId}
    message: "..."

capabilities:                    # 可执行能力
  - id: search_demands
    layer: operational
    tool: search_demands
    risk: read
    side_effect: none
    ...

delivery_templates:              # 可复用交付片段（可选）
  demand_detail_link:
    verification: ...
```

---

## 4. `capabilities[]` 字段规范

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 稳定标识，与业务语义一致 |
| `layer` | 是 | 固定 `operational` |
| `tool` | 否 | 绑 `tool-registry` 名；无 tool 则为 `manual_only` |
| `risk` | 是 | `read` \| `low` \| `medium` \| `high` \| `forbidden` |
| `side_effect` | 是 | `none` \| `navigate` \| `write_once` \| `write_batch` |
| `intent_signals` | 是 | 匹配用关键词/短语 |
| `plan_template` | 否 | 引用 `02-help-knowledge` 的 faq `id` |
| `rule_ids` | 否 | 引用 `01-business-rules` 的 rule `id` |
| `requires_confirm` | 是 | 是否仪式一 |
| `batchable` | 否 | 默认 false |
| `batch_limit` | 否 | 批量上限，默认 20 |
| `est_duration` | 否 | 预估耗时文案 |
| `delivery` | 是 | 见 §5 |
| `fallback_faq` | 否 | 无 tool 时降级 FAQ id |
| `notes` | 否 | 实现备注 |

---

## 5. `delivery` 字段规范

```yaml
delivery:
  summary_template: "找到 {count} 个相关需求"
  verification:
    path: "/demands/{id}"      # 支持 {id} {path} 等占位
    label: "查看需求详情"
  rollback:
    hint: "审核通过前可说「撤回需求 #{id}」"
    utterance: "撤回需求 {id}"
    tool: withdraw_demand
    within_minutes: null       # 或数字
  auto_navigate: false         # 为 true 时成功后发 navigate 事件
```

**模板占位符**：运行时由 Plan 执行结果注入。常用占位：

- `{id}` `{demandId}` `{orderId}` `{path}` `{count}` `{title}`

---

## 6. FAQ steps → capability 迁移规则

### 6.1 步骤分类

| FAQ step.action | executor | 迁移到 |
|-----------------|----------|--------|
| `navigate /path` | agent | capability.tool = navigate_to |
| `input field` | agent | 写工具 params（create_demand 等） |
| `submit` | agent | 写工具调用 |
| `click ...` | **human** | 不生成 agent step；改为 navigate + 说明 |
| 纯文字说明 | human | fallback_faq 引用 |

### 6.2 示例映射

| FAQ id | capability id | tool |
|--------|---------------|------|
| `how-to-publish` | `create_demand` | create_demand |
| `how-to-cancel` | `withdraw_demand` | withdraw_demand |
| — | `search_demands` | search_demands |
| — | `open_demand_detail` | navigate_to + get_demand_detail |

### 6.3 保留 FAQ 不删

迁移后 FAQ 仍服务：

- Help 文档页 `/help/docs`
- Agent 咨询意图（P5）
- manual 降级路径

---

## 7. MVP 能力清单（Phase 1–2）

本仓库 `03-agent-capabilities.yaml` 初版覆盖：

**Phase 1 — 只读 + 导航（无计划确认）**

- `search_demands`
- `get_demand_detail`
- `open_demand_detail`（navigate）
- `search_and_open_first`（复合意图说明）
- `navigate_page`
- `read_knowledge`
- `list_my_demands` / `list_my_orders` / `list_my_applications`

**Phase 2 — 写操作（计划 + 批准/确认）**

- `create_demand`
- `update_demand`
- `withdraw_demand`
- `apply_for_demand`
- `accept_applicant` / `reject_applicant`

**Phase 3 — 批量（待实现）**

- `batch_withdraw_demands`

**Phase 4 — 自动化（待实现）**

- `schedule_demand_digest`

---

## 8. 实现 checklist（后续编码任务）

- [ ] `matchCapability(utterance)` 服务读 03 yaml
- [ ] executor L2 调用 rule_ids 校验
- [ ] Plan 实例化读 plan_template
- [ ] 执行完渲染 delivery（Report Card）
- [ ] `auto_navigate: true` 的 capability 发 `navigate` SSE
- [ ] 操作日志表 + rollback tool 绑定

---

## 9. 变更流程

1. 新增/修改 capability → 更新 `03-agent-capabilities.yaml`
2. 若涉及业务规则 → 同步 `01-business-rules.yaml`
3. 若涉及用户可见步骤 → 同步 `02-help-knowledge.yaml` faq
4. 若涉及新 tool → 同步 `server/src/services/agent/tools.ts` + `AGENT_TOOL_LABELS`
5. 运行 `invalidateKnowledgeCache()` 或重启 dev server

---

## 10. 参考

- 运行时工具列表: `server/src/services/agent/tools.ts`
- 前端工具标签: `client-react/src/types/agent-access.ts` → `AGENT_TOOL_LABELS`
- 认知模型: `docs/specs/AGENT-COGNITIVE-MODEL.md`
