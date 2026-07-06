# Task 7 · Bento 侧栏与子页面实现规格（Codex 执行）

> 状态: **v1.0 · 待执行** · 创建: 2026-06-21  
> 来源: 圈子详情 Stitch 复刻 — `CircleDetailBentoSidebar` 导航审计  
> 读者: **Codex 执行员**（任务入口见 `docs/CODEX-HANDOFF.md` Task 7）  
> 设计参考: `docs/stitch-circle-detail/variant-b-cinematic.html`  
> 权威需求: `docs/DEVELOPMENT-GUIDE.md` §1 + §6（**禁止改 §1 原文**）

---

## 0. 问题陈述

圈子详情页 (`/circles/:id`) 左侧 **Ninewood · Productivity Hub** 侧栏来自 Stitch 静态 HTML，当前属于 **视觉假实现**：

1. **仅存在于圈子详情** — 其它路由无此侧栏，点击导航会跳到完全不同的 Layout（`InternalPageShell` / Discover 全屏等），体验断裂。
2. **激活态写死** — `MAIN_NAV` 里 `active: true` 固定给「圈子社区」，不随 `location.pathname` 变化。
3. **文案与路由语义不一致** — 如「我的团队」→ `/circles-list`，实际页面是 legacy「需求圈」列表（`circles-enhanced` API），与主圈子系统 `/circles` 无关。
4. **圈子详情页内仍有假控件** — 「分享此圈子」「查看全部」、硬编码「周活跃度 100%」等无后端或无 handler。
5. **双圈子 API 并存** — 主流程 `circleApi` (`/circles/*`) vs legacy `circles-enhanced`（`CircleList.tsx`），侧栏未反映这一分裂。

**目标**：要么把侧栏做成 **可导航的真实 Productivity Hub 壳层**，要么 **诚实降级**（禁用/移除未实现项）。本 spec 采用前者，分 Wave 交付。

---

## 1. 侧栏导航审计表

| Stitch 标签 | 当前 path | 目标页面 | 路由存在 | 页面真实度 | 壳层 | 主要问题 |
|-------------|-----------|----------|----------|------------|------|----------|
| 首页 | `/` | `Discover.tsx` | ✅ | 真实（公开发现页） | 无 Layout / 无侧栏 | 壳层不一致；未登录可访问 |
| 圈子社区 | `/circles` | `Circles.tsx` | ✅ | 真实（`circleApi`） | `Layout` + Internal UI | 壳层/字体与 Bento 不一致 |
| 资源文件 | `/card-pool` | `CardPool.tsx` | ✅ | 真实（卡池浏览） | `Layout` | 壳层不一致 |
| 分析数据 | `/tag-stats` | `TagStatsDashboard.tsx` | ✅ | Task 6 已接 API | `Layout` | 壳层不一致；非 Stitch 视觉 |
| 我的团队 | `/circles-list` | `CircleList.tsx` | ✅ | **半真实** | `Layout` | 文案错误；走 **legacy** `circles-enhanced`，与 `/circles` 非同一产品 |
| 帮助中心 | `/help` | `Help.tsx` | ✅ | 真实 | `Layout` | 壳层不一致 |
| 退出登录 | — | `userStore.logout` | ✅ | 真实 | — | OK |

### 1.1 圈子详情页内假控件（同页）

| UI | 文件 | 现状 | 应有行为 |
|----|------|------|----------|
| 分享此圈子 | `CircleDetailBentoView.tsx` | `<button>` 无 `onClick` | 复制链接 / 系统分享 / 或移除 |
| 查看全部 | `CircleDetailBentoView.tsx` | `<button>` 无 handler | 展开圈内需求或跳转列表 Tab |
| 周活跃度 100% | `CircleDetailBentoView.tsx` | 硬编码 | 接 API 或改为诚实占位「暂无数据」 |
| 品牌 Logo 点击 | `CircleDetailBentoSidebar.tsx` | 无跳转 | 应 → `/` 或 `/circles`（Brain 锁定） |

---

## 2. Brain 架构决策（本 spec 锁定）

### 2.1 壳层策略 — **Bento App Shell（推荐）**

抽取共享壳层，供 Productivity Hub 相关路由复用：

```
BentoAppShell（fixed 背景可选 + cdb-sidebar + outlet）
  ├── CircleDetailBentoSidebar（改名 AppBentoSidebar）
  └── <Outlet /> 或 children
```

**路由分组**（`router/index.tsx`）：

```tsx
{
  element: <AuthGuard />,
  children: [{
    element: <BentoAppShell />,  // 280px 侧栏 + Geist + circle-detail-bento.css
    children: [
      { path: 'circles', element: <CirclesBento /> },      // Wave 2：包装或重写
      { path: 'circles/:id', element: <CircleDetail /> }, // 已有
      { path: 'card-pool', element: <CardPoolBento /> },
      { path: 'tag-stats', element: <TagStatsBento /> },
      { path: 'teams', element: <TeamsPage /> },           // 新路由，见 3.4
      { path: 'help', element: <HelpBento /> },
    ],
  }],
}
```

**不在 Bento Shell 内**（保持现状）：

- `/` Discover — 公开营销/发现首页，Stitch 侧栏 HTML 亦用 `href="#"` 占位首页，可保留独立。
- `/dashboard` Admin — 已有独立 Admin 侧栏。
- `/messages/*`、`/orders/*` 等 — 不在 Productivity Hub 信息架构内。

### 2.2 「我的团队」产品语义 — **改路由与页面**

| 项 | 决策 |
|----|------|
| Stitch 文案 | 保留「我的团队」 |
| 新路由 | **`/teams`**（或 `/my-teams`，Brain 锁定 `/teams`） |
| 数据来源 | **`GET /circles/my`**（`circleApi.my`），展示我加入/管理的圈子 |
| Legacy | **`/circles-list` 保留但移出侧栏**；文件加 `@deprecated` 注释，不在 Bento nav 出现 |
| 侧栏旧 path | `circles-list` → 改为 `/teams` |

### 2.3 激活态

- 删除 `NavItem.active` 硬编码。
- 用 `useLocation()` + `matchPath` 规则：

```ts
const NAV_MATCH: Record<string, (p: string) => boolean> = {
  '/circles': (p) => p === '/circles' || /^\/circles\/[^/]+$/.test(p),
  '/card-pool': (p) => p.startsWith('/card-pool'),
  '/tag-stats': (p) => p === '/tag-stats',
  '/teams': (p) => p === '/teams',
  '/help': (p) => p.startsWith('/help'),
}
```

首页 `/` 不在 Bento shell 内 → 侧栏「首页」仍 `navigate('/')`，**永不 active**（或点击后离开 Bento shell，符合预期）。

### 2.4 视觉/token

- 侧栏与 Bento 卡片 **必须** 共用 `client-react/src/styles/circle-detail-bento.css` 中 `--cdb-*` token。
- **禁止** 在侧栏组件内混用 Tailwind 硬编码 `#abc7ff` / `text-xs tracking-widest`（已在 Task 6 圈详情 UI 中修复，Shell 抽取时一并遵守）。
- Geist 字体仅在 `.circle-detail-bento` 作用域内；`.ms-icon` 保持 Material Symbols。

---

## 3. Wave 任务分解

### Wave 1 · 壳层抽取 + 导航真实化（P0）

#### SIDEBAR-01 · 抽取 `BentoAppShell` + `AppBentoSidebar`

- [ ] **状态**: 待做

**范围**

- 新建 `client-react/src/components/layout/BentoAppShell.tsx`
- 重命名/迁移 `CircleDetailBentoSidebar.tsx` → `AppBentoSidebar.tsx`（或 re-export 兼容）
- 重构 `CircleDetail.tsx`：去掉重复 `BentoShell` 背景逻辑，改由 `BentoAppShell` 统一提供（`coverUrl` 仍仅详情页传入，见 SIDEBAR-02）
- `router/index.tsx`：将 `circles/:id` 挂到 `BentoAppShell` 下

**要求**

1. 侧栏 `active` 由路由计算，不再硬编码。
2. 品牌区可点击 → `/circles`（Brain 锁定）。
3. `MAIN_NAV` 抽至 `client-react/src/constants/bento-nav.ts` 单源。

**验收**

- 在 `/circles/:id` 切换侧栏项，active 样式正确。
- 从详情点「资源文件」→ `/card-pool`；侧栏仍可见（Wave 2 前允许内容区仍为旧 Layout 样式，但 **侧栏不能消失**）。

---

#### SIDEBAR-02 · 统一背景层策略

- [ ] **状态**: 待做

**问题**  
仅圈子详情有封面背景；其它 Bento 子页应使用统一 fallback（`#10131a` + `--cdb-overlay`）。

**范围**

- `BentoAppShell` 接受 `ambientCoverUrl?: string | null`
- `CircleDetail` 通过 outlet context 或 props 传入 `circle.coverUrl`
- 其它子页不传 → fallback

**验收**

- 非详情 Bento 页背景与 Stitch HTML 遮罩一致（单层 radial overlay）。
- 无 solid `#10131a` 挡在 glass blur 与封面之间（参见现有 `cdb-bg-layer` 实现）。

---

#### SIDEBAR-03 · 圈子详情假按钮清理

- [ ] **状态**: 待做

**范围**

- `CircleDetailBentoView.tsx`

**要求**

| 控件 | 最小实现 |
|------|----------|
| 分享此圈子 | `navigator.clipboard.writeText(window.location.href)` + toast「链接已复制」；Electron 可后续接 `electronAPI` |
| 查看全部 | 若 `demands.length > 3`：页内滚动/展开；或 navigate 至 `#demands` 锚点；**禁止** 空按钮 |
| 周活跃度 | 若无 API：`—` 或隐藏该 stat 行；**禁止** 假 `100%` |

**后端（可选本 Wave）**

- 若已有圈子 stats 字段，接 `GET /circles/:id` 扩展；无则前端诚实空态。

**验收**

- 三个控件均可交互或已移除，grep `100%` 硬编码活跃度为 0。

---

### Wave 2 · Bento 子页面壳层对齐（P1）

> 目标：侧栏导航到的页面 **内容区** 也处于 Bento shell 内，而非突然变成 `InternalPageShell`。

#### SIDEBAR-04 · `Circles` 列表 Bento 化

- [ ] **状态**: 待做

**范围**

- `client-react/src/views/Circles.tsx`
- 新建 `CirclesBentoView.tsx`（或在原文件内分支）

**要求**

1. 去掉 `PageHeader` + `InternalPageShell` 当处于 Bento shell 时。
2. 列表项使用 `cdb-glass-card` 或简化行卡片，Geist 排版。
3. 保留：公开圈列表、我的圈子、创建圈子、跳转 `/circles/:id`。
4. API 仅用 `circleApi`，不引入 `circles-enhanced`。

**验收**

- `/circles` 在 Bento shell 内视觉与详情页同一材质体系。
- 创建圈子 → 进入详情链路可用。

---

#### SIDEBAR-05 · `CardPool` Bento 包装

- [ ] **状态**: 待做

**范围**

- `CardPool.tsx` — 体量大，**优先包装策略**：Bento shell 内渲染现有卡池，移除外层 `BackButton`（侧栏已提供导航）。
- 子路由 `card-pool/explorer`、`card-pool/dead` 同步纳入 Bento shell。

**验收**

- 从侧栏进入卡池，无「突然换肤」至 Montserrat Internal UI 的 **外层壳**（卡池内部表格样式可 Wave 3 再统一）。

---

#### SIDEBAR-06 · `TagStatsDashboard` Bento 包装

- [ ] **状态**: 待做

**范围**

- `TagStatsDashboard.tsx`

**要求**

1. 确认 Task 6 后无 mock 数据（只读审计）。
2. 外层改 Bento 内容区 padding/max-width 1280px；图表区可保留现有组件。

**验收**

- `/tag-stats` 侧栏 + 背景与圈子详情一致。

---

#### SIDEBAR-07 · `Help` Bento 包装

- [ ] **状态**: 待做

**范围**

- `Help.tsx` — 内容保留，外壳对齐 Bento。

**验收**

- 侧栏「帮助中心」进入后 shell 一致。

---

### Wave 3 · 「我的团队」真实页 + Legacy 清理（P1）

#### SIDEBAR-08 · 新建 `/teams` 页面

- [ ] **状态**: 待做

**范围**

- 新建 `client-react/src/views/Teams.tsx`（或 `MyTeams.tsx`）
- `client-react/src/api/circle.ts` — 复用 `my()`
- 路由：`/teams`
- 更新 `bento-nav.ts`：「我的团队」→ `/teams`

**页面内容（MVP）**

1. 标题：「我的团队」
2. 列表：`circleApi.my()` 返回的圈子，展示名称、角色（OWNER/ADMIN/MEMBER）、成员数。
3. 点击 → `/circles/:id`
4. 空态：引导「去圈子社区加入」→ `/circles`

**验收**

- 不再依赖 `circles-enhanced`。
- 侧栏文案与页面标题一致。

---

#### SIDEBAR-09 · Legacy `CircleList` 降级

- [ ] **状态**: 待做

**范围**

- `CircleList.tsx`
- `router/index.tsx`

**要求**

1. 路由 `/circles-list` → `Navigate to="/teams"` 或保留并标注 deprecated。
2. 文件头注释说明 legacy API，禁止新功能接入。

**验收**

- 侧栏无 `/circles-list` 入口。
- grep 侧栏文案「circles-list」为 0。

---

### Wave 4 · 增强（P2，可选）

#### SIDEBAR-10 · 首页与 Hub 关系

- [ ] **状态**: 可选

**选项 A**：`/` 登录后 redirect → `/circles`  
**选项 B**：首页保持 Discover，侧栏「首页」明确离开 Hub  
**默认**：选项 B，不在本 Task 改 Discover。

---

#### SIDEBAR-11 · 圈子分享 API

- [ ] **状态**: 可选

**范围**

- `server/src/routes/circle.ts` — `GET /circles/:id/share` 返回 `{ url, code }` 若产品有邀请码
- 前端分享按钮接 API

---

## 4. 文件地图

| 路径 | Wave | 动作 |
|------|------|------|
| `client-react/src/components/layout/BentoAppShell.tsx` | 1 | 新建 |
| `client-react/src/components/layout/AppBentoSidebar.tsx` | 1 | 从 CircleDetailBentoSidebar 迁移 |
| `client-react/src/constants/bento-nav.ts` | 1 | 新建 |
| `client-react/src/styles/circle-detail-bento.css` | 1 | 必要时 rename → `bento-app.css`（可选） |
| `client-react/src/views/CircleDetail.tsx` | 1 | 简化，依赖 Shell |
| `client-react/src/components/circle/CircleDetailBentoView.tsx` | 1 | 假按钮修复 |
| `client-react/src/router/index.tsx` | 1–3 | 路由分组 |
| `client-react/src/views/Circles.tsx` | 2 | Bento 化 |
| `client-react/src/views/CardPool.tsx` | 2 | 包装 |
| `client-react/src/views/TagStatsDashboard.tsx` | 2 | 包装 |
| `client-react/src/views/Help.tsx` | 2 | 包装 |
| `client-react/src/views/Teams.tsx` | 3 | 新建 |
| `client-react/src/views/CircleList.tsx` | 3 | Deprecated |
| `docs/stitch-circle-detail/variant-b-cinematic.html` | — | 只读参考 |

---

## 5. 验证命令

每项 Wave 结束必跑：

```bash
pnpm typecheck
pnpm --filter client-react run lint
pnpm --filter server test
```

手动冒烟：

1. 登录 → `/circles/:id` → 侧栏五项 + 帮助 + 退出
2. 每项导航 active 态正确、返回详情仍正常
3. 分享/查看全部/活跃度无假数据
4. `/teams` 列表与 `/circles` 数据同源（`circleApi`）

---

## 6. Definition of Done（整包）

- [ ] Wave 1 全部勾选：Shell 抽取、active 路由、详情假按钮清理
- [ ] Wave 2 全部勾选：侧栏 4 个主入口页面均在 Bento shell 内
- [ ] Wave 3 全部勾选：`/teams` 替代「我的团队」假路由；legacy 降级
- [ ] 侧栏字体/材质/透明度与 `variant-b-cinematic.html` 一致（复用 `--cdb-*`）
- [ ] 无硬编码 `active: true`；无无 handler 的分享/查看全部按钮
- [ ] `pnpm typecheck` clean；server test 全绿
- [ ] `docs/CODEX-HANDOFF.md` Task 7 标记完成

---

## 7. 明确排除

| 项 | 原因 |
|----|------|
| Discover `/` Bento 化 | 公开首页，独立信息架构 |
| Admin `/dashboard` | 已有 admin-sidebar |
| 删除 `circles-enhanced` 后端 | 需单独立项；本 Task 仅前端降级 |
| Mobile 适配 | 项目 Scope Lock |
| Stage 2 公开圈 | D4 后置 |
| **Wave 2–4 全局页 Bento 包装** | **2026-06-21 产品改向：Hub 子页见 `TASK-8-circle-hub-backend.md`** |

---

## 8. 版本记录

| 日期 | 变更 |
|------|------|
| 2026-06-21 | v1.0 初版：侧栏审计 + Wave 1–4 |
| 2026-06-21 | v1.1 Brain：Wave 2–4 作废；Hub 嵌套子页 + 后端见 Task 8 |
