# Stage 1.2 — 公益收尾规格（政府拨付 + 选奖）

> 状态: **v1.0 · Brain 已批准** · 创建: 2026-06-19  
> 依据: `DEVELOPMENT-GUIDE.md` §1 原文 #11、§6 决策 D3（公益仍走两段式接单）  
> 对应: `ACTION-PLAN.md` §2 行 1.2

---

## 0. 范围锁定

| 做 | 不做 |
|---|---|
| 资金池 → **政府拨付出账记录**（DB 可追溯） | 真实政府系统 API 对接 |
| 奖励类型补 **「选奖」**（`choice`） | 重写 `POST /api/welfare/claim` 为普通两段式（backlog） |
| Admin 路由登记拨付 | 公开圈 / socket / 移动端 |
| Vitest + Prisma mock 单测 | HTTP 集成测试 / 真实 DB |

**决策 D3 不变**：公益仍保留请求→接单环节；本期不改 claim 行为。

---

## 1. 现状（代码为准）

- `WelfareFundPool`：`balance` / `totalInflow` / `totalOutflow`（schema L624-631）
- 完成公益：`POST /api/welfare/complete/:demandId` → 10% 入池 + `welfareRewardService.grantReward`（随机红包 | 精神勋章）
- **缺口**：抽成入池后无法登记「交给政府/部门」的出账；奖励无「选奖」分支

---

## 2. Schema 变更

新增 model（`server/prisma/schema.prisma`）：

```prisma
model WelfareDisbursement {
  id           String   @id @default(uuid())
  regionId     Int
  amount       Float
  recipientOrg String   @db.VarChar(200)  // 政府/部门名称
  memo         String?  @db.VarChar(500)
  operatorId   String                     // 操作员 userId
  createdAt    DateTime @default(now())

  @@index([regionId])
  @@index([createdAt])
}
```

扩展 `WelfareReward`：

```prisma
  rewardType   String   @default("random")  // random | spiritual | choice
  choiceLabel  String?  @db.VarChar(100)    // 选奖时奖品名称
```

- 运行 `pnpm --filter server exec prisma migrate dev --name welfare_disbursement_and_choice_reward`
- 现有 `isSpiritual` / `badge` **保留**；`spiritual` 类型继续写 `isSpiritual=true`

---

## 3. 拨付 service

新文件建议：`server/src/services/welfare-disbursement.ts`

```ts
recordDisbursement(params: {
  regionId: number
  amount: number
  recipientOrg: string
  memo?: string
  operatorId: string
})
```

行为：

1. 查 `WelfareFundPool`；不存在则 throw 404
2. `amount` 必须 `> 0` 且 `<= pool.balance`（精度 round 2 位）
3. 事务内：
   - `welfareDisbursement.create`
   - `welfareFundPool.update`: `balance -= amount`, `totalOutflow += amount`
4. 返回 disbursement 记录

列表：`listDisbursements(regionId, page?, limit?)` → `{ items, total }`

---

## 4. API

挂载在 **admin** 下（复用 `adminMiddleware`）：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/admin/welfare/disbursements` | body: `{ regionId, amount, recipientOrg, memo? }` |
| GET | `/api/admin/welfare/disbursements` | query: `regionId` 必填，`page` `limit` 可选 |

响应沿用 `success` / `fail` helper。

**不新增**面向普通用户的拨付接口。

---

## 5. 选奖奖励

扩展 `welfareRewardService.grantReward`：

```ts
grantReward(
  demandId: string,
  providerId: string,
  regionId: number,
  options?: { mode?: 'random' | 'choice'; choiceLabel?: string }
)
```

| mode | 行为 |
|---|---|
| `random`（默认） | **保持现有逻辑**（池有钱→随机红包；池空→精神勋章） |
| `choice` | 必须传 `choiceLabel`（非空，≤100 字）；创建 `WelfareReward`：`rewardType='choice'`, `choiceLabel`, `amount=0`, `isSpiritual=false`；**不扣池余额**（选奖为荣誉型，与随机红包区分） |

扩展 `POST /api/welfare/complete/:demandId` body（可选）：

```json
{ "finalPrice": 100, "rewardMode": "choice", "choiceLabel": "见义勇为证书" }
```

- 缺省 `rewardMode` → `random`
- `rewardMode=choice` 且无 `choiceLabel` → 400

---

## 6. 测试矩阵

新文件：`server/src/__tests__/welfare-disbursement.test.ts`（Vitest + Prisma mock）

| 用例 | 场景 | 预期 |
|---|---|---|
| Test A | 池 balance=1000，拨付 300 | disbursement 创建；balance=700；totalOutflow+=300 |
| Test B | 拨付 amount > balance | throw |
| Test C | 拨付 amount=0 | throw / 400 |
| Test D | `grantReward` mode=choice + label | rewardType=choice，choiceLabel 落库，不扣池 |
| Test E | `grantReward` 默认 random，池有余额 | 行为与改前一致（monetary 或 amount>0） |
| Test F | listDisbursements(regionId) | 返回该 region 记录 |

可选：在 `welfare-reward.test.ts` 扩 1 用例，或全部放 disbursement 文件 — 总数 **≥6** 即可。

---

## 7. 验收标准

| 号 | 检查项 | 验证 |
|---|---|---|
| V1 | migration 存在且 generate 通过 | `prisma migrate` + `tsc` |
| V2 | 拨付可追溯 | Test A + GET 列表含记录 |
| V3 | 不能超池拨付 | Test B |
| V4 | 选奖分支 | Test D |
| V5 | random 不回归 | Test E |
| V6 | admin 鉴权 | 非 ADMIN 调 POST → 403（单测 mock adminMiddleware 或路由层） |
| V7 | 全量测试绿 | `pnpm --filter server test` 全绿 |
| V8 | 未动 Stage 2 / claim 重写 / socket | diff 范围检查 |

---

## 8. 已知限制 / backlog

1. **claim 路径**：仍直接 `COMMUNICATING`（`welfare.ts:126`），与 `comm.service` 双消息起算不一致 — **Stage 1.2+ 单独 spec**
2. **选奖资金**：本期 honor-only；若产品要「选奖也扣池」，另开决策
3. **政府权限**：仅 ADMIN 登记；无多级审批

---

## 9. 交付清单

- [ ] `prisma/schema.prisma` + migration
- [ ] `welfare-disbursement.ts` + admin 路由
- [ ] `welfare-reward.ts` + `welfare.ts` complete body
- [ ] `__tests__/welfare-disbursement.test.ts`（≥6）
- [ ] `pnpm --filter server test` 全绿 + typecheck
- [ ] 文档 commit：`DEVELOPMENT-GUIDE` §3 #11 + `ACTION-PLAN` §2 行 1.2 ✅
