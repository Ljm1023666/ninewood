# Ninewood 发布说明（Release Notes）

> 自动生成于 2026-06-19 · 维护命令: `node scripts/sync-release-tags.mjs`
>
> **双轨阅读**：
> - **快照视角** — 本文 + `git tag -l`，每个 tag 是一个自认稳定的版本节点
> - **演进视角** — `git log <prev-tag>..<tag>` 查看两版本之间的原子提交

## 快速导航

| Tag | 层级 | 日期 | 标题 | 评级 |
|-----|------|------|------|------|
| [`snap/initial`](#snap-initial) | 预产品期（Pre-AI） | 2026-05-10 | 初始提交：九木平台 | — |
| [`snap/react-bootstrap`](#snap-react-bootstrap) | 预产品期（Pre-AI） | 2026-05-12 | React 客户端脚手架 | — |
| [`snap/electron-layout`](#snap-electron-layout) | 预产品期（Pre-AI） | 2026-05-13 | Electron 集成与布局居中 | — |
| [`snap/home-demand-ui`](#snap-home-demand-ui) | 预产品期（Pre-AI） | 2026-05-13 | 首页与需求 UI 优化 | — |
| [`snap/discover-search`](#snap-discover-search) | 预产品期（Pre-AI） | 2026-05-13 | 发现页搜索筛选与构建工具链 | — |
| [`snap/card-pool`](#snap-card-pool) | 预产品期（Pre-AI） | 2026-05-15 | 卡池系统与大技能库导入 | — |
| [`snap/react-only`](#snap-react-only) | 预产品期（Pre-AI） | 2026-05-15 | Vue 客户端归档清理 | — |
| [`snap/ui-tokens`](#snap-ui-tokens) | 预产品期（Pre-AI） | 2026-05-17 | 全项目 UI 修复与设计令牌 | — |
| [`v1.1`](#v1.1) | 产品快照（AI x.y / Home UI） | 2026-05-21 | V1.1 — 技能库与工程基座大合并 | B- |
| [`ai/1.0`](#ai-1.0) | 产品快照（AI x.y / Home UI） | 2026-05-21 | AI 1.0 — UI 组件与卡池 taxonomy 大扩展 | B |
| [`ai/1.1`](#ai-1.1) | 产品快照（AI x.y / Home UI） | 2026-05-21 | AI 1.1 — 需求工作区与 DemandCreate 重构 | B |
| [`ai/1.2`](#ai-1.2) | 产品快照（AI x.y / Home UI） | 2026-05-22 | AI 1.2 — 语义分类器初版 + Canvas 管理 | B |
| [`ai/1.3`](#ai-1.3) | 产品快照（AI x.y / Home UI） | 2026-05-22 | AI 1.3 — UI 组件 polish 与路由扩展 | B |
| [`ai/1.4`](#ai-1.4) | 产品快照（AI x.y / Home UI） | 2026-05-23 | AI 1.4 — CI/CD、Docker 与卡池开包动画 | B |
| [`ai/1.5`](#ai-1.5) | 产品快照（AI x.y / Home UI） | 2026-05-23 | AI 1.5 — 安全与流式推理 | A- |
| [`ai/1.6`](#ai-1.6) | 产品快照（AI x.y / Home UI） | 2026-05-23 | AI 1.6 — Agent 对话系统与服务层重构 | B- |
| [`ai/2.0`](#ai-2.0) | 产品快照（AI x.y / Home UI） | 2026-05-25 | AI 2.0 — hCaptcha 与云部署 | B |
| [`ai/2.2`](#ai-2.2) | 产品快照（AI x.y / Home UI） | 2026-05-25 | AI 2.2 — 活池/死池 + 标签系统 + 地域筛选 | C |
| [`ai/2.3`](#ai-2.3) | 产品快照（AI x.y / Home UI） | 2026-05-25 | AI 2.3 — 星空发现页 + 粒子首页 + 玻璃卡片 | C |
| [`ai/2.4`](#ai-2.4) | 产品快照（AI x.y / Home UI） | 2026-05-25 | AI 2.4 — 帮助文档重构 + 许可 + 发现页 | C+ |
| [`home-ui/v2`](#home-ui-v2) | 产品快照（AI x.y / Home UI） | 2026-05-26 | Home UI V2 — 首页/发现页合并 | B- |
| [`ai/2.5`](#ai-2.5) | 产品快照（AI x.y / Home UI） | 2026-05-27 | AI 2.5 — 管理后台 + 福利 + 交易 + 标签统计 | C+ |
| [`ai/3.0`](#ai-3.0) | 产品快照（AI x.y / Home UI） | 2026-05-27 | AI 3.0 — 语义分类器 + Agent 全功能重构 | B- |
| [`ai/3.0.1`](#ai-3.0.1) | 产品快照（AI x.y / Home UI） | 2026-05-27 | AI 3.0.1 — 卡池共享 + 需求发布 + 两段式接单 | B |
| [`ai/3.1.pro`](#ai-3.1.pro) | 产品快照（AI x.y / Home UI） | 2026-06-15 | AI 3.1.pro — 可读性 + 市场分析 SPA + Pro Shell | C |
| [`stage/1.1`](#stage-1.1) | 工程阶段（Stage x.y） | 2026-06-19 | Stage 1.1 — 认证者主动接单推送（完整） | A |

---

## 预产品期（Pre-AI）

### snap/initial

<a id="snap-initial"></a>

**初始提交：九木平台**


| 字段 | 值 |
|------|-----|
| Commit | `043d598` — 初始提交：九木平台 |
| 日期 | 2026-05-10 |
| 体量 | 114 files changed, 16574 insertions(+) |

**包含特性**

- Vue 3 + Electron 客户端雏形
- Express + Prisma 后端骨架
- 认证、需求、圈子、消息、订单 API 基础

**常用命令**

```bash
git checkout snap/initial
```

---

### snap/react-bootstrap

<a id="snap-react-bootstrap"></a>

**React 客户端脚手架**


| 字段 | 值 |
|------|-----|
| Commit | `dc5eaa3` — feat client-react and server updates |
| 日期 | 2026-05-12 |
| 体量 | 207 files changed, 19177 insertions(+), 7701 deletions(-) |

**包含特性**

- client-react 工作区初始化（Vite + React + TS）
- 保留 server 并扩展 API 层
- 引入 ui-design skill 与 MCP 配置

**自 `snap/initial` 以来的演进** (1 commits)

```
dc5eaa3 feat client-react and server updates
```

**常用命令**

```bash
git checkout snap/react-bootstrap
git log snap/initial..snap/react-bootstrap --oneline
git diff snap/initial snap/react-bootstrap --stat
```

---

### snap/electron-layout

<a id="snap-electron-layout"></a>

**Electron 集成与布局居中**


| 字段 | 值 |
|------|-----|
| Commit | `ac60ade` — feat: layout centering, profile/bio, demand card, electron, views |
| 日期 | 2026-05-13 |
| 体量 | 45 files changed, 2182 insertions(+), 2979 deletions(-) |

**包含特性**

- Electron main/preload 接入 client-react
- Layout 居中、Profile/Bio、Demand 卡片
- CertIntro、DemandDetail 等视图扩展

**自 `snap/react-bootstrap` 以来的演进** (1 commits)

```
ac60ade feat: layout centering, profile/bio, demand card, electron, views
```

**常用命令**

```bash
git checkout snap/electron-layout
git log snap/react-bootstrap..snap/electron-layout --oneline
git diff snap/react-bootstrap snap/electron-layout --stat
```

---

### snap/home-demand-ui

<a id="snap-home-demand-ui"></a>

**首页与需求 UI 优化**


| 字段 | 值 |
|------|-----|
| Commit | `481262b` — Improve layout, publish form centering, Home/Demand UI, server seed and demand service |
| 日期 | 2026-05-13 |
| 体量 | 13 files changed, 446 insertions(+), 175 deletions(-) |

**包含特性**

- Home / DemandCreate 布局与动效
- sparkles-text、theme-toggle 组件
- server seed 与 demand.service 调整

**自 `snap/electron-layout` 以来的演进** (1 commits)

```
481262b Improve layout, publish form centering, Home/Demand UI, server seed and demand service
```

**常用命令**

```bash
git checkout snap/home-demand-ui
git log snap/electron-layout..snap/home-demand-ui --oneline
git diff snap/electron-layout snap/home-demand-ui --stat
```

---

### snap/discover-search

<a id="snap-discover-search"></a>

**发现页搜索筛选与构建工具链**


| 字段 | 值 |
|------|-----|
| Commit | `f998e1e` — feat: 发现页搜索筛选与分页、Aceternity 按钮库、构建与样式修复 |
| 日期 | 2026-05-13 |
| 体量 | 122 files changed, 17558 insertions(+), 5003 deletions(-) |

**包含特性**

- 发现页搜索、筛选与分页
- Aceternity 按钮库与 sidebar 重构
- Husky / ESLint / Prettier 工程化基线

**自 `snap/home-demand-ui` 以来的演进** (1 commits)

```
f998e1e feat: 发现页搜索筛选与分页、Aceternity 按钮库、构建与样式修复
```

**常用命令**

```bash
git checkout snap/discover-search
git log snap/home-demand-ui..snap/discover-search --oneline
git diff snap/home-demand-ui snap/discover-search --stat
```

---

### snap/card-pool

<a id="snap-card-pool"></a>

**卡池系统与大技能库导入**


| 字段 | 值 |
|------|-----|
| Commit | `7c44fa0` — pool |
| 日期 | 2026-05-15 |
| 体量 | 303 files changed, 20218 insertions(+), 3442 deletions(-) |

**包含特性**

- CardPool 核心交互与 taxonomy
- Agent skills 批量导入（electron、express、prisma 等）
- Vue client 移入 archive/

**自 `snap/discover-search` 以来的演进** (1 commits)

```
7c44fa0 pool
```

**常用命令**

```bash
git checkout snap/card-pool
git log snap/discover-search..snap/card-pool --oneline
git diff snap/discover-search snap/card-pool --stat
```

---

### snap/react-only

<a id="snap-react-only"></a>

**Vue 客户端归档清理**


| 字段 | 值 |
|------|-----|
| Commit | `3aba25d` — there is no vue |
| 日期 | 2026-05-15 |
| 体量 | 222 files changed, 3268 insertions(+), 22580 deletions(-) |

**包含特性**

- 删除 archive/client-vue 残留
- 确认 React 为唯一前端栈（there is no vue）

**自 `snap/card-pool` 以来的演进** (1 commits)

```
3aba25d there is no vue
```

**常用命令**

```bash
git checkout snap/react-only
git log snap/card-pool..snap/react-only --oneline
git diff snap/card-pool snap/react-only --stat
```

---

### snap/ui-tokens

<a id="snap-ui-tokens"></a>

**全项目 UI 修复与设计令牌**


| 字段 | 值 |
|------|-----|
| Commit | `1dec134` — feat: 全项目 UI 修复 — z-index 令牌系统、焦点样式、对比度、加载反馈、交互动效 |
| 日期 | 2026-05-17 |
| 体量 | 66 files changed, 5039 insertions(+), 997 deletions(-) |

**包含特性**

- CSS z-index 分层令牌 (--z-base → --z-max)
- focus-visible 焦点环、浅色模式对比度修复
- prefers-reduced-motion、最小字号 11px
- Ninewood 设计系统文档持久化

**自 `snap/react-only` 以来的演进** (1 commits)

```
1dec134 feat: 全项目 UI 修复 — z-index 令牌系统、焦点样式、对比度、加载反馈、交互动效
```

**常用命令**

```bash
git checkout snap/ui-tokens
git log snap/react-only..snap/ui-tokens --oneline
git diff snap/react-only snap/ui-tokens --stat
```

---

## 产品快照（AI x.y / Home UI）

### v1.1

<a id="v1.1"></a>

**V1.1 — 技能库与工程基座大合并**


| 字段 | 值 |
|------|-----|
| Commit | `f7311e8` — V1.1 |
| 日期 | 2026-05-21 |
| 体量 | 1556 files changed, 210794 insertions(+), 1876 deletions(-) |
| 评级 | B- |

**包含特性**

- antfu / impeccable 等 Agent Skills 全量导入
- pnpm workspace 与 monorepo 结构定型
- CardPool、Demand、Discover 功能集齐的第一个大快照

**备注**

体量大；含大量第三方 skill 资产，适合作为「基线快照」而非细粒度 review 单元

**自 `snap/ui-tokens` 以来的演进** (1 commits)

```
f7311e8 V1.1
```

**常用命令**

```bash
git checkout v1.1
git log snap/ui-tokens..v1.1 --oneline
git diff snap/ui-tokens v1.1 --stat
```

---

### ai/1.0

<a id="ai-1.0"></a>

**AI 1.0 — UI 组件与卡池 taxonomy 大扩展**


| 字段 | 值 |
|------|-----|
| Commit | `3f2b935` — AI 1.0 |
| 日期 | 2026-05-21 |
| 体量 | 41 files changed, 19781 insertions(+), 1541 deletions(-) |
| 评级 | B |

**包含特性**

- liquid-glass-button、prompt-input-box、canvas-reveal-effect
- taxonomy 重构与 CardPool 交互增强
- theme store 重写、PageTransition 动画

**自 `v1.1` 以来的演进** (1 commits)

```
3f2b935 AI 1.0
```

**常用命令**

```bash
git checkout ai/1.0
git log v1.1..ai/1.0 --oneline
git diff v1.1 ai/1.0 --stat
```

---

### ai/1.1

<a id="ai-1.1"></a>

**AI 1.1 — 需求工作区与 DemandCreate 重构**


| 字段 | 值 |
|------|-----|
| Commit | `fef9fb2` — AI 1.1 |
| 日期 | 2026-05-21 |
| 体量 | 19 files changed, 5961 insertions(+), 1657 deletions(-) |
| 评级 | B |

**包含特性**

- WorkspaceFields / Summary / Tools 组件
- demand-workspace store 与 Discover 联动
- AI routes 大幅扩展（server/routes/ai.ts）

**自 `ai/1.0` 以来的演进** (1 commits)

```
fef9fb2 AI 1.1
```

**常用命令**

```bash
git checkout ai/1.1
git log ai/1.0..ai/1.1 --oneline
git diff ai/1.0 ai/1.1 --stat
```

---

### ai/1.2

<a id="ai-1.2"></a>

**AI 1.2 — 语义分类器初版 + Canvas 管理**


| 字段 | 值 |
|------|-----|
| Commit | `c9eb94b` — AI 1.2 |
| 日期 | 2026-05-22 |
| 体量 | 25 files changed, 3158 insertions(+), 608 deletions(-) |
| 评级 | B |

**包含特性**

- FAISS + BGE 语义分类器（server/classifier/）
- canvas-manager / canvas-modal / material-switch
- semantic-classifier 服务层

**自 `ai/1.1` 以来的演进** (1 commits)

```
c9eb94b AI 1.2
```

**常用命令**

```bash
git checkout ai/1.2
git log ai/1.1..ai/1.2 --oneline
git diff ai/1.1 ai/1.2 --stat
```

---

### ai/1.3

<a id="ai-1.3"></a>

**AI 1.3 — UI 组件 polish 与路由扩展**


| 字段 | 值 |
|------|-----|
| Commit | `a75b6fe` — AI 1.3 |
| 日期 | 2026-05-22 |
| 体量 | 46 files changed, 2086 insertions(+), 1249 deletions(-) |
| 评级 | B |

**包含特性**

- select、liquid-glass-button、message-bubble 等组件打磨
- DemandDiscoveryList 与 Workspace 微调
- router 新路由注册

**自 `ai/1.2` 以来的演进** (1 commits)

```
a75b6fe AI 1.3
```

**常用命令**

```bash
git checkout ai/1.3
git log ai/1.2..ai/1.3 --oneline
git diff ai/1.2 ai/1.3 --stat
```

---

### ai/1.4

<a id="ai-1.4"></a>

**AI 1.4 — CI/CD、Docker 与卡池开包动画**


| 字段 | 值 |
|------|-----|
| Commit | `42f7b62` — AI 1.4 |
| 日期 | 2026-05-23 |
| 体量 | 38 files changed, 9034 insertions(+), 3645 deletions(-) |
| 评级 | B |

**包含特性**

- GitHub Actions CI、docker-compose、DEPLOY.md
- PackOpeningAnimation、intro-animation
- REASONIX.md 设计文档、Help 测试

**自 `ai/1.3` 以来的演进** (1 commits)

```
42f7b62 AI 1.4
```

**常用命令**

```bash
git checkout ai/1.4
git log ai/1.3..ai/1.4 --oneline
git diff ai/1.3 ai/1.4 --stat
```

---

### ai/1.5

<a id="ai-1.5"></a>

**AI 1.5 — 安全与流式推理**


| 字段 | 值 |
|------|-----|
| Commit | `fb69c39` — AI 1.5 — SQL 注入修复 + 思考模式流式支持 + 设计债务清理 + 请求校验中间件 |
| 日期 | 2026-05-23 |
| 体量 | 7 files changed, 160 insertions(+), 113 deletions(-) |
| 评级 | A- |

**包含特性**

- SQL 注入修复
- 思考模式流式输出支持
- 请求校验中间件、设计债务清理

**备注**

小范围、聚焦安全，粒度良好

**自 `ai/1.4` 以来的演进** (1 commits)

```
fb69c39 AI 1.5 — SQL 注入修复 + 思考模式流式支持 + 设计债务清理 + 请求校验中间件
```

**常用命令**

```bash
git checkout ai/1.5
git log ai/1.4..ai/1.5 --oneline
git diff ai/1.4 ai/1.5 --stat
```

---

### ai/1.6

<a id="ai-1.6"></a>

**AI 1.6 — Agent 对话系统与服务层重构**


| 字段 | 值 |
|------|-----|
| Commit | `fdb181d` — AI 1.6 — Agent 对话系统 + AI 服务层重构 + Redis 集成 + Deposit 重构 + 安全增强 |
| 日期 | 2026-05-23 |
| 体量 | 112 files changed, 12222 insertions(+), 16471 deletions(-) |
| 评级 | B- |

**包含特性**

- Agent 对话全流程（executor、tool-registry）
- Redis 集成、Deposit 重构
- AI 服务层与安全增强

**自 `ai/1.5` 以来的演进** (1 commits)

```
fdb181d AI 1.6 — Agent 对话系统 + AI 服务层重构 + Redis 集成 + Deposit 重构 + 安全增强
```

**常用命令**

```bash
git checkout ai/1.6
git log ai/1.5..ai/1.6 --oneline
git diff ai/1.5 ai/1.6 --stat
```

---

### ai/2.0

<a id="ai-2.0"></a>

**AI 2.0 — hCaptcha 与云部署**


| 字段 | 值 |
|------|-----|
| Commit | `38d9f78` — AI 2.0 — hCaptcha 人机验证 + 云服务器部署 + pnpm 修复 + 语义分类器部署 |
| 日期 | 2026-05-25 |
| 体量 | 27 files changed, 1673 insertions(+), 697 deletions(-) |
| 评级 | B |

**包含特性**

- hCaptcha 人机验证
- 云服务器部署脚本与 pnpm 修复
- 语义分类器生产部署配置

**自 `ai/1.6` 以来的演进** (1 commits)

```
38d9f78 AI 2.0 — hCaptcha 人机验证 + 云服务器部署 + pnpm 修复 + 语义分类器部署
```

**常用命令**

```bash
git checkout ai/2.0
git log ai/1.6..ai/2.0 --oneline
git diff ai/1.6 ai/2.0 --stat
```

---

### ai/2.2

<a id="ai-2.2"></a>

**AI 2.2 — 活池/死池 + 标签系统 + 地域筛选**


| 字段 | 值 |
|------|-----|
| Commit | `ee12978` — AI 2.2 — 活池/死池 + 标签系统 + 地域筛选 + 语义分类器 + 种子数据 |
| 日期 | 2026-05-25 |
| 体量 | 90 files changed, 5407 insertions(+), 1481 deletions(-) |
| 评级 | C |

**包含特性**

- CardPool 活池/死池分流
- UserTag 标签系统与地域筛选
- 语义分类器集成、种子数据扩展

**备注**

5 个独立特性合并；14 张用户封面预设被清零（118KB→0）未在 message 说明

**自 `ai/2.0` 以来的演进** (1 commits)

```
ee12978 AI 2.2 — 活池/死池 + 标签系统 + 地域筛选 + 语义分类器 + 种子数据
```

**常用命令**

```bash
git checkout ai/2.2
git log ai/2.0..ai/2.2 --oneline
git diff ai/2.0 ai/2.2 --stat
```

---

### ai/2.3

<a id="ai-2.3"></a>

**AI 2.3 — 星空发现页 + 粒子首页 + 玻璃卡片**


| 字段 | 值 |
|------|-----|
| Commit | `f6b6c83` — AI 2.3 — 星空发现页 + 粒子首页 + 玻璃卡片 + 许可页面 + 帮助文档优化 |
| 日期 | 2026-05-25 |
| 体量 | 83 files changed, 8407 insertions(+), 1097 deletions(-) |
| 评级 | C |

**包含特性**

- 星空/粒子视觉首页与发现页
- 玻璃卡片 UI、许可页面
- 帮助文档优化、UI 组件库批量新增

**备注**

体量大；含 Discover.tmp 空文件未清理

**自 `ai/2.2` 以来的演进** (1 commits)

```
f6b6c83 AI 2.3 — 星空发现页 + 粒子首页 + 玻璃卡片 + 许可页面 + 帮助文档优化
```

**常用命令**

```bash
git checkout ai/2.3
git log ai/2.2..ai/2.3 --oneline
git diff ai/2.2 ai/2.3 --stat
```

---

### ai/2.4

<a id="ai-2.4"></a>

**AI 2.4 — 帮助文档重构 + 许可 + 发现页**


| 字段 | 值 |
|------|-----|
| Commit | `4697fa9` — AI 2.4 — 帮助文档重构 + 许可页面 + 发现页优化 |
| 日期 | 2026-05-25 |
| 体量 | 50 files changed, 3726 insertions(+), 420 deletions(-) |
| 评级 | C+ |

**包含特性**

- Help 文档结构重构
- Licenses 许可页面
- 发现页优化、theme store 重写（138 行）

**自 `ai/2.3` 以来的演进** (1 commits)

```
4697fa9 AI 2.4 — 帮助文档重构 + 许可页面 + 发现页优化
```

**常用命令**

```bash
git checkout ai/2.4
git log ai/2.3..ai/2.4 --oneline
git diff ai/2.3 ai/2.4 --stat
```

---

### home-ui/v2

<a id="home-ui-v2"></a>

**Home UI V2 — 首页/发现页合并**


| 字段 | 值 |
|------|-----|
| Commit | `86bb9ea` — Home UI V2 — 首页/发现页合并 + 星空背景优化 + UI质量提升 |
| 日期 | 2026-05-26 |
| 体量 | 40 files changed, 3703 insertions(+), 249 deletions(-) |
| 评级 | B- |

**包含特性**

- 首页与发现页合并为统一入口
- 星空背景优化、z-index 令牌延续
- prefers-reduced-motion 支持

**备注**

/discover → / 路由重定向，破坏性变更无迁移说明

**自 `ai/2.4` 以来的演进** (1 commits)

```
86bb9ea Home UI V2 — 首页/发现页合并 + 星空背景优化 + UI质量提升
```

**常用命令**

```bash
git checkout home-ui/v2
git log ai/2.4..home-ui/v2 --oneline
git diff ai/2.4 home-ui/v2 --stat
```

---

### ai/2.5

<a id="ai-2.5"></a>

**AI 2.5 — 管理后台 + 福利 + 交易 + 标签统计**


| 字段 | 值 |
|------|-----|
| Commit | `5441daf` — AI 2.5 — 管理后台 + 福利中心 + 交易系统 + 标签统计 + UI 组件库扩展 |
| 日期 | 2026-05-27 |
| 体量 | 104 files changed, 8425 insertions(+), 3140 deletions(-) |
| 评级 | C+ |

**包含特性**

- AdminDashboard 四 Tab（Overview/Users/Orders/System）
- WelfareCenter 福利中心、TransactionHistory 交易
- TagStatsDashboard、UI 组件库扩展

**备注**

5 个子系统单提交合并，理想情况应拆 5 个原子提交

**自 `home-ui/v2` 以来的演进** (1 commits)

```
5441daf AI 2.5 — 管理后台 + 福利中心 + 交易系统 + 标签统计 + UI 组件库扩展
```

**常用命令**

```bash
git checkout ai/2.5
git log home-ui/v2..ai/2.5 --oneline
git diff home-ui/v2 ai/2.5 --stat
```

---

### ai/3.0

<a id="ai-3.0"></a>

**AI 3.0 — 语义分类器 + Agent 全功能重构**


| 字段 | 值 |
|------|-----|
| Commit | `23e5c84` — AI 3.0: 语义分类器集成 + Agent 全功能重构 + 卡池修复 |
| 日期 | 2026-05-27 |
| 体量 | 48 files changed, 5551 insertions(+), 713 deletions(-) |
| 评级 | B- |

**包含特性**

- Python FAISS 语义分类服务深度集成
- agent/tools.ts 979 行重写
- CardPool 修复与 Agent 工具链完善

**自 `ai/2.5` 以来的演进** (1 commits)

```
23e5c84 AI 3.0: 语义分类器集成 + Agent 全功能重构 + 卡池修复
```

**常用命令**

```bash
git checkout ai/3.0
git log ai/2.5..ai/3.0 --oneline
git diff ai/2.5 ai/3.0 --stat
```

---

### ai/3.0.1

<a id="ai-3.0.1"></a>

**AI 3.0.1 — 卡池共享 + 需求发布 + 两段式接单**


| 字段 | 值 |
|------|-----|
| Commit | `01dcccf` — AI 3.0.1: 卡池共享组件重构 + 需求发布系统 + 两段式接单 + 标签状态机 |
| 日期 | 2026-05-27 |
| 体量 | 9 files changed, 475 insertions(+), 241 deletions(-) |
| 评级 | B |

**包含特性**

- useCardPoolShared Hook + CardPoolFooter 共享组件
- workspace expectedOutcome/visibilityWindow/maxApplicants
- 服务标签状态机 IDLE/BUSY/HIDDEN

**自 `ai/3.0` 以来的演进** (1 commits)

```
01dcccf AI 3.0.1: 卡池共享组件重构 + 需求发布系统 + 两段式接单 + 标签状态机
```

**常用命令**

```bash
git checkout ai/3.0.1
git log ai/3.0..ai/3.0.1 --oneline
git diff ai/3.0 ai/3.0.1 --stat
```

---

### ai/3.1.pro

<a id="ai-3.1.pro"></a>

**AI 3.1.pro — 可读性 + 市场分析 SPA + Pro Shell**


| 字段 | 值 |
|------|-----|
| Commit | `d995c7b` — AI 3.1.pro: 全局可读性、市场分析 SPA、设置 Pro 壳与项目文档 |
| 日期 | 2026-06-15 |
| 体量 | 115 files changed, 15694 insertions(+), 7600 deletions(-) |
| 评级 | C |

**包含特性**

- 全局字号行高提升、设置页账户区布局修复
- TagStatsDashboard SPA Tab 化 + tag-stats API
- InternalPageShell / Settings Pro 壳、根 README 与 LLM 文档

**备注**

UI/API/文档/脚本/配置五维混杂，回归风险高

**自 `ai/3.0.1` 以来的演进** (1 commits)

```
d995c7b AI 3.1.pro: 全局可读性、市场分析 SPA、设置 Pro 壳与项目文档
```

**常用命令**

```bash
git checkout ai/3.1.pro
git log ai/3.0.1..ai/3.1.pro --oneline
git diff ai/3.0.1 ai/3.1.pro --stat
```

---

## 工程阶段（Stage x.y）

### stage/1.1

<a id="stage-1.1"></a>

**Stage 1.1 — 认证者主动接单推送（完整）**


| 字段 | 值 |
|------|-----|
| Commit | `7c8817a` — test(push): strengthen auto-receive where assertions |
| 日期 | 2026-06-19 |
| 体量 | 4 files changed, 238 insertions(+), 4 deletions(-) |
| 评级 | A |
| 规格 | [`docs/specs/STAGE-1.1-auto-receive.md`](./specs/STAGE-1.1-auto-receive.md) |

**包含特性**

- push-engine autoReceiveOnly + triggerAutoReceivePush
- PATCH /api/user-tags/:tagName/auto-receive
- 12+ 测试用例含防回归断言（Test L）
- DEVELOPMENT-GUIDE / ACTION-PLAN 文档回写

**组成提交**

- 52561c1 feat(push): 实现
- b6ea2b5 docs: 文档回写
- 7c8817a test(push): 断言加强

**备注**

spec 驱动典范；当前 HEAD

**自 `ai/3.1.pro` 以来的演进** (3 commits)

```
7c8817a test(push): strengthen auto-receive where assertions
b6ea2b5 docs: 回写 Stage 1.1 落地状态
52561c1 feat(push): Stage 1.1 autoReceive 认证者主动接单推送
```

**常用命令**

```bash
git checkout stage/1.1
git log ai/3.1.pro..stage/1.1 --oneline
git diff ai/3.1.pro stage/1.1 --stat
```

---

## 阅读指南

| 你想… | 推荐做法 |
|-------|----------|
| 快速了解某版本做了什么 | 读对应 **tag** 小节 + `git show <tag>` |
| 看拆细后的演进历史 | `git log history/atomic --oneline`（约 65+ 原子提交） |
| 对比两个稳定版本 | `git diff ai/3.0 ai/3.1.pro --stat` |
| 定位回归引入点 | `git bisect` 用 **history/atomic** + tag 作 good/bad |
| 理解设计决策 | 优先读 `stage/*` 与 `docs/specs/` |
| 补充/修正快照 | 编辑 `scripts/release-milestones.mjs` 后重跑 sync 脚本 |
| 重建原子历史 | `node scripts/build-atomic-history.mjs`（需干净工作区） |

### 双分支模型

| 分支 | 视角 | 说明 |
|------|------|------|
| `master` | 稳定快照链 | 与 tag 一一对应，保持原 commit 不变 |
| `history/atomic` | 原子演进链 | 大里程碑拆成 feat/docs/chore 小提交，最终代码与 master 一致 |

```bash
# 快照视角（默认 log 不变，加 --decorate 看 tag）
git log --oneline --decorate -10

# 演进视角
git log history/atomic --oneline -20
git log ai/3.0..ai/3.1.pro --oneline   # tag 之间（master）
git log snap/ui-tokens..v1.1 --oneline -- history/atomic  # 原子链上同区间
```
