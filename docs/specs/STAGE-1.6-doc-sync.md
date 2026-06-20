# Stage 1.6-doc — 开发指导文档回写（claim↔comm）

> 状态: **v1.0 · 已落地** · 创建: 2026-06-19  
> 前置: Task 4（`STAGE-1.6-welfare-claim-comm.md`）代码 + 单测全绿  
> 对应: `DEVELOPMENT-GUIDE.md` §2 #11 · §3 #2b/#11 · §4 · §5

---

## 0. 范围

| 做 | 不做 |
|---|---|
| 回写 `DEVELOPMENT-GUIDE.md` + `ACTION-PLAN.md` §2 行 1.6 | 改 §1 原文 / §6 决策 |
| 修正「claim 已 PENDING」与「comm-integration.test.ts」等过时表述 | Stage 2 公开圈 |
| 版本 **v2.3** + ACTION-PLAN **v2.0** | 业务代码 |

**单独 commit**：`docs: sync DEVELOPMENT-GUIDE after Stage 1.6 welfare claim comm`

---

## 1. `DEVELOPMENT-GUIDE.md` 必改

### §2 #11 一行现状

- **删除**「claim↔comm 计时路径 backlog」
- **改为**（示例）：`claim` 与 `comm.service` 双消息起算已对齐（`welfare-claim-comm.test.ts` WC-A–F）；先到先得 + D3 两段式不变

### §3 #11 公益

- **删除**差距项「claim ↔ comm 计时路径不完全一致」
- **修正**实现 bullet：claim 创建 **`PENDING`**（非 COMMUNICATING）；计时由 `tryStartCommWindow` 在双方互发消息后启动
- **删除/更新**过时句「调用 `requestDemand`」若与代码不符——以 Task 4 实际实现为准（先到先得 handler，非 requestDemand）

### §3 #2b（可选 hygiene）

- 测试引用：`comm-integration.test.ts` → **`welfare-claim-comm.test.ts`**（或并列 `comm-close` + 新文件）
- 补一句：`POST /api/messages/send` 已调用 `tryStartCommWindow`

### §4 下一批

- 追加 **✅ Stage 1.6** claim↔comm
- 下一项：Stage 2 或 #3 认证撤销等 backlog

### §2 结论段

- 补 **Stage 1.6** ✅

### 版本记录

- 追加 **v2.3** 行（日期 2026-06-19，commit Task 4/5 哈希，全量测试数）

---

## 2. `ACTION-PLAN.md`

- §2 阶段 1 表新增行 **1.6 #11 claim↔comm** → ✅
- §0 任务队列：Task 4/5 ✅，待机
- 版本记录 **v2.0**

---

## 3. 验收

| 号 | 检查 |
|---|---|
| V1 | §1 / §6 未动（diff 检查） |
| V2 | §2 #11 无 backlog 字样 |
| V3 | §3 #11 与代码一致 |
| V4 | 仅 docs commit |

---

## 4. 交付清单

- [x] `DEVELOPMENT-GUIDE.md` v2.3  
- [x] `ACTION-PLAN.md` v2.0  
- [x] docs commit 单独  
