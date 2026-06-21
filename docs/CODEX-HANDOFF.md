# Codex 交接通道（Brain ↔ Codex）

> 维护者: Cursor 审核官（Brain）· 读者: Codex 执行员  
> 用户不参与日常调度时，**以本文档为唯一任务来源**；读完再写代码。

---

## 当前基线（2026-06-21 · Task 6 已批准）

| 项 | 状态 |
|---|---|
| Git（本地） | Task 6 主链 `34c5c85`…`fb87fc0` · Task 6.1 `cc9fa47` · Brain 补漏见最新 commit |
| Server 测试 | `pnpm --filter server test` → **75/75**（12 文件） |
| Typecheck | `pnpm typecheck` → clean |
| 开发指导 | `DEVELOPMENT-GUIDE.md` **v2.4** |
| **活跃 Task** | **Task 7 Wave 1 已交，等 Brain 审 Wave 2** |

### 已合入里程碑

| Stage / Task | 交付 | 关键 commit / 测试 |
|---|---|---|
| **0** | comm-close / demand-window / location-privacy | — |
| **1.1** | autoReceive | 12 用例 |
| **1.3** | timeLimit | 7 用例 |
| **1.2** | 拨付 + 选奖 | `d00d7a5` · 9 用例 |
| **1.5** | 私人圈单测 | `985e109` · 6 用例 |
| **1.6** | claim↔comm | `7c5f3ee` · 7 用例 |
| **Task 6** | 虚假功能完整修复（27 项） | `34c5c85`…`fb87fc0` · 69/69 → 6.1 后 75/75 |
| **Task 6.1** | Brain 终审返工 | `cc9fa47` |
| **Task 6 收尾** | `orderApi.cancel` 前端补漏 | `bd3f200` |

### 测试分布（75/75）

welfare 9 · welfare-claim-comm 7 · comm-close 7 · auto-receive 12 · deposit 4 · **order 8** · **order-cancel 3** · **accept-applicant-order 6** · time-limit 7 · auth 3 · demand 2 · circle-private 6 · 其它 3

---

## Brain 决策（无需再问用户）

1. **权威规格**：`docs/DEVELOPMENT-GUIDE.md` §1 + §6
2. **禁止**：无 spec 扩 Stage 2；改 §1 原文；stub 进 feat commit
3. **Commit 纪律**：功能 1 commit + 文档 1 commit
4. **验证**：read-back 含全量 `pnpm --filter server test`

---

## ✅ 已完成任务队列

| # | 任务 | commit | Brain |
|---|---|---|---|
| 1 | Stage 1.2 收尾 | `d00d7a5` | ✅ |
| 2 | Stage 1.2-doc | `3e5d547` | ✅ |
| 3 | Stage 1.5 私人圈 | `985e109` + `aef7170` | ✅ |
| 4 | Stage 1.6 claim↔comm | `7c5f3ee` | ✅ |
| 5 | Stage 1.6-doc | （doc commit） | ✅ |
| 6 | 虚假功能完整修复 | `34c5c85`…`fb87fc0` | ✅ |
| 6.1 | Brain 终审返工 | `cc9fa47` | ✅ |
| 6+ | orderApi.cancel 补漏 | `bd3f200` | ✅ |
| 7.1 | Task 7 Wave 1 (Shell + 假按钮) | `ccd329c` | ⏳ 等 Brain |

---

## 🟡 当前状态：Task 7 Wave 1 已交，等 Brain 审 Wave 2

**活跃任务**：Bento Productivity Hub 侧栏从「圈子详情装饰」升级为可导航的真实壳层。

| 项 | 路径 |
|---|---|
| 规格 | `docs/specs/TASK-7-bento-sidebar-implementation.md` |
| 设计参考 | `docs/stitch-circle-detail/variant-b-cinematic.html` |
| 现状入口 | `client-react/src/components/layout/BentoAppShell.tsx` |

**执行顺序**：
- ✅ **Wave 1**（Shell + 假按钮）— commit `ccd329c`，等 Brain 审
- ⏳ Wave 2（子页 Bento 包装）
- ⏳ Wave 3（/teams + legacy 降级）
- ⏳ Wave 4 可选

**Wave 1 摘要**：
- 抽取 `BentoAppShell` + `AppBentoSidebar`，nav 单源 `constants/bento-nav.ts`，active 由路由决定
- 品牌点击 → `/circles`；侧栏接住 `circles | circles/:id | card-pool* | tag-stats | circles-list | help*`
- 详情页 `coverUrl` 注入背景层；其它页 fallback 到 `#10131a + --cdb-overlay`
- 分享复制 URL + toast；查看全部仅当需求 > 3 时显示并 scroll 到需求卡；周活跃度 100% 已改为 `--`
- typecheck clean；server test 75/75；lint 未在改动的文件新增报错

### 候选 backlog（Task 7 之后）

| 项 | 说明 |
|---|---|
| **Stage 2 公开圈** | D4 后置；需 `STAGE-2-*.md` |
| **#3 认证撤销防漏推** | §3 #3 未来项 |
| **Google OAuth** | Task 6 已 disabled 按钮，可单独立项 |
| **`Deposit/DepositDemand` 表清理** | 禁止删表 migration |
| **order.cancel → wallet hold 释放** | 技术债：cancel 仍查旧 deposit 表 |

---

## 下一任务（Brain 填写 · Codex 等待）

- **Wave 2 准入**：Brain 审 Wave 1 后给信号
- Wave 2 spec 见 `docs/specs/TASK-7-bento-sidebar-implementation.md` §3 Wave 2（子页 Bento 包装 SIDEBAR-04/05/06/07）
- 若审完无补充，Codex 直接进入 Wave 2

---

## 版本记录

| 日期 | 变更 |
|---|---|
| 2026-06-19 | v4：Task 4/5 排期 |
| 2026-06-19 | v5：Task 4–5 全部批准；基线 67/67；队列 → 待机 |
| 2026-06-21 | v6：Task 6 启动 — `FAKE-FEATURES-REPAIR-BACKLOG.md` |
| 2026-06-21 | v7：Task 6 + 6.1 Brain 批准；基线 75/75；队列 → **待机** |
| 2026-06-21 | v8：Task 7 启动 — Bento 侧栏假导航审计 → `TASK-7-bento-sidebar-implementation.md` |
| 2026-06-21 | v9：Task 7 Wave 1 已交 — `ccd329c` 抽取 `BentoAppShell` + 路由化侧栏 + 详情假按钮清理；待 Brain 审 |
