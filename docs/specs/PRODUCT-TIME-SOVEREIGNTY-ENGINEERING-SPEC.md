# 九木产品时间主权工程规格

> **状态**：Accepted（Phase 0 防回归基线已落地；Phase 1–5 仍按阶段实施）  
> **日期**：2026-07-28  
> **Accepted 日期**：2026-07-28  
> **签字依据**：创始人 Phase 0 任务授权 + 工程代码/契约审计（§21 结论表）  
> **适用范围**：`client-react/`、`server/`、现行产品文档与发布流程  
> **最高准则**：创始人产品自述、[`docs/回的理念.md`](../回的理念.md)  
> **关联 ADR**：[`NATURAL-LOOP-V2-ADR.md`](./NATURAL-LOOP-V2-ADR.md)、[`DEMAND-SERVICE-CARD-ADR.md`](./DEMAND-SERVICE-CARD-ADR.md)、[`ORDER-TRANSACTION-TRUST-ADR.md`](./ORDER-TRANSACTION-TRUST-ADR.md)  
> **平台边界**：Windows 桌面优先，宽屏（≥1280px）；本规格不擅自引入移动端、PWA 或触摸交互  
> **实施原则**：分阶段、小步迁移、前后端契约同步；不得以本规格为由顺手重构无关模块

---

## 0. 执行摘要

九木的目标不是让用户更频繁地打开产品，而是让用户用更少的主动时间完成现实中的事情。产品必须围绕以下闭环构建：

```text
用户表达想完成的事
  → 系统寻找可执行、可验证的方案
  → 自动完成不需要人介入的步骤
  → 必要时连接可信的人
  → 托管、履约、验证、结算
  → 告知结果
  → 停止无关通知并从用户视野中淡出
```

本规格将这一理念转换为六条工程工作流：

1. **注意力机制清理**：隔离短视频流、无限消费、随机奖励、公开人气数字等机制。
2. **用户主权推送**：从“默认接收 + 排除”改为“必要通知默认保留 + 非必要通知由用户正向订阅”。
3. **结果优先主链**：统一为“一句话需求 → 可执行方案 → 运行 → 结果 → 退出”，禁止完成后继续诱导浏览。
4. **关系与承接语义重构**：把“粉丝、抢单、额度”改造成可信合作关系和真实承接能力，降低竞争性信息战。
5. **透明结果收费**：保持无会员、无广告、无付费曝光；所有费用在操作前可解释，未产生有效结果不保留结果佣金。
6. **时间节省度量**：用完成率、用户主动操作时间和通知负担评价产品，不以停留时长、滚动深度和连续登录为目标。

### 0.1 本项目的北极星指标

```text
单位用户主动时间内，经验证完成的现实事项数量
```

辅助表达：

```text
Outcome Efficiency = Verified Outcomes / User Active Minutes
```

该指标只用于聚合产品改进，不用于对个体用户打分、定价、排序或推送。

### 0.2 明确禁止作为产品目标的指标

- 日均使用时长、单次会话时长；
- 页面浏览量、无限滚动深度；
- 连续登录天数、签到率；
- 为提高回访而制造的红点点击率；
- 非任务型内容消费量；
- 将 DAU、留存率直接等同于用户价值。

DAU、留存可作为诊断性运营数据，但不得成为驱动诱导设计的目标函数。

---

## 1. 产品宪法：必须落实为工程约束

### 1.1 时间主权

- 用户的时间属于用户，不属于平台库存。
- 每个新增步骤必须证明它降低风险、提高成功率或减少后续时间。
- 能由系统安全完成的步骤，默认由系统完成；需要授权的步骤先解释再请求确认。
- 完成一件事后，界面必须提供清晰退出路径，不展示与当前结果无关的推荐流。

### 1.2 注意力中立

- 九木不售卖广告、排名、曝光、推送和搜索优先权。
- 不使用随机奖励、签到、连续任务、稀有度、倒计时恐惧等机制制造回访。
- 动效与沉浸视觉只能帮助理解状态、确认因果或降低认知负担，不能延长停留。
- 搜索和推荐只服务于用户已表达的目标，不主动制造新需求。

### 1.3 通知主权

- 交易安全和用户主动创建任务的结果通知属于必要通知。
- 新机会、匹配、圈子动态、关系动态属于可选通知，默认关闭或采用明确的首次选择。
- 每条非必要通知必须能回答：“为什么发给我？”以及“如何不再收到这一类？”
- 用户退出、完成或停用某个回后，相关非必要通知自动停止。

### 1.4 结果责任

- 地回不能自行宣布成功；必须按 Natural Loop V2 经过所需天回验证。
- 不能验证时诚实标记 `INCONCLUSIVE`，不得用“已完成”掩盖未知。
- 人回交易以双方协议、证据、托管和争议机制为准。
- 无可执行方案时可以生成草稿，但不得替用户静默发布。

### 1.5 普遍可用与公平

- 不以会员等级解锁核心能力。
- 不以内购区分服务质量、客服权利、申诉权或安全保障。
- 认证只能表达可验证事实和风险差异，不能出售。
- 任何排序必须给出与当前任务相关的理由，不得因为付费改变自然排序。

### 1.6 收费透明

- 收入主入口为成功结果后的佣金或手续费。
- 普通交易费率、公益规则、第三方实际成本必须在用户确认前展示。
- 取消、失败、争议退款时，平台保留或退还的每一项金额必须有机器可读的明细。
- 未来新增收费模式必须先经过独立 ADR，禁止以灰度实验绕过产品评审。

### 1.7 隐私边界

- 只记录九木内部为完成任务所需的最少事件。
- 不监视用户在其他软件中的行为，不读取无关窗口、应用使用历史或浏览历史。
- 不用个人注意力画像构建不可解释的信息茧房。
- 产品度量默认聚合化；个体事件设定最短必要保留期。

---

## 2. 当前实现基线与差距

### 2.1 已符合方向的能力

| 能力 | 当前实现 | 评价 |
|------|----------|------|
| 目标式发现 | `Discover.tsx` 调用 `loopApi.recommend({ q })` | 正确：用户先表达目标，不默认灌输 Feed |
| 可执行方案过滤 | `recommendation.service.ts` 只返回在线、可执行、有必要验证契约的 EARTH offering | 正确：推荐对结果负责 |
| 人回诚实回退 | 无地回时生成需用户确认的 Demand 草稿 | 正确：不静默发布 |
| 天回验证 | Natural Loop V2 要求 required verifier 全部通过才能成功 | 正确：避免自报成功 |
| 托管与结算 | WalletHold、WalletLedger、Settlement、交易幂等 | 正确方向：降低私下博弈 |
| 服务事实 | ServiceCardEvidence 只来自已完成订单 | 正确：声明与事实分离 |
| 消息可信 | 卡片快照、屏蔽、内容过滤、Socket 私信入库 | 正确：历史可追溯 |

### 2.2 与产品宪法冲突或不足的能力

| 编号 | 当前问题 | 主要位置 | 风险 |
|------|----------|----------|------|
| G-01 | PushPreference 默认接收，只有排除项；无记录时全部接受 | `schema.prisma`、`push-engine.ts` | 平台先打扰、用户再退出 |
| G-02 | `pushFrequency` 仅存储，未执行频率、安静时段、每日上限或摘要 | `push-engine.ts` | 设置与真实行为不一致 |
| G-03 | 手动推送缺少完整的需求所有权、原因和审计语义 | `routes/push.ts` | 用户可能收到不可解释或滥用推送 |
| G-04 | 后端保留 `/api/shorts` Feed、关注/附近标签和 Short 模型 | `routes/shorts.ts`、`schema.prisma` | 与反注意力定位直接冲突 |
| G-05 | 粉丝、关注数量和“我的社交”把合作关系塑造成受众关系 | `Follows.tsx`、`user.ts` | 形成地位数字与社交焦虑 |
| G-06 | 抢单额度、月度恢复、权重语言制造稀缺与刷新动机 | demand/user-tag/snatch 相关服务 | 从匹配转向竞争性信息战 |
| G-07 | 卡池存在开包、手牌、收集和部分无限滚动 | CardPool 相关组件 | 工具可能滑向收藏与消遣 |
| G-08 | 完成页和结果页缺少统一“结束并淡出”协议 | 订单、LoopRun、消息页 | 完成后仍残留通知与导航压力 |
| G-09 | 内置地回主要解决平台内部字段、路径、附件和封面 | `builtin-loops.ts` | 对普通人生活的直接效用有限 |
| G-10 | 当前仅 Windows 桌面 | 全局硬约束 | 不适合即时户外场景，需诚实限定首批场景 |
| G-11 | 费用规则散落于帮助、开发文档和结算代码 | wallet/settlement/help | 用户难在确认前形成稳定预期 |
| G-12 | 现有指标偏平台数量，缺少主动时间、打扰负担、退出质量 | tag stats/admin | 无法证明产品真的节省时间 |

---

## 3. 目标用户体验与统一状态模型

### 3.1 用户主链

所有主入口最终应收敛到以下状态：

```text
IDLE
  → INTENT_CAPTURED
  → OPTIONS_READY
  → USER_CONFIRMED
  → RUNNING
  → VERIFYING
  → SUCCEEDED | FAILED | INCONCLUSIVE | CANCELLED
  → ACKNOWLEDGED
  → QUIET
```

`QUIET` 是正式产品状态，而不是“没有设计”：

- 停止该任务的非必要通知；
- 清除与该任务有关的临时红点；
- 只保留可追溯记录；
- 不自动展示新的推荐；
- 用户需要时可从订单、消息或回中心重新查看。

### 3.2 每个页面必须回答的五个问题

1. 我现在在完成什么？
2. 系统已经替我完成了什么？
3. 现在是否需要我做决定？
4. 如果失败，我该怎么办？
5. 事情结束后，我如何离开？

无法回答这五个问题的页面不得作为主链页面发布。

### 3.3 推荐排序原则

允许的排序信号：

- 与当前明确需求的路径/字段匹配；
- 可执行性和端点健康；
- 经天回验证的结果质量及样本量；
- 预计完成时间；
- 透明价格和用户明确设置的约束；
- 地域、时间、认证等与任务风险直接相关的条件。

禁止的排序信号：

- 付费购买排名；
- 用户停留时长、点击诱惑度；
- 为提高成交而隐瞒不匹配项；
- 与当前任务无关的长期兴趣推断；
- 粉丝数、内容热度等人气信号直接替代履约事实。

每个推荐结果必须返回稳定的 `match.reasons`，前端至少展示一条主要理由。

---

## 4. 工作流 A：注意力机制清理

### 4.1 `/api/shorts` 处理策略

短视频 Feed 与本产品定位直接冲突。采用“先隔离、后删除”的可恢复策略：

#### 阶段 A1：立即隔离

- 生产环境不挂载 `shortsRouter`；开发环境仅在 `ENABLE_LEGACY_SHORTS=1` 时挂载。
- Swagger、帮助文档和导航不得宣传短视频 Feed。
- 禁止新增 Short 点赞、评论、自动播放、连播和推荐算法。
- 增加路由测试：生产环境访问 `/api/shorts` 返回 404。

#### 阶段 A2：数据决策

- 统计现有 `Short` 记录数量和是否存在真实用户数据，只输出聚合数，不读取媒体内容。
- 无真实数据：新增迁移删除 `Short` 模型和路由。
- 有真实数据：先提供用户导出与下架窗口，再通过独立迁移删除。
- 不把旧短视频能力迁移为新的内容流。

### 4.2 禁止无限消费模式

- 主发现页必须由明确查询触发，不允许空查询返回无限推荐。
- Demand/ServiceCard 浏览使用显式分页或“再看一页”；不得自动连续加载未知数量内容。
- CardPool 中仅为用户明确保存的单卡集合保留虚拟化加载；不得以“无限”作为产品文案。
- 每个列表显示总量、当前范围和退出入口。

### 4.3 卡池去随机奖励化

允许保留：

- 分类树、卡片化理解、手牌作为用户明确保存的工作集；
- 为理解分类层级服务的视觉动效；
- 用户主动选择的布局、排序和筛选。

禁止新增：

- 随机开包、稀有度、抽取概率；
- 每日免费次数、连续开包奖励；
- 收藏完成率驱动的红点；
- 通过付费获得卡片或曝光。

现有“开包”若只是确定性分类展开，应在产品文案中改为“展开分类”或“打开工作集”，避免随机奖励暗示。

### 4.4 静态防回归检查

新增 `scripts/audit-attention-patterns.mjs`，在 CI 中扫描新增业务代码与文案。首版阻断关键词只针对明确机制，不对普通技术词误报：

```text
签到奖励、连续登录、开屏广告、激励广告、购买曝光、付费置顶、随机开包、无限连播
```

以下词只警告、不直接阻断：

```text
粉丝、热度、榜单、连续、奖励、推荐、无限
```

警告项必须由评审人在 PR 中说明其任务价值。

---

## 5. 工作流 B：用户主权推送

### 5.1 通知分类

```text
TRANSACTIONAL_REQUIRED  交易、安全、争议、资金、用户正在等待的任务结果
USER_REQUESTED          用户主动订阅的需求匹配、回运行结果、定时 Agent 任务
DIGEST                  用户选择的机会摘要或圈子摘要
RELATIONSHIP             合作联系人和圈子关系变化
MARKETING                广告、促销、平台增长消息（九木禁止）
```

规则：

- `TRANSACTIONAL_REQUIRED` 默认开启，只允许按渠道降级，不允许完全丢失关键资金信息。
- `USER_REQUESTED`、`DIGEST`、`RELATIONSHIP` 默认关闭，用户显式选择后开启。
- `MARKETING` 不建模、不发送。

### 5.2 Prisma 数据草案

推荐新增模型，保留旧 `PushPreference` 作为迁移来源，避免直接扩展不可解释的排除数组。

```prisma
enum NotificationCategory {
  TRANSACTIONAL_REQUIRED
  USER_REQUESTED
  DIGEST
  RELATIONSHIP
}

enum NotificationChannel {
  IN_APP
  WINDOWS
  EMAIL
}

enum NotificationDeliveryMode {
  IMMEDIATE
  DIGEST
  OFF
}

model NotificationPolicy {
  id                 String   @id @default(uuid())
  userId             String   @unique
  timezone           String   @default("Asia/Shanghai")
  quietHoursStart    String?
  quietHoursEnd      String?
  dailyInterruptCap  Int      @default(3)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model NotificationSubscription {
  id           String   @id @default(uuid())
  userId       String
  category     NotificationCategory
  eventType    String
  mode         NotificationDeliveryMode @default(OFF)
  channels     NotificationChannel[]
  filters      Json     @default("{}")
  sourceRef    String?
  expiresAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([userId, eventType, sourceRef])
  @@index([userId, category, mode])
  @@index([expiresAt])
}

model NotificationDelivery {
  id              String   @id @default(uuid())
  userId          String
  eventType       String
  subscriptionId  String?
  reasonCode      String
  reasonText      String
  channel         NotificationChannel
  status          String   // QUEUED | SENT | SUPPRESSED | FAILED | READ
  suppressionCode String?
  resourceType    String?
  resourceId      String?
  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
  @@index([status, createdAt])
}
```

实现时可根据 Prisma/PostgreSQL 限制调整数组和 enum，但不得削弱默认关闭、原因可解释和到期自动停止三项要求。

### 5.3 API 契约

```text
GET  /api/notifications/policy
PUT  /api/notifications/policy
GET  /api/notifications/subscriptions
POST /api/notifications/subscriptions
PUT  /api/notifications/subscriptions/:id
DELETE /api/notifications/subscriptions/:id
GET  /api/notifications/deliveries?status=&page=
POST /api/notifications/preview
```

`POST /subscriptions` 示例：

```json
{
  "eventType": "DEMAND_MATCHED",
  "mode": "DIGEST",
  "channels": ["IN_APP"],
  "filters": {
    "tags": ["家电维修"],
    "regionIds": [330100],
    "maxPrice": 500
  },
  "expiresAt": "2026-08-28T00:00:00.000Z"
}
```

每次投递必须形成统一决策结果：

```ts
type NotificationDecision = {
  deliver: boolean
  mode: 'IMMEDIATE' | 'DIGEST' | 'OFF'
  channels: Array<'IN_APP' | 'WINDOWS' | 'EMAIL'>
  reasonCode: string
  reasonText: string
  suppressionCode?:
    | 'NOT_SUBSCRIBED'
    | 'QUIET_HOURS'
    | 'DAILY_CAP'
    | 'EXPIRED'
    | 'FILTER_MISS'
    | 'TASK_QUIET'
}
```

### 5.4 统一通知决策服务

新增 `server/src/services/notification-decision.service.ts`，所有非必要通知必须经过该服务。禁止业务模块直接调用 `io.emit` 发送机会型通知。

调用链：

```text
业务事件
  → buildNotificationIntent
  → NotificationDecisionService.evaluate
  → immediate / digest / suppress
  → NotificationDelivery 审计
  → message / socket / Windows channel adapter
```

交易必要通知也记录原因，但不受每日中断上限影响；安静时段可延迟 Windows 弹窗，站内消息仍应落库。

### 5.5 旧偏好迁移

- `receivePushes=false`：迁移为所有非必要订阅 `OFF`。
- `receivePushes=true` 不能直接视作对所有新通知的永久同意；首次进入新设置页时展示一次明确选择。
- 旧 `excludeKeywords/tags/regions` 迁移为订阅 filters 的排除条件。
- 旧 `pushFrequency`：`HIGH/NORMAL/LOW` 只能作为建议，不得覆盖用户的新明确选择。
- 迁移后保留旧表一个发布周期，只读对照；验证无回滚需求后再删除。

### 5.6 前端要求

`PushSettings.tsx` 重构为：

1. 必要通知说明；
2. 我主动订阅的事项；
3. 摘要频率；
4. 安静时段；
5. 每日最大主动打扰次数；
6. 最近为什么通知我；
7. 一键暂停全部非必要通知。

禁止使用“开启后不错过任何机会”等恐惧型文案。推荐文案：

```text
只在你选择的事情出现时提醒你。未选择的内容不会主动打扰。
```

---

## 6. 工作流 C：结果优先主链与完成后淡出

### 6.1 统一任务入口

`/discover` 保持目标输入入口，不恢复空查询 Feed。核心交互：

- 一次只突出一个问题：“你想完成什么？”
- 搜索结果按可执行性、验证、耗时和费用展示。
- 无方案时只提供人工草稿，不展示无关热门内容。
- 用户进入 offering 详情前即可看到：输入、输出、预计时间、验证方式、费用和数据使用范围。

### 6.2 运行中页面

LoopRun、Order、AgentTask 统一展示：

- 当前阶段；
- 已完成步骤；
- 是否需要用户介入；
- 下一次预计更新时间；
- 暂停/取消/争议入口；
- 失败原因和可恢复操作。

不得用无意义进度条伪装未知进度。未知时显示“等待外部结果”及最近更新时间。

### 6.3 完成确认协议

完成页必须由共享组件或共享协议生成，至少包含：

```ts
type CompletionSummary = {
  resourceType: 'LOOP_RUN' | 'ORDER' | 'AGENT_TASK'
  resourceId: string
  outcomeStatus: 'SUCCEEDED' | 'FAILED' | 'INCONCLUSIVE' | 'CANCELLED'
  outcomeSummary: string
  evidenceSummary?: string[]
  feeBreakdown?: FeeBreakdown
  activeTimeEstimateMs?: number
  nextRequiredAction: null | {
    label: string
    action: string
  }
  notificationsStopped: string[]
}
```

当 `nextRequiredAction=null`：

- 主按钮为“完成并返回”或“关闭”；
- 不出现“你可能还喜欢”“继续探索”“再看一个”；
- 允许次要入口查看详情、下载结果、报告问题；
- 将相关任务转为 `QUIET`。

### 6.4 Quiet 服务

新增 `TaskQuietService` 或等价服务，接收资源终态事件：

```text
on LoopRun terminal
on Order terminal
on AgentTask disabled/deleted
on Demand completed/withdrawn/expired
```

执行：

- 停止 `sourceRef` 对应临时订阅；
- 取消待发送的非必要通知；
- 清理临时红点；
- 保留交易必要通知、审计和历史消息；
- 写一条 `TASK_QUIETED` 聚合事件。

### 6.5 “回头看一眼”的承诺

淡出不等于隐藏历史。订单、回中心和消息页必须持续提供：

- 可检索历史；
- 结果与证据；
- 费用明细；
- 曾经的参与方；
- 再次发起相似事项的显式按钮。

“再次发起”只能由用户主动点击，不能自动推送。

---

## 7. 工作流 D：关系、信任与承接机制

### 7.1 “粉丝/关注”语义迁移

不立即删除 Follow 数据关系，因为它仍可支持联系人和群聊选择。先做语义迁移：

| 现有概念 | 目标概念 |
|----------|----------|
| 关注 | 保存为合作联系人 / 愿意再次协作 |
| 粉丝 | 保存了我的人（默认不展示数字） |
| 我的社交 | 合作关系 |
| 粉丝数 | 不作为公开身份指标 |

实施要求：

- Profile 不突出 follower/following 数字。
- 搜索和推荐不得使用粉丝数排序。
- 关系通知默认关闭。
- 新群聊联系人优先来自真实会话、订单和圈子成员，其次才是 Follow 兼容数据。
- 后续如需要双向信任关系，新增独立 ADR，不直接把 Follow 改成强关系。

### 7.2 抢单机制重构

目标：限制滥用，但不制造“必须盯着平台抢机会”的稀缺循环。

#### 保留

- 防刷限流；
- 同一需求一次有效申请；
- 服务者当前是否忙碌；
- 最大同时承接数量；
- 不履约、恶意申请的风险控制。

#### 逐步移除或改名

- `snatchCredits` 用户文案改为“可承接容量”或“申请保护”。
- 取消“每月恢复次数”作为奖励叙事；容量根据未完成申请和订单动态释放。
- 不鼓励刷新抢单；匹配到用户明确订阅的任务时再通知。
- 认证等级不能出售，也不能无理由增加曝光；只能因当前任务的验证要求影响资格或排序。

建议目标模型：

```text
availableCapacity = configuredCapacity
                    - activeApplications
                    - activeOrdersWeighted
```

具体权重需单独产品确认；本规格不直接迁移 `snatchCredits` 字段。

### 7.3 信任展示

优先展示：

- 与当前任务相关的已验证完成次数；
- 样本量；
- 争议和退款口径；
- 最近完成时间；
- 可解释认证；
- 预计响应和完成时间。

不展示或弱化：

- 粉丝数；
- 与任务无关的总热度；
- 无样本量的百分比；
- 付费徽章；
- 通过在线时长塑造的“活跃达人”。

---

## 8. 工作流 E：透明收费与结果责任

### 8.1 商业边界

以下能力不得加入：

- 会员解锁核心服务；
- 付费置顶、购买流量、付费推送；
- 区分普通/高级用户的申诉权和安全保障；
- 通过制造复杂套餐隐藏实际费率；
- 默认勾选的附加服务。

### 8.2 统一费用明细

定义前后端共享语义：

```ts
type FeeBreakdown = {
  currency: 'POINT' | 'CNY'
  serviceAmount: number
  platformFee: number
  verificationFee: number
  thirdPartyCost: number
  heldAmount: number
  refundableAmount: number
  totalDue: number
  feeRate?: number
  pricingVersion: string
  explanations: Array<{
    code: string
    label: string
    amount: number
    refundable: boolean
    reason: string
  }>
}
```

所有资金确认接口在写入前必须能获得相同口径的 quote：

```text
GET /api/orders/:id/fee-quote?action=prepay|confirm|partial_accept|cancel
```

若实际执行时价格或规则版本变化，返回 `409 FEE_QUOTE_CHANGED`，由用户重新确认。

### 8.3 收费时点

- 发布时托管款不是平台收入，界面必须明确“仍属于交易保障资金”。
- prepay 扣取的服务费在订单取消或争议退款时按规则退回；未最终保留前不得在经营指标中记作已赚收入。
- `Settlement` 形成且订单达到允许的终态后，平台服务费才计入结果收入。
- 地回若天回验证失败，不得保留结果佣金；实际发生且提前说明的第三方成本按独立条目处理。

### 8.4 用户可理解性验收

在不打开帮助文档的情况下，测试用户必须能回答：

1. 现在会扣多少钱？
2. 哪部分是服务者收入？
3. 哪部分是平台手续费？
4. 如果失败或取消，哪些会退？
5. 为什么公益类规则不同？

五项任一无法回答，费用 UI 不得验收。

---

## 9. 工作流 F：真实生活地回试点

### 9.1 首批场景选择原则

由于当前仅支持 Windows 桌面，首批场景必须适合在电脑前表达、计划和验收：

- 文档与资料处理；
- 学习、求职和工作辅助；
- 设计、开发、远程专业服务；
- 家庭计划型事务；
- 可提前预约的本地维修、安装、代办。

暂不以“走在街上立即发生”的移动场景作为首批成功标准。移动入口必须由未来独立范围决策处理。

### 9.2 每个试点地回的完成标准

每个试点必须具备：

1. 明确自然语言入口；
2. 结构化输入与输出 schema；
3. 在线、可执行 endpoint；
4. 至少一个必要天回验证；
5. 明确费用和第三方成本；
6. 失败、超时和人工回退；
7. 真实 LoopRun、事件和证据；
8. 完成后 Quiet；
9. 端到端自动化测试；
10. 不依赖用户持续停留页面。

### 9.3 试点规模

第一批只做 3 个完整场景，不同时扩展大量分类。建议结构：

- 1 个纯自动地回；
- 1 个自动处理 + 人工确认的混合地回；
- 1 个地回失败后可顺畅转人回的场景。

产品负责人选定具体场景后，为每个场景建立独立规格，不把行业细节塞回通用 Natural Loop 服务。

### 9.4 试点评价

每个场景必须测量：

- 首个可行方案时间；
- 用户主动操作时间；
- 用户介入次数；
- 验证通过率及样本量；
- 失败后恢复成功率；
- 每次成功产生的通知数量；
- 费用争议率；
- 完成后 24 小时内无关触达次数（目标为 0）。

---

## 10. 时间节省与注意力度量架构

### 10.1 事件最小化

只记录与任务闭环有关的事件：

```text
INTENT_SUBMITTED
OPTIONS_PRESENTED
OPTION_CONFIRMED
USER_ACTION_REQUIRED
USER_ACTION_COMPLETED
RUN_TERMINAL
OUTCOME_ACKNOWLEDGED
TASK_QUIETED
NOTIFICATION_SENT
NOTIFICATION_SUPPRESSED
NOTIFICATION_OPENED
FEE_QUOTE_PRESENTED
FEE_CONFIRMED
```

不得记录：

- 鼠标轨迹；
- 与任务无关的每次悬停；
- 其他应用使用情况；
- 为构造上瘾画像而采集的滚动速度、犹豫时长；
- 未明确用途的全量页面点击流。

### 10.2 数据模型草案

```prisma
model OutcomeEvent {
  id            String   @id @default(uuid())
  userId        String?
  correlationId String
  resourceType  String
  resourceId    String
  eventType     String
  occurredAt    DateTime @default(now())
  activeMs      Int?
  metadata      Json     @default("{}")

  @@index([correlationId, occurredAt])
  @@index([resourceType, resourceId])
  @@index([eventType, occurredAt])
}
```

约束：

- `metadata` 使用字段白名单，禁止存需求正文、私信正文和敏感证件内容。
- 个体事件默认保留 90 天；之后只保留不可回溯到个体的日聚合。
- 管理看板展示群体聚合；小样本阈值建议 `n >= 20`。
- 用户可在隐私说明中查看采集目的。

### 10.3 指标定义

| 指标 | 公式 | 目标方向 |
|------|------|----------|
| Time to First Viable Option | `OPTIONS_PRESENTED - INTENT_SUBMITTED` | 越低越好 |
| Active Completion Time | 同一 correlationId 的 `activeMs` 合计 | 越低越好 |
| Intervention Count | `USER_ACTION_REQUIRED` 数量 | 在安全前提下越低越好 |
| Verified Outcome Rate | 验证成功终态 / 全部可判断终态 | 越高越好，必须带样本量 |
| Notification Burden | 非必要通知数 / 成功事项数 | 越低越好 |
| Irrelevant Notification Rate | 被关闭、忽略或标记无关 / 非必要通知 | 越低越好 |
| Quiet Integrity | 终态后 24h 内无关触达为 0 的任务比例 | 越高越好 |
| No Result No Fee Rate | 无有效结果且未保留结果佣金 / 无有效结果任务 | 目标 100% |
| Recovery Rate | FAILED/INCONCLUSIVE 后成功恢复 / 可恢复失败 | 越高越好 |

“节省时间”不能凭空宣称。若没有可靠的人工基线，只展示“用户主动操作时间”和“完成耗时”，不展示估算节省值。

### 10.4 管理看板要求

管理后台新增“用户时间与结果”面板，默认顺序：

1. 经验证完成事项；
2. 首个方案时间；
3. 主动操作时间；
4. 通知负担；
5. 失败与恢复；
6. 费用与退款透明度。

DAU、PV、会话时长放在诊断区，不作为首页英雄指标。

---

## 11. 后端模块改造清单

### 11.1 新增建议

```text
server/src/services/notification-decision.service.ts
server/src/services/notification-delivery.service.ts
server/src/services/task-quiet.service.ts
server/src/services/outcome-event.service.ts
server/src/routes/notification-policy.ts
server/src/routes/outcome-metrics.ts          // admin only
server/src/__tests__/notification-sovereignty.test.ts
server/src/__tests__/task-quiet.test.ts
server/src/__tests__/outcome-event-privacy.test.ts
server/src/__tests__/fee-quote.test.ts
server/src/__tests__/attention-surface.test.ts
scripts/audit-attention-patterns.mjs
```

### 11.2 修改建议

```text
server/src/index.ts                           // 生产不挂 legacy shorts；挂新路由
server/src/services/push-engine.ts            // 迁移到统一决策服务
server/src/services/push.service.ts           // 禁止直接发送非必要通知
server/src/routes/push.ts                     // 兼容层、所有权与审计
server/src/cron/agent-task-scheduler.ts        // 经通知决策服务投递
server/src/services/loop/*                     // 终态触发 Quiet/OutcomeEvent
server/src/services/order.service.ts           // 终态触发 Quiet/费用摘要
server/src/services/wallet.service.ts          // 统一 FeeBreakdown 口径
server/prisma/schema.prisma                    // 新通知与度量模型
.github/workflows/ci.yml                       // attention audit + 集成测试
```

### 11.3 禁止直接替换的现有能力

- WalletLedger/Settlement：只扩展费用解释，不另造平行账本。
- LoopRun/LoopEvent：继续作为运行事实来源，不用 OutcomeEvent 代替领域事件。
- Message：继续承载站内通知正文；NotificationDelivery 只记录投递决策和状态。
- Follow：第一阶段只改产品语义，不立即破坏数据与群聊联系人能力。
- PushPreference：先兼容迁移，一个发布周期后再决定删除。

---

## 12. 前端模块改造清单

### 12.1 新增建议

```text
client-react/src/api/notification-policy.ts
client-react/src/api/fee-quote.ts
client-react/src/components/notifications/NotificationReason.tsx
client-react/src/components/notifications/SubscriptionEditor.tsx
client-react/src/components/outcome/CompletionSummary.tsx
client-react/src/components/outcome/QuietConfirmation.tsx
client-react/src/components/fees/FeeBreakdown.tsx
client-react/src/utils/task-active-time.ts
```

### 12.2 修改建议

```text
client-react/src/views/PushSettings.tsx
client-react/src/views/Discover.tsx
client-react/src/views/OrderDetail.tsx
client-react/src/views/loop/LoopRunDetailPage.tsx
client-react/src/views/loop/MyLoopsPage.tsx
client-react/src/views/Follows.tsx
client-react/src/views/Profile.tsx
client-react/src/views/CardPool.tsx
client-react/src/views/help-faq-data.ts
client-react/src/router/index.tsx
```

### 12.3 活跃时间采集

只统计任务主链中的明确交互时间：

- 页面处于可见状态；
- 用户正在编辑、确认或处理必要步骤；
- 连续无输入超过 60 秒停止累计；
- 不以鼠标移动维持活跃；
- 只上报聚合 `activeMs`，不上传按键内容和轨迹。

该实现必须经过隐私评审，并允许在非生产环境检查事件 payload。

### 12.4 无障碍与普通人可理解性

- 不依赖颜色表达状态；
- 所有倒计时说明其业务意义，不制造紧迫文案；
- 键盘可完成主链；
- 费用、失败、取消和退出按钮不能隐藏在 hover 中；
- 自动化开始前说明会做什么，结束后说明做了什么；
- 禁止使用“错过”“仅剩”“最后机会”等非事实性诱导文案。

---

## 13. API 与错误码统一要求

新增稳定错误码：

| HTTP | details.code | 场景 |
|------|--------------|------|
| 400 | `NOTIFICATION_POLICY_INVALID` | 时区、安静时段或上限非法 |
| 403 | `NOTIFICATION_SOURCE_FORBIDDEN` | 无权为该资源创建推送 |
| 409 | `FEE_QUOTE_CHANGED` | 费用版本或金额变化 |
| 409 | `TASK_ALREADY_QUIET` | 重复 Quiet，可转为幂等成功 |
| 422 | `SUBSCRIPTION_FILTER_INVALID` | 订阅过滤条件不合法 |
| 429 | `NOTIFICATION_DAILY_CAP` | 非必要通知达到用户上限 |

API 响应继续使用现有信封；机器码放在 `details.code`，不强制全站一次性重构。

所有新写接口必须：

- 鉴权；
- Zod 校验；
- 所有权检查；
- 审计关键变更；
- 限制分页和数组长度；
- 不返回私信正文、需求正文等无关敏感字段。

---

## 14. 测试矩阵

### 14.1 通知主权 N1–N12

| ID | 用例 | 期望 |
|----|------|------|
| N1 | 新用户无非必要订阅 | 不收到机会、关系、摘要通知 |
| N2 | 交易资金变化 | 站内必要通知落库，不受每日上限影响 |
| N3 | 用户订阅指定标签/地域 | 仅匹配规则的需求可投递 |
| N4 | 安静时段即时机会 | Windows 弹窗延迟或转摘要，站内审计存在 |
| N5 | 每日上限达到 | 后续非必要通知 `SUPPRESSED/DAILY_CAP` |
| N6 | 订阅过期 | 不再投递，原因 `EXPIRED` |
| N7 | 任务完成进入 Quiet | sourceRef 对应订阅停止 |
| N8 | 每条投递 | 有 `reasonCode/reasonText` |
| N9 | 用户暂停全部非必要通知 | 所有 USER_REQUESTED/DIGEST/RELATIONSHIP 停止 |
| N10 | 手动执行他人需求推送 | 403 |
| N11 | AgentTask 未选择 MESSAGE | 不创建系统消息 |
| N12 | 旧 receivePushes=false 迁移 | 保持关闭，不被新默认覆盖 |

### 14.2 注意力边界 A1–A8

| ID | 用例 | 期望 |
|----|------|------|
| A1 | 生产访问 `/api/shorts` | 404 |
| A2 | Discover 空查询 | 不返回默认 Feed |
| A3 | 列表到底 | 不自动加载下一页，除明确工作集虚拟化 |
| A4 | 完成页 | 无无关推荐和继续浏览 CTA |
| A5 | CI 出现“付费置顶”实现 | audit 阻断 |
| A6 | Profile | 不突出公开粉丝数 |
| A7 | 推荐排序 | 不消费 follower/short 热度字段 |
| A8 | 卡池 | 无随机概率、签到、连续开包奖励 |

### 14.3 结果与 Quiet Q1–Q9

| ID | 用例 | 期望 |
|----|------|------|
| Q1 | LoopRun SUCCEEDED | 生成 CompletionSummary，进入 Quiet |
| Q2 | LoopRun INCONCLUSIVE | 展示重试/人工回退，不伪装成功 |
| Q3 | Order COMPLETED | 保留交易通知和证据，停止机会通知 |
| Q4 | Demand WITHDRAWN | 停止其匹配订阅和待发机会通知 |
| Q5 | 重复 Quiet | 幂等，无重复副作用 |
| Q6 | Quiet 后用户主动查看 | 历史完整可见 |
| Q7 | Quiet 后 24h | 无与任务相关的非必要触达 |
| Q8 | 无下一步动作 | 主 CTA 为关闭/返回 |
| Q9 | 有必要动作 | 只展示一个主要动作及原因 |

### 14.4 收费透明 F1–F8

| ID | 用例 | 期望 |
|----|------|------|
| F1 | prepay quote | 与实际扣款同口径 |
| F2 | quote 后价格变化 | 409 `FEE_QUOTE_CHANGED` |
| F3 | cancel/refund | 明细解释退款和保留项 |
| F4 | 地回验证失败 | 不保留结果佣金 |
| F5 | 第三方成本 | 提前展示且独立列项 |
| F6 | 公益交易 | 明确 10% 去向与口径 |
| F7 | 用户未确认 quote | 不执行资金写入 |
| F8 | UI 理解测试 | 五个费用问题全部可回答 |

### 14.5 度量隐私 M1–M8

| ID | 用例 | 期望 |
|----|------|------|
| M1 | OutcomeEvent metadata | 白名单拒绝私信/需求正文 |
| M2 | 页面后台或空闲 | 不累计 activeMs |
| M3 | 用户恢复必要操作 | 正常继续累计 |
| M4 | 聚合看板小样本 | 不展示可识别个体数据 |
| M5 | 90 天清理 | 个体事件删除，日聚合保留 |
| M6 | 完成后通知 | Quiet Integrity 正确计算 |
| M7 | 无人工基线 | 不展示估算节省时间 |
| M8 | 其他应用状态 | 不采集、不上传 |

### 14.6 真实场景 L1–L10

每个试点地回复用以下验收：

- L1：自然语言成功解析；
- L2：错误或缺失输入需要最少补问；
- L3：endpoint 不在线时不推荐；
- L4：required verifier 缺失时不推荐；
- L5：执行成功但验证失败不得结算成功；
- L6：外部超时进入明确失败或不确定状态；
- L7：可转人回且必须用户确认；
- L8：运行、验证、费用与事件完整可追溯；
- L9：用户离开页面后仍可完成；
- L10：终态后正确 Quiet。

---

## 15. 实施阶段与团队拆分

### Phase 0：产品签字与防回归基线（1 个短迭代）

**状态（2026-07-28）**：已完成（见 §21.5）。未部署云端。

交付：

- 本规格改为 Accepted；
- 产品宪法进入工程评审模板；
- attention audit 以警告模式接入 CI；
- 生产禁用 legacy shorts；
- 建立现有通知、Follow、CardPool、snatch 使用情况的聚合基线。

退出条件：P0 检查表全部完成，不涉及数据库删除。

### Phase 1：用户主权通知（2–3 个迭代）

交付：

- NotificationPolicy/Subscription/Delivery 迁移；
- 决策服务和渠道适配器；
- 新推送设置 UI；
- 旧偏好兼容迁移；
- AgentTask、Demand push 接入统一服务；
- N1–N12 自动化测试。

退出条件：所有非必要通知均可追溯到显式订阅。

### Phase 2：完成后淡出与注意力清理（2 个迭代）

交付：

- CompletionSummary 与 Quiet 服务；
- 订单、回、AgentTask 终态接入；
- Discover 无 Feed 防回归；
- Follows 文案和公开数字弱化；
- CardPool 去随机奖励审计；
- A/Q 测试完成。

退出条件：终态后 24 小时无关触达自动化测试通过。

### Phase 3：透明费用（1–2 个迭代）

交付：

- FeeBreakdown 与 quote API；
- 订单关键操作前端确认；
- 帮助文档单一口径；
- F1–F8 测试。

退出条件：quote、实际账本、Settlement 三者一致。

### Phase 4：三个真实生活地回（按场景独立排期）

交付：

- 三个完整场景；
- 真实 endpoint、验证、费用、回退、Quiet；
- L1–L10；
- 小范围受控用户验证。

退出条件：每个场景至少积累产品确认的最小有效样本，未达标不得扩大分类。

### Phase 5：时间节省度量与治理（1–2 个迭代）

交付：

- OutcomeEvent；
- 隐私保留和聚合任务；
- 用户时间与结果看板；
- M1–M8。

退出条件：管理层能在不看停留时长的情况下判断产品是否真正帮到用户。

### 15.1 推荐团队工作包

| 工作包 | 负责人建议 | 依赖 |
|--------|------------|------|
| WP-A 产品宪法/文案/评审模板 | 产品 + 创始人 | 无 |
| WP-B 通知数据与决策服务 | 后端 | WP-A |
| WP-C 推送设置与通知原因 UI | 前端 | WP-B API 冻结 |
| WP-D Quiet/CompletionSummary | 前后端联合 | WP-A |
| WP-E 注意力表面审计 | 前端 + QA | WP-A |
| WP-F 费用 quote 与明细 | 交易后端 + 前端 | ORDER TRUST ADR Accepted |
| WP-G OutcomeEvent 与看板 | 数据/后端 + 管理前端 | WP-D |
| WP-H 三个真实地回 | 领域小组 | WP-B/WP-D/WP-F 基础能力 |

同一迭代最多允许一个工作包修改钱包核心，避免与交易可信度工作交叉。

---

## 16. 数据库迁移与发布顺序

### 16.1 迁移原则

- 所有迁移先在真实本地 PostgreSQL 验证 `deploy → rollback rehearsal → clean deploy`。
- 先增表/增字段，兼容一个发布周期后再删旧表。
- 不使用生产 `db push`；生产只用 `prisma migrate deploy`。
- 迁移前备份并记录 `prisma migrate status`、应用版本和数据行数。

### 16.2 推荐迁移批次

```text
M1 notification_sovereignty
   + NotificationPolicy
   + NotificationSubscription
   + NotificationDelivery

M2 outcome_events
   + OutcomeEvent

M3 legacy_cleanup（独立产品签字）
   - PushPreference（确认完成迁移后）
   - Short（确认无真实数据或完成导出后）
```

### 16.3 部署顺序

```text
备份
→ migrate status
→ 部署向后兼容数据库迁移
→ 部署后端（双读旧偏好，写新模型）
→ 冒烟验证
→ 同窗口部署前端
→ 观察通知抑制率、错误率、队列积压
→ 开启新策略
→ 一个发布周期后停止旧写入
→ 再评审是否删除旧表
```

### 16.4 回滚

- 新通知系统故障：关闭新策略 flag，回退为“只发交易必要站内消息”，不得回退为全部推送。
- Quiet 故障：可暂停自动停订阅，但不得删除历史消息或运行记录。
- Fee quote 故障：禁止资金操作并返回可恢复提示，不允许绕过确认继续扣款。
- OutcomeEvent 故障：主业务继续运行；度量失败不得阻断交易和回执行。

---

## 17. Feature Flags

推荐环境变量：

```text
ENABLE_LEGACY_SHORTS=0
NOTIFICATION_SOVEREIGNTY_ENABLED=0
NOTIFICATION_LEGACY_READ_FALLBACK=1
TASK_QUIET_ENABLED=0
FEE_QUOTE_REQUIRED=0
OUTCOME_METRICS_ENABLED=0
ATTENTION_AUDIT_STRICT=0
```

规则：

- 生产默认 `ENABLE_LEGACY_SHORTS=0`，且 `NODE_ENV=production` 时代码层强制忽略该 flag。
- 新通知系统未启用时，只允许交易必要通知和用户已存在的明确自动任务；禁止“临时恢复全部推送”。
- Feature flag 必须有删除日期或退出条件，不能永久形成双系统。

### 17.1 Flag 退出条件

| Flag | 默认 | 退出条件 |
|------|------|----------|
| `ENABLE_LEGACY_SHORTS` | `0` | Short 表完成导出/确认无真实数据并经 M3 独立签字删除后，移除此 flag 与 `routes/shorts.ts` |
| `NOTIFICATION_SOVEREIGNTY_ENABLED` | `0` | Phase 1 N1–N12 通过且 legacy fallback 命中率可忽略后，下一周期关 `NOTIFICATION_LEGACY_READ_FALLBACK` |
| `NOTIFICATION_LEGACY_READ_FALLBACK` | `1` | 一个发布周期双读完成后删除旧写入路径；再评审是否删 `PushPreference` |
| `TASK_QUIET_ENABLED` | `0` | Phase 2 Quiet 自动化测试通过后默认开启，旧“完成后继续推”路径删除 |
| `FEE_QUOTE_REQUIRED` | `0` | Phase 3 F1–F8 通过且 ORDER TRUST Accepted 后生产开启 |
| `OUTCOME_METRICS_ENABLED` | `0` | Phase 5 M1–M8 通过后开启；失败不得阻断主业务 |
| `ATTENTION_AUDIT_STRICT` | `0` | Phase 0 警告模式；产品确认误报可控后 CI 可改为 strict 阻断明确机制词 |

---

## 18. 可观测性与运行保障

必须监控：

- notification decision 延迟、投递失败、抑制原因分布；
- digest 队列积压；
- Quiet 执行失败和重试；
- fee quote 与实际执行冲突率；
- OutcomeEvent 写入失败率；
- 每项成功结果的非必要通知数量；
- legacy fallback 命中率。

日志要求：

- 使用 correlationId/resourceId；
- 不打印通知正文、私信正文、完整需求正文；
- 不记录验证码、JWT、API Key；
- 错误日志可定位决策路径，但不得泄露用户过滤条件中的敏感内容。

告警建议：

- 交易必要通知落库失败立即告警；
- 非必要通知每日上限失效立即停发对应渠道；
- Quiet 连续失败进入降级队列；
- Fee quote 与执行金额不一致时禁止操作并告警。

---

## 19. 安全、合规与公平审查

### 19.1 推送滥用

- Demand 推送只能由需求所有者或受授权系统触发。
- 每个需求推送具有总接收人数上限和速率限制。
- 同一用户、同一需求、同一事件幂等。
- 用户举报通知后可追溯到 reasonCode、sourceRef 和操作者。

### 19.2 排序公平

- 排序版本化，记录使用了哪些信号类别。
- 运营后台不得人工付费改自然排名。
- 管理干预仅用于合规下架、风险限制和明确的公共利益策略，并有审计。

### 19.3 自动化授权

- 自动化读取和写入范围在运行前展示。
- 涉及资金、公开发布、联系陌生人和不可逆外部操作时必须遵循 Agent 权限与确认规则。
- 天回验证失败不得被运营手工改成成功；需要复核时生成新的验证记录。

### 19.4 收费合规

- “手续费可以避开数字税”等表述不得写入用户协议或工程决策；收费和税务按实际业务、支付通道及司法辖区合规处理。
- 平台不直接沉淀客户备付金；真实支付阶段应接入持牌机构的担保、分账或平台收付能力。

---

## 20. Definition of Done

任一阶段只有同时满足以下条件才算完成：

- 产品规则在本规格或子 ADR 中已 Accepted；
- API 字段与前端类型同步；
- Prisma migration 可干净部署；
- 单元测试、路由测试和适用的真实 PostgreSQL 测试通过；
- `pnpm run typecheck` 通过；
- 前端改动通过定向 ESLint；
- 关键用户路径完成桌面宽屏手工验收；
- 可观测性和降级策略已实现；
- 帮助文档与真实行为一致；
- 没有新增广告、付费曝光、随机奖励或默认非必要推送；
- 完成态有明确退出和 Quiet；
- 更新 `SESSION-ANCHOR.md`；只有形成稳定长期规则时才更新 `MEMORY.md`。

---

## 21. 产品与工程签字检查表

> **审计结论（2026-07-28）**：下列项均具备明确产品结论且工程可实施；无项因「需猜测产品决定」而阻断 Accepted。  
> **实现分期**：勾选表示原则与目标架构已冻结，不表示 Phase 1–5 已上线。  
> **兼容提醒**：现有 `PushPreference.receivePushes` 默认 `true` / 无记录全接受，**不得**解释为用户对未来所有通知类别的永久同意；Phase 1 迁移须正向订阅重建。  
> **依赖提醒**：统一 FeeBreakdown 落地（WP-F）仍依赖 `ORDER-TRANSACTION-TRUST-ADR` 进入 Accepted；本规格收费原则已冻结，但不提前改钱包状态机。

### 21.1 产品原则

- [x] 确认不以停留时长、滚动深度和连续登录作为产品目标 — *北极星为 Outcome Efficiency；DAU 仅诊断*
- [x] 确认不提供广告、会员门槛、付费置顶和购买推送 — *代码无会员/广告售卖入口；禁止新增*
- [x] 确认非必要通知采用正向订阅，默认关闭 — *目标态；当前 PushPreference 为排除模型，Phase 1 迁移*
- [x] 确认完成后不展示无关推荐，并进入 Quiet — *目标态；Phase 2 落地 CompletionSummary/Quiet*
- [x] 确认 Follow 对外改为合作关系语义，不突出粉丝数 — *目标态；Phase 2 文案；表与 API 暂保留*
- [x] 确认抢单额度逐步改为承接容量，而非回访奖励 — *目标态；现 `snatchCredits`+月度重置仍在，Phase 2 改造*
- [x] 确认 legacy shorts 生产禁用并进入删除评审 — *Phase 0：生产不挂载；删除待 Short 聚合基线 + 独立签字（M3）*
- [x] 确认首批只做三个完整生活场景 — *Phase 4；Windows 桌面诚实限定*

### 21.2 收费与公平

- [x] 确认收入主入口仍为结果佣金/手续费
- [x] 确认无有效结果不保留结果佣金
- [x] 确认所有费用在操作前显示统一明细 — *原则冻结；实现属 Phase 3 / WP-F*
- [x] 确认认证与自然排名不可购买
- [x] 确认新增收费模式必须独立 ADR

### 21.3 工程架构

- [x] 确认 NotificationPolicy/Subscription/Delivery 目标模型 — *§5.2 草案为 Phase 1 权威起点*
- [x] 确认所有非必要通知统一经过决策服务
- [x] 确认 OutcomeEvent 只记录闭环最小事件 — *Phase 5；不替代 LoopEvent*
- [x] 确认个体事件 90 天保留与小样本保护
- [x] 确认 Quiet 失败不阻断交易，但必须可重试和告警
- [x] 确认新旧推送系统只兼容一个发布周期 — *flag 退出条件见 §17*

### 21.4 发布治理

- [x] 确认 Phase 0–5 顺序
- [x] 确认生产迁移前备份和 migrate status
- [x] 确认前后端契约同窗口发布
- [x] 确认每个 feature flag 有退出条件 — *见 §17 退出条件表*
- [x] 确认云端部署需要独立授权，不由文档签字自动触发 — *本轮 Accepted 不触发云端部署*

全部勾选后，将本文件状态改为 **Accepted**。未 Accepted 前允许做只读盘点、原型和测试基建，不得实施破坏性数据迁移或对生产发布新策略。

### 21.5 Phase 0 退出检查（防回归基线）

- [x] 规格状态 Accepted
- [x] 产品宪法进入工程评审模板（`PRODUCT-TIME-SOVEREIGNTY-REVIEW-CHECKLIST.md`）
- [x] `scripts/audit-attention-patterns.mjs` 以警告模式接入 CI（`ATTENTION_AUDIT_STRICT=1` 才失败）
- [x] 生产禁用 legacy `/api/shorts`；开发仅 `ENABLE_LEGACY_SHORTS=1`；路由回归测试覆盖
- [x] PushPreference / Short / Follow / CardPool / snatch 聚合基线已建立（见 `PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE.md`）
- [x] 未删除 Short、Follow、PushPreference 表；未实施 NotificationPolicy；未改钱包/订单状态机；未部署云端

---

## 22. 工程任务派发模板

每个工作包派发时必须包含：

```text
目标：它为用户节省了什么时间或减少了什么风险？
范围：允许修改哪些文件/模型/API？
非目标：明确不能顺手加入什么？
契约：输入、输出、状态、错误码、权限。
迁移：数据如何兼容、回滚和清理？
验收：引用本规格测试 ID。
度量：如何证明有效，而不优化停留时长？
隐私：采集什么、不采集什么、保留多久？
发布：flag、灰度、监控、回滚。
```

任何任务如果无法回答第一项，不进入开发。

---

## 23. 最终产品判断标准

工程团队不应以“功能都做出来了”作为本计划完成标准，而应以以下事实作为判断：

1. 用户可以只说一次目标，就得到可执行或诚实回退的方案。
2. 用户无需持续盯着九木，事情仍能安全推进。
3. 每次需要用户介入时，都能解释原因和后果。
4. 推送来自用户自己的选择，而不是平台对注意力的索取。
5. 成功、失败、费用和证据都可追溯。
6. 事情完成后，九木停止制造新的打扰。
7. 平台收入只在真正创造结果时产生。
8. 用户离开九木去生活，不被视为产品失败。

九木的成功不是用户舍不得离开，而是用户可以放心离开；需要时回头，它仍然在。
