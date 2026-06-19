# 九木平台 - 技术实现报告

> 基于设计文档 v1.0 与当前代码库状态生成
> 生成日期：2026-05-24

---

## 零、现状总览

当前 Ninewood 是一个功能较完整的 **需求撮合平台**（类似任务大厅），已具备：

- 用户系统（手机号注册/登录、个人资料、认证等级）
- 需求发布/搜索/抢单/接单
- 订单生命周期（支付、完成、评价、争议）
- 圈子（公开/私密群组）
- 即时通讯（私聊/群聊/系统通知，Socket.IO 推送）
- AI Agent 对话 + 语义分类器
- 押金系统
- 短视频

**但核心设计理念与你的文档完全不同：**
- 当前是"任务大厅"模式 → 你要的是"标签 + 活池"模式
- 当前有 GPS 坐标 → 你要的是纯行政区划（无精确位置）
- 当前无标签系统 → 标签是你的核心原语
- 当前无活池/死池分离 → 这是你架构的核心
- 当前无推送/反选/时间杠杆机制

**本次改造是一次平台级的重构，而非功能叠加。**

---

## 一、差距分析：现有 vs 目标

### 1.1 数据模型对照

| 设计文档概念 | 现有对应 | 差距 |
|-------------|---------|------|
| **行政区划 (Regions)** | `cityCode` 字段（User/Demand 上各一个字符串） | 需新建完整的 Region 层级表（国家→省→市→区县） |
| **标签 (Tags)** | `category` + `taxonomyLeafId`（需求上的简单字段） | 需新建独立的 Tag 模型；标签主战场是**服务者**（主动打标签/开关），需求打标签是辅助检索 |
| **需求 (Demands)** | 现有 Demand 模型（17 字段） | 需增加 `tags[]`, `region_id`, `is_certified_only`, `push_config`, `stage`, `cover_image`, `amount_estimate`, `deleted_at`；需移除 `locationLat`, `locationLng` |
| **活池 (Active Pool)** | 无 | 需新建 ActiveDemand 表（时间杠杆数据） |
| **死池 (Dead Pool)** | DemandStatus.COMPLETED | 需新建 DeadDemand 表或通过 stage 字段区分 |
| **认证服务者** | User.certificationLevel（5 级枚举） | 需新建 CertifiedProvider 表，关联标签和区域 |
| **应标/竞标** | 无（当前是抢单模式：一人接单） | 需支持多人应标 → 需求者选择的竞标流程，需新增 Bid 模型或扩展 Order 模型 |
| **推送/反选** | 无 | 需新建 PushConfig (JSONB) + UserBlocklist |
| **色条** | 无 | DeadDemand 上的 color_code 字段 |
| **未分类需求** | 无 | 通过 tags 为空数组来表示（无法/不愿用标签描述的需求） |

> **注意**：当前 Prisma Demand 模型使用 `DemandStatus` 枚举（PENDING, ACCEPTED, PAID, IN_PROGRESS, COMPLETED, CANCELLED, FROZEN）。新增的 `stage` 字段与 `status` 并行存在，映射关系见 §2.2。

### 1.2 API 对照

| 设计 API | 现有对应 | 差距 |
|----------|---------|------|
| `POST /api/demand` | `POST /api/demands` | 字段差异大，需重写 |
| `POST /api/demand/:id/extend` | 无 | 全新 |
| `POST /api/demand/:id/complete` | `POST /api/orders/:id/complete` | 逻辑不同（需写入死池、固化封面，需求者选定封面图片） |
| `POST /api/demand/:id/bid` | 无 | 全新（服务者应标，替代现有抢单模式） |
| `GET /api/demand/active` | `GET /api/demands/search` | 标签筛选 + 未分类需求视图 |
| `GET /api/demand/dead` | 无 | 全新（含权限门控） |
| `GET /api/demand/active?special=true` | 无 | 全新（特殊搜索） |
| `PUT /api/demand/:id/push` | 无 | 全新 |
| `PUT /api/user/blocklist` | 无 | 全新 |
| `GET /api/regions` | 无 | 全新 |

### 1.3 前端对照

| 设计页面 | 现有页面 | 差距 |
|---------|---------|------|
| 发现页（活池浏览） | `Discover.tsx` | 需重写为标签筛选 + 地域选择器 + 池切换 |
| 死池浏览 | 无 | 全新页面（需权限门控） |
| 发布需求 | `DemandCreate.tsx` | 需增加标签选择、推送配置、地域选择 |
| 未分类需求卡包 | 无 | 全新视图 |
| 标签管理 | 无 | 全新页面（服务者标签开关） |
| 推送屏蔽设置 | `Settings.tsx` 部分 | 需扩展 |
| 卡池资源探索器 | `CardPoolResourceExplorer.tsx` | 可能需要重定向到新的死池入口 |

---

## 二、数据库迁移方案

### 2.1 新增表

```sql
-- 行政区划表（预填充中国行政区划数据）
CREATE TABLE regions (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level TINYINT NOT NULL,  -- 1=国家 2=省 3=市 4=区县
  parent_id INT NOT NULL DEFAULT 0
);

-- 标签表
CREATE TABLE tags (
  name VARCHAR(50) PRIMARY KEY,
  type ENUM('service', 'demand', 'both') NOT NULL DEFAULT 'both',
  total_completed INT NOT NULL DEFAULT 0,
  total_estimated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  color_histogram JSONB NOT NULL DEFAULT '[]'
);

-- 认证服务者表
-- 注意：tags 使用 TEXT[] 而非外键关联 tags 表，这是有意的取舍——
-- PostgreSQL TEXT[] 不支持外键约束。如需保证引用完整性，可在应用层校验，
-- 或改用关联表 certified_provider_tags(provider_id, tag_name)。
CREATE TABLE certified_providers (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  tags TEXT[] NOT NULL DEFAULT '{}',
  region_id INT REFERENCES regions(id),
  avg_rating FLOAT NOT NULL DEFAULT 0,
  total_completed INT NOT NULL DEFAULT 0
);

-- 活池需求扩展表（时间杠杆）
CREATE TABLE active_demands (
  demand_id UUID PRIMARY KEY REFERENCES demands(id),
  expiration_strategy ENUM('normal', 'extended') NOT NULL DEFAULT 'normal',
  extension_months INT NOT NULL DEFAULT 0,
  forgiveness_used INT NOT NULL DEFAULT 0,
  next_compression_date TIMESTAMP
);
```

### 2.2 修改现有表

```sql
-- Demand 表改造
-- 注意：cover_image 在需求发布时为 NULL，仅在 POST /api/demand/:id/complete
-- （需求完成、移入死池）时由需求者选定填充，填充后不可二次更改
ALTER TABLE demands
  ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN region_id INT REFERENCES regions(id),
  ADD COLUMN is_certified_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN push_config JSONB,
  ADD COLUMN stage ENUM('active', 'compressed', 'completed') NOT NULL DEFAULT 'active',
  ADD COLUMN cover_image VARCHAR(255),
  ADD COLUMN amount_estimate DECIMAL(10,2),
  ADD COLUMN deleted_at TIMESTAMP,
  DROP COLUMN location_lat,
  DROP COLUMN location_lng;

-- User 表扩展
ALTER TABLE users
  ADD COLUMN push_blocklist JSONB NOT NULL DEFAULT '{"tags":[],"keywords":[],"ageRanges":[]}',
  ADD COLUMN has_visited_completed_list BOOLEAN NOT NULL DEFAULT false;
```

**现有 `DemandStatus` 枚举 → 新 `stage` 字段映射：**

| 旧 status | 新 stage | 说明 |
|-----------|---------|------|
| `PENDING` | `active` | 待接单，在活池中 |
| `ACCEPTED` | `active` | 已接单，服务中 |
| `PAID` | `active` | 已支付 |
| `IN_PROGRESS` | `active` | 进行中 |
| `FROZEN` | `active` | 冻结（保留在原状态，可单独处理） |
| `COMPLETED` | `completed` | 完成，进入死池 |
| `CANCELLED` | `completed` | 取消（不进入死池展示，但 stage 标记为 completed 以区分） |

> `status` 字段保留不删，继续承载订单流转逻辑；`stage` 是新增的池生命周期维度。
```

### 2.3 索引策略

```sql
CREATE INDEX idx_demands_region_stage ON demands(region_id, stage);
CREATE INDEX idx_demands_tags ON demands USING GIN(tags);
CREATE INDEX idx_demands_stage_created ON demands(stage, created_at DESC);
CREATE INDEX idx_certified_region_tags ON certified_providers(region_id, tags);
CREATE INDEX idx_regions_parent ON regions(parent_id);
```

---

## 三、后端实现计划

### 3.1 新增服务模块

| 模块 | 文件 | 职责 |
|------|------|------|
| `region.service.ts` | `server/src/services/` | 行政区划 CRUD、级联查询 |
| `tag.service.ts` | `server/src/services/` | 标签 CRUD、统计更新、色条聚合 |
| `pool.service.ts` | `server/src/services/` | 活池/死池检索、时间杠杆计算、压缩调度 |
| `certification.service.ts` | `server/src/services/` | 认证服务者注册/检索（扩展现有 cert 逻辑） |
| `push.service.ts` | `server/src/services/` | 推送条件匹配、反选过滤、通知分发 |
| `bid.service.ts` | `server/src/services/` | 应标/竞标流程、竞标群聊创建 |

### 3.2 新增/改造路由

| 路由文件 | 路径前缀 | 关键端点 |
|---------|---------|---------|
| `region.ts` | `/api/regions` | `GET /` (级联查询) |
| `tag.ts` | `/api/tags` | `GET /` (列表), `PUT /user/tags` (个人标签开关) |
| `demand.ts` (重写) | `/api/demand` | `POST /` (发布), `GET /active` (活池), `GET /dead` (死池), `POST /:id/extend`, `POST /:id/complete`, `POST /:id/bid` (应标), `GET /:id/bids` (查看应标列表), `PUT /:id/push` |
| `certification.ts` | `/api/certification` | `POST /register`, `GET /providers` |
| `user.ts` (扩展) | `/api/users` | `PUT /blocklist`, `GET /blocklist` |

### 3.3 时间杠杆引擎（核心逻辑）

```
核心公式（纯函数，支持多次延期累加）：

  totalAcceleration = sum(所有延期月数) × 10    // 单位：月
  coverDeletion  = max(T0, (T0 + 1)  - totalAcceleration)
  detailDeletion = max(T0, (T0 + 12) - totalAcceleration)
  cardDeletion   = T0 + 36 - totalAcceleration

T0: 发布时间

默认阶段（无延期）：
  封面删除 = T0 + 1 月
  详情删除 = T0 + 12 月    ← 这就是"12月保质期"
  卡片删除 = T0 + 36 月

第一次延期（T0 时刻，延期 1 月）：
  totalAcceleration = 1 × 10 = 10
  封面删除 = max(T0, T0 + 1 - 10)  = T0（即刻删除）
  详情删除 = max(T0, T0 + 12 - 10) = T0 + 2 月    ← "12月缩短为2月"
  卡片删除 = T0 + 36 - 10          = T0 + 26 月

第二次延期（T0+2 月时，再延期 2 月）：
  totalAcceleration = (1 + 2) × 10 = 30
  详情删除 = max(T0, T0 + 12 - 30) = T0（即刻删除）
  卡片删除 = T0 + 36 - 30          = T0 + 6 月
  此时距离现在（T0+2）还剩 4 月；再等 2 月后距离删卡只剩 2 月
```

实现为纯函数 `calculateCompressionDates(publishedAt: Date, totalExtendedMonths: number)`，返回三个删除日期。`active_demands.extension_months` 存储累计延期月数，每次延期累加。

### 3.4 定时任务

在现有 cron 目录（`server/src/cron/`，已有 4 个定时任务：圈子活跃度、抢单额度重置、需求冻结、消息清理）中新增：

| 任务 | 频率 | 动作 |
|------|------|------|
| `compression-scheduler.ts` | 每 6 小时 | 检查当前时间是否达到 coverDeletion / detailDeletion / cardDeletion，将到期需求推进到下一压缩阶段（删封面→删详情→删卡） |

并在 `server/src/cron/index.ts` 中注册新任务。

---

## 四、前端实现计划

### 4.1 新增页面

| 页面 | 路由 | 核心组件 |
|------|------|---------|
| 发现页（重写） | `/discover` | 地域选择器、标签筛选项、活池/死池 Tab、需求卡片列表 |
| 死池浏览 | `/card-pool/dead` | 色条展示、标签筛选、地域筛选 |
| 标签管理 | `/my-tags` | 标签开关列表、忙碌状态切换、特殊搜索通知开关 |
| 未分类需求卡包 | `/discover/untagged` | "?" 封面入口、未分类需求列表 |
| 推送屏蔽设置 | `/settings/blocklist` | 关键词管理、标签屏蔽、年龄段屏蔽 |
| 认证服务者搜索 | `/discover/certified` | 认证标识、按标签+地域筛选 |
| 应标管理 | `/my-bids` | 我发出的应标列表、应标状态追踪、竞标群聊入口 |

### 4.2 修改现有页面

| 页面 | 改动 |
|------|------|
| `DemandCreate.tsx` | 增加标签选择器（多选）、推送配置区（折叠面板）、地域选择器（代替坐标选取） |
| `DemandDetail.tsx` | 显示标签、地域、推送状态；延期按钮（含时间轴预览弹窗）；应标列表（需求者视角）/ 应标按钮（服务者视角） |
| `MyDemands.tsx` | 增加"我发布的需求"的应标管理入口；完成时引导选择封面图片 |
| `CardPool.tsx` | 重构为标签卡包视图 |
| `CardPoolResourceExplorer.tsx` | 重定向或改造为死池入口 |
| `Settings.tsx` | 增加推送屏蔽 tab |
| `Profile.tsx` | 增加标签管理入口、认证状态展示 |

### 4.3 新增 Zustand Store

| Store | 职责 |
|-------|------|
| `region.ts` | 当前选中的地域层级、地域树缓存 |
| `tags.ts` | 用户标签列表、热门标签、标签筛选状态（包含/排除） |
| `pool.ts` | 当前池视图（活池/死池）、检索参数、分页状态 |

### 4.4 关键 UI 组件

| 组件 | 说明 |
|------|------|
| `RegionCascader` | 省→市→区县级联选择器 |
| `TagSelector` | 多选标签，支持包含/排除切换 |
| `TimeLeverageModal` | 延期确认弹窗，显示时间轴变化预览 |
| `ColorBar` | 色条渲染组件（基于 color_code 显示渐变色条） |
| `UntaggedCard` | 未分类需求入口卡片（大 "?" 图标） |
| `PushConfigPanel` | 推送条件配置面板（地域+关键词+年龄段） |

---

## 五、实现阶段划分

### 阶段 1：数据基础（预计 3-5 天）

**目标**：建好地基，不破坏现有功能。

- [ ] 创建 `regions` 表并预填充中国行政区划数据（省 34 + 市 ~350 + 区县 ~3000）
- [ ] 创建 `tags` 表
- [ ] 创建 `active_demands` 表
- [ ] 创建 `certified_providers` 表
- [ ] 修改 `demands` 表（新增字段、移除坐标）
- [ ] 修改 `users` 表（新增 push_blocklist）
- [ ] 编写 Prisma 迁移
- [ ] 实现 `region.service.ts` + `GET /api/regions`
- [ ] 实现 `tag.service.ts` + 基础 CRUD

**验证**：新表创建成功，`/api/regions` 返回省市区数据，旧 API 不报错。

### 阶段 2：活池/死池核心（预计 5-7 天）

**目标**：需求可以在活池/死池间流转。

- [ ] 重写 `POST /api/demand`（新字段结构）
- [ ] 实现 `pool.service.ts`（活池检索、死池检索）
- [ ] 实现 `GET /api/demand/active`（标签筛选+地域+分页）
- [ ] 实现 `POST /api/demand/:id/bid` + `GET /api/demand/:id/bids`（应标/竞标流程，替代旧抢单模式）
- [ ] 实现 `POST /api/demand/:id/complete`（移入死池，需求者选定封面图片并固化+色条）
- [ ] 实现 `GET /api/demand/dead`（权限门控）
- [ ] 实现时间杠杆引擎（纯函数支持多次延期累加 + `POST /api/demand/:id/extend`）
- [ ] 实现压缩调度定时任务
- [ ] 改造 `Discover.tsx`（活池视图 + 标签筛选 + 地域选择器）
- [ ] 实现死池浏览页面
- [ ] 实现未分类需求卡包视图

**验证**：发布需求 → 活池可见 → 完成交易 → 死池记录 → 封面固化 → 色条显示。

### 阶段 3：标签 + 认证系统（预计 3-4 天）

**目标**：服务者可以通过标签和认证被检索。

- [ ] 实现用户标签管理（服务者打标签/去标签、忙碌状态切换）
- [ ] 实现认证服务者注册 + 检索
- [ ] 实现标签统计更新（total_completed, total_estimated_amount, color_histogram）
- [ ] 标签管理页面（前端）
- [ ] 认证服务者搜索页面（前端，带认证标识）

**验证**：服务者打"出租车"标签 → 用户搜索"出租车"标签 → 看到该服务者。

### 阶段 4：推送 + 反选（预计 3-4 天）

**目标**：需求者可以精准推送，服务者可以精确屏蔽。

- [ ] 实现 `push.service.ts`（条件匹配引擎）
- [ ] 实现 `POST /api/demand/:id/push`（配置推送条件）
- [ ] 实现 `GET /api/user/blocklist` + `PUT /api/user/blocklist`
- [ ] 实现推送分发（需求者推送 → 匹配服务者 → 通知）
- [ ] 推送配置面板（前端）
- [ ] 推送屏蔽设置页面（前端）

**验证**：推送"18岁+动漫标签" → 18岁动漫爱好者收到通知 → 屏蔽"动漫"关键词的服务者不收到通知。

### 阶段 5：特殊搜索 + 忙碌状态（预计 2-3 天）

**目标**：支持高级场景（出租车没下客就接下一单）。

- [ ] 实现特殊搜索 API（忙碌服务者、压缩需求）
- [ ] 服务者忙碌通知开关
- [ ] 特殊搜索前端开关 + 结果展示（匿名化）
- [ ] 忙碌状态自动管理（服务中自动半隐藏）

**验证**：司机忙碌中 → 乘客特殊搜索 → 看到忙碌司机（无精确位置）→ 发起请求 → 司机结束后收到通知。

### 阶段 6：清理 + 测试 + 文档（预计 2-3 天）

- [ ] 移除旧 Demand 模型的残留逻辑
- [ ] 清理不再需要的 API 端点
- [ ] 编写核心流程测试
- [ ] 更新 CLAUDE.md 项目说明

---

## 六、架构决策记录

### ADR-1：死池用单独表还是 stage 字段？

**决策**：使用 `stage` 字段区分，不新建死池表。

**理由**：
- 活池和死池本质是同一条需求的不同生命周期阶段
- 用 `stage` 字段 + `active_demands` 扩展表即可满足需求
- 单独建表会导致数据同步问题（完成交易时需要跨表移动）

### ADR-2：行政区划数据从哪里来？

**决策**：预填充静态数据，不自建 GPS 服务。

**理由**：
- 开发阶段明确不接入真实 GPS
- 国家统计局有公开的行政区划代码（6 位编码）
- 预填充 3000+ 条区县级数据，体积小（< 1MB）
- 未来如需精确距离，可在前端用行政区划中心点粗略计算

### ADR-3：标签是预定义还是用户自创？

**决策**：预定义标签池 + 用户申请新标签（需审核）。

**理由**：
- 完全自由创建会导致标签泛滥、同义重复（"打车"/"出租车"/"的士"）
- 预定义保证检索一致性
- 开放申请通道避免标签不足

### ADR-4：推送是轮询还是 WebSocket？

**决策**：WebSocket（复用现有 Socket.IO 基础设施）。

**理由**：
- 项目已有成熟的 Socket.IO 集成
- 推送是即时通知场景，不需要离线队列
- 服务者在线时才需要收到推送，离线用户下次登录时拉取即可

### ADR-5：死池访问门控如何实现？

**决策**：前端路由守卫 + 数据库字段校验。

**理由**：
- 项目使用 JWT 认证（无 session），无法在服务端内存中设标志
- 替代方案：在 User 表增加 `has_visited_completed_list BOOLEAN DEFAULT false` 字段
- 用户首次访问"我的完成列表"时，后端将此字段设为 `true`
- 死池 API 校验此字段，未访问过完成列表的用户无法浏览死池
- 前端路由守卫在进入死池页面前先请求"我的完成列表"接口，确保标志已设置
- 这不是安全机制（用户可通过直接调用 API 绕过），而是体验门槛：让用户先了解自己的完成记录，再接触他人的死池数据

---

## 七、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 时间杠杆多次延期累加，易出 Bug | 需求被提前删除或永不删除 | 纯函数 `calculateCompressionDates(publishedAt, totalExtendedMonths)` + 单元测试覆盖单次/多次延期边界用例 |
| 竞标机制缺失（当前是抢单模式） | 无法实现"多人应标→需求者选择"流程 | 阶段 2 同步实现 `POST /api/demand/:id/bid`，不延后 |
| 标签预填充数据不完整 | 初期标签覆盖不足 | 提供标签申请通道，运营期可快速补充 |
| 行政区划数据变更 | 数据与实际不符 | 提供管理后台更新接口，定期同步统计局数据 |
| 老数据迁移（现有需求无 region_id） | 迁移失败或数据丢失 | 迁移脚本使用 `cityCode` 映射到 `region_id`，无法映射的归入"全国" |
| 活池检索性能（GIN 索引 + 多条件） | 检索 > 200ms，标签反选（排除）查询效率低 | 阶段 2 建立索引，用 EXPLAIN 验证；对反选查询考虑应用层过滤 |
| 色条计算逻辑未定义 | 阶段 2 实现时卡住，色条无法渲染 | 暂时全部使用默认彩色渐变渲染，后续迭代再接入计算逻辑 |
| 前端重构范围大（多个页面需改） | 开发周期失控 | 严格按阶段推进，每阶段独立可验证 |

---

## 八、统计

| 维度 | 数量 |
|------|------|
| 新增数据表 | 4（regions, tags, certified_providers, active_demands） |
| 修改数据表 | 2（demands, users） |
| 新增服务文件 | 6（region, tag, pool, certification, push, bid） |
| 新增路由文件 | 2（region, tag） |
| 重写路由文件 | 1（demand，含应标端点） |
| 新增前端页面 | 7（含应标管理） |
| 修改前端页面 | 6+ |
| 新增 Zustand Store | 3 |
| 新增 UI 组件 | 8+ |
| 预计总工期 | 22-34 天（单兵，含 30-50% 缓冲） |

> 原估算 18-26 天偏乐观，增加缓冲主要考虑：Prisma 迁移回滚调试、GIN 索引调优、竞标机制、跨页面回归测试、UI 打磨。

---

## 九、立即可开始的工作

以下任务 **不依赖任何其他改动**，可以现在就开始：

1. **创建 `regions` 表并填充数据** — 纯数据工作，不影响现有功能
2. **实现 `GET /api/regions` 级联查询** — 独立的新端点
3. **创建 `tags` 表 + 基础 CRUD** — 独立模块
4. **前端 RegionCascader 组件** — 可先用于发布需求页替换坐标选取
5. **前端 TagSelector 组件** — 通用多选组件

---

**报告结束。** 如需对某个阶段展开详细实现方案，或需要调整优先级/范围，请告知。

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|---------|
| v1.1 | 2026-05-24 | ADR-5：session → JWT + 数据库字段方案；3.4：修正 cron 目录描述为"现有目录新增"；3.3：补充多次延期累加场景和纯函数签名；2.2：补充 cover_image 填充时机说明 + DemandStatus 枚举映射表；1.1/1.2：增加竞标机制差距分析；4.1/4.2：增加应标管理页面；3.1/3.2：增加 bid 服务和端点；七：增加多次延期、竞标缺失、色条未定义、标签反选性能风险；八：更新统计数据，工期增加 30-50% 缓冲；2.1：补充 certified_providers.tags 无 FK 约束的取舍说明 |
