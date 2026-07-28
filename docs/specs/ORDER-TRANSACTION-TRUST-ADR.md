# ADR · 交易可信度：部分完成双方确认与资金幂等

> **状态**：Proposed（实现已对齐推荐默认；§11 仍未勾选，**不得**改为 Accepted）  
> **日期**：2026-07-28（修订：同日，回应 5 项设计阻断；实现进度：本地迁移 + 幂等中间件 + PG trust 测试）  
> **范围**：订单资金相关状态机与并发一致性；**不含**真实支付网关、双向评价、Socket 消息持久化  
> **前置**：P0 安全止血包已完成（匿名运维写口已封）  
> **实现门槛**：第 11 节检查表全部勾选、本文件改为 **Accepted** 后方可改业务代码与迁移

---

## 0. 未解决阻断（本轮修订目标）

上一版草案被指出 5 个设计阻断；本节列出修订结论。第 11 节仍全部未勾选，**暂不 Accepted**。

| # | 阻断 | 修订结论（见正文对应节） |
|---|------|--------------------------|
| B1 | 部分完成资金守恒未定义 | §4.3：禁止直接套用「整笔 consumeHold + 只付提议价」；定义 hold 拆分、剩余价公式、服务费多退少补与守恒式 |
| B2 | `operationKey` 冲突不可事务内“跳过” | §5.4：唯一冲突 ⇒ **整事务回滚**，再只读重放；禁止在已改余额后 catch-and-continue |
| B3 | 幂等 `IN_PROGRESS` 无崩溃恢复 | §5.3：`leaseUntil`、超时接管、4xx 在业务回滚后的独立短事务落库 |
| B4 | 状态规则自相矛盾 | §3.4 / §5.5：prepay 允许 `PARTIAL_PENDING`；`WAITING_REVIEW` 下 cancel **推荐禁止**，待产品勾选 |
| B5 | 前端幂等契约缺失 | §4.5：key 生成、重试复用、用户重发换新；生产强制 header 的前置条件 |

---

## 1. 背景与问题

当前实现已有钱包账本、托管、`Settlement`、订单状态与若干事务，但存在三类会破坏撮合信任的缺陷：

1. **部分完成单方面结算**  
   `POST /api/orders/:id/partial` 由服务方调用后立即 `settleDemand`、将订单标为 `COMPLETED`，并创建剩余需求 + 对需求方 `hold`。需求方无确认权。

2. **资金写路径缺少条件更新与幂等**  
   `prepay` / `cancel` 等在事务外读取订单状态；并发重试可导致重复扣服务费或重复退费。`WalletLedger` 仅有普通索引，无操作级唯一约束。

3. **争议退款同样无并发保护**  
   管理员 `POST /api/admin/disputes/:id/resolve` 的 `refund` / `complete` 在状态检查与写库之间可竞态。

另：现有 `settleDemand` 会 **整笔** `consumeHold`（托管从 HELD→CONSUMED，点数不退回需求方可用余额），再按 `finalPrice` 给服务方入账。若 `finalPrice < held`，差额既不退回也不转入新 hold，造成**账本空洞**。部分完成若继续调用该函数，会在「再为剩余需求 hold」时形成**重复占款**。此问题必须在协议层先钉死，而不是留给实现时临场发挥。

完整成交主路径（`complete` → `WAITING_REVIEW` → `confirm`）已是「服务方提议、需求方确认」；部分完成必须与之对齐，不能成为绕过验收的捷径。

---

## 2. 决策摘要

| # | 决策 |
|---|------|
| D1 | 新增订单状态 `PARTIAL_PENDING`；部分完成改为「提议 → 确认/拒绝」两步，**确认前不结算、不创建剩余需求、不加新 hold** |
| D2 | 活跃提议落在 `OrderPartialProposal`（可审计） |
| D3 | 资金突变接口统一支持 `Idempotency-Key`；同用户同 scope 同 key 重放返回首次终态响应；占位必须有租约与超时接管 |
| D4 | 账本写入增加稳定 `operationKey`（DB 唯一）；冲突时 **回滚事务后只读重放**，禁止同事务内跳过继续写 |
| D5 | 订单状态变迁必须用**条件更新**；影响行数为 0 时按终态幂等或 409 |
| D6 | 部分完成 accept 使用专用 `settlePartialWithRemainder`，**不得**直接调用会整笔吞 hold 的 `settleDemand` |
| D7 | 资金守恒验收为硬门槛（§9.4）；守恒式见 §4.3.5 |
| D8 | 本包验收以真实 PostgreSQL 事务/并发用例为准，不单靠 Prisma mock |

---

## 3. 冻结后的订单状态机（资金相关）

### 3.1 状态集合

在现有 `OrderStatus` 上**仅新增**：

```text
PARTIAL_PENDING   // 服务方已提出部分完成，等待需求方确认或拒绝
```

其余保持：`PENDING` | `IN_PROGRESS` | `WAITING_REVIEW` | `COMPLETED` | `CANCELLED` | `REFUNDED` | `DISPUTED`

### 3.2 主路径（语义 + 本包补强）

```text
（接单创建）→ IN_PROGRESS
  ├─[requester prepay]→ 同状态 + paidAt（可幂等）
  ├─[provider complete]→ WAITING_REVIEW
  │    └─[requester confirm]→ COMPLETED + settleDemand（全额）
  ├─[requester cancel]→ CANCELLED（规则见 §3.4，待产品确认 WAITING_REVIEW）
  └─[either dispute]→ DISPUTED
       ├─[admin refund]→ REFUNDED
       └─[admin complete]→ COMPLETED + settle
```

### 3.3 部分完成路径

```text
IN_PROGRESS
  └─[provider propose partial]→ PARTIAL_PENDING
       ├─[requester accept]→ COMPLETED + settlePartialWithRemainder(proposedPrice)
       │                      + 创建剩余 Demand + hold(剩余价对应托管)
       ├─[requester reject]→ IN_PROGRESS（提议作废）
       ├─[provider withdraw]→ IN_PROGRESS（提议撤回）
       └─[either dispute]→ DISPUTED（活跃提议 → SUPERSEDED）
```

### 3.4 `PARTIAL_PENDING` / 相关态：允许与禁止

| 操作 | 允许？ | 说明 |
|------|:------:|------|
| 需求方 accept / reject | ✓ | 正式接口 |
| 服务方 withdraw | ✓ | 避免卡死；实现必做 |
| 需求方 prepay（尚未 `paidAt`） | ✓ | 允许状态：`IN_PROGRESS` **或** `PARTIAL_PENDING`（与 §5.5 伪代码一致） |
| 服务方再次 propose | ✗ | 须先 withdraw/reject |
| 服务方 `complete` | ✗ | 409 `PARTIAL_PROPOSAL_ACTIVE` |
| 需求方 `confirm` | ✗ | 仅 `WAITING_REVIEW` |
| 需求方 `cancel`（自 `IN_PROGRESS` / `PARTIAL_PENDING`） | ✓ | 作废 PENDING 提议；已付服务费按 cancel 退还 |
| 需求方 `cancel`（自 `WAITING_REVIEW`） | **待产品确认** | **推荐冻结为禁止**（见下） |
| 任一方 `dispute` | ✓ | 含自 `PARTIAL_PENDING` / `WAITING_REVIEW` |
| 管理员裁决 | ✓ | 仅 `DISPUTED`（现行若仍允许自 `WAITING_REVIEW` 裁决，实现阶段收敛为仅 `DISPUTED`，另开兼容说明） |

#### 关于 `WAITING_REVIEW` + cancel（阻断 B4）

现行代码允许在 `WAITING_REVIEW` 取消（只要不是 COMPLETED/CANCELLED/DISPUTED）。这意味着服务方已声明交付后，需求方仍可单方取消并可能取回服务费，而不走争议。

**本 ADR 推荐冻结（待产品勾选）：**

- `WAITING_REVIEW` **禁止** `cancel` → 返回 409 `ORDER_STATE_CONFLICT` / 明确文案「请验收确认或发起争议」。  
- 需求方选项仅：`confirm` 或 `dispute`。  

若产品坚持保留「待验收可取消」，须在第 11 节显式勾选替代方案，并补：取消时是否通知服务方、是否扣除违约比例、托管如何释放——否则不得 Accepted。

### 3.5 与全额完成的关系

- `WAITING_REVIEW`：全额完成待验收，结算价 = 当前 `agreedPrice`。  
- `PARTIAL_PENDING`：部分完成待确认，结算价 = `proposedPrice`，且 `0 < proposedPrice < agreedPrice`。  
- 二者互斥。

---

## 4. 部分完成：数据、资金守恒与 API

### 4.1 新表 `OrderPartialProposal`

```text
id              String   PK
orderId         String   FK → Order
proposedPrice   Decimal  // 0 < proposedPrice < order.agreedPrice
description     String   // ≤ 2000
status          enum     PENDING | ACCEPTED | REJECTED | WITHDRAWN | SUPERSEDED
proposedBy      String
decidedBy       String?
decidedAt       DateTime?
remainingDemandId String?
createdAt       DateTime
updatedAt       DateTime

@@index([orderId, status])
```

- 同一 `orderId` 至多一条 `PENDING`。  
- **提议阶段零资金副作用**。

### 4.2 API

| 方法 | 路径 | 角色 | 行为 |
|------|------|------|------|
| `POST` | `/api/orders/:id/partial` | 服务方 | 仅提议 → `PARTIAL_PENDING` |
| `POST` | `/api/orders/:id/partial/accept` | 需求方 | `settlePartialWithRemainder` + 剩余需求 |
| `POST` | `/api/orders/:id/partial/reject` | 需求方 | 回 `IN_PROGRESS` |
| `POST` | `/api/orders/:id/partial/withdraw` | 服务方 | 回 `IN_PROGRESS` |

- Body 字段名保持 `{ newPrice, description }`。  
- propose 成功：**不**返回 `remainingDemandId`。  
- `GET /orders/:id` 在 `PARTIAL_PENDING` 附带 `partialProposal`。

### 4.3 资金守恒与 `settlePartialWithRemainder`（阻断 B1）

#### 4.3.1 价格与剩余需求口径（冻结）

| 符号 | 含义 |
|------|------|
| `A` | 接受提议前订单 `agreedPrice`（全额约定价） |
| `P` | 提议价 `proposedPrice`（本单已完成部分的结算价） |
| `M` | 原需求 `minPrice`（发布时托管口径） |
| `H` | 原需求当前 `WalletHold.amount` 且 `status=HELD`（正常等于发布时托管额） |

**剩余需求商业价（`remainingDemand.minPrice`）冻结为：**

```text
R = max(1, roundPoints(A - P))
```

即按 **订单约定价差额** `agreedPrice - proposedPrice`，**不是** `M - P`。  
理由：`agreedPrice` 才是双方对「整单」的价格共识；`minPrice` 只是发布托管下限，议价后可能 `A ≠ M`。

若 `A ≠ M`，accept 时必须仍满足守恒（见下），不得假设 `H == A`。

#### 4.3.2 为何不能直接 `settleDemand(P)`

现有 `settleDemand`：

1. 整笔 `consumeHold`（H 从托管消失，**不**退回需求方余额）；  
2. 仅向服务方 `credit(P)`；  
3. 若随后再 `holdForDemand(R)`，需求方可用余额再被扣一遍。  

当 `P < H` 时，差额 `H - P` 既未给服务方、也未回到需求方，再 hold `R` 即 **重复占款 / 账本空洞**。故 partial accept **禁止**调用该路径。

#### 4.3.3 `settlePartialWithRemainder` 事务步骤（冻结）

在单一 DB 事务内：

1. 条件更新订单：`PARTIAL_PENDING` → `COMPLETED`，`agreedPrice = P`，`completedAt = now()`；失败则整单 abort。  
2. 提议 → `ACCEPTED`。  
3. 读取并锁定原 hold（`H`，必须为 `HELD`；否则 409/400）。  
4. **拆分托管（守恒核心）**  
   - 设结算占用 `S = min(H, P)`。  
   - 若 `P > H`：对需求方 `debit(P - H)`，`operationKey=demand:{id}:partial-extra`（与全额 settle 的补差价同构）。  
   - 将原 hold 标为 `CONSUMED`（整笔结束生命周期）。  
   - 对服务方 `credit(P)`，`operationKey=demand:{id}:settle-provider`。  
   - **未用于本单结算的托管回吐到需求方可用余额**：  
     `U = max(0, H - P)`（当 `P >= H` 时 `U=0`）  
     `credit/RELEASE` 需求方 `U`，`operationKey=demand:{id}:partial-unused-release`。  
5. **服务费（以 P 为税基）**  
   - `feeP = roundPoints(P * 费率)`（普通 5% / 公益 10%，与现 `calculateSettlement` 一致）。  
   - 若 `!paidAt`：`debit(feeP)`，`operationKey=demand:{id}:settle-fee`。  
   - 若 `paidAt`：预付时已按 **全额 A** 扣过 `feeA = roundPoints(A * 费率)`。此时：  
     - **多退**：`refundFee = max(0, feeA - feeP)`，`credit` 需求方，`operationKey=order:{orderId}:partial-fee-refund`；  
     - **不**再扣 `feeP`。  
6. 写 `Settlement`（`finalPrice=P`，`serviceFee=feeP`，…）；`demandId` 唯一。  
7. 创建剩余 Demand，`minPrice = R`（§4.3.1）。  
8. `holdForDemand(requester, remainingDemandId, deposit(R))`，  
   `operationKey=demand:{remainingDemandId}:hold`。  
   若步骤 4 回吐的 `U` 与新 hold 同事务，余额必须足够；不足则 **整事务回滚**（不可部分成功）。  
9. 系统消息；事务外异步证据/shadow（失败隔离）。

> 实现可将 4–6 收敛为 wallet 模块内具名函数，但语义不得弱于上表。

#### 4.3.4 与「剩余 hold 金额」的关系

- 新 hold 金额由 `deposit(R)` 决定（沿用现 `calculateDeposit`），**来源是需求方可用余额**（含本事务刚 RELEASE 的 `U`）。  
- 不要求 `deposit(R) == U`：当 `A ≠ M` 或费率/deposit 规则使二者不等时，差额表现为需求方可用余额的净增减，且必须被守恒式解释。

#### 4.3.5 资金守恒式（硬验收）

对任意资金突变用例（至少含 partial accept、prepay→cancel、confirm、dispute refund），在**同一组参与账户**上：

```text
期末(需求方可用余额 + 服务方可用余额 + 平台记账收入余额*)
+ 期末(所有 status=HELD 的 hold 合计)
= 期初(需求方可用余额 + 服务方可用余额 + 平台记账收入余额*)
+ 期初(所有 status=HELD 的 hold 合计)
```

\* 内测无独立平台账户时，用 Settlement/流水推导的平台服务费净额替代「平台记账收入余额」，但等式两边口径必须一致。

单用户视角辅助式（需求方）：

```text
期末可用 + 期末名下 HELD
= 期初可用 + 期初名下 HELD
  - 本操作净支付给服务方
  - 本操作净支付给平台
  + 本操作从服务方/平台净退回
```

### 4.4 前端：部分完成 UI（实现阶段）

- 服务方文案：「提出部分完成」；成功后进入待确认。  
- 需求方：展示提议价/说明 +「同意结算 / 拒绝」。  
- `orderApi`：`acceptPartial` / `rejectPartial` / `withdrawPartial`。

### 4.5 前端：Idempotency-Key 契约（阻断 B5）

生产强制资金接口 header 之前，前端必须具备：

| 规则 | 说明 |
|------|------|
| 生成 | `crypto.randomUUID()`（或等价），长度 8–128 |
| 作用域 | 每个「用户发起的一次意图」对应一个 key，维度建议 `scope + orderId`（如 `ORDER_PREPAY:orderId`） |
| 存储 | 请求进行中：内存 ref / 模块级 Map；**不要**把成功 key 写进可长期复用的全局单例导致误重放无关请求 |
| 网络重试 | axios 超时、5xx、断网自动重试：**必须复用同一 key**（挂在该次意图的闭包/ref 上） |
| 用户再次点击 | 若上一意图已返回终态（2xx 或 4xx 业务失败）：**换新 key**；若上一意图仍 in-flight：禁用按钮或复用同一 key，禁止并行两个 key 打同一资金动作 |
| 刷新页面 | 允许丢失 in-memory key（换新 key）；安全性靠服务端 `operationKey` + 条件更新兜底 |
| 覆盖接口 | `prepay` / `cancel` / `confirm` / `partial/accept`；管理端争议 `resolve` 由运营台同样遵循 |
| 无资金写 | `complete`、partial propose/reject/withdraw：**不强制** key |

`client-react/src/api` 应提供小助手（实现阶段），例如：

```ts
// 示意，非本轮代码
withIdempotency(scope, resourceId, (key) => api.post(url, body, { headers: { 'Idempotency-Key': key } }))
```

未完成 §4.5 与管理端同等约定前，不得勾选「生产强制 Idempotency-Key」。

---

## 5. 幂等与并发

### 5.1 适用范围

| Scope | 接口 | 资金效果 |
|-------|------|----------|
| `ORDER_PREPAY` | `POST /orders/:id/prepay` | 扣服务费 + `paidAt` |
| `ORDER_CANCEL` | `POST /orders/:id/cancel` | 可能退服务费 + `CANCELLED` |
| `ORDER_CONFIRM` | `POST /orders/:id/confirm` | 全额 `settleDemand` |
| `ORDER_PARTIAL_ACCEPT` | `POST /orders/:id/partial/accept` | `settlePartialWithRemainder` + 剩余 hold |
| `ORDER_DISPUTE_REFUND` | admin resolve `refund` | 释放托管 + 退服务费 + `REFUNDED` |
| `ORDER_DISPUTE_COMPLETE` | admin resolve `complete` | 结算 + `COMPLETED` |

无资金写的状态接口：条件更新建议做，不强制 Idempotency-Key。

### 5.2 客户端 / 服务端重放语义

- Header：`Idempotency-Key`。  
- 同 `userId + scope + key`：  
  - `SUCCEEDED` / `FAILED` → 原样重放 `responseCode` + `responseBody`；  
  - `IN_PROGRESS` 且租约未过期 → `409 IDEMPOTENCY_IN_PROGRESS`；  
  - `IN_PROGRESS` 且租约已过期 → 允许接管（§5.3）。  
- `requestHash` 不匹配 → `422 IDEMPOTENCY_PAYLOAD_MISMATCH`。  
- 生产资金接口缺 key → `400 IDEMPOTENCY_KEY_REQUIRED`（开关默认生产开启；以前端 §4.5 就绪为前提）。

### 5.3 `IdempotencyRecord` 与崩溃恢复（阻断 B3）

```text
id            String
userId        String
scope         String
key           String
resourceId    String
requestHash   String?
status        enum        IN_PROGRESS | SUCCEEDED | FAILED
responseCode  Int?
responseBody  Json?
leaseUntil    DateTime    // 租约到期时间
leaseOwner    String?     // 实例标识 / 请求 id，便于观测
createdAt     DateTime
updatedAt     DateTime

@@unique([userId, scope, key])
@@index([resourceId, scope])
@@index([status, leaseUntil])
```

**租约与接管：**

- 创建 `IN_PROGRESS` 时设置 `leaseUntil = now() + 30s`（可配置，建议 15–60s）。  
- 长事务可续租（同一 `leaseOwner` 更新 `leaseUntil`）。  
- 新请求发现 `IN_PROGRESS && leaseUntil < now()`：用条件更新  
  `WHERE status=IN_PROGRESS AND leaseUntil < now()` 抢占租约并重置 `leaseOwner`；抢占失败则仍 409。  
- 抢占后**必须**先只读检查订单/账本是否已达目标终态（`paidAt` / `operationKey` / 订单 status）；已完成则写 `SUCCEEDED` 重放，禁止重复扣款。

**4xx / 业务失败落库：**

```text
尝试业务事务
  失败需要返回 4xx → ROLLBACK 业务事务
其后：开启【独立短事务】
  将 IdempotencyRecord 更新为 FAILED + response*
COMMIT
返回 4xx
```

禁止依赖「与业务同一事务提交」来持久化 FAILED（否则回滚会抹掉失败记录，客户端重试会换语义）。  
`SUCCEEDED` 可在业务事务内更新幂等行，或业务成功后独立短事务写入（二选一须在实现中固定；推荐：**业务成功后独立短事务写 SUCCEEDED**，与 FAILED 对称，避免业务提交成功但幂等行未写的窗口用租约+终态探测弥补）。

### 5.4 `operationKey`（阻断 B2）

`WalletLedger.operationKey String? @unique`

| 操作 | operationKey |
|------|----------------|
| 预付服务费 | `order:{orderId}:prepay-fee` |
| 取消退服务费 | `order:{orderId}:cancel-fee-refund` |
| 争议退服务费 | `order:{orderId}:dispute-fee-refund` |
| 部分完成服务费多退 | `order:{orderId}:partial-fee-refund` |
| 结算入账服务者 | `demand:{demandId}:settle-provider` |
| 结算/部分补差价 | `demand:{demandId}:settle-extra` 或 `...:partial-extra` |
| 结算服务费 | `demand:{demandId}:settle-fee` |
| 部分未用托管回吐 | `demand:{demandId}:partial-unused-release` |
| 托管 | `demand:{demandId}:hold` |

**冲突处理（冻结）：**

1. **禁止**在 PostgreSQL 事务因唯一约束失败后，于同一事务内 catch 错误并继续后续余额/状态写入（连接已处于 aborted 状态）。  
2. 推荐主路径：写入前 `SELECT` 已有 `operationKey`（可配合订单行锁）；已存在则本事务内**不再插入流水**，并转入「只读校验余额与订单终态是否一致」；不一致则 abort 整单。  
3. 若仍发生唯一冲突（竞态）：**立即 ROLLBACK 整个业务事务** → 新开只读事务按 `operationKey` 读取已有流水 → 结合订单条件读，构造与首次成功等价的响应（或 409 若状态仍不稳定）。  
4. 「跳过入账」仅允许出现在**尚未因该冲突而 aborted 的事务**中的显式预检查分支，语义是「发现已存在则不写」，不是「写失败后跳过」。

### 5.5 条件状态更新（与 §3.4 对齐）

**prepay**（允许 `IN_PROGRESS` 与 `PARTIAL_PENDING`）：

```text
BEGIN
  claim/renew idempotency lease (ORDER_PREPAY)
  n = UPDATE orders SET paidAt=now()
      WHERE id=? AND requesterId=?
        AND status IN ('IN_PROGRESS','PARTIAL_PENDING')
        AND paidAt IS NULL
  IF n=0:
    IF paidAt already set: 准备 200 幂等成功响应
    ELSE: 4xx → ROLLBACK → 独立事务写 FAILED → return
  debit prepay-fee with operationKey（预检查已存在则校验一致性）
  COMMIT 业务
  独立短事务写 SUCCEEDED + body
```

**cancel**（推荐集；`WAITING_REVIEW` 取决于产品勾选）：

```text
允许集合_推荐 = ('IN_PROGRESS','PARTIAL_PENDING')
允许集合_兼容旧行为 = 推荐 ∪ ('WAITING_REVIEW')   -- 仅当第 11 节勾选保留时

n = UPDATE orders SET status='CANCELLED'
    WHERE id=? AND requesterId=? AND status IN 允许集合
...
作废 PENDING 提议；按需 credit cancel-fee-refund；重开 demand
```

**dispute refund / confirm / partial accept**：先条件推进状态，再资金函数；全程遵守 §5.4。

---

## 6. 错误码约定

| HTTP | details.code / 语义 | 含义 |
|------|------|------|
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | 生产资金接口缺 key |
| 409 | `IDEMPOTENCY_IN_PROGRESS` | 租约未过期的进行中 |
| 409 | `ORDER_STATE_CONFLICT` | 条件更新失败且非终态幂等 |
| 409 | `PARTIAL_PROPOSAL_ACTIVE` | 未决部分完成阻断全额 complete |
| 422 | `IDEMPOTENCY_PAYLOAD_MISMATCH` | 同 key 不同 body |
| 409 | `FUND_INVARIANT_VIOLATION` | 守恒校验失败（偏测试/管理探针；生产可仅日志+500） |

---

## 7. 明确不在本包

- 真实法币支付、支付回调、对账文件。  
- 双向评价、`Review.orderId` 唯一问题。  
- Socket 私信持久化与屏蔽。  
- cancel 时托管违约比例大改（若启用 `WAITING_REVIEW` 可取消，须另附产品规则）。  
- cron 分布式锁。

---

## 8. 迁移与发布顺序

1. Migration：`PARTIAL_PENDING`、`OrderPartialProposal`、`IdempotencyRecord`（含 `leaseUntil`）、`WalletLedger.operationKey`。  
2. 实现 `settlePartialWithRemainder` + 幂等助手；**先合测试**。  
3. 前端：部分完成两步 UI + §4.5 幂等助手，与资金接口同发。  
4. `/partial` 行为破坏：发版说明；内测双端齐发。  
5. 回滚：`PARTIAL_PENDING` 订单需运维打回或人工处理。

---

## 9. 验收用例清单

### 9.1 部分完成协议

| ID | 用例 | 期望 |
|----|------|------|
| P1 | propose | `PARTIAL_PENDING`；无 Settlement；无新 Demand；无新 hold；无结算类流水 |
| P2 | accept | `COMPLETED`；`Settlement.finalPrice=P`；剩余 Demand.`minPrice=R=max(1,A-P)`；有对应 hold |
| P3 | reject | `IN_PROGRESS`；`REJECTED`；账本不变 |
| P4 | withdraw | 同 P3，`WITHDRAWN` |
| P5 | pending 时 complete | 409 |
| P6 | 角色错误 | 403 |
| P7 | 非法价格 | 400 |

### 9.2 幂等与并发

| ID | 用例 | 期望 |
|----|------|------|
| I1 | 同 key 两次 prepay | 重放；仅一条 prepay-fee；一次 paidAt |
| I2 | 两并发 prepay（异 key） | 仅一笔扣款 |
| I3–I4 | cancel 同/异 key 并发 | 仅一笔退费 |
| I5 | confirm vs partial accept | 单一 Settlement / 单一终态 |
| I6 | 重复 dispute refund | 无双退 |
| I7 | 生产缺 key | 400 |
| I8 | `IN_PROGRESS` 租约未过期 | 409 |
| I9 | 租约过期后同 key 接管 | 若已成功则重放成功，不二次扣款 |
| I10 | operationKey 竞态冲突 | 事务回滚后只读重放，无双流水 |

### 9.3 账本与订单一致性

| ID | 用例 | 期望 |
|----|------|------|
| L1 | prepay → cancel | 服务费维度余额回到 prepay 前 |
| L2 | prepay → confirm | skip 二次服务费；Settlement 正确 |
| L3 | partial accept（已 prepay） | 服务费多退至 `feeP`；剩余 hold=`deposit(R)` |
| L4 | dispute refund | hold 释放；服务费退回；无 provider 结算入账 |

### 9.4 资金守恒（新增硬门槛）

| ID | 用例 | 期望 |
|----|------|------|
| C1 | partial accept（`P < H`，未 prepay） | 满足 §4.3.5 守恒式；存在 `partial-unused-release`；新 hold 不导致「消失点数」 |
| C2 | partial accept（`P < H`，已 prepay） | 守恒式 + `partial-fee-refund = feeA - feeP`（若 >0） |
| C3 | partial accept（`A ≠ M`） | 剩余 `minPrice` 按 `A-P`；守恒式仍成立 |
| C4 | prepay → cancel | 守恒式成立 |
| C5 | confirm 全额 | 守恒式成立 |

测试策略：真实 PostgreSQL；并发用例用多连接；守恒断言读 `User.points` + `WalletHold(HELD)` + 相关 ledger/Settlement。

---

## 10. 后果

- 正面：部分完成可审计、可守恒；重试与崩溃可恢复；状态规则自洽。  
- 负面：API 破坏性变更；实现复杂度高于「包一层 settleDemand」；前端必须上幂等助手。  
- 风险：在第 11 节未勾选前开工，极易在 hold 拆分或幂等租约上返工。

---

## 11. 评审检查表（全部未勾选；勾完前禁止 Accepted）

### 11.1 原五项（保留）

- [ ] 产品确认：剩余需求仅在 accept 时创建（非 propose）  
- [ ] 产品确认：`PARTIAL_PENDING` 允许 cancel / dispute  
- [ ] 工程确认：生产强制 Idempotency-Key（**依赖 11.2 前端契约已确认**）  
- [ ] 工程确认：operationKey 命名表无冲突，且冲突处理按 §5.4 回滚重放  
- [ ] 前端确认：OrderDetail 两步 UI 可与后端同发  

### 11.2 阻断项补齐后方可具备确认条件

- [ ] 产品/工程确认：剩余价口径 `R = max(1, A - P)`，以及 `settlePartialWithRemainder` 步骤（§4.3）  
- [ ] 产品确认：`WAITING_REVIEW` **禁止 cancel**（推荐）——或显式勾选「保留可取消」并附违约/托管规则  
- [ ] 工程确认：幂等租约、超时接管、FAILED/SUCCEEDED 独立短事务落库（§5.3）  
- [ ] 前端确认：§4.5 key 生成/重试复用/重发换新已排期，覆盖 prepay/cancel/confirm/partial accept  
- [ ] 工程确认：§9.4 守恒用例 C1–C5 列入 CI  

评审通过后将文首状态改为 **Accepted**，再开实现 PR。
