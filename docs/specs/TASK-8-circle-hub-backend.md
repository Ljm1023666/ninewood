# Task 8 · 圈子 Hub 后端 + 前后端联调（Codex 执行）

> 状态: **v1.0 · 待 Codex 执行** · 创建: 2026-06-21  
> 前置: Cursor 已完成 **Task 7 前端子页**（嵌套路由 + Stitch 视觉）  
> 读者: **Codex 执行员**（入口 `docs/CODEX-HANDOFF.md` Task 8）  
> 权威需求: `docs/DEVELOPMENT-GUIDE.md` §1 + §6（**禁止改 §1 原文**）

---

## 0. 背景与 Brain 决策

### 0.1 前端现状（Cursor 已交付，勿推翻）

侧栏 **仅** 在 `/circles/:id/*` 显示；子路由嵌套于 `BentoAppShell`：

| 子页 | 路由 | Stitch 方案 | 数据现状 |
|------|------|-------------|----------|
| 首页 | `/circles/:id/home` | home-variant-b | **Mock** 动态/部分统计 |
| 圈子社区 | `/circles/:id/community` | 原 Bento 详情 | **真实** `circleApi.get` + `getDemands` |
| 资源文件 | `/circles/:id/resources` | resources-variant-c | **Mock** 文件列表 |
| 分析数据 | `/circles/:id/analytics` | analytics-variant-b | **Mock** 图表 + 日期 caption 已修 |
| 我的团队 | `/circles/:id/teams` | teams-variant-a | **半真实** members + Mock 待处理邀请 |
| 帮助中心 | `/circles/:id/help` | help-variant-c | **静态** FAQ + 圈主来自 API |

关键文件：

```
client-react/src/views/circle-hub/CircleHubLayout.tsx   # 加载 circle + demands
client-react/src/views/circle-hub/circle-hub-context.tsx
client-react/src/views/circle-hub/CircleHub{Home,Resources,Analytics,Teams,Help}.tsx
client-react/src/constants/bento-nav.ts                 # /circles/:id/* 路径
client-react/src/api/circle.ts                          # 待扩展
server/src/routes/circle.ts
server/src/services/circle.service.ts
server/prisma/schema.prisma
```

**Task 7 spec Wave 2–3（全局 Layout 包装 `/card-pool` 等）已作废** — 产品改为 Hub 内子页，见本文 §0.1。

### 0.2 本 Task 目标

1. **允许改 Prisma schema + migration**，新增圈子 Hub 所需表/字段。  
2. **实现 REST API**，满足上述 5 个子页（community 已有，仅补字段/统计）。  
3. **Codex 负责前端联调**：替换 mock、扩展 `circleApi`、保持 Stitch UI 不变。  
4. **测试**：新增 server 单测，基线 **75/75 不可回退**。

### 0.3 明确授权

| 允许 | 禁止 |
|------|------|
| 新增 Prisma model / migration | 删除现有表（含 Deposit 等） |
| 新增 `server/src/routes/circle-hub.ts` 或扩展 `circle.ts` | 改 `DEVELOPMENT-GUIDE.md` §1 原文 |
| 扩展 multer 上传目录 `uploads/circle-resources/` | Mobile 适配 |
| Seed / 脚本为 dev 造演示数据 | 无 spec 扩 Stage 2 公开圈业务 |

---

## 1. 已知缺口（读代码确认）

### 1.1 `Circle.description` 幽灵字段

- `createSchema` / `applyPublicCircle` 接受 `description`，但 **`Circle` model 无 `description` 列**。  
- 前端 `CircleDetailData.description`、首页公告 fallback 依赖此字段。  
- **Wave A 必做**：`Circle.description String?` + migration；create/apply 写入；`getById` 返回。

### 1.2 无资源 / 动态 / 邀请 / 分析聚合 API

前端 mock 位置 grep：

- `CircleHubHome.tsx` — `MOCK_ACTIVITIES`, 硬编码 stat  
- `CircleHubResources.tsx` — `MOCK_FILES`  
- `CircleHubAnalytics.tsx` — `MEMBER_GROWTH_*`, `WEEKLY_DEMAND_*`, `ENGAGEMENT`  
- `CircleHubTeams.tsx` — 待处理邀请 mock  
- `CircleHubHelp.tsx` — 静态 FAQ（可保留静态 + 可选 DB）

### 1.3 成员「上次活动」

- Teams 页展示「当前在线 / 2小时前」，无后端字段。  
- MVP：`CircleMember.lastSeenAt DateTime?`（成员访问 Hub 时 heartbeat 更新）或暂用 `User.updatedAt` 并在 spec 注明近似值。

---

## 2. 数据模型（Prisma · Wave A）

### 2.1 扩展 `Circle`

```prisma
model Circle {
  // ...existing...
  description String?
}
```

### 2.2 新表（命名空间 `Circle*`）

```prisma
enum CircleResourceCategory {
  DOC
  DESIGN
  CODE
  VIDEO
  OTHER
}

enum CircleActivityType {
  DISCUSSION    // 讨论（MVP 可仅 seed）
  DEMAND        // 发布需求
  MEMBER_JOIN   // 新成员
  RESOURCE      // 上传资源
  ANNOUNCEMENT  // 公告更新
}

enum CircleInviteStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}

model CircleAnnouncement {
  id        String   @id @default(uuid())
  circleId  String
  circle    Circle   @relation(fields: [circleId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  title     String
  body      String
  pinned    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([circleId, pinned])
}

model CircleActivity {
  id        String             @id @default(uuid())
  circleId  String
  circle    Circle             @relation(fields: [circleId], references: [id], onDelete: Cascade)
  actorId   String?
  actor     User?              @relation(fields: [actorId], references: [id], onDelete: SetNull)
  type      CircleActivityType
  title     String             // 短标题，如需求名
  summary   String?            // 一行摘要
  refId     String?            // 关联 demandId / resourceId 等
  createdAt DateTime           @default(now())

  @@index([circleId, createdAt])
}

model CircleResource {
  id         String                 @id @default(uuid())
  circleId   String
  circle     Circle                 @relation(fields: [circleId], references: [id], onDelete: Cascade)
  uploaderId String
  uploader   User                   @relation(fields: [uploaderId], references: [id], onDelete: Cascade)
  name       String
  fileUrl    String
  mimeType   String?
  sizeBytes  Int
  category   CircleResourceCategory @default(OTHER)
  createdAt  DateTime               @default(now())

  @@index([circleId, createdAt])
  @@index([circleId, category])
}

model CircleInvite {
  id         String             @id @default(uuid())
  circleId   String
  circle     Circle             @relation(fields: [circleId], references: [id], onDelete: Cascade)
  email      String
  invitedById String
  invitedBy  User               @relation("CircleInvitesSent", fields: [invitedById], references: [id], onDelete: Cascade)
  status     CircleInviteStatus @default(PENDING)
  createdAt  DateTime           @default(now())
  expiresAt  DateTime?

  @@index([circleId, status])
  @@unique([circleId, email, status]) // 简化：同邮箱仅一条 PENDING
}

model CircleMember {
  // ...existing...
  lastSeenAt DateTime?
}
```

**Circle 反向关系**（添加到 `Circle` model）：

```prisma
announcements CircleAnnouncement[]
activities    CircleActivity[]
resources     CircleResource[]
invites       CircleInvite[]
```

**User 反向关系**：按 Prisma 惯例补全 `CircleAnnouncement[]`、`CircleActivity[]` 等。

### 2.3 活动写入策略（Wave B 起）

| 事件 | 写入 `CircleActivity` |
|------|------------------------|
| 成员加入 | `MEMBER_JOIN` — 在 `joinPublic` / `joinByCode` 后 |
| 圈内发需求 | `DEMAND` — 在 demand 创建且 `circleId` 存在时（查现有 demand 路由） |
| 上传资源 | `RESOURCE` — POST resources 后 |
| 发公告 | `ANNOUNCEMENT` — POST announcement 后 |

讨论 `DISCUSSION` MVP **可不实现发帖**，seed 即可。

### 2.4 Seed 要求

在 `server/prisma/seed-bulk.ts` 或新脚本 `seed-circle-hub.ts`：

- 为至少 1 个公开圈 + 1 个私密圈写入：公告 1 条、资源 4–8 条、活动 10 条、邀请 1 条 PENDING。  
- 保证本地打开 `/circles/:id/home` 等页非空。

---

## 3. API 契约（Wave B–E）

统一前缀：`/api/circles/:circleId/...`  
鉴权：读操作 — 公开圈可匿名读 overview；**私密圈**需成员或 403。写操作 — `authMiddleware` + 成员角色校验（OWNER/ADMIN/MEMBER）。

辅助函数建议：`circle.service.assertMember(circleId, userId, roles?)`。

### 3.1 `GET /circles/:id/hub/home`

**用途**: `CircleHubHome` 一次拉取。

**Response `data`**:

```ts
type CircleHubHomeDto = {
  stats: {
    todayActive: number      // 今日 lastSeenAt 或 activity 去重成员数
    todayActiveDelta: number // 较昨日，可 0
    newDemands: number       // 今日/本周圈内新需求，与前端第二卡一致
    weekDemands: number
    resourceUpdates: number  // 7 日内 CircleResource count
    resourceUpdatesDelta: number
    memberCount: number
    pendingInvites: number
  }
  announcement: {
    id: string
    title: string
    body: string
    pinned: boolean
    author: { id: string; nickname: string }
    createdAt: string
  } | null
  hotTags: string[]          // MVP: 从圈内 demand tags 聚合 top5；无则默认数组
  activities: CircleActivityItem[]  // 最新 10 条
}

type CircleActivityItem = {
  id: string
  type: CircleActivityType
  actor: { id: string; nickname: string } | null
  title: string
  summary: string | null
  refId: string | null
  createdAt: string
}
```

### 3.2 `GET /circles/:id/hub/activities?page=&limit=`

分页动态，供「加载更多」。

**Response**: `paginated<CircleActivityItem>`（用现有 `paginated()` helper）。

### 3.3 `POST /circles/:id/hub/announcements`（OWNER/ADMIN）

Body: `{ title: string; body: string; pinned?: boolean }`  
创建公告 + 写 `CircleActivity` type `ANNOUNCEMENT`。

### 3.4 `GET /circles/:id/resources?category=&q=&page=&limit=`

**Response**:

```ts
{
  recent: CircleResourceItem[]   // 最近 4 条
  items: CircleResourceItem[]
  page, limit, total, totalPages
}

type CircleResourceItem = {
  id: string
  name: string
  fileUrl: string
  mimeType: string | null
  sizeBytes: number
  sizeLabel: string            // 服务端格式化 "2.4 MB"
  category: CircleResourceCategory
  uploader: { id: string; nickname: string; avatarUrl: string | null }
  createdAt: string
}
```

Filter `category`: `all | doc | design | code | video` 映射到 enum。

### 3.5 `POST /circles/:id/resources`（成员）

- `multipart/form-data`: `file` + optional `category`  
- 扩展 `server/src/middleware/upload.ts`：`circleResource` → `uploads/circle-resources/`  
- 限制：50MB；允许 pdf/doc/zip/fig/mp4/xlsx 等（与前端 icon 类型一致）  
- 响应：创建的 `CircleResourceItem`

### 3.6 `DELETE /circles/:id/resources/:resourceId`

上传者或 OWNER/ADMIN。

### 3.7 `GET /circles/:id/analytics?range=30d`

**用途**: `CircleHubAnalytics` — **替换全部 mock 常量**。

**Response `data`**:

```ts
type CircleAnalyticsDto = {
  range: { start: string; end: string }  // ISO date YYYY-MM-DD，前端 caption 已用此格式
  kpis: {
    memberCount: number
    memberGrowthPct: number | null
    activeRate: number                   // 0–100
    activeRateDelta: number | null
    weekDemands: number
    weekDemandsDelta: number | null
    interactions: number
    interactionsDelta: number | null
  }
  memberGrowthSeries: Array<{ offsetDay: number; label: string; date: string; value: number }>
  // offsetDay 1..30；label "1日" "5日"... 与前端 MEMBER_GROWTH_OFFSETS 一致
  weeklyDemandSeries: Array<{ weekday: string; count: number }>
  // 周一..周日 必须 7 个点（修复周一被裁切是前端 margin 问题，后端仍返回完整 7 天）
  engagement: Array<{ name: string; value: number }>
  // 发布需求 / 评论互动 / 浏览潜水 — MVP 可按 activity type 占比；评论可先 0
}
```

**计算说明**:

- `memberGrowthSeries`：按 `CircleMember.joinedAt` 在 `[start,end]` 内累计 count。  
- `weeklyDemandSeries`：按 `Demand.createdAt` 在当前自然周 bucket。  
- `engagement`：无评论表时 — `DEMAND` / `RESOURCE`+`MEMBER_JOIN` / 其余权重估算，**禁止返回全 0**（至少 seed 有数据）。

Query `range` 仅支持 `30d` MVP；预留 `7d`。

### 3.8 `GET /circles/:id/members?q=&page=&limit=`

扩展成员列表（Teams 页）。现有 `getById` 仅 `take: 20`。

**Response item**:

```ts
{
  userId: string
  role: MemberRole
  joinedAt: string
  lastSeenAt: string | null
  lastActiveLabel: string    // "当前在线" | "2小时前" — 服务端格式化可选
  user: { id; nickname; avatarUrl; bio? }
}
```

### 3.9 邀请（Teams 页）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/circles/:id/invites` | PENDING 列表 |
| POST | `/circles/:id/invites` | `{ email }` OWNER/ADMIN |
| POST | `/circles/:id/invites/:inviteId/resend` | 重置 createdAt |
| DELETE | `/circles/:id/invites/:inviteId` | 撤销 → REVOKED |

MVP **不发真实邮件**；返回 success + 写库。复制链接仍用前端 `inviteCode` 或 `GET /circles/:id/share`。

### 3.10 `POST /circles/:id/hub/heartbeat`（可选 P1）

成员进入 Hub 任意子页时调用，更新 `CircleMember.lastSeenAt`。前端在 `CircleHubLayout` mount 时调一次。

### 3.11 Help 页

**MVP 保持静态 FAQ**（`CircleHubHelp.tsx` 内数组），仅圈主信息来自已有 `circle.owner`。  
可选 P2：`GET /circles/:id/help` 返回 `{ faq[], rules[] }` 全局 seed，非本 Task 阻塞项。

---

## 4. 服务层结构

```
server/src/services/circle-hub.service.ts   # 新建：home/analytics/activities
server/src/services/circle-resource.service.ts
server/src/services/circle-invite.service.ts
server/src/routes/circle-hub.ts             # 挂载到 app 或 merge 进 circle.ts
```

路由注册（`server/src/app.ts` 或现有 index）：

```ts
app.use('/api/circles', circleRouter)
// circleRouter 内嵌 :id/hub/* 或子 router
```

**禁止** fat handler — 逻辑进 service，与 `circle.service.ts` 风格一致。

---

## 5. 前端联调（Codex · Wave F）

### 5.1 扩展 `client-react/src/api/circle.ts`

```ts
getHubHome(circleId: string)
getHubActivities(circleId: string, page?: number)
getResources(circleId: string, params?: { category?: string; q?: string; page?: number })
uploadResource(circleId: string, file: File, category?: string)
deleteResource(circleId: string, resourceId: string)
getAnalytics(circleId: string, range?: '30d')
getMembers(circleId: string, params?: { q?: string; page?: number })
listInvites(circleId: string)
createInvite(circleId: string, email: string)
resendInvite(circleId: string, inviteId: string)
revokeInvite(circleId: string, inviteId: string)
postHeartbeat(circleId: string)  // 可选
```

### 5.2 各页改造要点

| 文件 | 改动 |
|------|------|
| `CircleHubHome.tsx` | 删除 `MOCK_ACTIVITIES`；`useEffect` 拉 `getHubHome`；stats/announcement/activities/tags 绑 API |
| `CircleHubResources.tsx` | 删除 `MOCK_FILES`；搜索/筛选 debounce 调 API；上传接 `FormData` |
| `CircleHubAnalytics.tsx` | 删除 mock 常量；`getAnalytics('30d')` 驱动 KPI + 三图表；保留现有 date caption 逻辑（用 API `range.start/end`） |
| `CircleHubTeams.tsx` | `getMembers` + invites API；复制链接保留 |
| `CircleHubHelp.tsx` | 暂可不动 |
| `CircleHubLayout.tsx` | 可选 heartbeat；`description` 显示修复依赖 Wave A |

### 5.3 UI 约束

- **不得**改 Stitch 布局 class（`cdb-hub-*`）。  
- Loading：复用 `Skeleton` / 现有 hub 空态。  
- 错误：`toast` + 重试按钮。

---

## 6. Wave 执行顺序

| Wave | 内容 | 验证 |
|------|------|------|
| **A** | Prisma schema + migration + `Circle.description` + seed | `pnpm --filter server exec prisma migrate dev` |
| **B** | hub/home + activities + announcement POST + activity 钩子 | 新单测 ≥6 |
| **C** | resources CRUD + upload middleware | 新单测 ≥4 |
| **D** | analytics 聚合 endpoint | 新单测 ≥4；返回 7 天 weekly + range 日期 |
| **E** | members 列表 + invites CRUD + heartbeat 可选 | 新单测 ≥4 |
| **F** | 前端联调 5 页 | `pnpm typecheck` + 手动冒烟 |
| **G** | 文档 + CODEX-HANDOFF 标记完成 | 全量 `pnpm --filter server test` |

**Commit 纪律**（Brain 锁定）：功能 1 commit + 文档 1 commit。

---

## 7. 测试要求

新文件建议：`server/src/__tests__/circle-hub.test.ts`（或按域拆分）。

必覆盖：

1. 非成员访问私密圈 hub → 403  
2. `GET analytics` 返回 `range.start/end` + 7 个 weekday  
3. 上传资源后 `GET resources` 可见 + activity 增加  
4. 创建/撤销 invite 状态流转  
5. `GET home` stats 字段类型完整  

基线：**75/75 全绿后再 + 新用例**。

---

## 8. 手动冒烟（Wave F 后）

1. 登录 → 进入 `/circles/:id/home` — 公告/动态/统计非 mock  
2. `/resources` — 上传文件 → 列表与「最近上传」更新  
3. `/analytics` — 图表随 seed 数据变化；副标题含起始日期  
4. `/teams` — 成员列表完整；邀请 CRUD  
5. `/community` —  regression：需求卡、加入圈子仍正常  
6. 侧栏切换时 shell 不闪断、active 正确  

---

## 9. Definition of Done

- [ ] Migration 已提交且可 `migrate dev`  
- [ ] §3 全部 MVP endpoint 实现  
- [ ] 前端 5 个子页无 `MOCK_` / 「即将上线」toast（Help 快捷入口除外）  
- [ ] `pnpm typecheck` clean  
- [ ] `pnpm --filter server test` ≥ 75 + 新增全绿  
- [ ] `docs/CODEX-HANDOFF.md` Task 8 标记完成  

---

## 10. 明确排除

| 项 | 原因 |
|----|------|
| 真实邮件发送邀请 | 单独立项 |
| 讨论帖 CRUD | MVP seed 即可 |
| Help FAQ 后台 CMS | 静态足够 |
| Task 7 Wave 2 全局页 Bento 包装 | 架构已改为 Hub 子页 |
| Stage 2 公开圈规则 | D4 后置 |

---

## 11. 版本记录

| 日期 | 变更 |
|------|------|
| 2026-06-21 | v1.0 Cursor Brain 起草：Hub 后端 + 联调交给 Codex |
