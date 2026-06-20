# Stage 1.5 — 私人需求圈回归测试

> 状态: **v1.0 · Brain 已批准** · 创建: 2026-06-19  
> 依据: `DEVELOPMENT-GUIDE.md` §1 原文 #12、§6 决策 D4（初期只做私人圈）  
> 对应: `DEVELOPMENT-GUIDE.md` §3 #12「初期下一步：仅确保私人圈…补测试」

---

## 0. 范围锁定

| 做 | 不做 |
|---|---|
| `circle.service.ts` 私人圈路径 Vitest + Prisma mock | 公开圈申请审核（Stage 2） |
| 邀请码加入、创建、成员角色 | 改 `circle-enhanced` 对外入口 |
| 可选：`circle-activity` cron 1 个 smoke 用例 | socket / 移动端 |

---

## 1. 测试文件

建议：`server/src/__tests__/circle-private.test.ts`

风格同 `comm-close.test.ts` / `welfare-disbursement.test.ts`。

---

## 2. 用例矩阵

| 用例 | 场景 | 预期 |
|---|---|---|
| PC-A | `create(userId, { name })` | `type=PRIVATE`；`inviteCode` 生成；创建者 `CircleMember.role=OWNER`；`memberCount=1` |
| PC-B | `joinByCode(userId, code)` 有效码 | 创建 MEMBER；`memberCount` increment |
| PC-C | `joinByCode` 无效码 | 404 |
| PC-D | `joinByCode` 已在圈内 | 409 |
| PC-E | `joinPublic` 对 PRIVATE 圈 | 400「私密圈子需要通过邀请码加入」 |
| PC-F | （可选）`getMyCircles` | 返回用户 memberships |

**总数 ≥5**。

---

## 3. 验收

| 号 | 检查 |
|---|---|
| V1 | `pnpm --filter server test` 全绿 |
| V2 | 未改 `circle-enhanced` 路由行为 |
| V3 | 文档 commit：`DEVELOPMENT-GUIDE` §3 #12 补「单测 ✅」；§4 下一批 → Stage 2 或 backlog |

---

## 4. 交付清单

- [ ] `circle-private.test.ts`（≥5）  
- [ ] 全量测试绿 + typecheck  
- [ ] docs commit（§3 #12 + §4 + 版本 v2.1）  
