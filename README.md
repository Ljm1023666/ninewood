# Ninewood（九木）

Windows 桌面优先的本地生活服务撮合平台：需求发布、发现匹配、担保交易、即时通讯与运营分析一体化。

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand
- **后端**：Express + Prisma + PostgreSQL + Socket.IO
- **桌面**：Electron（可选，与 Web 共用同一套前端）

> 历史 Vue 版本已归档，当前主开发线为本仓库的 `client-react` + `server` monorepo。

---

## 功能概览

| 模块 | 说明 |
|------|------|
| 发现 / 卡池 | 星空发现页、标签筛选、分类卡池与手牌桌面 |
| 需求与订单 | 发布需求、两段式接单、担保支付、订单生命周期 |
| 消息与圈子 | 实时私信、群聊、兴趣圈子与圈内需求 |
| 认证与信用 | 实名/技能认证、信用分与抢单额度 |
| 市场分析 | 标签维度统计、活跃度图表、热门标签排行（`/tag-stats`） |
| 管理后台 | 运营指标、用户/需求管理（管理员） |
| AI 助手 | 自然语言问答、需求搜索辅助（需配置 LLM，见 `docs/LLM-CONFIG.md`） |

应用内帮助：登录后访问 **帮助中心**（`/help`）或 **帮助文档**（`/help/docs`）。

---

## 环境要求

- **Node.js** 20+
- **pnpm** 9+（包管理）
- **PostgreSQL** 18（本地开发默认端口见 `server/.env.example`）
- **Redis**（可选，语义分类缓存）
- **Windows 10/11**（当前 UI 按宽屏桌面设计，不做移动端适配）

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

按需修改 `DATABASE_URL`、`JWT_SECRET` 等。数据库与 LLM 详细说明见：

- `server/.env.example`
- `docs/LLM-CONFIG.md`

### 3. 初始化数据库

```bash
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

# 仅后端 API（http://localhost:3001）
pnpm run dev:server

# 仅前端（http://localhost:5174）
pnpm run dev:client

# Electron 桌面壳 + 前后端
pnpm run dev:electron
```

浏览器访问：**http://localhost:5174**

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 前后端并行开发 |
| `pnpm run dev:electron` | Electron 开发模式 |
| `pnpm run build` | 构建 server + client |
| `pnpm run build:electron` | 构建 Windows 安装包 |
| `pnpm run typecheck` | 全仓 TypeScript 检查 |
| `pnpm run lint -w client-react` | 前端 ESLint |
| `pnpm run test -w client-react` | 前端单元测试 |

---

## 仓库结构

```text
ninewood/
├── client-react/          # React 前端 + Electron 壳
│   ├── src/               # 页面、组件、状态、API
│   ├── electron/          # 主进程与 preload
│   └── public/            # 静态资源、PWA manifest
├── server/                # Express API
│   ├── src/routes/        # 路由
│   ├── src/services/      # 业务逻辑
│   └── prisma/            # Schema、种子数据
├── docs/                  # 工程与配置文档
├── scripts/               # 根级脚本（如 electron-dev）
└── package.json           # pnpm workspace 入口
```

---

## 本地测试账号

种子数据默认密码：**`1`**

| 角色 | 手机号 | 说明 |
|------|--------|------|
| 管理员 | `13901001001` | 可访问管理后台 `/dashboard` |
| 普通用户 | `13901001002` | 设计师示例账号 |
| 更多用户 | `13901001003` … | 见 `server/prisma/seed.ts` |

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/ENGINEERING_OVERVIEW.md](docs/ENGINEERING_OVERVIEW.md) | 工程现状、模块与约定 |
| [docs/LLM-CONFIG.md](docs/LLM-CONFIG.md) | 大模型提供商与 BYOK 配置 |
| [docs/FEATURE_SPECIFICATIONS.md](docs/FEATURE_SPECIFICATIONS.md) | 功能规格说明 |
| [client-react/README.md](client-react/README.md) | 前端专项说明 |
| 应用内 `/help/docs` | 用户向帮助文档（FAQ） |

---

## 开发约定

- 路径别名：`@` → `client-react/src`
- API 代理：前端 `/api`、`/uploads`、`/socket.io` → `http://localhost:3001`
- IPC 通道：`domain:action`（如 `window:minimize`）
- 目标平台：**仅 Windows 桌面宽屏**，请勿引入移动端断点或触摸专用交互

更完整的协作规范见仓库根目录 `CLAUDE.md`。

---

## 许可证

本项目为私有仓库。第三方依赖许可证可在应用内 **设置 → 法律 → 开源许可**（`/licenses`）查看。
