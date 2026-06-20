# Stage 1.6 — 公益 claim 与 comm 双消息起算对齐

> 状态: **v1.0 · Brain 已批准** · 创建: 2026-06-19  
> 依据: `DEVELOPMENT-GUIDE.md` §1 原文 #11、§6 决策 **D3**（公益仍走两段式接单）；`STAGE-1.2-welfare.md` §8 backlog #1  
> 对应: `DEVELOPMENT-GUIDE.md` §3 #11「claim ↔ comm 计时路径 backlog」

---

## 0. 范围锁定

| 做 | 不做 |
|---|---|
| `POST /api/welfare/claim` 创建 **`PENDING`**，**不**预写 `commStartAt` / `commDeadline` | 把 claim 改成调用 `requestDemand` 并放开多人申请（**保留先到先得**） |
| `POST /api/messages/send` 成功后调用 `tryStartCommWindow(from, to)` | 改 §6 决策 D3 / 正式接单 `acceptApplicant` 语义 |
| Vitest + Prisma mock：`welfare-claim-comm.test.ts`（≥6 用例） | 改 socket `io.emit` 逻辑（仅 HTTP send 后 hook） |
| 保留 claim 互斥：同 demand 仅允许 1 条 `PENDING`/`COMMUNICATING` | Stage 2 公开圈 / schema migration |

**Brain 决策（本 spec 内锁定）**：

1. **D3 不变**：claim = 请求认领，发布者仍通过 `acceptApplicant` 正式接单；不做「默认全员接单直接交付」。
2. **先到先得不变**：`welfare.ts` 现有 `findFirst` + 409 逻辑保留。
3. **计时规则与普通两段式一致**：双方各发 ≥1 条私信后，由 `comm.service.tryStartCommWindow` 置 `COMMUNICATING` + 5 分钟窗口（`comm.service.ts:54-63`）。
4. **`tryStartCommWindow` 当前无调用点**（全仓库仅定义未使用）——本期在 **私信 HTTP send** 路径接线，不算改 socket 底层。

---

## 1. 现状（代码为准 · 2026-06-19）

| 点 | 现状 | 问题 |
|---|---|---|
| `welfare.ts:120-129` | claim 直接 `status: 'COMMUNICATING'`，立即写 `commStartAt` / `commDeadline` | 绕过双消息起算 |
| `comm.service.tryStartCommWindow` | 已实现，**无任何调用** | 普通申请人与公益认领均无法按规则起算 |
| `DEVELOPMENT-GUIDE` §3 #11 | 写「claim 已 PENDING」 | **与代码矛盾**；doc 在 Task 4-doc 修正 |
| `comm-integration.test.ts` | 文档引用，**文件不存在** | 本 spec 用 `welfare-claim-comm.test.ts` 覆盖 |

---

## 2. 代码变更

### 2.1 `server/src/routes/welfare.ts` — claim handler

**改前**（L120-129）：

```ts
status: 'COMMUNICATING',
commStartAt: new Date(),
commDeadline: new Date(Date.now() + 5 * 60000),
```

**改后**：

```ts
status: 'PENDING',
// 不写 commStartAt / commDeadline
```

- 成功文案建议：`已认领，请与发布者沟通（双方互发消息后开始 5 分钟计时）`
- **保留**：`isPublicWelfare` / `ACTIVE` / 先到先得 409 / `message: '公益认领'`
- **不要**改 `complete` / `demands` 其它路由

### 2.2 私信 send 接线 — 二选一（优先 A）

**A（推荐）** — `server/src/routes/message.ts` `POST /send`：

```ts
const msg = await messageService.send(...)
await tryStartCommWindow(req.user!.userId, toUserId)
```

**B** — 在 `message.service.send` 末尾调用（若路由有多处 send 入口则 B 更集中）。

约束：

- `import { tryStartCommWindow } from '../services/comm.service.js'`
- **await** 调用（保证响应前 comm 状态已更新）
- **不要**改 `io.emit` 块

### 2.3 禁止额外抽象

- 不新建 `welfare-claim.service.ts`（除非 claim handler 超过 ~40 行不得不抽）
- 不改 `demand.service.requestDemand`

---

## 3. 测试文件

**路径**：`server/src/__tests__/welfare-claim-comm.test.ts`  
**风格**：Vitest + Prisma mock（同 `circle-private.test.ts` / `welfare-disbursement.test.ts`）

### 3.1 用例矩阵（≥6）

| 用例 | 场景 | 预期 |
|---|---|---|
| **WC-A** | `POST /api/welfare/claim/:id` 合法公益 ACTIVE | 201；`DemandApplicantV2.create` 为 `status: 'PENDING'`；**无** `commStartAt`/`commDeadline` |
| **WC-B** | 同 demand 已有 `PENDING` 或 `COMMUNICATING` | 409；不 create |
| **WC-C** | 非公益 / 非 ACTIVE demand | 400 |
| **WC-D** | `tryStartCommWindow`：仅申请者→发布者 1 条消息 | 不 update（仍 PENDING 或返回 null） |
| **WC-E** | `tryStartCommWindow`：双方各 ≥1 条消息 | update 为 `COMMUNICATING`；`commStartAt`/`commDeadline` 有值；deadline ≈ now+5min |
| **WC-F** | `tryStartCommWindow`：已是 `COMMUNICATING` 且有 `commStartAt` | 幂等返回原 applicant，不重复 update |
| **WC-G**（可选） | send 路由：mock `messageService.send` + `tryStartCommWindow` | send 成功后 `tryStartCommWindow` 被调用一次 |

**实现提示**：

- WC-A–C：supertest + mock `authMiddleware`（参照 `welfare-disbursement.test.ts` Test G）或直测 route handler mock prisma
- WC-D–F：直测 `tryStartCommWindow`，mock `demandApplicantV2.findMany` / `message.count` / `update`
- 时间断言：`commDeadline` 与 `Date.now()+5min` 误差 < 2s

---

## 4. 验收

| 号 | 检查 | 验证 |
|---|---|---|
| V1 | 全量测试绿 | `pnpm --filter server test` |
| V2 | typecheck | `pnpm typecheck` |
| V3 | claim 不再预写 COMMUNICATING | WC-A + grep `welfare.ts` |
| V4 | send 已接线 tryStartCommWindow | grep `message.ts` 或 `message.service.ts` |
| V5 | D3 / 先到先得 | WC-B + 未删 acceptApplicant 路径 |
| V6 | 未动 socket emit 块 | diff 仅多 import + await 一行 |
| V7 | 未越界 | 无 schema / Stage 2 / circle-enhanced |

---

## 5. 交付清单

- [ ] `welfare.ts` claim → PENDING  
- [ ] `message` send 接线 `tryStartCommWindow`  
- [ ] `welfare-claim-comm.test.ts`（≥6）  
- [ ] `pnpm --filter server test` 全绿 + typecheck  
- [ ] **不要**在本 commit 改 `DEVELOPMENT-GUIDE`（留给 Task 5 doc）

---

## 6. read-back 格式

```markdown
## git log --oneline -3
## 测试（全量 X/X + welfare-claim-comm 文件 Y/Y）
## V1–V7 对照
## 未做/未越界清单
```

Brain 复审 Task 4 通过后，**再执行 Task 5**（doc 单独 commit）。
