# Ninewood 项目分析报告

分析日期：2026-06-22
分析范围：`D:\ninewood`（用户选定目录，工作区名为 `ninewood`）
分析方式：静态扫描（package.json / 目录结构 / 配置文件），未运行代码

---

## 1. 一句话定位

Windows 桌面优先的本地生活服务撮合平台「九木」。前端 React 19 + Vite + Tailwind v4 + Electron，后端 Express + Prisma + PostgreSQL + Socket.IO，pnpm workspace 双包结构。功能涵盖需求发布、卡池发现、担保交易、即时通讯、圈子、认证、市场分析、管理后台、AI 助手。

---

## 2. 仓库顶层结构

```
ninewood/
├── client-react/      # 前端 + Electron 壳（主开发线）
├── server/            # Express API（主开发线）
├── docs/              # 工程文档（11 个 .md）
├── scripts/           # 根级工具脚本（Electron 启动、网络修复、发布里程碑等）
├── archive/           # 历史归档（默认只读）
│   ├── client-vue/        # 已废弃的 Vue 版本
│   ├── demo-components-unused/
│   └── onlook/            # onlook 工具备份
├── assets/            # 仓库级静态资源
├── tools/             # 空目录
├── .agents/  .reasonix/  .impeccable/  .codex-logs/   # 各 AI 工具配置
└── 根级散落文件        # ⚠️ 见第 7 节
```

文档总索引 5756 行，主要文档：

| 文档 | 行数 | 用途 |
|------|------|------|
| `README.md` | 188 | 项目门面、快速开始 |
| `CLAUDE.md` | 248 | 协作规范（Windows-only、移动端禁入等硬约束） |
| `DEVELOPMENT-GUIDE.md` | 383 | 需求对照、实现状态 |
| `ENGINEERING-ROADMAP.md` | 1207 | 工程路线图 |
| `ENGINEERING_OVERVIEW.md` | 222 | 工程现状总览 |
| `FEATURE_SPECIFICATIONS.md` | 277 | 功能规格 |
| `LLM-CONFIG.md` | 176 | 大模型配置 |
| `RELEASE-NOTES.md` | 1037 | 发布说明 |
| `REPORT-九木平台技术实现报告.md` | 478 | 技术实现报告 |
| `DESIGN.md` | 554 | 设计文档 |
| `REASONIX.md` | 808 | 推理/AI 相关 |

---

## 3. Monorepo 与工具链

- 包管理：pnpm workspace（`pnpm-workspace.yaml` 声明 `server` 和 `client-react` 两个 package）
- 并发执行：`concurrently`（根 `dev`/`dev:electron` 脚本）
- TypeScript：`server` 用 5.7，`client-react` 用 6.0（⚠️ 版本号异常，见第 6 节）
- 构建：`server` 用 `tsc`，`client-react` 用 `tsc -b && vite build`
- Electron 打包：`electron-builder`（仅 `client-react/build:electron`）
- 测试：Vitest（前后端均用）
- Lint/Format：ESLint + Prettier + lint-staged + Husky
- 数据库：Prisma 6.2 + PostgreSQL 18（默认端口 `5433`，与默认 5432 不同）

### 根级 npm scripts

`dev` / `dev:server` / `dev:client` / `dev:electron` / `build` / `build:server` / `build:client` / `build:electron` / `typecheck` / `lint` / `lint:fix` / `format` / `test`

---

## 4. 前端 `client-react/`

### 4.1 技术栈

- React 19.2 + TypeScript 6.0 + Vite 8
- 路由：react-router-dom 7.15（data router 模式，`createBrowserRouter`）
- 状态：Zustand 5（**没有 Redux**）
- HTTP：Axios
- 样式：Tailwind CSS v4（通过 `@tailwindcss/vite`），含大量 `cn` / `class-variance-authority` / `tailwind-merge`
- UI 基件：Radix UI 全家桶 + shadcn 风格封装 + `cmdk` 命令面板 + `vaul` 抽屉
- 动效：Framer Motion + GSAP + Paper Shaders
- 3D：Three.js + @react-three/fiber + drei（用于「卡池」「星空发现页」等视觉特效）
- 数据可视化：Recharts
- 实时：socket.io-client
- 表单：react-hook-form + zod
- 监控：Sentry React
- 拖拽/分屏：react-resizable-panels
- 测试：Vitest + Testing Library + jsdom

### 4.2 目录约定

```
src/
├── api/           # 17 个 axios 封装的请求模块
├── components/    # 按业务域分目录
│   ├── agent/ blocks/ card-pool/ circle/ demand/ layout/ ui/
├── views/         # 49 个页面（路由级）
│   └── admin/ circle-hub/
├── stores/        # 7 个 Zustand store
├── hooks/ services/ utils/ lib/ types/ constants/ data/
├── router/        # 路由表
├── styles/ assets/ test/
└── electron/../   # 见 4.4
```

### 4.3 Store 设计（Zustand）

7 个 store：`user` `chat` `demand-workspace` `canvas` `region` `theme` + 1 个（可能漏数）。模块边界清晰，**没有出现「超大 store」反模式**。

### 4.4 Electron

```
electron/
├── main.cjs     83 行
└── preload.cjs   9 行
```

主进程非常薄（窗口创建、生命周期），业务逻辑全部留在 Web 端，符合 CLAUDE.md 约定的 `domain:action` IPC 风格。

### 4.5 路由概览

49 个页面，使用 `createBrowserRouter` + `lazy()` + `Suspense` 实现按需加载。路由分组：

- 公共：`/`（Discover）、`/login`、`/search`、`/providers`、`/certified-search`、`/tag-stats`、`/help` `/help/docs`、`/privacy` `/terms` `/licenses`
- 已登录：`/dashboard`（管理员）、`/profile`、`/settings`、`/circles/:id/*`（圈子 hub，含 community/resources/analytics/teams/help 子路由）、`/messages`、`/chat/:id`
- 业务：`/demands/*`（create/detail/my）、`/orders/*`、`/payment`、`/my-bids`、`/transaction-history`
- 特色：`/card-pool`、`/card-pool-explorer`、`/dead-pool`、`/filters-preview`、`/agent-chat`（AI 助手）、`/welfare-center`
- 认证：`/cert-center`、`/cert-intro`、`/user-tags-manage`

---

## 5. 后端 `server/`

### 5.1 技术栈

- Express 4.21 + Prisma 6.2 + PostgreSQL
- Socket.IO 4.8（实时消息）
- 鉴权：JWT（jsonwebtoken）+ bcryptjs
- 校验：zod
- 短信：tencentcloud-sdk-nodejs-sms（腾讯云）
- 限流：express-rate-limit
- 定时任务：node-cron（`src/cron/`）
- 图片处理：sharp
- 缓存（可选）：ioredis
- 文件上传：multer
- 文档：swagger-jsdoc + swagger-ui-express（`/api-docs`）
- 监控：Sentry Node

### 5.2 目录结构

```
src/
├── index.ts          # 入口
├── config.ts         # 配置
├── swagger.ts        # OpenAPI
├── classifier.ts     # 分类器（语义分类）
├── taxonomy.ts / .json  # 分类法数据
├── routes/           # 27 个路由模块
├── services/         # 33 个 service（含子目录 agent/ ai/）
├── middleware/ lib/ utils/ cron/ __tests__/

prisma/
├── schema.prisma     # 875 行，37 个 model
├── migrations/
└── seed*.ts          # 12 个种子脚本（按域拆分）
```

### 5.3 路由模块（27）

`auth` `user` `user-tag` `region` `demand` `order` `message` `circle` `circle-hub` `circle-enhanced` `certification` `review` `complaint` `tag` `tag-stats` `deposit` `transaction` `welfare` `push` `agent` `ai` `shorts` `provider` `captcha` `admin` `health` `health-actions`

### 5.4 Prisma 模型（37）

按业务域：

- 用户域：`User` `UserTag` `CertifiedProvider` `Follow` `Region`
- 需求/订单：`Demand` `DemandApplication` `DemandApplicantV2`（V2 两段式接单） `DemandFavorite` `Order` `Settlement` `Deposit` `DepositDemand`
- 卡池/Short：`Pool` 隐含于 service `pool.service.ts`；`Short`、`ActiveDemand`（可能与卡池/活跃需求相关）
- 消息：`Message` `ConversationMerge` `ConversationMergeMember`
- 圈子：`Circle` `CircleMember` `CircleActivity` `CircleAnnouncement` `CircleDemand` `CircleInvite` `CircleResource`
- 标签/统计：`Tag` `TagStats`
- AI：`AgentConversation` `AgentMessage`
- 钱包/福利：`WalletHold` `WalletLedger` `WelfareFundPool` `WelfareDisbursement` `WelfareReward`
- 投诉：`Complaint`
- 推送：`PushPreference`

种子脚本 12 个，按域独立（seed.ts / seed-bulk / seed-circle-hub / seed-demands / seed-pool / seed-stats-data / seed-tags / seed-user-tags / seed-regions / seed-ip-region / seed-full / seed-assets）—— **粒度合理，方便局部重建数据**。

---

## 6. 值得注意的工程信号

### 6.1 ⚠️ 一些可疑 / 需要确认的版本号

- `react ^19.2.5`、`react-dom ^19.2.5`
- `vite ^8.0.10`、`@vitejs/plugin-react ^6.0.1`、`@vitejs/plugin-basic-ssl ^2.3.0`
- `react-router-dom ^7.15.0`
- `typescript ~6.0.2`（client-react），`typescript ^5.7.3`（server）
- `lucide-react ^1.14.0`（与社区常用 `^0.4xx` 节奏差异很大）

这些是 package.json 里写明的版本。要么是项目在用前瞻版本，要么是 manifest 被改过未同步安装。建议 `pnpm install` 后跑 `pnpm typecheck` 与 `pnpm --filter client-react run build` 确认真实可用版本。

### 6.2 ⚠️ `.gitignore` 未覆盖的临时/历史文件

下列文件位于 `client-react/src/views/`：

- `Discover.tmp`
- `Home.tsx.bak`

CLAUDE.md 指出 `Home.tsx.bak` 不应进库（`Discover` 已取代 `Home`）。建议加入 `.gitignore` 的 `*.tmp` / `*.bak` 规则并清理。

### 6.3 ⚠️ 根目录混杂

见第 7 节详述。

### 6.4 路由文件出现乱码注释

`client-react/src/router/index.tsx` 第 81–85 行附近注释显示为乱码（疑似文件编码或被工具替换过）。功能未受影响，但建议用编辑器确认编码（应是 UTF-8）。

### 6.5 后端 schema 体量

`schema.prisma` 875 行 / 37 model —— 大但仍可控。**没有看到明显的拆分需求**（例如枚举全部塞进单文件），这是合理的。

### 6.6 文档资产体量健康

`docs/` 共 ~5756 行，覆盖从路线图到发布说明、技术报告；冗余但不重复。建议新读者从 `docs/README.md` → `ENGINEERING_OVERVIEW.md` → `DEVELOPMENT-GUIDE.md` 三份切入。

### 6.7 测试

前后端都用 Vitest。`docs/` 未单独列出覆盖率目标，但 `client-react/package.json` 暴露了 `test:coverage` 脚本。建议跑一次基线看覆盖率。

---

## 7. 根目录混杂文件清单

按"是否属于 Ninewood 项目"分类，便于你决定清理策略。

### 7.1 明确不属于项目（建议删除/移走）

| 文件 | 大小 | 说明 |
|------|------|------|
| `_dev.log` | **57 MB** | 长期积累的开发日志，绝对不该入库；`.gitignore` 已写 `*.log`，但 git 跟踪过吗？需 `git rm --cached` |
| `temp_image.jpg` | 16 KB | 临时图片（360×360），无项目用途 |
| `temp-reference.html` | 357 KB | 临时参考页 |
| `free_server.py` | — | 个人 v2rayN 订阅服务器脚本，与 Ninewood 无关 |
| `free_sub.txt` | 0 字节 | 空文件，配套 free_server.py |
| `free_nodes.txt` | 14 行 | 节点列表，配套 free_server.py |
| `pnpm` | 0 字节 | 空文件，疑似误建 |
| `__vite_test.html` | 0 字节 | 空文件 |
| `_tmp_test.cjs` | — | 临时测试文件 |
| `report_images/` | — | 7 张 bug 截图，疑似另一个课程项目 |
| `generate_report.py` / `generate_report_final.py` | 406 / 470 行 | 报告生成脚本，从内容看是另一个项目（缺陷管理/测试报告） |
| `read_doc.py` | — | 读取桌面 docx 的脚本，**硬编码路径 `C:/Users/19617/Desktop/《软件测试与质量控制》实验报告（三）.docx`**——明显是另一个课的作业 |
| `doc_content.txt` | 48 行 | 上面的输出结果 |
| `fix_help.py` | — | 一次性修补 `client-react/src/views/Help.tsx` 的脚本，**功能应已并入代码** |

### 7.2 可能属于项目（需二次确认）

| 文件 | 说明 |
|------|------|
| `opencode.md` | 项目内部的 AI/工具备忘（66 行），可保留或挪到 `docs/` |
| `__restore_settings.tsx` | Settings 页面的还原/参考脚本，可能已过时，建议核实是否还有用 |
| `.mcp.json` | MCP 服务器配置，可能影响开发 |
| `.codex-logs/` `.agents/` `.impeccable/` `.reasonix/` | 各 AI 工具的配置/日志目录，需决定哪些入 `.gitignore` |

### 7.3 建议的清理步骤

1. **`_dev.log`**：先 `git rm --cached _dev.log`，再追加到 `.gitignore`（已有 `*.log`，验证是否生效）。
2. **临时文件**：`Discover.tmp` / `Home.tsx.bak` / `temp_image.jpg` / `temp-reference.html` / `_tmp_test.cjs` / `__vite_test.html` / 空 `pnpm` / 空 `free_sub.txt` —— 直接删除。
3. **无关脚本**：`free_server.py` `free_nodes.txt` `generate_report*.py` `read_doc.py` `doc_content.txt` `fix_help.py` `report_images/` —— 移到仓库外或彻底删除。
4. **临时调试脚本的位置**：从脚本里硬编码的 `E:/Ninewood/...` 路径看，这些是从 `E:/Ninewood` 拷贝过来的。CLAUDE.md 说"仓库根 `e:/Ninewood`"，但你现在的工作区是 `D:\ninewood`。**这是另一个隐患**：当前工作目录名（`D:\ninewood`）和文档声称的根（`e:/Ninewood`）不一致，会让所有写绝对路径的脚本失败。
5. **`.gitignore`**：增加 `*.tmp` `*.bak` `__pycache__/`（已有），并把 `.codex-logs/`、`.reasonix/`、`.impeccable/` 也加入（除非有入 git 的需要）。

---

## 8. 综合评价

**优点**

- 架构清晰：前后端边界清楚，业务按 domain 拆模块（circle / demand / pool / tag / agent / welfare），没有巨型单文件
- 工具链现代且完整：pnpm workspace、TypeScript 双端、Vite 8、Prisma、Vitest、ESLint+Prettier+Husky
- Zustand + Axios + React Router data router + Tailwind v4 + Radix 组合是当下 React 工程的主流选型
- 后端按 service / route 分离，37 个 model 全部放在一个 `schema.prisma`（合理体量）
- 文档齐全：路线图、需求对照、Release Notes、技术报告都有
- Electron 主进程只做窗口壳，业务全留 Web 端，IPC 规约清晰
- 严格遵守 Windows-only 约束（CLAUDE.md 中硬编码），未引入移动端相关代码

**风险点**

1. **依赖版本号异常**（见 6.1）—— 多个包版本领先于常见发布节奏，需 `pnpm install` 实跑确认
2. **根目录污染**（见 6.2 / 第 7 节）—— 影响 clone 体积、专业度，且部分脚本硬编码 `E:/Ninewood` 而实际目录是 `D:\ninewood`
3. **`_dev.log` 57 MB** —— 若曾入库，需要清理 git 历史
4. **路由文件乱码** —— 不影响运行，但需修
5. **`scripts/` 数量较多**（16 个）—— 多数是 .ps1/.bat 发布/启动脚本，注意维护成本

**下一步建议（按优先级）**

1. 处理根目录污染（删除/迁移），修正文档与实际路径的不一致（`E:/Ninewood` → `D:\ninewood`）
2. `pnpm install` + `pnpm typecheck` 验证依赖版本是否能解析
3. 给 `.gitignore` 补 `*.tmp` `*.bak`，并清理 `Discover.tmp` / `Home.tsx.bak`
4. 修复 `router/index.tsx` 注释乱码
5. 跑一次 Vitest 基线覆盖率
6. 把 `opencode.md` 收纳到 `docs/`，统一文档入口

---

> 本报告基于静态扫描得出，未运行代码、未读取大型二进制/日志。如需深入某一模块（例如 Circle Hub、Agent Chat、卡池 3D、Prisma schema 关系），可在此基础上再起一份专项分析。