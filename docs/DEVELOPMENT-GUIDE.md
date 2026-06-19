# 九木平台 · 产品需求与开发指导（基于现状）

> 版本: AI 3.1.pro · 创建: 2026-06-15 · 最近同步: 2026-06-19 (Stage 1.3 落地)
> 定位: 本文档以**用户原话需求**为唯一权威来源，对照**当前代码实现**标注完成度，并给出**接下来开发的指导**。
> 关系: 取代 `ENGINEERING-ROADMAP.md` 作为开发主线。Roadmap 是早期设计稿，部分 API 路径/表结构与现状不一致，仅作历史参考。
> 配套: 可执行的推进路线、验收标准与测试用例清单见 `ACTION-PLAN.md`。本文档负责"是什么/到哪了"，`ACTION-PLAN.md` 负责"按什么顺序做/做完怎么算数"。

---

## 0. 如何使用本文档

1. **第 1 节「需求原文」是不可改动的真理来源**——逐字引用用户最初口述，禁止在该节增删或「优化」。所有实现争议以原文为准。
2. **第 2 节「实现状态总览」**给出一页式矩阵，快速定位每个能力的完成度。
3. **第 3 节「逐条对照与开发任务」**是主体：每条需求 = 原文 + 当前实现（文件/API/表）+ 差距 + 下一步任务。
4. **第 4 节「范围锁定」**明确初期只做哪几条，避免铺摊子。
5. **第 5 节「API 现状对照」**记录实际路径，纠正 Roadmap 里的虚构路径。

### 状态图例

| 标记 | 含义 |
|---|---|
| ✅ 已实现 | 主链路可用，与原文基本一致 |
| 🟡 部分实现 | 有表/接口/字段，但关键规则未闭环 |
| 🔴 未实现 | 基本没有对应代码 |
| ⚠️ 偏离设计 | 有实现，但行为与原文不符，需对齐 |

### 平台约束（Scope Lock）

- 仅 **Windows 桌面**（Electron + React），宽屏（≥1280px），不做移动端/触摸/PWA。
- Roadmap 第 10 节的「AI 3.0 移动端」**已作废**，不在开发计划内。

---

## 1. 需求原文（权威来源 · 逐字 · 不可改动）

### 一、需求发布与位置隐私
"如果打开了位置权限那么用户在发布的同时就可以被附近的人搜索到，但不是具体地址，大概有50米左右的误差，保护用户具体位置。"

### 二、15分钟紧急窗口与5分钟沟通资格
"用户一旦发布需求则默认为紧急需求，紧急到他都没时间去设置为长期需求。短期需求只有15分钟的生效期，一直无人接单，便会自动冻结。"

"我们给提交请求的人至少会给予5分钟时间与需求发布者沟通，哪怕这个短期需求已经14分59秒无人接单，我们也会为其该请求者延迟5分钟。所以不用担心需求只剩3秒钟自己就不敢去接单，担心自己3秒钟无法描述自己的优势啥的。"

"需求发布后，有一个15分钟的公开倒计时，此期间所有人可见可申请。在这15分钟内，任何用户点击'请求接单'，他个人都会获得一个专属的5分钟沟通资格。"

"15分钟公开倒计时结束，需求准时对所有人隐藏/冻结，不再接受新的请求。那些在15分钟结束前已获得沟通资格的用户，其5分钟沟通窗口依然有效，不受需求隐藏的影响。"

"5分钟的沟通资格是指，一旦你在那15分钟内点击了申请接单，那么在发布者确定正式接单者之前，你都有机会和发布者沟通，沟通时间的计算方式为，双方都为对方发了一条消息开始计时。换句话说，只有5分钟的时间来说服发布者，发布者也只会给你5分钟的时间。"

"不过，双方如果愿意，可以一起定一个延迟时间，将沟通资格时间无限期延长。但是这个资格的上限在需求是否被完成。如果需求被发布者确定完成，那么这个沟通资格会被强制切断。除非双方加好友才可以继续私聊，但那都是后话了，现实中社交属性和工作很难联系在一起。"

### 三、AI标签与认证者推送
"用户一旦发布需求可以自主选择是否认可AI分析后打上的标签，也可以自己选择标签，一旦带有标签的需求被用户主动推送，就会自动提醒相应的认证者。不过认证者也可以选择打开主动接受功能，那样的话即使用户不主动推送也会收到通知，这适合工作狂和高效率者，以及，机会主义者。"

### 四、效果导向验收
"用户发布需求必须填写最终想要达到的效果，这是接单者的服务下限，你可以尽量写高，如果你不担心没有人能接受你的价格和需求的话。需求被解决后，以该效果为准则，没做到可以拒绝付款，如果没证据证明，则必须付款。我们强烈建议写上时间限制，让服务者在限定的时间内完成。"

### 五、押金与多单规则
"发布一条需求不需要钱，需求解决后可以再发。但同时发布多需求就需要缴纳最低报价的百分之一的押金，需求解决（用户通过平台交付给供应方成交价）后平台退回押金，需求被冻结不退还多单押金，用户删除冻结需求后退还押金。最低报酬极限平台限制为1元上不封顶。"

### 六、两段式接单与需求销毁
"接单分为两部分，请求接单后正式接单。服务者可以请求接单并且描述自己可以解决该需求的原因。用户会看到多个人的描述，然后选择其中一个进行正式接单，此时服务者会立马行动。一旦有人正式接单那么需求就会被销毁，只有双方能看到。同时请求接单数上限由发布者自己设定，默认10人，达到上限后需求会被隐藏，只有用户拒绝掉一些后才能使得其重新出现在需求广场。"

### 七、平台结算与预充值
"交易完成后需求发布者需要额外缴纳成交额5%的平台服务费。以成交价为准。平台采用'预充值扣款'模式。需求方发布时，需将'最低报价'预付至平台（实际上最低报价是平台对服务方的保障，保障服务费的最低回报，保下限，一旦需求完成，需求者必须支付，虽然是由平台中转）。交易完成后，需求者只需支付给服务者成交额和最低报价的差价支付给服务方，平台将最低报价支付给服务方，服务费留作平台收入。不存在复杂的分账。"

### 八、需求冻结与撤回
"你发布需求后迟迟不做决定或者就没有人请求接单，那你这条需求就会被冻结，无法被搜索到，在你删除所有冻结需求前无法发布新需求。"

"关于虚假需求或者需求发布后发现又不需要了，那么正常的自行删除是可以的。所有的需求发布的时候必须预先支付标明的最低成交价作为押金，需求完成后无事发生，需求被冻结或者被自己撤回，冻结只返还95%的押金，自己撤回返还99.99%。最低成交价是直接被服务者看到的最低保障，只有高价才能吸引优质服务者，极低的最低成交价可能会很难被接单，那么就会被冻结，那么就要损失押金。"

### 九、用户无需计算金额
"用户不需要计算付款金额，平台会自动结算，同时每次付款都可以选择查看各部分的金额，也可以查之前的金额，所以复杂的金额计算与用户无关，但我们依旧提供一切可追溯的资料与证据。"

### 十、项目初期范围
"项目初期，我们只提供1，2，4，6，7，10作为基础需求发布功能，其余功能开发难度太大留到后期考虑。"

*（编号对应：1=位置模糊，2=15分钟窗口+沟通资格，4=效果导向验收，6=两段式接单，7=平台结算，10=用户无需计算金额）*

### 十一、公益需求系统
"公益类需求，用户自己设置为公益需求后会被投进当地的公益需求圈（这是一个特殊的自由圈），这里的所有需求都是公益性质，平台对该类需求的抽成会特殊的用于建设该圈。比如寻人启事和寻物启事，这类需求就可以设置为公益需求，对于服务者我们会进行奖励，鼓励其行为，奖励形式多样，可能是抽奖也可能是选择奖项，也可能是直接就发红包，而这些的资金都来自于平台对该圈子的抽成。对于公益圈，政府有很高的管理权限，无论是警察局还是医院或者什么都可以与公益圈对接。公益圈有独特的交付方式，不需要请求接单，所有看到该需求的人都默认请求接单，比如当你找到了谁的小孩，你就可以直接联系需求者说你完成了单子，那么那么就可以进行正常的交付，你获得了成交价后还会获得平台的随机奖励。公益需求冻结时间由默认15分钟特殊处理为默认15天。公益需求平台抽成较高（10%），平台在公益需求的所有抽成全部交予当地政府或有关部门处理，平台只是顺手做了公益，无心在公益上盈利，这是为了避免人们胡乱讲需求标为公益，以此来恶意占用长达15天的社会注意力。"

### 十二、需求圈体系
"正如民族分布一样，需求也是大杂居，小聚聚，相互交错。所以为了把那些类似的需求聚集起来，我们推出'需求圈'这一概念。首先空间上我们实现了初步的划分，因为每个需求在发布的时候就已经标明了地理位置，那些没有标明地理位置的或许他自己认为他的需求与位置无关吧，或者他视自己的位置为隐私，但无论如何都至少有一个基本的地理位置（用户IP）。就空间而言，用户可以进行二次甚至多次筛选。比如创建一个希望小学需求圈，这里可能就如论坛一般有着许多的讨论，但是所有的需求都可以明码标价，也就是说，所有的需求都大概率可以得到满足。再比如金华富二代需求圈，这个就也很厉害，富二代之间的需求那都是极其重要的，因为他们很有可能直接促成许多产品的成交，而且富二代的需求往往只有别的富二代可以满足。那么需求如果在圈内没有得到解决呢？是的，需求圈内没有满足的需求，需求发布者可以选择将其投往圈外，也就是大众市场。所以大众无法看到圈内的需求，只有那些无法被圈内满足的需求被发布者公开后才会被大众看到。"

"那么如何创建和加入需求圈呢？需求圈分为两种，私人需求圈和公公开需求圈。私人需求圈有由圈主自由创建，管理流程类似于微信群。而公开需求圈不能由圈主自由创建，需要向平台申请，核名时不能重复且必须加入地区前缀，命名格式为某地某某需求圈。地区前缀需要圈员人数达标。公开需求圈的活跃程度过低会被平台预警，随后彻底注销该圈，可以重新创建一个。公开需求圈接受全社会的监督，所有人都可以搜索到，所有当地的人都可以申请进圈。当地的圈内人士可以发布需求和解决需求，而当地的圈外人士只能发布需求在该圈内（会被标上大众需求的标签），圈外人士只有在圈内人士无法解决需求后圈内和圈外发布者将需求公开后才能解决该需求。也就是说圈内需求优先被圈内解决，最后才会把需求公开。任何需求都会被解决，只是顺序不同。"

"在你的平台交易记录中，你有过多次的大众级别的手工服务记录（而不是自己拉个圈子自己给自己人服务），才有资格申请县级的手工公开圈，县级公开圈内优秀成员（由平台和大众评估）才有资格申请市级的公开圈，以此内推，最终会上升到中国级别的圈子（该圈子我们将部分权力交由政府）。"

---

## 2. 实现状态总览

> 最近一次同步：2026-06-15 · v1.5 收尾轮
> 旁注：上一版"2b/2c 🔴"为审计误判（实现在 `comm.service.ts` 而非 `message.service.ts`，grep 不全导致），本版已纠正

| # | 能力 | 初期范围 | 状态 | 一句话现状 |
|---|---|:---:|:---:|---|
| 1 | 位置模糊（50m 噪声） | ✔ | ✅ | `fuzzLocation` 落库 + raw SQL 已切 `fuzzyLat/fuzzyLng`（2026-06-15 修复） |
| 2a | 15 分钟紧急窗口 + 自动冻结 | ✔ | ✅ | `visibleUntil` + 30s cron 冻结；Stage 0 已补 `processDemandWindows` 单测（`demand-window.test.ts`） |
| 2b | 5 分钟沟通资格（双方互发消息计时） | ✔ | ✅ | `comm.service.ts` 状态机：双方首消息 → `COMMUNICATING` + 5min；`comm-integration.test.ts` 已覆盖 |
| 2c | 沟通延长 / 完成后强制切断 | ✔ | ✅ | `closeAllCommForDemand` 已接入 4 处（`comm.service.ts:104` → `acceptance`/`demand.acceptApplicant`/`pool.completeDemand`）；Stage 0 已补单测（`comm-close.test.ts`） |
| 3 | AI 标签 + 推送认证者 / 主动接受 | | ✅ | Stage 1.1 已落地：复用 `UserTag.autoReceive`（原决策为"不新增 `PushPreference.autoAccept`"，考虑到字段已存在 + 按 tag 粒度更精细）；`demand.service.create` 交付后自动触发推送；12 个新单测 (A–L) 已覆盖。`autoAccept` 名字在后续业务可能会提供，但本期不变。未来项：认证撤销场景需下阶段补上。 |
| 4 | 效果导向验收（拒付/举证） | ✔ | ✅ | `WAITING_REVIEW`→确认/拒付；`Complaint.evidenceUrls`；拒付弹窗支持图片上传（`POST /api/uploads/evidence`） |
| 5 | 押金（每条全额预付，决策已锁定） | | ✅ | `wallet.service` 闭环；旧 `/api/deposits/*` 已 410 Gone；Stage 0 已删 `deposit.service.ts`；`Deposit/DepositDemand` 表按决策 D1 保留 |
| 6 | 两段式接单 + 销毁 + 满员隐藏 | ✔ | ✅ | `canViewDemand` + 搜索排除 `FROZEN/IN_PROGRESS` + 满员 post-filter；`rejectApplicant` 递减 `applicantCount` |
| 7 | 平台结算 + 预充值最低报价 | ✔ | ✅ | `wallet.hold` + `settleDemand` + `GET /api/orders/:id/pay-breakdown` |
| 8 | 冻结/撤回（删冻结才能再发） | | ✅ | 冻结 cron + `checkFrozenBeforePublish` + 搜索排除 `FROZEN`（`demand-search-visibility.test.ts`） |
| 9 | 用户无需计算金额（明细可查） | ✔ | ✅ | `SettlementPanel` + `breakdown/history` + `Payment.tsx` pay-breakdown 折叠面板 |
| 11 | 公益需求系统（接单沿用两段式） | | 🟡 | 10% 抽成+奖励闭环；claim 已对齐两段式（2026-06-15 修复）；无政府拨付出账 |
| 12 | 私人需求圈（初期只做这个） | | 🟡 | 主体可用；公开圈按 D4 后置；缺测试 + 活跃度 cron 验证 |
| — | 公开圈/审核/升级/公众待办区 | | 🔴 | **初期不做，整体后置**（决策 D4） |

**结论**：初期范围（1/2/4/6/7/10）**已全部落地**；剩余工作集中在：
(a) 回归测试补全（#2c 完成切断、冻结后窗口存续），
(b) #3/#11/#12 后期范围，
(c) 旧 `Deposit/DepositDemand` 表与 `deposit.service.ts` 清理，


---

## 3. 逐条对照与开发任务

### 1. 位置模糊 ✅

- **原文**：发布即可被附近搜到，但有约 50 米误差。
- **当前实现**
  - `server/src/utils/location-fuzz.ts` → `fuzzLocation()`，约 ±50m 抖动。
  - `server/src/services/demand.service.ts` 发布时调用，落库 `fuzzyLat/fuzzyLng`，精确坐标不入库。
  - `server/src/utils/distance.ts` 按模糊坐标算距离；开发期用 IP→`Region`（`ipgeo.service.ts` / `region.service.ts`）。
- **差距**：基本无。可补：附近搜索的距离排序在前端的可视化。
- **下一步**：保持现状；编写一个单测固化「精确坐标永不出现在 API 响应」。

### 2a. 15 分钟紧急窗口 ✅

- **原文**：默认紧急、15 分钟生效期、无人接单自动冻结。
- **当前实现**
  - `Demand.visibilityWindow`（默认 15）、`visibleUntil`、`frozenAt`。
  - `server/src/cron/demand-window.ts`：每 30s 把 `visibleUntil <= now 且无接单者` 的需求置 `FROZEN`。
- **差距**：无明显问题。
- **下一步**：保持；为 cron 写一个时间推进的集成测试。

### 2b + 2c. 5 分钟沟通资格 ✅（2026-06-15 审计复核纠正）

> 旁注：上一版"🔴"是审计误判——沟通计时实现在 `comm.service.ts`（非 `message.service.ts`），grep 范围不全导致。复核后状态升级为 ✅。

- **原文**：点击「请求接单」获得专属 5 分钟沟通资格；**双方各发一条消息才开始计时**；15 分钟结束后已获资格者的 5 分钟仍有效；双方可约定无限延长；需求被确认完成则强制切断（除非加好友）。
- **当前实现**
  - 状态机在 `server/src/services/comm.service.ts`：检测发布者↔申请者双方首消息 → 置 `COMMUNICATING` + `commStartAt=now` + `commDeadline=now+5min`（comm.service.ts:55-65）。
  - 延长接口：`POST /api/demands/:id/extend-comm`（demand.ts:481-489），`extendComm()` 累加 `extensionMinutes` 并顺延 `commDeadline`（comm.service.ts:88-98）。
  - 计时超时：`server/src/cron/demand-window.ts` 检查 `COMMUNICATING + commDeadline<=now → TIMED_OUT`。
  - 公益认领同样走该状态机（已并入两段式，对齐 D3）。
  - **完成/接单切断**：`closeAllCommForDemand()`（comm.service.ts:104）用 `updateMany` 把该 demand 下所有 `PENDING/COMMUNICATING` 置终态；已接入 4 处——正式接单（demand.service.ts:791）、确认验收（acceptance.service.ts:36/127）、卡池完成（pool.service.ts:241）。
  - 测试：`server/src/__tests__/comm-integration.test.ts` 覆盖"双方首消息起算 / 单方不起算 / 延长"三条路径。
- **剩余差距**（2026-06-19 复核：切断逻辑 + Stage 0 单测已覆盖）
  - [ ] 切断仅做 DB 状态置终态，**未通过 socket 向其他申请人广播实时关闭通知**（前端需轮询/刷新才感知）。
  - ✅ 冻结后沟通窗口存续：`demand-window.test.ts` 5 用例（Stage 0.2）。
  - ✅ 完成/接单切断：`comm-close.test.ts` 7 用例（Stage 0.1）。

### 3. AI 标签 + 推送认证者 ✅（2026-06-19 Stage 1.1 落地）

- **原文**：可认可/自选 AI 标签；带标签需求被「主动推送」→ 自动提醒认证者；认证者可开「主动接受」即使不推送也收通知。
- **当前实现**
  - 标签：`Demand.aiTags / tags / tagsConfirmed`；前端 `DemandCreate.tsx` 传 `tagsConfirmed`；分类用 `semantic-classifier.ts` / `intent-classifier`。
  - 推送：`server/src/services/push-engine.ts`（规则链）+ `POST /api/pushes/execute/:demandId`；偏好 `PushPreference`（`excludeKeywords/Tags/Regions`、`receivePushes`、`pushFrequency`）。
  - 认证：`Certification` / `CertifiedProvider`，`GET /api/providers/certified`，`Demand.isCertifiedOnly`。
- **差距**
  - 推送目标主要按 `UserTag(status=IDLE)`，**「自动提醒认证者」未与认证体系直接挂钩**。
    - 资格门槛：优先 `UserTag.certified=true`，兜底 `User.certificationLevel !== 'NONE'`；不足返 403。
  - Roadmap 的「推送进度 `GET /pushes/:id/status`」无（也无 `DemandPush` 表）。
- **下一步任务（非初期范围，排后）**
    - 匹配规则：`status=IDLE` + `autoReceive=true` + tag 匹配 + 可选 region 匹配；走现有 7 规则链 `shouldReceivePush`。
    - 触发点：`demand.service.create()` 交付 demand 后，catch 包裹调用 `triggerAutoReceivePush`；推送失败不反向影响 demand 创布。
    - 接口：`PATCH /api/user-tags/:tagName/auto-receive`（body `{ autoReceive: boolean }`，身份校验全后端推导）。

### 4. 效果导向验收 ✅

- **原文**：必填「最终效果」，作为服务下限；解决后以效果验收，没做到可拒付，无证据则必须付款；强烈建议填时间限制。
- **当前实现**
  - `Demand.expectedOutcome`：后端 `POST /api/demands` zod `min(1)` 必填；前端 `DemandCreate` / `WelfareCenter` 同步校验。
  - 验收状态机：`acceptance.service.ts` — 服务者 `complete` → `WAITING_REVIEW` → 需求方 `confirm` 结算 / `reject-acceptance` 拒付并举证 → `Complaint` + `DISPUTED`；7 天无操作 cron 自动验收。
  - 举证：`Complaint.evidenceUrls String[]`；`POST /api/uploads/evidence` 上传图片；`OrderDetail.tsx` 拒付弹窗支持上传 + 链接粘贴。
  - **`Demand.timeLimit`**：✅ Stage 1.3 落地 — `POST /api/demands` 接受可选 `timeLimitMinutes`（>=15 且 <=10080），服务端换算为绝对 `timeLimit = new Date(Date.now() + N*60_000)` 落库；`order.service.getById` 的 demand select 含 `timeLimit`；`OrderDetail.tsx` 展示剩余/已超时；`processTimeLimitReminders` cron（60s）按 Order 锚点扫描 `IN_PROGRESS + timeLimit<=now`，命中时给 requester + provider 各发一条以 `[TIME_LIMIT]` 起头的 SYSTEM 消息（**仅提醒，不改订单状态**），同 orderId 幂等去重。7 个新单测（`time-limit.test.ts` A–G）覆盖接线 + 扫描 + 幂等。
- **差距**：平台裁决 `Complaint` 人工处理流未做管理端闭环；timeLimit 接线**仅提醒、不自动进入拒付/争议**（与已决策『公益接单沿用两段式 + 不擅自扣款』原则一致），且语义为『从发布起算』而非『从接单起算』。
- **下一步任务（后期）**
  - [ ] 管理端争议裁决 UI 对接 `complaint.ts`。
  - [ ] 若产品要改『从接单起算』，新增 `serviceDeadlineFromAccept` 字段（Stage 1.3+ 后续）。

### 5. 押金与多单规则 ✅（2026-06-15 修复轮升级）

- **决策（见第 6 节）**：押金 = **每条预付全额最低报价**，托管于平台；**废弃「多单 1%」模型**。退款：完成 100% / 撤回 99.99% / 冻结 95%。
- **原文**
  - 节五：发 1 条免费；多条未完成时每条交 `最低报价×1%`；解决后退；冻结不退多单押金；删除冻结需求后退还押金。
  - 节八：所有需求发布必须预付**最低成交价**作押金；冻结返 95%，撤回返 99.99%。
  - → 决策采纳节八口径（全额预付），节五的「1%」作废。
- **当前实现**
  - 押金计算：`wallet.service.calculateDeposit(minPrice) === minPrice`（wallet.service.ts:61）。
  - 发布托管：`demand.service.create()` 事务内调用 `wallet.holdForDemand` 全额预扣（demand.service.ts:142）。
  - 退款三档：wallet.service.ts:21 `refundRatio = { COMPLETED:1.0, WITHDRAWN:0.9999, DELETE_FROZEN:0.95 }`；`releaseHold()` 统一入口；`wallet-settle-integration.test.ts` 显式断言三档比例。
  - 旧路径下线：`POST /api/deposits/hold|return`、`GET /api/deposits/my` 已返回 **410 Gone**；`deposit.test.ts` 改写为期望 410（3 个 case）。
  - `checkFrozenBeforePublish`：有冻结需求则禁止发布 ✅。
- **剩余工作**
  - [ ] 清理旧 `Deposit/DepositDemand` 表（保留数据以备追溯，前端/路由已不再触达）。
  - [ ] 评估 `server/src/services/deposit.service.ts` 旧 service 是否可删除（已无调用方，剩 `@deprecated` 标记）。

### 6. 两段式接单 + 销毁 + 满员隐藏 ✅

- **原文**：请求接单（带描述）→ 发布者从多人中选 1 正式接单 → 立即行动；**正式接单后需求销毁、仅双方可见**；请求上限默认 10，满员隐藏，发布者拒绝部分后重新出现在广场。
- **当前实现**
  - `requestDemand` / `acceptApplicant` / `rejectApplicant` / `getApplicantsV2` / `withdrawDemand`。
  - `maxApplicants` 默认 10；满员 `requestDemand` 抛 429。
  - **满员隐藏**：`demand.service.ts` search 排除 `applicantCount >= maxApplicants` 的 `PENDING/ACTIVE`；geo SQL 同步过滤；`isVisibleInMarketplace()` 单测覆盖。
  - **拒绝重现**：`rejectApplicant` 内 `applicantCount` 递减。
  - **接单后仅双方可见**：`canViewDemand()` — `IN_PROGRESS` 仅发布者与 `acceptedProviderId` 可读；搜索排除 `IN_PROGRESS`。
  - `acceptApplicant` 调用 `closeAllCommForDemand` 切断其他申请人沟通。
- **差距**：基本无。可补 E2E：满员→隐藏→拒绝→重现。
- **下一步**：保持；可选补集成测试。

### 7. 平台结算 + 预充值最低报价 ✅

- **原文**：完成后需求方额外付成交额 5% 服务费；**预充值扣款**：发布时把「最低报价」预付到平台托管；完成后需求者补「成交价−最低报价」给服务者，平台把最低报价转给服务者，服务费归平台。
- **当前实现**
  - `wallet.service`：`holdForDemand` 发布全额托管、`settleDemand` 完成拆分、`releaseHold` 三档退款。
  - `calculateSettlement`（5%）/ `calculateSettlementWelfare`（10%）。
  - `GET /api/orders/:id/pay-breakdown` 付款前预览；`GET /api/transactions/:demandId/breakdown|history` 历史追溯。
  - 旧 `deposit.service`（1%）路由已 410，业务不再触达。
- **差距**：旧 `Deposit/DepositDemand` 表仍保留（待清理）。
- **下一步任务**
  - [ ] 清理旧 `Deposit/DepositDemand` 表与 `deposit.service.ts`（数据归档后）。

### 8. 冻结与撤回 ✅

- **原文**：迟迟不决定/无人请求 → 冻结、不可搜索、删完冻结才能再发；自行删除可；冻结返还 95%、撤回 99.99%。
- **当前实现**：冻结 cron ✅；`checkFrozenBeforePublish` 拦截发布 ✅；`withdrawDemand` 退 99.99% ✅；搜索排除 `FROZEN` ✅（`demand-search-visibility.test.ts`）。
- **差距**：无明显问题。
- **下一步**：保持。

### 9. 用户无需计算金额 ✅

- **原文**：平台自动结算；每次付款可查各部分明细，也可查历史；金额计算与用户无关，但保留可追溯证据。
- **当前实现**：`settlement.ts` 自动算；`/api/transactions/:demandId/breakdown` + `/history`；`Payment.tsx` 折叠「结算明细预览」；`TransactionHistory.tsx` 流水页。
- **差距**：无。
- **下一步**：保持。

### 10. 初期范围（约束，非功能） ✔

- **原文**：初期只做 1、2、4、6、7、10。
- **执行**：见第 4 节「范围锁定」。

### 11. 公益需求系统 🟡

- **原文**：设为公益 → 投入当地公益需求圈；抽成专用于建圈；服务者获奖励（抽奖/选奖/红包，资金来自抽成）；政府高管理权限；**独特交付：无需请求接单，所有人默认接单**，完成后直接联系交付，获成交价 + 随机奖励；冻结期 15 分钟特殊处理为 **15 天**；抽成 **10%** 且全部交当地政府/部门。
- **当前实现**
  - `routes/welfare.ts`：发布公益需求（15 天窗口 ✅）、自动建 `公益需求圈-{regionId}`（PUBLIC）✅、关联 `CircleDemand` ✅、`maxApplicants=9999`。
  - 抽成 10%：`calculateSettlementWelfare` ✅。
  - 奖励：`welfare-reward.ts`（池有钱→随机红包，池空→精神勋章）✅；`WelfareFundPool` / `WelfareReward` 表 ✅。
  - 认领：`POST /api/welfare/claim` 已对齐两段式（调用 `requestDemand`，PENDING 而非直接 COMMUNICATING）✅。
- **决策（见第 6 节）**：公益**仍走两段式接单**（保留请求→接单），不做「所有人默认接单直接交付」。原文「默认接单」仅作文案/体验简化，不改变接单环节。
- **差距**
  - 公益交付应统一到普通两段式流程（当前 `claim` 是另一套，需对齐 #6）。
  - 「抽成全部交当地政府/部门」只入了 `WelfareFundPool`，**无政府对接/拨付出口**。
  - 奖励「选择奖项」分支未实现（仅随机红包 + 精神勋章）。
- **下一步任务（后期）**：公益接单对齐 #6 两段式；设计资金池→政府拨付的出账记录；补「选奖」奖励类型。

### 12. 需求圈体系 🟡 / 🔴

- **原文**：地理初步划分（IP 兜底）；可多次筛选；圈内需求明码标价、优先圈内解决，未解决可由发布者公开到大众；大众看不到圈内需求，只看到被公开的。私人圈圈主自建（类微信群）；公开圈需平台申请、核名唯一+地区前缀（「某地某某需求圈」）、前缀按圈员人数解锁、活跃过低预警后注销；全社会可搜、当地人可申请进；圈内人可发可解，圈外人只能在圈内发（标「大众需求」），圈外人须等圈内解决不了、公开后才能解。升级链：大众级手工记录达标→申请县级手工公开圈→优秀成员→市级→…→国家级（部分权力交政府）。
- **当前实现**
  - 私人圈：`circle.service.ts`（创建、邀请码加入、`OWNER/MEMBER`）✅。
  - 公开圈增强：`routes/circle-enhanced.ts`（列表、创建、加入、圈内发需求 `isPublic=false`、`publish` 公开到大众、查圈内需求）🟡。
  - 状态/层级枚举已建：`CircleType(PRIVATE/PUBLIC)`、`CircleStatus(ACTIVE/WARNING/DEFUNCT)`、`CircleLevel(COUNTY/CITY/PROVINCE/NATIONAL)`、`MemberRole`。
  - 活跃度 cron：`cron/circle-activity.ts`（预警/注销方向）🟡。
- **决策（见第 6 节）**：**初期只做私人圈**（圈主自建、邀请码加入、仅圈内可见，类微信群）。以下公开圈相关全部后置。
- **差距（后置，初期不做）**
  - 公开圈「平台申请 + 审核」缺：`circle-enhanced` 直接 create，仅校验名字含「需求圈」。
  - 公众待办区（圈外人发布进圈、标「大众需求」、圈内 1 小时优先窗口、未接转大众可见）🔴。
  - 升级量化判定（县→市→省→国，按完成单数/好评率/圈员数）🔴。
  - 地区前缀按人数解锁 🔴。
- **初期下一步**：仅确保私人圈（`circle.service.ts`）创建/邀请码加入/圈内可见可用并补测试；公开圈代码（`circle-enhanced`）初期可不暴露入口。

---

## 4. 范围锁定（接下来要做的）

依据原文第十条，**初期只交付 1、2、4、6、7、10**。**M1–M3 已于 2026-06-15 完成**，后续按优先级推进：

### 已完成里程碑

| 里程碑 | 对应能力 | 状态 |
|---|---|:---:|
| M1 | #2b/#2c/#6 两段式接单 + 沟通资格 | ✅ |
| M2 | #5/#7/#8/#9 点数钱包 + 结算 + 明细 | ✅ |
| M3 | #4 效果导向验收闭环 | ✅ |

### 下一批（2026-06-19 更新）

1. ✅ **Stage 0 测试补全** + **deposit.service.ts 删除** — 已完成。
2. ✅ **Stage 1.1** autoReceive · **Stage 1.3** timeLimit — 已完成。
3. **进行中**：**Stage 1.2** 公益政府拨付出账 + 选奖（`docs/specs/STAGE-1.2-welfare.md`）。
4. **后期**：Stage 1.1 未来项（认证撤销防漏推、重复推送防重）；Stage 2 公开圈全套。

### 暂缓（后期，非初期范围）
- #12 公开圈全部能力（申请审核、公众待办区、圈升级）——**初期只做私人圈**。
- 公益 `claim` 与普通两段式完全对齐（见 STAGE-1.2 spec §8 backlog）。

---

## 5. API 现状对照（纠正 Roadmap 的虚构路径）

> Roadmap 第 11 节的多数路径与实际不符，以下为**当前真实路由**（挂载见 `server/src/index.ts`）。

| 领域 | 真实路径 | 说明 |
|---|---|---|
| 发布需求 | `POST /api/demands` | `multipart`，含 `expectedOutcome/visibilityWindow/tagsConfirmed` |
| 搜索 | `GET /api/demands/search` | 排除 `FROZEN`/`IN_PROGRESS`；满员 `PENDING/ACTIVE` 隐藏 |
| 请求接单 | `POST /api/demands/:id/request` | Phase 1，body `{ message }` |
| 正式接单 | `POST /api/demands/:id/accept/:applicantId` | Phase 2；切断其他申请人沟通 |
| 拒绝申请 | `POST /api/demands/:id/reject/:applicantId` | `applicantCount` 递减，需求重新可见 |
| V2 申请列表 | `GET /api/demands/:id/applicants-v2` | |
| 撤回 | `POST /api/demands/:id/withdraw` | 退 99.99% |
| 弹性延期 | `POST /api/demands/:id/extend-lifecycle` | 卡池生命周期 |
| 延长沟通 | `POST /api/demands/:id/extend-comm` | `extendComm()` 累加分钟 |
| 订单付款预览 | `GET /api/orders/:id/pay-breakdown` | 付款前结算明细 |
| 拒付并举证 | `POST /api/orders/:id/reject-acceptance` | body `{ reason, evidenceUrls? }` |
| 举证上传 | `POST /api/uploads/evidence` | multipart，最多 5 张图 |
| 旧押金（已废弃） | `POST/GET /api/deposits/*` | **410 Gone**，走钱包托管 |
| 服务者检索 | `GET /api/providers/search` · `POST /api/providers/special-search` · `GET /api/providers/certified` | 结果 `anonymize` |
| 推送偏好 | `GET/PUT /api/pushes/preferences` | |
| 执行推送 | `POST /api/pushes/execute/:demandId` | 无进度查询 |
| 用户标签 | `GET /api/user-tags` · `POST /api/user-tags/:tagName` · `DELETE` · `POST .../toggle` | IDLE/BUSY/HIDDEN |
| 标签分析 | `GET /api/tag-stats` · `POST /api/tag-stats/refresh` | Roadmap 写的是 `/api/tags/stats` |
| 交易 | `GET /api/transactions/:demandId/breakdown` · `GET /api/transactions/history` | |
| 点数钱包 | `GET /api/wallet/balance` · `GET /api/wallet/ledger` | 开发期 1点=1元，默认 100W |
| 公益 | `POST /api/welfare/demands` · `POST /api/welfare/claim` | 15 天 + 自动建公益圈 |
| 圈（私人） | `/api/circles/*` | 邀请码加入 |
| 圈（公开增强） | `/api/circles-enhanced/*` | 无申请审核、无升级 |

### 关键数据模型（`server/prisma/schema.prisma`）

- 已建：`UserTag`、`DemandApplicantV2`（含 `commStartAt/commDeadline/extensionMinutes`）、`TagStats`、`PushPreference`、`WelfareFundPool`、`WelfareReward`、`CircleDemand`、`Settlement`、`Deposit/DepositDemand`、`Complaint`、`Review`。
- Roadmap 提及但**未建**：`DemandPush`、独立 `Card` 死池表、`AuditLog`（死池用 `Demand.lifecycleStage` + `ActiveDemand` 替代）。

---

## 6. 已决策（设计已锁定 · 2026-06-15）

> 以下决策由需求方拍板，作为实现依据。后续如需变更，须更新本节并同步相关章节。

1. **押金口径 = 每条预付全额最低报价**。发布每条需求时，把**完整的最低报价**预付至平台托管（预充值扣款）。**废弃**现有「多单 1%」押金模型，不再并存。（落地见 #5、#7）
2. **冻结退款 = 95%**。统一为：完成 100% / 自行撤回 99.99% / 冻结 95%。覆盖现有代码的 `DELETE_FROZEN=100%`。
3. **公益交付仍需接单**。不做「所有人默认接单、直接交付」；公益需求沿用两段式接单流程（可简化文案，但保留请求→接单环节）。
4. **初期只做私人圈**（类似微信群的私密性）：圈主自建、邀请码加入、仅圈内可见。公开圈、平台申请审核、圈升级（县→市→省→国）、公众待办区**整体后置**，初期不实现。
5. **开发阶段用「点数」模拟货币**：每个用户**默认 100W 点数**（1 点 = 1 元等效），开发/测试期间所有押金、预充值、结算、退款、奖励**只对点数加减**，不接入真实支付。**上线前**再替换为真实货币 + 支付渠道接入。
   - 实现要求：`User` 现**无**余额字段，需新增 `points`（或 `balance`），默认 `1_000_000`；seed 给所有测试用户发满。
   - 资金流转必须收敛到**一个支付抽象层**（如 `wallet.service`），开发期实现为点数加减，上线时只替换该层为真实支付，不改业务调用方。
   - 余额不足、扣款失败等错误路径在开发期也要走通（便于测试），不要因为"点数管够"而跳过校验。

---

## 版本记录

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-06-15 | v1.0 | 基于 AI 3.1.pro 现状，以用户原话为权威来源重建开发指导；纠正 Roadmap 虚构 API；标注 12 项能力完成度与 M1–M3 里程碑 |
| 2026-06-15 | v1.1 | 锁定 4 项决策：①押金=每条全额预付 ②冻结退款 95% ③公益仍走两段式接单 ④初期只做私人圈；同步更新 #5/#7/#8/#11/#12、范围锁定与状态矩阵 |
| 2026-06-15 | v1.2 | 新增决策⑤：开发期用点数模拟货币（用户默认 100W），资金收敛到 `wallet.service` 抽象层，上线前换真实支付；同步 #7、M2 |
| 2026-06-15 | v1.3 | 实现 M2 地基：`User.points`、`WalletHold`/`WalletLedger`、`wallet.service`、发布全额托管、冻结95%/撤回99.99% 退款、`GET /api/wallet/balance|ledger` |
| 2026-06-15 | v1.4 | 审计复核 + 修复轮：①旧 `/api/deposits/*` 路由 410 Gone + `deposit.test.ts` 改期望；②`Complaint.evidenceUrls String[]` 落库；③`GET /api/orders/:id/pay-breakdown` + `Payment.tsx`；④纠正 2b/2c 审计误判；⑤Cap1 schema 漂移修复；⑥公益 `claim` 对齐两段式。 |
| 2026-06-15 | v1.5 | 收尾轮：①`POST /api/uploads/evidence` + `OrderDetail` 拒付弹窗图片上传；②`demand-search-visibility` 单测（FROZEN/满员/拒绝重现）；③§2–§5 真值表同步（#4/#6/#8 升 ✅，M1–M3 标完成）；④`timeLimit` 标注为后期字段。 |
| 2026-06-19 | v1.6 | 回写纠偏：核对代码发现 #2c"完成切断"逻辑（`closeAllCommForDemand` 接入 4 处）已实现，原 §3"剩余差距"描述与代码矛盾，已改为"DB 已置终态、仅缺 socket 广播 + 测试"；新增配套文档 `ACTION-PLAN.md` 并互相关联。 |
| 2026-06-19 | v1.7 | Stage 1.1 实现后回写：#3 状态从 🟡 升级为 ✅；采用"复用 `UserTag.autoReceive`"决策（不新增 `PushPreference.autoAccept`）；`demand.service.create` 接起 autoReceive 自动推送；未动 schema / `DemandPush` / socket 底层。
|  · §3 #3 段落重写（实现+差距+下一步）；§2 状态矩阵 #3 行同步。
|  · ACTION-PLAN.md v1.3 同步：§2 阶段 1 表 1.1 行 ✅。
|  · 未来项（不在本期范围）：认证撤销防漏推、重复推送防重、计数/进度接口。 |
| 2026-06-19 | v1.8 | Stage 1.3 落地后回写：#4 中 timeLimit 从"后期"升为 Stage 1.3 已落地；发布表单可选「服务时限（分钟）」（15–10080），服务端换算为绝对截止时间落库；processTimeLimitReminders cron（60s）仅提醒不改订单状态，同 orderId 幂等去重。7 个新单测（A–G）全绿；`pnpm --filter server test` 45/45 passed；server + client tsc 均 clean。ACTION-PLAN.md v1.4 同步。未动 schema / Stage 1.2/2 / socket 底层。 |
| 2026-06-19 | v1.9 | Brain↔Codex 通道：`docs/CODEX-HANDOFF.md`；§3 #2 Stage 0 单测标记 ✅；§4 下一批更新（1.1/1.3 ✅，1.2 进行中）。 |
