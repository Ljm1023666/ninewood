# Ninewood（九木）

Windows 桌面优先的本地生活服务撮合平台：需求发布、发现匹配、担保交易、即时通讯与运营分析一体化。

- **前端**：React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Zustand + React Router 7
- **后端**：Express + Prisma + PostgreSQL + Socket.IO
- **桌面**：Electron（可选，与 Web 共用同一套前端）

> 历史 Vue 版本已归档；当前主开发线为 `client-react` + `server` 的 **pnpm workspace** monorepo。

---

## 功能概览

| 模块 | 说明 |
|------|------|
| 发现 / 卡池 | 星空发现页、标签筛选、3D 卡池与手牌桌面 |
| 需求与订单 | 发布需求、V2 两段式接单、点数担保支付、订单生命周期 |
| 消息与圈子 | 实时私信、群聊、兴趣圈子与圈内需求 |
| 认证与信用 | 实名/技能认证、信用分与抢单额度 |
| 市场分析 | 标签统计、活跃度图表、成交额排行、30 日平台走势（`/tag-stats`） |
| 管理后台 | 运营指标、用户/需求/争议管理（管理员 `/dashboard`） |
| AI 助手 | 自然语言问答、语义导航、需求搜索辅助（需配置 LLM，见 `docs/LLM-CONFIG.md`） |

应用内帮助：登录后访问 **帮助中心**（`/help`）或 **帮助文档**（`/help/docs`）。

---

## 环境要求

| 依赖 | 版本 / 说明 |
|------|-------------|
| Node.js | 20+ |
| pnpm | 9+（包管理与 workspace） |
| PostgreSQL | 18（连接串见 `server/.env.example`，默认端口 `5433`） |
| Redis | 可选（语义分类缓存等） |
| 语义分类器 | 可选（本地 `8001`，Agent 语义导航用） |
| 操作系统 | **Windows 10/11**（UI 按宽屏桌面设计，不做移动端适配） |

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置后端环境

```bash
cp server/.env.example server/.env
```

按需修改 `DATABASE_URL`、`JWT_SECRET`、LLM 相关变量。详见：

- `server/.env.example`
- [docs/LLM-CONFIG.md](docs/LLM-CONFIG.md)

### 3. 初始化数据库

```bash
pnpm --filter server run db:generate
pnpm --filter server run db:push
pnpm --filter server run db:seed
```

可选：同步本地图片资源（头像、封面、卡片图）

```bash
pnpm --filter server run assets:sync
pnpm --filter server run assets:assign
```

### 4. 启动开发环境

```bash
# 前后端并行（推荐）
pnpm run dev

# 仅后端 API
pnpm run dev:server

# 仅前端
pnpm run dev:client

# Electron 桌面壳 + 前后端
pnpm run dev:electron
```

### 5. 本地地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3080 |
| 后端 API | http://localhost:3001/api |
| Swagger | http://localhost:3001/api-docs |
| 上传静态 | http://localhost:3001/uploads |

前端通过 Vite 代理将 `/api`、`/uploads`、`/socket.io` 转发到 `3001`。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 前后端并行开发 |
| `pnpm run dev:electron` | Electron 开发模式 |
| `pnpm run build` | 构建 server + client |
| `pnpm run build:electron` | 构建 Windows 安装包 |
| `pnpm run typecheck` | 全仓 TypeScript 检查 |
| `pnpm --filter client-react run lint` | 前端 ESLint |
| `pnpm --filter client-react run test` | 前端单元测试（Vitest） |
| `pnpm --filter server run test` | 后端单元测试（Vitest） |

---

## 仓库结构

```text
ninewood/
├── client-react/          # React 前端 + Electron 壳
│   ├── src/               # 页面、组件、状态、API
│   ├── electron/          # 主进程与 preload
│   └── public/            # 静态资源
├── server/                # Express API
│   ├── src/routes/        # 路由
│   ├── src/services/      # 业务逻辑
│   └── prisma/            # Schema、种子数据
├── docs/                  # 工程与产品文档
├── scripts/               # 根级脚本（如 electron-dev）
├── archive/               # 历史归档（默认只读）
└── package.json           # pnpm workspace 入口
```

---

## 本地测试账号

种子数据默认密码：**`1`**

| 角色 | 手机号 | 说明 |
|------|--------|------|
| 管理员 | `13800000000` | 可访问管理后台 `/dashboard` |
| 普通用户 | `13901001002` | 设计师示例账号 |
| 更多用户 | `13901001003` … | 见 `server/prisma/seed.ts` |

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/README.md](docs/README.md) | 文档总索引 |
| [docs/DEVELOPMENT-GUIDE.md](docs/DEVELOPMENT-GUIDE.md) | 需求对照、实现状态、开发主线 |
| [docs/ENGINEERING_OVERVIEW.md](docs/ENGINEERING_OVERVIEW.md) | 工程现状、模块与约定 |
| [docs/LLM-CONFIG.md](docs/LLM-CONFIG.md) | 大模型提供商与 BYOK 配置 |
| [docs/FEATURE_SPECIFICATIONS.md](docs/FEATURE_SPECIFICATIONS.md) | 功能规格说明 |
| [client-react/README.md](client-react/README.md) | 前端专项说明 |
| 应用内 `/help/docs` | 用户向帮助文档（FAQ） |

---

## 开发约定

- **路径别名**：`@` → `client-react/src`
- **API 代理**：前端 `/api`、`/uploads`、`/socket.io` → `http://localhost:3001`
- **Electron IPC**：`domain:action`（如 `window:minimize`）
- **目标平台**：仅 Windows 桌面宽屏（≥1280px），请勿引入移动端断点、触摸事件或 PWA/Service Worker
- **协作规范**：见仓库根目录 [CLAUDE.md](CLAUDE.md)

### 变更验收（建议）

```bash
pnpm run typecheck
pnpm --filter client-react run lint   # 前端改动时
pnpm --filter server run test         # 后端改动时
pnpm --filter client-react run test   # 核心逻辑改动时
```

---

## 许可证

本项目为私有仓库。第三方依赖许可证可在应用内 **设置 → 法律 → 开源许可**（`/licenses`）查看。
