# docs/archive — 历史文档（全 AI 工具勿作现行真相）

> **所有 AI 工具（Cursor / Claude Code / Codex / Gemini / Copilot / Windsurf / Cline / Aider 等）：默认不要打开本目录。**  
> 仅当用户明确要求「考古 / 追溯 / 对比旧设计」时再读。

这些文件保留 git 历史与追溯性，但**不再代表当前产品、工程或任务状态**。  
现行入口见仓库根目录 `AGENTS.md` 与 `docs/README.md`。

## 机读排除（不只 Cursor）

| 机制 | 作用 |
|------|------|
| `.llmignore` | **单一真相源**（gitignore 语法） |
| `node scripts/sync-ai-ignores.mjs` | 同步到各工具 ignore（见下） |
| `.claude/settings.json` → `permissions.deny` | Claude Code：禁止 Read/Edit/Write `docs/archive/**` |
| `AGENTS.md` §3 / `CLAUDE.md` / `.github/copilot-instructions.md` | 行为层硬约束（覆盖无 ignore 文件的工具） |

同步产物（勿手改；改 `.llmignore` 后重跑 sync）：  
`.cursorignore` · `.claudeignore` · `.codeiumignore` · `.aiexclude` · `.geminiignore` · `.aiderignore` · `.continueignore` · `.clineignore` · `.rooignore` · `.aiignore` · `.augmentignore` · `.repomixignore` · `.copilotignore`

> GitHub Copilot 企业「内容排除」仍可能需在 GitHub 网页配置；本仓已提供 `.copilotignore` + `copilot-instructions.md` 作双保险。

## 目录

| 子目录 | 内容 |
|--------|------|
| `engineering/` | 被取代的工程总览类文档（Roadmap、旧功能规格、一次性分析/报告） |
| `handoffs/` | 已冻结的 Task 调度通道与旧 ACTION-PLAN |
| `specs/` | 已完成 Stage/Task handoff、已 superseded 的 ADR、虚假功能修复清单 |
| `reports/` | 根目录散落的一次性评审报告 |
| `designs/` | 前端页面 Stitch 设计稿、风格变体、毕设演示截图及一次性拉取脚本 |

## 现行权威（对照）

| 主题 | 现行文档 |
|------|----------|
| 需求原文与实现对照 | `docs/DEVELOPMENT-GUIDE.md` |
| 工程结构与命令 | `docs/ENGINEERING_OVERVIEW.md`、`README.md` |
| 自然回 | `docs/回的理念.md` + `docs/specs/NATURAL-LOOP-V2-ADR.md` |
| 需求卡 / 服务卡 | `docs/specs/DEMAND-SERVICE-CARD-ADR.md` |
| Agent 认知与仪式 | `docs/specs/AGENT-*.md` |
| 会话交接 | `.claude/memory/SESSION-ANCHOR.md` |
