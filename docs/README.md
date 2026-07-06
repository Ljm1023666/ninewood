# Ninewood 文档索引

| 文档 | 读者 | 说明 |
|------|------|------|
| [../README.md](../README.md) | 全员 | 项目介绍、环境搭建、常用命令、测试账号 |
| [RELEASE-NOTES.md](./RELEASE-NOTES.md) | 开发 / 考古 | 全历史稳定版本 tag 索引与发布说明 |
| [ENGINEERING_OVERVIEW.md](./ENGINEERING_OVERVIEW.md) | 开发者 | 仓库结构、技术栈、模块划分 |
| [LLM-CONFIG.md](./LLM-CONFIG.md) | 开发者 / 运维 | 大模型提供商、环境变量、BYOK |
| [FEATURE_SPECIFICATIONS.md](./FEATURE_SPECIFICATIONS.md) | 产品 / 开发 | 功能规格与业务规则 |
| [ENGINEERING-ROADMAP.md](./ENGINEERING-ROADMAP.md) | 开发 | 工程路线图 |
| [CLAUDE-CODE-HANDOFF.md](./CLAUDE-CODE-HANDOFF.md) | Claude Code | 任务交接通道（**当前 Task 10**） |
| [CODEX-HANDOFF.md](./CODEX-HANDOFF.md) | — | 已迁移，见上 |
| [specs/FAKE-FEATURES-REPAIR-BACKLOG.md](./specs/FAKE-FEATURES-REPAIR-BACKLOG.md) | 执行员 | 虚假功能完整修复清单（27 项 · Wave P0–P4） |
| [specs/TASK-8-circle-hub-backend.md](./specs/TASK-8-circle-hub-backend.md) | 执行员 | 圈子 Hub 后端（已完成） |
| [specs/TASK-9-agent-executor.md](./specs/TASK-9-agent-executor.md) | 归档 | Agent 执行代理 Wave A–E（✅ 149/149） |
| [specs/TASK-10-agent-automation.md](./specs/TASK-10-agent-automation.md) | **Claude Code 当前** | Agent 自动化 Wave A–F |
| [specs/AGENT-COGNITIVE-MODEL.md](./specs/AGENT-COGNITIVE-MODEL.md) | 产品 / Agent 实现 | 四层认知流水线、Plan/Report 对象、意图×副作用决策 |
| [specs/AGENT-INTERACTION-RITUALS.md](./specs/AGENT-INTERACTION-RITUALS.md) | 产品 / 前端 | 三仪式状态机、Plan/Progress/Report UI 规格 |
| [specs/AGENT-CAPABILITIES-YAML.md](./specs/AGENT-CAPABILITIES-YAML.md) | Agent / 后端 | 能力矩阵 YAML 规范与 FAQ 迁移规则 |
| [REPORT-九木平台技术实现报告.md](./REPORT-九木平台技术实现报告.md) | 技术评审 | 实现报告 |

## 用户向帮助（应用内）

以下内容维护在代码中，修改后需重新构建前端：

| 入口 | 路径 | 数据源 |
|------|------|--------|
| 帮助中心（智能跳转） | `/help` | `client-react/src/views/Help.tsx` |
| 帮助文档（FAQ 全文） | `/help/docs` | `client-react/src/views/help-faq-data.ts` |

更新产品功能时，请同步修改 `help-faq-data.ts` 中对应 FAQ 条目，并在 `Help.tsx` 的页面注册表中核对跳转路径。

## AI 知识库（Agent 消费）

| 文件 | 说明 |
|------|------|
| `server/ai-knowledge/00-system.yaml` | 数据模型与枚举 |
| `server/ai-knowledge/01-business-rules.yaml` | 业务规则（rule id） |
| `server/ai-knowledge/02-help-knowledge.yaml` | FAQ + 手动操作步骤 |
| `server/ai-knowledge/03-agent-capabilities.yaml` | **Agent 能力矩阵 + 交付模板**（见 specs/AGENT-CAPABILITIES-YAML.md） |
