# AGENTS.md — 新会话快速上手

> 切换模型或新开会话时，**先读本文件**，再按需下钻。目标：2–5 分钟恢复项目语境，避免重复踩坑。

## 0. 开场必读（按顺序）

| 优先级 | 文件 | 用途 |
|--------|------|------|
| 1 | 本文件 `AGENTS.md` | 地图、硬约束、当前领域边界 |
| 2 | `.claude/memory/SESSION-ANCHOR.md` | **当前意图 / 已改文件 / 下一步**（会话交接态） |
| 3 | `.claude/memory/MEMORY.md` | 长期稳定约束与工作约定 |
| 4 | `.claude/memory/LEARNINGS.md` | 近期踩坑与可复用教训（读最新几条即可） |
| 5 | `CLAUDE.md` | 协作行为规范、DoD、Windows-only 细则 |

深度文档按需再读，不要一上来通读整个 `docs/`。

---

## 1. 项目一句话

**Ninewood（九木）**：Windows 桌面优先的本地生活服务撮合平台——需求发布、发现匹配、担保交易、即时通讯、认证信用、运营分析、AI 助手。

- 前端：`client-react/`（React 19 + Vite + Tailwind v4 + Zustand + React Router 7）
- 后端：`server/`（Express + Prisma + PostgreSQL + Socket.IO）
- 桌面：Electron（可选，与 Web 共用前端）
- 包管理：**pnpm** workspace（`server` + `client-react`）
- 历史 Vue 在 `archive/`，默认只读

---

## 2. 常用命令

```bash
pnpm install
pnpm run dev              # 前后端并行
pnpm run dev:electron     # 含 Electron
pnpm run typecheck
pnpm run lint -w client-react   # 或 pnpm --filter client-react run lint
pnpm --filter server run db:generate
```

- 本地 API：`http://localhost:3001`（Vite 代理 `/api`、`/uploads`、`/socket.io`）
- PostgreSQL 默认端口常为 **5433**（见 `server/.env.example`）
- Electron 启动优先用项目本地 CLI，避免 `npx electron` 二次下载失败

---

## 3. 硬约束（违反即错）

适用于 **所有 AI 工具**（Cursor / Claude Code / Codex / Gemini / Copilot / Windsurf / Cline / Aider / Roo / JetBrains AI 等），不只 Cursor。

1. **仅 Windows 桌面**：宽屏（≥1280px）；禁止移动断点、触摸事件、PWA/Service Worker、safe-area。
2. **外科手术式改动**：只改与请求直接相关的文件；不做顺手重构。
3. **前后端契约同步**：改 API 字段时同时改 `server` 路由/服务与 `client-react/src/api/`。
4. **`archive/`（代码）与 `docs/archive/**` 默认禁止读取/检索/引用**：仅用户明确要求考古时可打开；不要手改 `dist/` 等构建产物。
5. **未要求不要提交**；不要改 git config；不要 force push。
6. **全工具上下文隔离**：`.llmignore` 统一排除历史归档、会话残留、重复工具树、本地密钥/上传文件与临时生成物；经 `node scripts/sync-ai-ignores.mjs` 同步到各工具 ignore。Claude Code 另有 `.claude/settings.json` → `permissions.deny`；Copilot 另见 `.github/copilot-instructions.md`。

语言约定：对用户用中文；代码注释用中文；内部推理可用英文。

---

## 4. 目录速查

```
ninewood/
├── AGENTS.md                 # ← 你在这里
├── CLAUDE.md                 # 协作规范
├── README.md                 # 人类向快速开始
├── client-react/src/
│   ├── api/                  # Axios 封装
│   ├── views/                # 路由页面
│   ├── components/           # 按业务域分目录
│   ├── stores/               # Zustand
│   ├── router/index.tsx      # 路由表
│   └── styles/               # 页面级 CSS
├── server/src/
│   ├── routes/               # Express 路由
│   ├── services/             # 业务逻辑（含 loop/、service-card 等）
│   └── prisma/               # schema + migrations
├── docs/specs/               # 现行 ADR / Agent 规格
└── .claude/memory/           # AI 会话记忆（必读）
```

---

## 5. 当前领域地图（易混点）

### 5.1 需求卡 vs 服务卡

| 概念 | 模型 / 路由 | 含义 |
|------|-------------|------|
| 需求卡 | `Demand`，`/demands/*` | 需求侧发布与申请/订单合约 |
| 服务卡 | `ServiceCard`，`/service-cards/*`、`/my-service-cards` | 公开服务声明，独立生命周期 |
| 统一发布入口 | `/publish` | 选方向（需求卡 / 服务卡），再进工作区 |
| 统一检索 | `/search` + `card-search` API | 用 `resultType` 区分；身份偏好只影响排序 |
| 消息附件 | `CardAttachment` | 发送时快照；卡片后续编辑**不回写**历史消息 |
| 服务经验 | `ServiceCardEvidence` | 只聚合 `OrderStatus.COMPLETED`；不暴露客户身份/订单号/私信 |

权威说明：`docs/specs/DEMAND-SERVICE-CARD-ADR.md`

### 5.2 「回」能力体系（Natural Loop）

| 路由 | 含义 |
|------|------|
| `/loops` | **当前用户**的运行实例中心（`LoopRun`）；侧栏入口「回」 |
| `/loops/discover` | 需求者发现可执行地回 |
| `/loops/accept` | 服务者承接人回（路径检索） |
| `/services`、`/path-search` | 兼容入口（可重定向）；勿当作现行主叙事 |

- 天地人分区按 `LoopRun.loopKind` 展示；**查看/排序/调布局不改变** loop 类型。
- 用户运行能力必须写入 `LoopRun` 及开始/结果/失败事件，否则回中心无轨迹。
- 权威说明：`docs/回的理念.md` + `docs/specs/NATURAL-LOOP-V2-ADR.md` + `docs/specs/NATURAL-LOOP-V3-ADR.md`（旧 V1 ADR 已归档）

### 5.3 其他高频路由

- 发现 / 卡池：`/discover`、`/card-pool`
- 订单 / 钱包：`/orders`、`/wallet`、`/transactions`
- 消息：`/messages`
- 认证：`/cert-center`
- 管理后台：`/dashboard`（管理员）
- AI：`/agent`

---

## 6. 改代码时的默认检查清单

1. 读 `SESSION-ANCHOR.md`，确认是否与当前意图冲突。
2. 先定位：前端看 `views/` + `api/`；后端看 `routes/` + `services/`；数据看 `schema.prisma`。
3. 有契约变更 → 前后端一起改；有领域决策 → 查/补 `docs/specs/*-ADR.md`。
4. 验证：优先 `pnpm run typecheck`；前端改动做**定向 eslint**（全仓 lint 可能有既有错误）。
5. 会话结束（实质工作后）：更新 `SESSION-ANCHOR.md`；可复用教训追加 `LEARNINGS.md`；稳定长期约定才改 `MEMORY.md`。

---

## 7. 文档下钻索引

| 需要了解… | 去读 |
|-----------|------|
| 安装与启动 | `README.md` |
| 文档总索引 | `docs/README.md` |
| LLM / Agent 配置 | `docs/LLM-CONFIG.md` |
| 开发主线 / 需求原文 | `docs/DEVELOPMENT-GUIDE.md` |
| 工程现状 | `docs/ENGINEERING_OVERVIEW.md` |
| 需求卡+服务卡 | `docs/specs/DEMAND-SERVICE-CARD-ADR.md` |
| Natural Loop | `docs/回的理念.md`、`docs/specs/NATURAL-LOOP-V2-ADR.md`、`docs/specs/NATURAL-LOOP-V3-ADR.md` |

**禁止默认阅读**：`archive/**`、`docs/archive/**`（历史代码、Roadmap / 旧 handoff / 已完成 Stage·Task / 一次性报告），以及 `.workbuddy/memory/**`、`.agents/**`、`.reasonix/**` 等非现行上下文。仅用户明确要求考古时再打开。

---

## 8. 给新 Agent 的最短提示词（可复制）

```
先读 AGENTS.md 与 .claude/memory/SESSION-ANCHOR.md、MEMORY.md。
本仓库是 Ninewood（Windows 桌面 only，pnpm monorepo：client-react + server）。
改动保持外科手术式；API 契约前后端同步；不要做移动端适配。
不要读取 archive/ 或 docs/archive/，也不要读取 .workbuddy/memory、.agents、.reasonix（除非用户要求考古）。
完成实质工作后更新 SESSION-ANCHOR；可复用教训追加 LEARNINGS。
```
