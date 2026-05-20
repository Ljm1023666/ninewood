# Ninewood 工程文档（现状总览）

> 更新时间：2026-05-15  
> 仓库根目录：`e:/Ninewood`

## 1. 项目定位与现状

Ninewood 当前是一个 **Windows 桌面优先** 的全栈项目，技术路线为：

- 前端：`client-react`（React + TypeScript + Vite）
- 后端：`server`（Express + Prisma + PostgreSQL + Socket.IO）
- 桌面壳：Electron（主进程 + preload + 渲染层桥接）

历史 Vue 版本已从仓库移除（不再作为工作区参与构建）。

---

## 2. 仓库结构与职责

```text
e:/Ninewood
├─ client-react/              # 前端主应用（React）
│  ├─ src/                    # 页面、组件、store、api
│  ├─ electron/               # Electron 主进程与 preload
│  ├─ electron-builder.json   # 安装包配置（Windows NSIS）
│  └─ package.json
├─ server/                    # 后端 API 服务
│  ├─ src/                    # routes / services / middleware / cron
│  ├─ prisma/                 # schema、迁移、seed
│  └─ package.json
├─ scripts/                   # 根脚本（含 electron dev 启动器）
├─ docs/                      # 工程文档
└─ package.json               # npm workspaces 入口
```

---

## 3. Monorepo 与常用命令

根 `package.json` 使用 npm workspaces 管理 `server` 与 `client-react`。

### 3.1 开发命令

- 全栈开发：`npm run dev`
- Electron 开发：`npm run dev:electron`
- 仅后端：`npm run dev:server`
- 仅前端：`npm run dev:client`

### 3.2 构建命令

- 全量构建：`npm run build`
- Electron 安装包构建：`npm run build:electron`

### 3.3 质量命令

- 前端 lint：`npm run lint -w client-react`
- 前端测试：`npm run test -w client-react`
- 类型检查（全仓）：`npm run typecheck`

---

## 4. 前端工程说明（client-react）

### 4.1 技术栈

- React 19
- TypeScript 6
- Vite 8（开发端口 `5174`）
- Tailwind CSS v4
- Radix UI + 自定义 UI 组件
- Zustand（用户、聊天、主题等 store）
- React Router 7
- Axios

### 4.2 入口与路由

- 入口：`src/main.tsx` -> `src/App.tsx`
- 路由：`src/router/index.tsx`（`createBrowserRouter` + `AuthGuard`）
- 布局骨架：`src/components/layout/Layout.tsx`

### 4.3 关键业务模块（示例）

- 卡池：`src/views/CardPool.tsx`、`CardPoolResourceExplorer.tsx`
- 需求：`src/views/DemandCreate.tsx`、`DemandDetail.tsx`
- 圈子：`src/views/Circles.tsx`、`CircleDetail.tsx`
- 消息：`src/views/ChatDetail.tsx`、相关模板组件

---

## 5. 后端工程说明（server）

### 5.1 技术栈

- Express 4
- Prisma 6 + PostgreSQL
- Socket.IO
- Zod 校验
- JWT / bcrypt
- Multer 上传
- node-cron 定时任务

### 5.2 模块分层

- 路由：`src/routes/*.ts`
- 服务：`src/services/*.service.ts`
- 中间件：`src/middleware/*`
- 定时任务：`src/cron/*`
- Prisma 实体：`prisma/schema.prisma`

### 5.3 关键实体（Prisma）

包括并不限于：

- `User`
- `Demand`
- `Order`
- `Circle` / `CircleMember`
- `Message`
- `Follow`
- `Deposit`
- `Complaint`

---

## 6. Electron 集成现状

### 6.1 已完成

- 主进程：`client-react/electron/main.cjs`
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- 预加载桥：`client-react/electron/preload.cjs`
  - 暴露 `window.electronAPI`
  - 提供窗口控制能力（最小化/最大化/关闭）
- 渲染层接入：`src/components/layout/Layout.tsx`
  - Electron 环境显示窗口控制按钮
- 类型声明：`src/types/electron-api.d.ts`
- 打包配置：`client-react/electron-builder.json`

### 6.2 打包产物

- 命令：`npm run build:electron`
- 默认输出目录：`client-react/release/`
- 目标：Windows NSIS 安装包

---

## 7. 环境与代理约定

### 7.1 前端开发代理

`client-react/vite.config.ts` 将以下路径代理到后端：

- `/api`
- `/uploads`
- `/socket.io`

后端默认地址：`http://localhost:3001`

### 7.2 常见端口

- 前端 Vite：`5174`
- 后端 Express：`3001`

---

## 8. 代码质量与测试现状

### 8.1 当前优势

- TypeScript 已启用严格模式（`client-react/tsconfig.app.json`）
- ESLint + Prettier + lint-staged 已接入
- 前端关键可访问性与配置类高优先告警已做过一轮清理

### 8.2 当前短板

- 自动化测试用例数量仍偏少（Vitest 能力已具备，但覆盖率有提升空间）
- 部分页面仍有 UI 细节一致性优化空间（布局比例、交互统一）

---

## 9. 已知风险与建议

### 9.1 风险

- Electron 生产行为仍需持续收敛（开发便利设置不要进入发布态）
- 大体积目录（`node_modules`、`server/uploads`）容易导致仓库本地占用偏高
- 打包产物若误纳入版本库会膨胀历史

### 9.2 建议

- 在 `.gitignore` 中确保忽略 `client-react/release/`
- 增加基础回归测试（路由守卫、关键表单、核心业务流程）
- 增补“发布流程 Runbook”（从构建到安装包验收）

---

## 10. 快速排障清单

- 前端起不来：
  - 检查 `5174` 是否被占用
  - 检查 `client-react` 依赖是否完整
- 后端连不上：
  - 检查 `3001` 是否启动
  - 检查 Vite proxy 配置和后端 CORS/环境变量
- Electron 白屏：
  - 检查 preload 路径与主进程 loadURL/loadFile 逻辑
  - 检查前端构建输出 `client-react/dist/` 是否存在
- 安装包构建失败：
  - 检查 `electron-builder` 是否安装
  - 检查 `client-react/electron-builder.json` 中 files 与路径是否有效

---

## 11. 后续推荐路线（工程优先）

1. 增加关键路径测试（至少覆盖登录、发需求、卡池基础流程）  
2. 固化 Electron 发布流程（版本号、签名、安装验证）  
3. 继续收敛 UI 规范警告（无功能损失前提下逐步清理）  
4. 建立变更基线文档（每次大改都更新 `docs/`）

