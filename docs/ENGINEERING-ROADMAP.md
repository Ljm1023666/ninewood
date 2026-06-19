# 九木平台工程实现文档

> 版本: AI 2.5 → AI 3.0+
> 创建: 2026-05-25 | 最后更新: 2026-05-26
> 文档范围: 需求发布全规则 + 服务者标签系统 + 双模式检索 + 推送引擎 + 卡池生命周期 + 标签分析 + 认证检索 + 需求圈体系

---

## 目录

0. [产品设计原则](#0-产品设计原则)
1. [数据模型总览](#1-数据模型总览)
2. [Part A：需求发布系统](#2-part-a需求发布系统)
   - 2.1 位置模糊
   - 2.2 15 分钟紧急窗口
   - 2.3 AI 标签认可
   - 2.4 效果导向验收
   - 2.5 押金与多单规则
   - 2.6 两段式接单
   - 2.7 平台结算
   - 2.8 需求冻结
   - 2.9 虚假需求与撤回
   - 2.10 需求圈
3. [Part B：服务者检索系统](#3-part-b服务者检索系统)
   - 3.1 标签状态机
   - 3.2 普通检索
   - 3.3 特殊检索
   - 3.4 认证检索
4. [Part C：推送与通知](#4-part-c推送与通知)
5. [Part D：卡池生命周期](#5-part-d卡池生命周期)
6. [Part E：标签分析与市场指标](#6-part-e标签分析与市场指标)
7. [Part F：公益需求系统](#7-part-f公益需求系统)
8. [Part G：需求圈体系](#8-part-g需求圈体系)
9. [安全与隐私](#9-安全与隐私)
10. [实施路线图](#10-实施路线图)
11. [API 接口清单](#11-api-接口清单)

---

## 0. 产品设计原则

### 0.1 核心命题

九木不是「需求广场」，而是**匿名的服务连接器**。每一个用户同时具有两种身份：

- **需求者（Demander）：** 发布需求，寻找服务者
- **服务者（Provider）：** 打标签，声明自己可以提供的服务

核心命题是**「在保护双方隐私的前提下，高效地连接有服务意愿的人和需要服务的人」**。

### 0.2 设计铁律

1. **需求是紧急的。** 默认 15 分钟窗口，过期自动冻结。鼓励快速决策。
2. **隐私是不可侵犯的。** 位置永远加 50 米随机噪声。精确定位不落库。
3. **质量是验收标准。** 需求必须填写预期效果。没达标 = 可拒绝付款。
4. **平台不推流。** 用户自己检索、自己选择。平台只提供连接，不替用户做决策。
5. **好的 UI 是感觉不到 UI 的存在。** 打开软件，里面没有多余的东西。
6. **有需求的人能找到想服务的人。** 其他的，是用户的生活。

---

## 1. 数据模型总览

### 1.1 核心表关系

```
User ──┬── UserTag (服务者标签状态) ─── TagStats (标签统计)
       │
       ├── Demand (需求) ──┬── DemandApplicant (请求接单记录)
       │                  ├── DemandPush (推送记录)
       │                  └── Card (死池卡牌)
       │
       ├── UserPushPreference (推送偏好)
       ├── Certification (认证)
       └── Circle (需求圈) ──┬── CircleMember (圈子成员)
                             └── CircleDemand (圈内需求关联)
```

### 1.2 与现有系统的关系

```
当前 (AI 2.4)             本次改造后
─────────────────────────────────────
Demand                    Demand (大幅扩展)
User                      User (不变)
Tag                       Tag (不变)
                          UserTag (新增)
                          DemandApplicant (新增)
                          DemandPush (新增)
                          UserPushPreference (新增)
                          Card (新增)
                          TagStats (新增)
                          Transaction (扩展)
                          Circle (新增)
                          AuditLog (新增)
```

---

## 2. Part A：需求发布系统

### 2.1 位置模糊（规则 1）

用户打开位置权限 → 发布需求时前端传入精确 GPS → 后端立即加噪存储：

```typescript
// server/src/utils/location-fuzz.ts
export function fuzzLocation(lat: number, lng: number) {
  // 50 米左右误差：0.00045 度 ≈ 50m
  const jitter = () => (Math.random() - 0.5) * 0.0009
  return { lat: lat + jitter(), lng: lng + jitter() }
}
// 精确定位永不落库，只存模糊坐标
```

- 开发阶段用 IP → 行政区划替代 GPS
- API 返回给其他用户的只有模糊坐标
- 需求发布后，附近的人可以搜到（按模糊坐标计算距离）

### 2.2 15 分钟紧急窗口（规则 2）

**核心理念：** 用户发布需求时是紧急状态，默认 15 分钟公开窗口。来不及设置为长期需求，这本身就是一种设计意图——需求发布的零摩擦。

```
需求发布 → 15:00 倒计时开始
  ├─ 所有人可见可申请
  ├─ 任何人点击「请求接单」
  │   └─ 获得 5 分钟专属沟通资格（不受 15 分钟窗口影响）
  ├─ 14:59 时还有人来申请 → 依然给 5 分钟
  ├─ 15:00 到 → 需求冻结/隐藏
  │   └─ 已获得沟通资格的人，5 分钟窗口继续有效
  ├─ 发布者选择某人「正式接单」
  │   └─ 需求销毁，未选中者窗口强制关闭
  └─ 无人请求 / 发布者不做决定
      └─ 需求冻结，进入冻结池
```

**沟通计时规则：**

```
申请者发出描述消息 → 发布者回复 → 开始 5 分钟倒计时
双方必须在 5 分钟内说服对方
双方可协商延长（无上限），直到需求被完成或正式接单
需求完成 → 所有沟通资格强制切断（加好友除外）
```

#### 2.2.1 数据模型

```prisma
model Demand {
  id               String   @id @default(uuid())
  userId           String
  title            String
  description      String

  // ── 紧急窗口 ──
  visibilityWindow Int      @default(15)  // 公开分钟数，默认 15
  visibleUntil     DateTime               // 公开截止时间 = 发布时间 + visibilityWindow
  frozenAt         DateTime?              // 冻结时间

  // ── 申请控制 ──
  maxApplicants    Int      @default(10)  // 最大申请人数，默认 10
  applicantCount   Int      @default(0)   // 当前申请人数

  // ── 效果导向 ──
  expectedOutcome  String                 // 预期效果 (必填)
  timeLimit        DateTime?              // 时间限制

  // ── 金额 ──
  minPrice         Float                  // 最低报价（1 元起）
  finalPrice       Float?                 // 最终成交价

  // ── 押金 ──
  deposit          Float    @default(0)   // 押金金额

  // ── 状态 ──
  status           DemandStatus @default(ACTIVE)

  // ── 标签 ──
  tags             String[]               // AI 识别或用户自选标签
  aiTags           String[]               // AI 原始建议（用户可拒绝）
  tagsConfirmed    Boolean  @default(false) // 用户是否确认标签

  // ── 位置 ──
  fuzzyLat         Float?                 // 模糊纬度
  fuzzyLng         Float?                 // 模糊经度
  regionId         Int?                   // 行政区划 ID

  // ── 公益 ──
  isPublicWelfare  Boolean  @default(false)

  // ── 圈子 ──
  circleId         String?                // 所属需求圈

  // ── 生命周期 ──
  lifecycleStage   LifecycleStage @default(ACTIVE)
  coverDeletedAt   DateTime?
  detailDeletedAt  DateTime?
  fullDeletedAt    DateTime?

  // 关联
  user             User     @relation(fields: [userId], references: [id])
  applicants       DemandApplicant[]
  acceptedProviderId String?
  acceptedProvider User?    @relation("AcceptedDemands", fields: [acceptedProviderId], references: [id])

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([status, visibleUntil])
  @@index([frozenAt])
  @@index([userId, status])
  @@index([fuzzyLat, fuzzyLng, status])
}

enum DemandStatus {
  ACTIVE       // 公开中（15 分钟窗口内）
  FROZEN       // 已冻结（超时或无人接单）
  IN_PROGRESS  // 已有人正式接单，服务进行中
  COMPLETED    // 已完成
  WITHDRAWN    // 用户自行撤回
}
```

#### 2.2.2 DemandApplicant

```prisma
model DemandApplicant {
  id              String   @id @default(uuid())
  demandId         String
  demand           Demand   @relation(fields: [demandId], references: [id])
  userId           String
  user             User     @relation(fields: [userId], references: [id])

  message         String    // 申请理由（如何解决该需求）

  // ── 沟通窗口 ──
  status           ApplicantStatus @default(PENDING)
  commStartAt      DateTime?      // 双方各发一条消息后的时间
  commDeadline     DateTime?      // commStartAt + 5 分钟 + 延期
  extensionMinutes Int    @default(0)

  createdAt        DateTime @default(now())

  @@unique([demandId, userId])  // 一人一条需求只能申请一次
  @@index([demandId, status])
}

enum ApplicantStatus {
  PENDING         // 已申请，等待发布者回复
  COMMUNICATING   // 沟通中
  ACCEPTED        // 被选中 → 正式接单
  REJECTED        // 被发布者拒绝
  TIMED_OUT       // 沟通超时
  WITHDRAWN       // 申请者主动撤回
}
```

#### 2.2.3 定时任务

```typescript
// server/src/jobs/demand-window.ts
// 每 30 秒执行
export async function processDemandWindows() {
  const now = new Date()

  // 1. 超时冻结
  await prisma.demand.updateMany({
    where: {
      status: 'ACTIVE',
      visibleUntil: { lte: now },
      acceptedProviderId: null
    },
    data: { status: 'FROZEN', frozenAt: now }
  })

  // 2. 沟通超时
  await prisma.demandApplicant.updateMany({
    where: {
      status: 'COMMUNICATING',
      commDeadline: { lte: now }
    },
    data: { status: 'TIMED_OUT' }
  })

  // 3. 满额隐藏：前端不渲染 + 后端拦截
  // 前端: applicantCount >= maxApplicants 时不显示「请求接单」按钮
  // 后端: POST /api/demands/:id/request 检查计数，超限返回 429
}
```

### 2.3 AI 标签认可（规则 3）

需求发布时 AI 自动分析标题和描述，建议标签。用户可：

- **确认 AI 建议的标签**
- **手动修改/添加/删除**
- **完全拒绝，自己选或不用标签**

确认后，带有标签的需求可以被推送给相关认证者。认证者可选择「主动接收」模式，不推送也能收到通知。

```typescript
// 发布需求时的标签流程
interface PublishDemandRequest {
  title: string
  description: string
  expectedOutcome: string
  minPrice: number
  // ... other fields ...

  aiTags?: string[]        // AI 建议的标签（后端分析后返回给前端展示）
  confirmedTags?: string[] // 用户确认后的标签
  userCustomTags?: string[] // 用户自己添加的标签
}

// 标签确认流程:
// 1. 用户输入标题 + 描述
// 2. 后端调用 AI 分析 → 返回建议标签列表
// 3. 前端展示「AI 建议标签」，用户可勾选/取消/添加
// 4. 用户提交 → confirmedTags 落库
```

```typescript
// server/src/services/tag-notification.ts
// 推送标签通知给认证者
export async function notifyCertifiedProviders(tags: string[], demandId: string) {
  // 查找所有在该标签下「主动接收」模式的认证服务者
  const providers = await prisma.userTag.findMany({
    where: {
      tagName: { in: tags },
      certified: true,
      autoReceive: true // 主动接收模式
    },
    include: { user: true }
  })

  // 批量发送通知
  for (const p of providers) {
    await sendNotification(p.userId, `新需求「${demandId}」匹配你的标签「${p.tagName}」`)
  }
}
```

### 2.4 效果导向（规则 4）

需求必须填写 `expectedOutcome`。这是服务者的下限，验收的唯一标准。

- 没达标 → 需求者可拒绝付款，平台介入仲裁
- 达标 → 需求者必须付款
- 双方无证据 → 默认付款

```typescript
// 验收逻辑
export async function verifyCompletion(demandId: string, outcomeEvidence: string) {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    include: { acceptedProvider: true }
  })
  // 平台将 expectedOutcome 与实际交付比对
  // 争议时：双方各提交证据 → 平台仲裁
  // 无争议：自动通过

  return {
    passed: boolean,
    reason?: string,
    requiresArbitration: boolean
  }
}
```

**强烈建议填写时间限制：**

```prisma
// Demand 表已有 timeLimit 字段
// 示例: "30 分钟内到达" → timeLimit = 发布时间 + 30分钟
```

### 2.5 押金与多单规则（规则 6）

```
单条需求：免费发布，无需押金
同时多需求（≥2 条未完成）：每条需缴纳 最低报价 × 1% 作为押金

需求完成 → 押金全退
需求冻结 → 押金不退（鼓励用户主动管理需求）
自行删除冻结需求 → 押金退回
自行撤回活跃需求 → 退 99.99%
最低报价 ≥ ¥1 元
```

```typescript
// server/src/services/deposit.ts

export async function calculateDeposit(userId: string, minPrice: number): Promise<number> {
  const activeCount = await prisma.demand.count({
    where: {
      userId,
      status: { in: ['ACTIVE', 'IN_PROGRESS'] }
    }
  })
  // 第一单免费，第二单开始收押金
  if (activeCount < 1) return 0
  return Math.round(minPrice * 0.01 * 100) / 100
}

export async function checkFrozenBeforePublish(userId: string) {
  const frozenCount = await prisma.demand.count({
    where: { userId, status: 'FROZEN' }
  })
  if (frozenCount > 0) {
    throw new PublishBlockedError(
      `你有 ${frozenCount} 条冻结需求，请先删除它们之后再发布新需求`
    )
  }
}

export async function refundOnDelete(demandId: string, reason: 'WITHDRAWN' | 'DELETE_FROZEN') {
  const demand = await prisma.demand.findUnique({ where: { id: demandId } })
  if (!demand || demand.deposit <= 0) return

  let refundRatio: number
  if (reason === 'DELETE_FROZEN') refundRatio = 1.0      // 删除冻结 → 全退
  else refundRatio = 0.9999                                 // 自行撤回 → 退 99.99%

  const refundAmount = Math.round(demand.deposit * refundRatio * 100) / 100
  // 退回用户账户
  await refundUser(demand.userId, refundAmount)
}
```

### 2.6 两段式接单（规则 6）

```
Phase 1: 请求接单
  服务者点击「请求接单」→ 填写申请理由
  → 系统创建 DemandApplicant(PENDING)
  → 发布者收到通知
  → 该服务者获得专属沟通资格

Phase 2: 正式接单
  发布者查看所有申请人 + 沟通
  → 选择一人「正式接单」
  → 需求变为 IN_PROGRESS
  → 需求对其他人彻底隐藏
  → 未选中者强制关闭沟通窗口
```

**申请上限：** 发布者设定（默认 10 人）。达到上限后需求自动隐藏，发布者拒绝掉一些后才能重新出现在广场。

```typescript
// POST /api/demands/:id/request
export async function requestDemand(req: Request, res: Response) {
  const demand = await prisma.demand.findUnique({ where: { id: demandId } })

  // 检查窗口
  if (demand.status !== 'ACTIVE' || new Date() > demand.visibleUntil) {
    throw new Error('需求已过期')
  }
  // 检查满员
  if (demand.applicantCount >= demand.maxApplicants) {
    res.status(429).json({ error: 'APPLICANTS_FULL', message: '申请人数已达上限，请等待发布者释放名额' })
    return
  }

  const applicant = await prisma.demandApplicant.create({
    data: {
      demandId,
      userId: req.user.id,
      message: req.body.message,
      // 沟通资格 = 现在 + 5 分钟
      commStartAt: null, // 等待发布者回复
      commDeadline: null
    }
  })

  // 更新计数
  await prisma.demand.update({
    where: { id: demandId },
    data: { applicantCount: { increment: 1 } }
  })

  // 通知发布者
  await notifyDemander(demand.userId, `有人申请了你的需求「${demand.title}」`)

  res.json(applicant)
}

// POST /api/demands/:id/accept/:applicantId
export async function acceptApplicant(req: Request, res: Response) {
  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
    include: { applicants: true }
  })

  // 关掉所有其他申请人的窗口
  await prisma.demandApplicant.updateMany({
    where: {
      demandId,
      id: { not: applicantId },
      status: { in: ['PENDING', 'COMMUNICATING'] }
    },
    data: { status: 'REJECTED' }
  })

  // 标记正式接单
  await prisma.$transaction([
    prisma.demand.update({
      where: { id: demandId },
      data: {
        acceptedProviderId: applicant.userId,
        status: 'IN_PROGRESS'
      }
    }),
    prisma.demandApplicant.update({
      where: { id: applicantId },
      data: { status: 'ACCEPTED' }
    })
  ])

  // 通知被选中者
  await notifyProvider(applicant.userId, `你已被选为需求「${demand.title}」的服务者`)
  // 通知未选中者
  const rejected = demand.applicants.filter(a => a.id !== applicantId)
  for (const a of rejected) {
    await notifyProvider(a.userId, `需求「${demand.title}」已选择其他服务者`)
  }

  res.json({ ok: true })
}
```

### 2.7 平台结算（规则 7）

**模型：预充值扣款。** 需求发布时，将最低报价预付给平台。交易完成后平台中转分配。

```
需求最低报价 ¥100 | 成交价 ¥150

发布时:
  预扣: ¥100 (最低报价) → 平台托管

交易完成:
  需求者支付:  ¥150 (成交额) + ¥7.5 (成交额 × 5% 服务费) = ¥157.5
  平台分配:
    → 服务者: ¥100 + ¥50 = ¥150
    → 平台:   ¥7.5
  需求者收到: ¥0 (已全部支付)
```

```typescript
// server/src/services/settlement.ts

interface SettlementResult {
  minPrice: number           // 最低报价
  finalPrice: number         // 成交额
  serviceFee: number         // 平台服务费 (minPrice × 5%)
  demanderPaid: number       // 需求者总支付
  providerReceived: number   // 服务者收到
  platformRevenue: number    // 平台收入
  depositReturned: number    // 退回押金
}

export function calculateSettlement(minPrice: number, finalPrice: number, deposit: number): SettlementResult {
  const serviceFee = Math.round(finalPrice * 0.05 * 100) / 100
  const providerReceived = finalPrice  // 服务者收到成交额全额
  const demanderPaid = finalPrice + serviceFee // 需求者支付 = 成交额 + 服务费
  const platformRevenue = serviceFee

  return {
    minPrice, finalPrice, serviceFee,
    demanderPaid, providerReceived, platformRevenue,
    depositReturned: deposit  // 完成后退押金
  }
}
```

**交易明细可追溯：**

```typescript
// GET /api/transactions/:demandId/breakdown
interface TransactionBreakdown {
  items: Array<{
    label: string          // "最低报价托管" / "差价补付" / "平台服务费"
    amount: number
    direction: 'PAY' | 'RECEIVE'
  }>
  summary: {
    demanderPaid: number
    providerReceived: number
    platformRevenue: number
    depositReturned: number
    netForDemander: number  // 最终花费（负数表示支出）
    netForProvider: number  // 最终收入（正数表示收入）
  }
  timestamp: string
  settlementId: string
}
```

### 2.8 需求冻结

冻结条件：
- 15 分钟到期无人接单
- 发布者迟迟不做决定
- 申请人数达上限且发布者不处理

冻结后果：
- 无法被搜索到
- 存在冻结需求时禁止发布新需求
- 冻结需求不退还多单押金
- 删除冻结需求后退还押金
- **前端删除提示：** "你确定要删除这 X 条冻结需求吗？删除后将退回押金共计 ¥XX.XX 元。删除后即可发布新需求。"

### 2.9 虚假需求与撤回（规则 9）

```
正常需求完成 → 无事发生
需求被冻结 → 扣 5% 押金
需求自行撤回 → 扣 0.01% 押金
虚假需求 → 平台介入，可能封号
```

```typescript
export async function withdrawDemand(demandId: string, userId: string) {
  const demand = await prisma.demand.findUnique({ where: { id: demandId } })
  if (demand.userId !== userId) throw new Error('无权操作')

  await prisma.$transaction([
    prisma.demand.update({
      where: { id: demandId },
      data: { status: 'WITHDRAWN' }
    }),
    // 退回 99.99% 押金
    refundDeposit(userId, demand.deposit * 0.9999),
    // 关闭所有申请窗口
    prisma.demandApplicant.updateMany({
      where: { demandId, status: { in: ['PENDING', 'COMMUNICATING'] } },
      data: { status: 'WITHDRAWN' }
    })
  ])
}
```

### 2.10 用户无需计算金额（规则 10）

平台自动结算，用户只需看结果。每次支付可选「查看明细」。历史交易随时可查。

```typescript
// GET /api/transactions/history?page=1&limit=20
interface TransactionHistoryItem {
  demandId: string
  demandTitle: string
  role: 'DEMANDER' | 'PROVIDER'
  amount: number
  type: 'PAYMENT' | 'INCOME' | 'REFUND' | 'DEPOSIT'
  breakdown: TransactionBreakdown
  createdAt: string
}
```

---

## 3. Part B：服务者检索系统

### 3.1 标签状态机

服务者通过标签声明自己的服务意愿和当前状态。

```prisma
model UserTag {
  id          String    @id @default(uuid())
  userId      String
  tagName     String
  status      TagStatus @default(IDLE)
  regionId    Int?
  certified   Boolean   @default(false)
  autoReceive Boolean   @default(false) // 主动接收需求通知
  rating      Float     @default(0)
  orderCount  Int       @default(0)
  metadata    Json?

  user        User      @relation(fields: [userId], references: [id])

  @@unique([userId, tagName])
  @@index([status, tagName, regionId])
  @@index([tagName, certified])
}

enum TagStatus {
  IDLE    // 空闲 → 可被普通检索找到
  BUSY    // 忙碌 → 只能被特殊检索穿透
  HIDDEN  // 下线 → 不被检索
}
```

**状态流转：**

```
openTag() → IDLE ← closeTag() → HIDDEN
                 ↘ startOrder() → BUSY ← finishOrder() ↗
```

### 3.2 普通检索

只返回 IDLE 状态的服务者。

```typescript
// GET /api/providers/search?tagName=出租车司机&regionId=110000&page=1
interface ProviderSearchResponse {
  providers: Array<{
    userId: string      // 匿名 ID
    tagName: string
    status: 'IDLE'
    rating: number
    orderCount: number
    distance: string    // "同区" / "约 5 公里" / "跨省"
  }>
  total: number
}
```

### 3.3 特殊检索

穿透 BUSY 状态，用户可看到忙碌中的服务者并主动发起请求。请求在对方恢复 IDLE 后通知。

```typescript
// POST /api/providers/special-search
interface SpecialSearchRequest {
  tagName: string
  regionId?: number
  includeBusy: boolean
  notifyOnIdle: boolean  // 等待对方空闲后通知
}
```

### 3.4 认证检索

独立的检索维度，搜索已认证的高质量服务者。

```typescript
// GET /api/providers/certified?serviceType=厨师&regionId=110000&minLevel=INTERMEDIATE
```

`serviceTypes` 来自 UserTag（`certified: true`）。认证是对已有标签的官方背书。

---

## 4. Part C：推送与通知

### 4.1 推送触发条件

- 需求者主动点击「推送」→ 选择推送画像 → 精准推送
- **或** 认证服务者开启「主动接收」→ 有标签匹配的新需求自动通知

### 4.2 推送匹配（异步）

```typescript
// POST /api/demands/:id/push → 立即返回 { pushId, status: 'queued' }
// 后台消息队列异步匹配 → 前端轮询 GET /api/pushes/:id/status
```

### 4.3 接收者规则

接收者有权拒绝特定标签/关键词/区域的推送。

```prisma
model UserPushPreference {
  id                String  @id @default(uuid())
  userId            String  @unique
  excludeKeywords   String[]
  excludeTags       String[]
  excludeRegions    Int[]
  receivePushes     Boolean @default(true)
  pushFrequency     PushFrequency @default(NORMAL)
}

enum PushFrequency { HIGH, NORMAL, LOW, OFF }
```

**规则引擎（7 步判断链）：**

```
1. 全局 OFF？ → 跳过
2. 命中 excludeKeywords？ → 跳过
3. 命中 excludeTags？ → 跳过
4. 命中 excludeRegions？ → 跳过
5. 命中 allowKeywords？ → 接收
6. 命中 allowTags？ → 接收
7. 默认 → receivePushes ? 接收 : 跳过
```

---

## 5. Part D：卡池生命周期

### 5.1 时间线

```
需求完成 → 生成 Card → 进入死池（永久保留）
需求未完成 → 跟随生命周期衰减:

[ACTIVE] —— 1 个月 ——→ [NO_COVER] —— 1 年 ——→ [NO_DETAIL] —— 2 年 ——→ 整卡删除
```

### 5.2 弹性延期（10 倍透支）

延期 N 个月 → 后面各阶段提前 `N × 10` 个月。

```typescript
function extendLifecycle(demand, extendMonths) {
  const now = new Date()
  const oneDay = 86400000
  const oneDayLater = new Date(now.getTime() + oneDay)

  // 封面删除 = max(延期后, now + 1d)
  let coverDeletedAt = addMonths(demand.coverDeletedAt, extendMonths)
  if (coverDeletedAt < oneDayLater) coverDeletedAt = oneDayLater

  // 详情删除 = max(提前 10×n 月, coverDeletedAt + 1d)
  let detailDeletedAt = addMonths(demand.detailDeletedAt, -extendMonths * 10)
  const minDetail = new Date(coverDeletedAt.getTime() + oneDay)
  if (detailDeletedAt < minDetail) detailDeletedAt = minDetail

  // 整卡删除 = max(提前 10×n 月, detailDeletedAt + 1d)
  let fullDeletedAt = addMonths(demand.fullDeletedAt, -extendMonths * 10)
  const minFull = new Date(detailDeletedAt.getTime() + oneDay)
  if (fullDeletedAt < minFull) fullDeletedAt = minFull

  return { coverDeletedAt, detailDeletedAt, fullDeletedAt }
}
```

### 5.3 卡牌（死池）

需求完成后生成 Card，记录服务双方、金额、标签、需求者选择的封面图片。

```prisma
model Card {
  id            String   @id @default(uuid())
  demandId       String   @unique
  demand         Demand   @relation(fields: [demandId], references: [id])
  providerId     String
  demanderId     String
  coverImage     String?  // 需求者选择，永不可改
  cardColor      String?  // 色条颜色
  orderAmount    Float
  tags           String[]
  completedAt    DateTime @default(now())
}
```

---

## 6. Part E：标签分析与市场指标

### 6.1 指标维度

每个标签 × 每个区域，定期计算：

| 指标 | 说明 |
|---|---|
| 总成交量 | 已完成的需求数 |
| 总成交金额 | 所有完成需求的金额之和 |
| 平均成交金额 | 总金额 / 总量 |
| 活跃服务者 | IDLE 状态的服务者数 |
| 活跃需求 | ACTIVE 阶段的需求数 |
| 供需比 | 服务者 : 需求者 |
| 色条颜色 | 根据金额分位数映射 |

### 6.2 色条算法

```typescript
function calculateCardColor(amount, percentile) {
  if (percentile >= 90) return '#ef4444'  // 顶级高价值
  if (percentile >= 75) return '#f59e0b'  // 高价值
  if (percentile >= 50) return '#22c55e'  // 中上
  if (percentile >= 25) return '#06b6d4'  // 中等
  return '#6b7280'                         // 常规
}
```

### 6.3 缓存

```typescript
// Redis 缓存，TTL 1 小时
// Key: tag:stats:{tagName}:{regionId}
// 失效: 新卡牌完成 / 标签状态变更 / 定时刷新
```

---

## 7. Part F：公益需求系统

### 7.1 特殊规则

| 属性 | 公益需求 | 普通需求 |
|---|---|---|
| 公开窗口 | **15 天** | 15 分钟 |
| 平台抽成 | **10%** | 5% |
| 接单模式 | 默认全员申请 | 手动请求接单 |
| 服务者奖励 | 公益资金池随机红包，池空时发精神奖励 | 无 |
| 认领冲突 | 先到先得 + 5 分钟独家确认窗口 | 无 |
| 抽成去向 | 全额交给当地政府/有关部门 | 平台收入 |

### 7.2 公益圈

- 每个地区自动创建一个公益需求圈
- 公益需求自动投往当地公益圈
- 政府/警察局/医院等机构可以对接公益圈
- 公益需求圈有独立的管理权限体系

### 7.3 交付方式（含认领冲突解决）

无需请求接单流程。所有看到公益需求的人默认可以申请接单。

**认领机制（先到先得 + 独家确认窗口）：**

```
第一个点击「我已找到/我能完成」的人
  → 获得 5 分钟独家确认窗口
  → 需求者在此期间验证真伪
  → 验证成功 → 交易完成
  → 验证失败/超时 → 释放给下一个等待者
等待队列按申请时间排序
```

完成者联系需求者确认完成 → 正常支付 + 平台随机奖励。

### 7.4 公益奖励资金池

奖励来源是公益圈 10% 抽成。不做平台垫付。

```
公益圈每完成一笔 → 10% 抽成自动划入「当地公益圈资金池」
奖励从池子里出
池子不为空 → 随机红包（金额从池子里出）
池子为空 → 只发精神奖励（徽章 + "公益之星"积分）
资金池按地域独立核算
```

```prisma
model WelfareFundPool {
  id          String   @id @default(uuid())
  regionId    Int      @unique
  balance     Float    @default(0)
  totalInflow Float    @default(0)   // 累计流入
  totalOutflow Float   @default(0)   // 累计支出（奖励）
  updatedAt   DateTime @updatedAt
}
```

---

## 8. Part G：需求圈体系

### 8.1 需求圈类型

| 类型 | 创建方式 | 可见性 | 加入方式 |
|---|---|---|---|
| **私人需求圈** | 用户自由创建 | 仅圈内可见 | 邀请制（类似微信群） |
| **公开需求圈** | 平台申请 + 审核 | 全社会可搜索 | 当地用户可申请加入 |

### 8.2 公开圈命名规则

格式: `{地区前缀}{主题}需求圈`
示例: `金华富二代需求圈`、`北京朝阳手工需求圈`

地区前缀需要圈员人数达标才能使用对应级别的前缀。

### 8.3 圈内需求流转

```
圈内人发布 → 圈内优先匹配
  ├─ 圈内解决 → 完成
  ├─ 圈内未解决（1 小时优先窗口后）→ 可选公开到大众
  └─ 公开 → 投往大众市场（标注"大众需求"标签）

圈外人发布 → 进入该圈的「公众待办区」
  ├─ 公众待办区对全体圈外人和圈内人均可见
  ├─ 圈内人优先抢单（1 小时优先窗口）
  ├─ 圈内人未接 → 自动改为大众可见
  └─ 圈外人发布者始终可以看见自己这条需求
```

### 8.4 公开圈升级路径（量化指标）

全部自动化判定，只有国家级需要人工审核。

```
县级 → 市级:
  - 圈内完成 ≥ 10 单
  - 好评率 ≥ 95%
  - 圈员 ≥ 50 人

市级 → 省级:
  - 圈内完成 ≥ 50 单
  - 好评率 ≥ 95%
  - 圈员 ≥ 200 人

省级 → 国家级:
  - 圈内完成 ≥ 200 单
  - 好评率 ≥ 97%
  - 平台人工审核
  - 部分权力交政府
```

### 8.5 数据模型

```prisma
model Circle {
  id          String    @id @default(uuid())
  name        String    @unique
  ownerId     String
  type        CircleType
  regionId    Int?
  level       CircleLevel @default(COUNTY)
  memberCount Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  members     CircleMember[]
  demands     CircleDemand[]
}

enum CircleType { PRIVATE, PUBLIC, PUBLIC_WELFARE }
enum CircleLevel { COUNTY, CITY, PROVINCE, NATIONAL }

model CircleMember {
  id        String   @id @default(uuid())
  circleId   String
  userId     String
  role       CircleRole @default(MEMBER)
  joinedAt   DateTime @default(now())

  @@unique([circleId, userId])
}

enum CircleRole { MEMBER, MODERATOR, ADMIN, OWNER }

model CircleDemand {
  id        String   @id @default(uuid())
  circleId   String
  demandId   String
  isExternal Boolean  @default(false) // 圈外人发布
  isPublic   Boolean  @default(false) // 是否已公开到大众市场
  createdAt  DateTime @default(now())

  @@unique([circleId, demandId])
}
```

---

## 9. 安全与隐私

### 9.1 数据分级

| 层级 | 内容 | 可见性 | 存储方式 |
|---|---|---|---|
| 公开 | 标签名、评分、接单数、距离 | 所有用户 | 明文 |
| 半公开 | 认证服务者信息 | 所有用户 | 明文 |
| 受控 | 需求标题、详情（ACTIVE 阶段） | 检索用户 | 明文 |
| 敏感 | 联系方式 | 接单后的双方 | 加密 |
| 私密 | 真实姓名、身份证 | 本人 + 系统 | AES-256 |

### 9.2 位置隐私

- 精确定位永不落库
- 存储的永远是 +50m 噪声的模糊坐标
- API 返回：只给距离，不给方位
- 需求者位置只有正式接单后的服务者可见

### 9.3 防滥用

- 每用户每标签一条 UserTag（防刷榜）
- 推送限频：500 人/天/需求，50 次/天/用户
- 检索限频：60 次/分钟（普通），10 次/分钟（特殊）
- 虚假需求 → 举报 → 平台介入 → 封号

---

## 10. 实施路线图

```
AI 2.5 ─ Part A: 需求发布系统
 ├── Schema 变更: Demand 扩展 + DemandApplicant 新表
 ├── 位置模糊 (fuzzLocation)
 ├── 15 分钟紧急窗口 + 5 分钟沟通资格
 ├── 发布流程: AI 标签 → 确认 → 填写效果 → 设定接单上限
 ├── 两段式接单: 请求 → 沟通 → 正式接单
 ├── 押金计算 + 冻结/撤回/完成
 ├── 平台结算 + 交易明细
 └── 预估: 5-6 天

AI 2.6 ─ Part B: 服务者检索
 ├── UserTag 表 + 标签状态机
 ├── 普通检索 API
 ├── 特殊检索 API
 ├── 匿名化中间层
 ├── 认证检索 API
 └── 预估: 4-5 天

AI 2.7 ─ Part C + Part D: 推送 + 卡池
 ├── 推送匹配引擎
 ├── 规则引擎
 ├── 通知聚合
 ├── 卡池生命周期（CRON + 延期算法）
 ├── 死池 Card 表
 └── 预估: 4-5 天

AI 2.8 ─ Part E + Part F: 标签分析 + 公益
 ├── TagStats 表 + 聚合查询
 ├── 色条颜色算法
 ├── 公益需求模型
 ├── 公益圈自动创建
 ├── 随机奖励系统
 └── 预估: 4-5 天

AI 2.9 ─ Part G: 需求圈
 ├── Circle/CircleMember/CircleDemand 表
 ├── 圈创建/加入/管理
 ├── 圈内需求流转
 ├── 公开圈升级体系
 └── 预估: 4-5 天

AI 3.0 ─ 整合 + 移动端
 ├── 全链路测试
 ├── 前端适配
 ├── 移动端技术选型 + 脚手架
 └── 预估: 5-7 天
```

**总工期估算: 26-33 天**

---

## 11. API 清单

### 需求发布

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/demands` | 发布需求 |
| GET | `/api/demands/:id` | 需求详情 |
| DELETE | `/api/demands/:id` | 撤回需求 |
| POST | `/api/demands/:id/request` | 请求接单 |
| POST | `/api/demands/:id/accept/:applicantId` | 正式接单 |
| POST | `/api/demands/:id/reject/:applicantId` | 拒绝申请 |
| POST | `/api/demands/:id/extend-comm` | 延长沟通时间 |
| POST | `/api/demands/:id/push` | 推送需求 |
| GET | `/api/pushes/:id/status` | 推送进度 |
| GET | `/api/demands/check-frozen` | 检查冻结需求数 |

### 服务者检索

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/user-tags` | 我的标签列表 |
| POST | `/api/user-tags/:tagName/toggle` | 切换标签开关 |
| GET | `/api/providers/search` | 普通检索 |
| POST | `/api/providers/special-search` | 特殊检索 |
| POST | `/api/providers/:userId/request` | 向服务者发起请求 |
| GET | `/api/providers/certified` | 认证服务者检索 |

### 交易

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/transactions/:demandId/breakdown` | 交易明细 |
| GET | `/api/transactions/history` | 交易历史 |
| POST | `/api/demands/:id/complete` | 标记需求完成 |

### 卡池

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/card-pool/live` | 活池检索 |
| GET | `/api/card-pool/dead` | 死池浏览 |
| GET | `/api/card-pool/stats` | 卡池统计 |
| POST | `/api/card-pool/extend` | 弹性延期 |

### 标签分析

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tags/stats` | 标签市场指标 |
| GET | `/api/tags/trending` | 热门标签 |

### 需求圈

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/circles` | 创建需求圈 |
| GET | `/api/circles/:id` | 圈详情 |
| POST | `/api/circles/:id/join` | 申请加入 |
| POST | `/api/circles/:id/demands` | 在圈内发布需求 |
| POST | `/api/circles/:id/demands/:demandId/publish` | 将圈内需求公开 |

---

## 版本记录

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-05-25 | v1.0 | 初始六层架构 |
| 2026-05-26 | v2.0 | 全量纳入需求发布 10 规则 + 需求圈 + 公益系统 |
| 2026-05-26 | v2.1 | 6 条确认补全: 公益资金池、圈外公众待办区、升级量化指标、认领冲突、满额双重拦截、冻结删除提示 |
