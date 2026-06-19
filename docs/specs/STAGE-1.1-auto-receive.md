# Stage 1.1 — autoReceive 推送规格（草案）

> 状态: 草案 · 创建: 2026-06-19 · 请审核官审阅
> 依据: 需求原文三 「认证者也可以选择打开主动接受功能，那样的话即使用户不主动推送也会收到通知」 + 代码现状（PushPreference 无 autoAccept 字段，UserTag.autoReceive 存在但零引用）
> 与 Stage 0 的关系: 仅写文档，不动代码；后续代码实现需另行申请。

---

## 0. 本草案与原草案的偏差（核心调整）

| 原草案假设 | 现状与决策 |
|---|
| 在 PushPreference 新增 autoAccept 字段 | **不新增**。UserTag 已服务者级别存在 `autoReceive Boolean @default(false)`（schema L591），全仓零引用，且是按 `tagName` 粒度的，比全局开关更精细 |
| 新建 DemandPush 表 | **本期不建**。沉淀与进度查询留到后续阶段；本期复用 socket emit `push:new_demand` |
| 能力评分 / 白名单 / 冷却时间 | **不做**。过度设计，砍掉 |

---

## 1. 字段语义与默认值

### 1.1 复用现有字段：`UserTag.autoReceive`

- **位置**: `server/prisma/schema.prisma:591`，model `UserTag`
- **类型**: `Boolean`
- **默认值**: `false`
- **语义**: 当该值为 true 时，该用户会在任务发布时（不需要发布者主动调用）被动推送一次匹配的需求。
- **粒度**: 按 (userId, tagName) 组合，即用户可以对某个 tag 开启，对其他 tag 不开启。这是选择合并 `UserTag` 而非 `PushPreference` 的主要理由。

### 1.2 为什么不在 PushPreference 新增

PushPreference 是按用户级别的全局推送偏好（excludeKeywords / excludeTags / excludeRegions / receivePushes / pushFrequency）。考虑到：
1. 原文表达中不区分全局 / 按标签两种粒度，但业务上用户更需要“只接水电不接搬家”这种粒度；
2. 匹配引擎 `matchAndPush` 本身就是按 `UserTag.tagName` 查询的（参 `push-engine.ts:91`），上 `UserTag.autoReceive` 能直接被 `where` 子句满足；
3. 为什么不是“全局 + 按 tag 同时为真”：原文表达是“也可以选择”，本期采取“按 tag 细粒度”，可覆盖全局为真。若后续产品需要全局开关，再考虑加回 PushPreference（同不与本期冲突）。

### 1.3 不动 schema，不生成 migration

`UserTag.autoReceive` 已存在。本期 **0 个 schema 变动**。

---

## 2. 资格门槛：谁能开启 autoReceive

### 2.1 开启条件（与且关系）

`autoReceive=true` 不是“谁都能开”，必须满足：
1. `UserTag.certified === true` —— 强推荐，精细到 tag 粒度
   - 或者退而次之：`User.certificationLevel !== 'NONE'` —— 粗粒度。仅在 `UserTag.certified` 为 null / 未设置时降级使用。

> **IDLE/BUSY 不是资格门槛**，是运行时状态。一个正在 BUSY 的认证者仍应能保留 autoReceive=true，仅在 BUSY 期间不被匹配（matchAndPush 里的 `status: 'IDLE'` 已经处理）。资格门槛仅看认证状态。

### 2.2 为什么是认证者

原文三明确说“也选择打开主动接受功能”的主体是“认证者”，以区分于“一般服务者可能被点到”的场景。本期不开放给非认证者，避免“低质量服务者被主动填送”。

### 2.3 错误例

- 非认证者调 PATCH 走通，后端在 update 之前额外检查该用户的认证状态（不依赖客户端提交），不资格则不写入 `autoReceive=true`，並在响应中返回 `{ autoReceive: false, reason: 'NOT_CERTIFIED' }`。不依赖前端另行推送是否存在。

---

## 3. 匹配规则

### 3.1 查询形状

`matchAndPush` 当前 where（push-engine.ts:79-87）：

```ts
const where: any = { status: 'IDLE' };
if (target.tags && target.tags.length > 0) where.tagName = { in: target.tags };
if (target.regions && target.regions.length > 0) where.regionId = { in: target.regions };
```

**本期改动：**把 autoReceive 变为“条件参数”，在 where 里加个子句。只有调用方传了 `autoReceiveOnly=true` 时才加上该筛选：

```ts
const where: any = { status: 'IDLE' };
if (target.autoReceiveOnly) where.autoReceive = true;  // 条件加入，不传则不加
if (target.tags && target.tags.length > 0) where.tagName = { in: target.tags };
if (target.regions && target.regions.length > 0) where.regionId = { in: target.regions };
```

> **这个参数是防回归的关键**：手动推送路径不传此参，matchAndPush 行为与今天一致；只有 `triggerAutoReceivePush` 调用时才传为 true。若不做这个区分，手动推送会被静默限制只能推送给 autoReceive=true 的人——这是对现有功能的静默回归。

### 3.2 走完 matchAndPush 后还需过 7 规则链 `shouldReceivePush`

不绕过。主动推送现有的 7 条算法一律适用（GLOBAL_OFF / EXCLUDE_KEYWORD / EXCLUDE_TAG / EXCLUDE_REGION 等），以避免被用户自己设的推送黑名单绕过。

### 3.3 不做东西（明确裁决）

| 不做 | 理由 |
|---|
| 能力评分 | 原文未要求；今后需要可加为“资质加权” |
| 服务者白名单 | 资格门槛已足够；加白名单增加维护成本 |
| 冷却时间 | UserTag 本身有 `status`（IDLE / BUSY），足以避免点到正在干活的服务者 |

### 3.4 与手动推送的关系

- 发布者仍可调 `POST /api/pushes/execute/:demandId`（也调 `POST /api/demands/:id/push`）进行手动推送。
- 本期增加的筛选仅由 `target.autoReceiveOnly=true` 触发。手动路由**不传**此参，matchAndPush 行为与今天完全一致：手动能推送给任何 IDLE 服务者，不受 autoReceive 约束。
- autoReceive 是为了实现原文中“即使用户不主动推送也会收到通知”这一点
- 同一个 demand 可能被同一个服务者收到 2 次（一次自动 + 一次手动），这是本期已知项，暂先不做去重，后续阶段可加 DemandPush 表作记录

---

## 4. 触发时机（本期唯一新增业务逻辑）

### 4.1 现状

- 发布者调 `POST /api/pushes/execute/:demandId` —— 主动推送
- 发布者调 `POST /api/demands/:id/push` —— 同上，同时更新 pushConfig

### 4.2 本期新增：需求发布后自动触发一次

钩子点：`demand.service.create()`（`server/src/services/demand.service.ts:68`）交付 demand 记录之后、但返回 `created` 之前。

原因：
1. 只有需求事务提交成功后才触发，避免需求回滚后乱推
2. 不在事务内，避免推送出错导致需求创建也失败

### 4.3 调用形状

```ts
// 在 demand.service.create 交付 created 后插入
const autoPushResult = await triggerAutoReceivePush(created.id, io).catch((err) => {
  console.error('[auto-receive] failed for demand', created.id, err)
  return { error: err.message }  // 吃掉错误，不影响 demand 发布
})
```

**错误处理原则：**auto-push 任何错误不能反向影响 demand 发布上的交付。错误只记日志、不重试。

### 4.4 入口函数设计要求（实现阶段参考）

- 名称：`triggerAutoReceivePush(demandId: string, io: Server | undefined): Promise<AutoPushResult>`
- 该函数在 `server/src/services/push-engine.ts` 中添加，与 `matchAndPush` 并列
- 其内部调用 `matchAndPush(demandId, { tags, regions, autoReceiveOnly: true }, io)`——**必须传 `autoReceiveOnly: true`，否则会透过子句加上 autoReceive 筛选**。这是防手动路由被误调为传入的唯一保护。
- matchAndPush 的 `PushTarget` 接叧需新增 `autoReceiveOnly?: boolean` 字段；默认 false，手动路由不需修改传参。
- AutoPushResult: `{ matched, sent, rejected }`，与 `matchAndPush` 返回值对齐

---

## 5. API 设计

### 5.1 修改现有接口：`PATCH /api/user-tags/:tagName/auto-receive`

在现有 `user-tag.ts` 路由上新增：

请求体：
```json
{ "autoReceive": true }
```

- `autoReceive`：必填，boolean
- 身份校验全部后端做：
  - 优先检查 `UserTag.certified`；如果为 true 则允许。
  - 如果 `UserTag.certified` 为 null / false，回退检查 `User.certificationLevel !== 'NONE'`，为真才允许。
  - 两者都不满足返 `403 NOT_CERTIFIED`。

> **为什么不让客户端提交 certified**：认证状态是不可信三方传入的。客户端报“certified: true”本身就是安全漏洞：任何登陆用户都可以自己写。严格后端推导。

响应：成功返回更新后的 `UserTag`；身份不符返 `403 NOT_CERTIFIED`。

为什么不直接 PUT autoReceive：为了让客户端上传“我要开启 X 标签的接收”，同时让后端能跟据它的身份决定是否接受。这个设计与原有的 `/:tagName/toggle`（切 IDLE/BUSY）一致，不增加路由表面。

### 5.2 修改现有接口：`GET /api/user-tags/`

该接口已存在，返回包含 `autoReceive` 字段的 UserTag 列表。无需变动后端。客户端可以直接读取。

### 5.3 不新增的接口

- 不新增 `DemandPush` 表
- 不新增推送进度查询接口（本期仅进行推送，不做记录，后续阶段补上）
- 不新增计数接口（计数需要先有记录表）

---

## 6. 测试矩阵

本期新增一个测试文件：`server/src/__tests__/auto-receive.test.ts`

遵循 Stage 0 风格：Vitest + Prisma mock，不动真实数据库。

| 用例 | 场景 | 预期 |
|---|---|
| Test A | `autoReceive=true` + certified + tag 匹配 | 被推送 |
| Test B | `autoReceive=true` + **非** certified | 不被推送，并不走到 socket emit |
| Test C | `autoReceive=false` | 不被推送 |
| Test D | `autoReceive=true` + tag 不匹配 | 不被推送 |
| Test E | `autoReceive=true` + 匹配 tag 但 regionId 不一致 | 不被推送 |
| Test F | `autoReceive=true` + UserTag.status=BUSY | 不被推送 |
| Test G | `autoReceive=true` 但被 PushPreference 全局关闭 | 不被推送（走 7 规则链） |
| Test H | `demand.service.create` 调用后主动触发一次推送 | 被推送，且 demand 发布不受推送失败影响 |
| Test I | 发布 demand 时 auto-push 抛出错误 | demand 发布仍然成功（错误被 catch 吃掉） |
| Test J | PATCH /api/user-tags/:tagName/auto-receive 身份不符（User.certificationLevel = NONE 且 UserTag.certified 不为 true）| 返 403 |
| Test K | PATCH 后 GET 返回的 UserTag 包含新值 | 一致 |
| Test L | 防回归：手动推送（`matchAndPush` 不传 `autoReceiveOnly`）能命中 `autoReceive=false` 的 IDLE 服务者 | 被推送（证明手动路径不受 autoReceive 约束） |

---

## 7. 验收标准（可 grep / run-test 验证）

| 号 | 检查项 | 验证方法 |
|---|---|
| V1 | schema 未变动 | 运行 `git diff server/prisma/schema.prisma` 为空 |
| V2 | 未新增 `DemandPush` 表 | 运行 `git grep DemandPush server/prisma/schema.prisma` 无结果 |
| V3 | 手动推送路径不变 | `git diff server/src/routes/push.ts server/src/routes/demand.ts` 仅新增 `PATCH` 与 接口，不动现有 POST 接口 |
| V4 | `matchAndPush` 实现增 `autoReceive: true` | `git grep autoReceive server/src` 出现在 push-engine.ts |
| V5 | 触发点在 demand create 交付后 | `git grep triggerAutoReceivePush server/src/services/demand.service.ts` 出现 |
| V6 | 错误处理不反向 | Test I |
| V7 | 7 规则链仍生效 | Test G |
| V8 | 资格门槛生效 | Test B 与 Test J |
| V9 | 服务端测试全绿 | `pnpm --filter server test` 仍 18+1 = 19 文件 / 84 用例（原 72 + 本期 12） |
| V10 | 未动 `socket` 底层代码 | 本期复用 `push:new_demand` emit，不动 socket.io 本身 |

---

## 8. 已知项 / 限制

1. **重复推送：**同一 demand 被同一服务者接收 2 次（auto + 手动）。本期不做去重。
2. **进度不可查：**没有记录表，推送是一次性的。需要询问“我是否接收了这个 demand”需下阶段加 DemandPush 表。
3. **定时推送：**本期只有发布时一次。原文中“推送频率”与 PushFrequency 字段是同一个话题，本期不动。
4. **全局接收开关：**本期不提供。如产品需要可在 PushPreference 新增一个 `receiveAutoPushes`，但可能与当前的 `receivePushes` 冲突，需另行设计。
5. **公益需求不走该路径：**公益需求不累计服务者接单，不适用 autoReceive（该路径以后再论）。

---

## 9. 交付清单（实现阶段请按次序交付）

- [ ] `server/prisma/schema.prisma` 未改
- [ ] `server/src/services/push-engine.ts` 新增 `triggerAutoReceivePush` + matchAndPush where 加 autoReceive
- [ ] `server/src/routes/user-tag.ts` 新增 `PATCH /:tagName/auto-receive`
- [ ] `server/src/services/demand.service.ts` create 插入 triggerAutoReceivePush 调用（catch 包裹）
- [ ] 新增 `server/src/__tests__/auto-receive.test.ts` · 11 个用例
- [ ] `pnpm --filter server test` 全绿，`tsc --noEmit` clean
- [ ] 未动 socket 底层 / Prisma model / 任何阶段 1 其他子项