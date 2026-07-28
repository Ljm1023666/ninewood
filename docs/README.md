# Ninewood 文档索引（现行）

> 新会话先读仓库根目录 [`AGENTS.md`](../AGENTS.md)，再按需下钻。  
> **`docs/archive/` 为历史归档：所有 AI 工具默认勿读**（机读排除见根目录 [`.llmignore`](../.llmignore)；说明见 [archive/README.md](./archive/README.md)）。

## 现行文档

| 文档 | 读者 | 说明 |
|------|------|------|
| [DEVELOPMENT-GUIDE.md](./DEVELOPMENT-GUIDE.md) | 产品 / 开发 | **开发主线**：需求原文 §1 + 实现对照（取代旧 Roadmap） |
| [ENGINEERING_OVERVIEW.md](./ENGINEERING_OVERVIEW.md) | 开发者 | 仓库结构、技术栈、模块与端口 |
| [LLM-CONFIG.md](./LLM-CONFIG.md) | 开发 / 运维 | 大模型提供商、环境变量、BYOK |
| [MACOS-PUBLISH-PAGE-AI.md](./MACOS-PUBLISH-PAGE-AI.md) | macOS / 运维 | **发布页 AI**：业务逻辑、实现路径、公网 LLM 部署复刻 |
| [WINDOWS-CURSOR-CLOUD-ACCESS.md](./WINDOWS-CURSOR-CLOUD-ACCESS.md) | Windows Cursor | 云端 SSH / 生产机接入（与 macOS 同机） |
| [RELEASE-NOTES.md](./RELEASE-NOTES.md) | 开发 / 考古 | 稳定版本 tag 索引与发布说明 |
| [回的理念.md](./回的理念.md) | 产品 / 领域 | 自然回（天地人）产品准则原文 |
| [tax-visualizer.md](./tax-visualizer.md) | 功能说明 | 税务可视化页 |
| [thesis-mentor-qa.md](./thesis-mentor-qa.md) | 毕设 | 导师沟通材料（非工程规格） |

## 现行 ADR / 规格（`docs/specs/`）

| 文档 | 说明 |
|------|------|
| [DEMAND-SERVICE-CARD-ADR.md](./specs/DEMAND-SERVICE-CARD-ADR.md) | 需求卡 vs 服务卡边界、附件快照、经验聚合 |
| [NATURAL-LOOP-V2-ADR.md](./specs/NATURAL-LOOP-V2-ADR.md) | 自然回 V2：统一回中心与可验证运行（**现行**） |
| [ORDER-TRANSACTION-TRUST-ADR.md](./specs/ORDER-TRANSACTION-TRUST-ADR.md) | 交易可信度：部分完成双方确认、资金幂等与并发（**Accepted**） |
| [PRODUCT-TIME-SOVEREIGNTY-ENGINEERING-SPEC.md](./specs/PRODUCT-TIME-SOVEREIGNTY-ENGINEERING-SPEC.md) | 产品时间主权（**Accepted**；Phase 0–1B 已落地；Quiet/费用/度量仍待后续 Phase） |
| [PRODUCT-TIME-SOVEREIGNTY-REVIEW-CHECKLIST.md](./specs/PRODUCT-TIME-SOVEREIGNTY-REVIEW-CHECKLIST.md) | 时间主权 PR/设计评审勾选模板 |
| [PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE.md](./specs/PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE.md) | Phase 0 只读聚合基线（PushPreference/Short/Follow/CardPool/snatch） |
| [AGENT-COGNITIVE-MODEL.md](./specs/AGENT-COGNITIVE-MODEL.md) | Agent 四层认知与 Plan/Report |
| [AGENT-INTERACTION-RITUALS.md](./specs/AGENT-INTERACTION-RITUALS.md) | Agent 三仪式 UI |
| [AGENT-CAPABILITIES-YAML.md](./specs/AGENT-CAPABILITIES-YAML.md) | 能力矩阵 YAML 规范 |

## 用户向帮助（应用内）

| 入口 | 路径 | 数据源 |
|------|------|--------|
| 帮助中心 | `/help` | `client-react/src/views/Help.tsx` |
| 帮助文档 FAQ | `/help/docs` | `client-react/src/views/help-faq-data.ts` |

## AI 知识库（Agent 消费）

| 文件 | 说明 |
|------|------|
| `server/ai-knowledge/00-system.yaml` | 数据模型与枚举 |
| `server/ai-knowledge/01-business-rules.yaml` | 业务规则 |
| `server/ai-knowledge/02-help-knowledge.yaml` | FAQ + 操作步骤 |
| `server/ai-knowledge/03-agent-capabilities.yaml` | Agent 能力矩阵 |

## 历史归档

过期主线、冻结 handoff、已完成 Stage/Task、一次性报告 → [`docs/archive/`](./archive/README.md)。  
**不要**把 archive 内「当前 Task 10」「Roadmap API」「抢单缺竞标」等句子当现状。
