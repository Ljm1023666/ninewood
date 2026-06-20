# Stage 1.2-doc — 开发指导文档回写规格

> 状态: **v1.0 · Brain 已批准** · 创建: 2026-06-19  
> 前置: Stage 1.2 代码 + 单测全绿（`welfare-disbursement.test.ts` V1–V8）  
> 对应: `DEVELOPMENT-GUIDE.md` §2 / §3 #11 / §4 / §5 · `ACTION-PLAN.md` §2 行 1.2

---

## 0. 范围

| 做 | 不做 |
|---|---|
| 回写 `DEVELOPMENT-GUIDE.md` 与 `ACTION-PLAN.md` | 改 §1 需求原文 |
| 新增 §5 API 行、§2 矩阵、§3 #11 差距 | 改 §6 已决策 |
| 版本记录 v2.0 | Stage 2 公开圈内容 |

**单独 commit**：`docs: sync DEVELOPMENT-GUIDE after Stage 1.2 welfare`

---

## 1. `DEVELOPMENT-GUIDE.md` 必改清单

### §2 实现状态总览

| # | 改前 | 改后 | 一句话现状（建议） |
|---|---|---|---|
| 11 | 🟡 | 🟡→✅ 或 🟡（若 claim backlog 仍开放） | 10% 抽成入池；`WelfareDisbursement` 政府拨付可追溯；`choice` 选奖可用；claim 仍两段式（D3） |

**§2 结论段（约 L114–117）**：删除仍写「回归测试补全 #2c」的过时句；改为：

- 初期范围 1/2/4/6/7/10 ✅  
- Stage 1.1 / 1.3 / **1.2（拨付+选奖）** ✅  
- 下一批：私人圈单测（Stage 1.5）、Stage 2 公开圈后置  

### §3 #11 公益需求系统

**删除/修正过时差距**（与 v1.4+ 代码矛盾）：

- ~~「公益交付应统一到普通两段式（当前 claim 是另一套）」~~ → 改为：`claim` 已对齐 `requestDemand`（2026-06-15）；**backlog** 见 STAGE-1.2 spec §8（与 comm 双消息起算不一致，另开 spec）
- ~~「无政府对接/拨付出口」~~ → ✅ `POST/GET /api/admin/welfare/disbursements`
- ~~「选择奖项分支未实现」~~ → ✅ `rewardMode=choice` + `choiceLabel`

**保留差距（如实）**：

- 无真实政府外部 API；仅 ADMIN 登记出账  
- 选奖 honor-only，不扣池（STAGE-1.2 决策）  
- claim 与 `comm.service` 计时路径不完全一致（backlog）

**下一步任务**：改为 Stage 1.5 私人圈 / Stage 2 公开圈；或「保持 + 可选 claim/comm 对齐 spec」

### §4 范围锁定 · 下一批

- Stage 1.2 → ✅ 已完成（日期 2026-06-19）  
- 下一项：**Stage 1.5 私人圈单测**（`docs/specs/STAGE-1.5-private-circle-tests.md`）  
- Stage 2 公开圈：仍后置  

### §5 API 现状对照

新增行：

| 领域 | 真实路径 | 说明 |
|---|---|---|
| 公益拨付（Admin） | `POST /api/admin/welfare/disbursements` · `GET /api/admin/welfare/disbursements?regionId=` | Stage 1.2；需 ADMIN |

扩展公益 complete 说明：`POST /api/welfare/complete/:demandId` body 可选 `{ rewardMode, choiceLabel }`

**关键数据模型**：列表中加入 `WelfareDisbursement`；`WelfareReward.rewardType` / `choiceLabel`

### §3 #3（可选 hygiene）

删除仍写「下一步任务（非初期范围）」里已落地的 autoReceive 实现步骤；保留「未来项：认证撤销防漏推…」

### 版本记录

追加：

```markdown
| 2026-06-19 | v2.0 | Stage 1.2 落地后回写：#11 拨付+选奖；§5 增 admin disbursements；§4 下一批改 Stage 1.5；修正 §2 结论与 #11 过时差距。 |
```

文档头 `最近同步` 改为 `(Stage 1.2 落地)`。

---

## 2. `ACTION-PLAN.md` 必改

- §2 行 1.2：`🟡 Codex 执行中` → `✅ Stage 1.2 已完成`（附 commit hash 若已知）  
- §0 Codex 执行边界：`当前任务` → Stage 1.5 或「待机见 CODEX-HANDOFF」  
- 版本记录 v1.6：Stage 1.2 + doc sync  

---

## 3. 验收

| 号 | 检查 |
|---|---|
| D1 | §1 原文零改动 |
| D2 | §2 #11 与代码一致（拨付 API、choice 奖励） |
| D3 | §5 含 disbursements 路径 |
| D4 | 无「Stage 0 待补测」类过时结论 |
| D5 | 仅 docs 文件变更（本 stage） |

---

## 4. 交付

- [ ] `DEVELOPMENT-GUIDE.md` 按 §1 修改  
- [ ] `ACTION-PLAN.md` 行 1.2 ✅  
- [ ] 单独 docs commit  
