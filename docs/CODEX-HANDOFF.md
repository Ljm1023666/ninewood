# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-21 · Task 7 前端子页已交付）

| 项 | 状态 |
|---|---|
| Git（本地） | Task 6 主链 + Task 7 前端 Hub 子页（未要求 Brain commit） |
| Server 测试 | `pnpm --filter server test` → **75/75**（12 文件） |
| Typecheck | `pnpm typecheck` → clean |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.4** |
| **活跃 Task** | _Task 8 已完成，待 Brain read-back_ |

### 已合入里程碑

| Stage / Task | 交付 | 关键 commit / 测试 |
|---|---|---|
| **Task 6** | 虚假功能完整修复 | 75/75 |
| **Task 7 前端** | Hub 嵌套路由 + 5 子页 Stitch UI | Cursor 交付，见 §Task 8 前置 |
| **Task 8** | Hub 后端 4 表 + 11 端点 + 5 子页接入 + 9 单测 | 84/84 + typecheck clean |

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6
2. **Task 8 授权**：**可改 Prisma / migration / 增表**，为满足 Hub 子页真实数据
3. **禁止**：无 spec 扩 Stage 2；改 §1 原文；删表 migration
4. **Commit 纪律**：功能 1 commit + 文档 1 commit
5. **验证**：read-back 含全量 `pnpm --filter server test` + `pnpm typecheck`

---

## 🟢 当前状态：Task 8 — Codex 立即执行

**用户指令（2026-06-21）**：「现在开始做后端，允许增加数据、修改数据库；**整个任务请给 Codex 做**。」

| 项 | 路径 |
|---|---|
| **规格（必读）** | `docs/specs/TASK-8-circle-hub-backend.md` |
| 前端入口 | `client-react/src/views/circle-hub/*` |
| 设计参考 | `docs/stitch-circle-hub-subpages/`（只读） |
| Task 7 旧 spec | `docs/specs/TASK-7-bento-sidebar-implementation.md` — **Wave 2–3 已作废**，勿做全局 Layout 包装 |

### Task 7 前端已完成（Cursor · 勿重做）

- `BentoAppShell` **仅** `/circles/:id/*`
- 嵌套子路由：`home | community | resources | analytics | teams | help`
- 侧栏 nav：`constants/bento-nav.ts` → `/circles/:id/...`
- **community** = 现有 `CircleDetailBentoView`（已接 API）
- **其余子页** = Stitch UI + **mock 数据** → Task 8 替换

### Task 8 执行顺序（Codex）

```
Wave A  Prisma + migration + Circle.description + seed
Wave B  GET hub/home, activities, POST announcements, activity hooks
Wave C  Resources CRUD + upload (uploads/circle-resources/)
Wave D  GET analytics?range=30d（真实聚合，7 天周一..周日）
Wave E  Members 列表 + Invites CRUD (+ heartbeat 可选)
Wave F  前端联调：扩展 circle.ts，删 MOCK_* 
Wave G  测试 + 更新本文档 Task 8 ✅
```

### 前端 mock 清单（Wave F 必须清除）

| 文件 | Mock |
|------|------|
| `CircleHubHome.tsx` | `MOCK_ACTIVITIES`, 硬编码 stat |
| `CircleHubResources.tsx` | `MOCK_FILES` |
| `CircleHubAnalytics.tsx` | `MEMBER_GROWTH_*`, `WEEKLY_*`, `ENGAGEMENT` |
| `CircleHubTeams.tsx` | 待处理邀请假数据 |
| `CircleHubHelp.tsx` | FAQ 可暂留静态 |

### 验证命令（每 Wave）

```bash
pnpm typecheck
pnpm --filter server test
pnpm run lint -w client-react   # Wave F 后
```

手动：`/circles/:id/home|resources|analytics|teams` 数据来自 API，非 toast「即将上线」。

---

## ✅ 已完成任务队列

| # | 任务 | Brain |
|---|---|---|
| 6 | 虚假功能修复 | ✅ |
| 7-fe | Hub 子页前端 + 嵌套路由 | ✅ Cursor |
| 8 | Hub 后端 + 联调 | ⏳ **Codex 进行中** |

---

## Task 7 状态（归档说明）

- Wave 1 Shell：已完成（Cursor）
- **Wave 2–4（全局 `/card-pool` Bento 包装等）**：产品改向 Hub 子页，**取消**
- 侧栏假导航问题：已通过 `/circles/:id/*` 子路由解决

---

## 候选 backlog（Task 8 之后）

| 项 | 说明 |
|---|---|
| Stage 2 公开圈 | D4 后置 |
| 邀请邮件真实发送 | Task 8 MVP 仅写库 |
| Help FAQ CMS | P2 |
| Google OAuth | Task 6 disabled |

---

## 下一任务（Brain 填写 · Codex 等待）

- **当前**：执行 `TASK-8-circle-hub-backend.md` Wave A → G
- **完成后**：Brain 审 read-back（migration 名、测试数、mock 已清）
- **勿开始**：Task 7 Wave 2 全局页包装

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-21 | v10：Task 8 启动 — Hub 后端 + DB + 联调交 Codex；Task 7 前端 Hub 归档 |
| 2026-06-22 | v11：Task 8 完成 — Hub 后端 (Wave A-E) + 前端 5 页接入 + 9 单测 84/84 + typecheck clean |
| 2026-06-21 | v9：Task 7 Wave 1 |
| 2026-06-21 | v7：Task 6 批准；75/75 |
