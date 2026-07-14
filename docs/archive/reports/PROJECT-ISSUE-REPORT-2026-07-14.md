# Ninewood（九木）项目问题报告

> 生成日期：2026-07-14
> 核查方式：基于项目文档（`AGENTS.md` / `CLAUDE.md` / `PRODUCT.md` / `DESIGN.md` 等）与实际代码（`client-react/src/index.css`、Prisma schema、测试文件）抽样核对。**未逐行阅读业务源码**，结论以"文档与代码是否一致、是否误导 AI 协作"为评判口径。
> 状态说明：本报告相对 2026-07-14 两轮评估做了纠偏——其中 CLAUDE.md 工具链问题已被证实**不存在**（上轮误判，本次更正）。

---

## 一、项目基线（规模与定性）

| 维度 | 实测数据 |
|------|---------|
| 数据模型 | Prisma **53 模型 / 31 枚举 / 16 次迁移** |
| 后端 | 路由 35 个、services 50+ |
| 前端 | views **58** 个 |
| 领域文档 | `docs/specs/` 下 **24 份 ADR**；`docs/` 另有 `RELEASE-NOTES.md`、`ENGINEERING_OVERVIEW.md` 等 |
| 测试 | 后端 **52** 个 `.test.ts`；前端 **16** 个 `.test.*`（其中 views 下仅 **3** 个） |

**整体定性**：架构分层与领域建模已"像样"，AI 协作记忆机制是亮点；**最大风险不是代码质量，而是"文档/记忆与实现脱节 + 一处被污染的 AI 记忆文件"**——它们会直接误导后续 AI 会话做出错误决策。

---

## 二、已验证的正面事实（避免误伤，防止过度整改）

1. **后端测试扎实**：52 个测试覆盖 Agent 系列、demand、order、order-cancel、deposit、transaction-access、welfare-disbursement、welfare-claim、compliance-age、content-filter、circle、path-search 等。担保 / 订单 / 交易 / 福利等涉钱核心链路**均有回归测试**。
2. **架构分层清晰**：前端 `views/components/stores/api`；后端 `routes → services → prisma`；services 按业务域拆分，粒度合理。
3. **AI 协作记忆机制教科书级**：`.claude/memory/SESSION-ANCHOR.md` 真实记录"当前意图 / 已改文件 / 决策 / 活跃问题"，跨会话不丢上下文。
4. **领域建模有边界感**：需求卡（Demand）与服务卡（ServiceCard）刻意保持独立生命周期；消息附件用快照、卡片编辑不回写历史——经过思考的领域决策。
5. **CLAUDE.md 工具链现已正确**（**更正上轮误判**）：第 135 行 `Repository root: D:\ninewood`、第 146 行 `Package management: **pnpm** workspaces`、第 147-152 行命令均为 `pnpm run dev` / `pnpm --filter client-react run dev`。此前报告的"CLAUDE.md 仍写 npm workspaces / e:/Ninewood"**不成立**，应为上轮读取到旧缓存或已修复，本次以实际文件为准。

---

## 三、问题清单（按严重度）

### 🔴 P0 — 高严重度（误导 AI 协作 / 持续喂错误结论）

**P0-1｜`REASONIX.md` 记忆文件被污染，已成"净负资产"**
- **位置**：`D:\ninewood\REASONIX.md`（当前 **809 行**）
- **现象**：
  - 同一段"九木 React 项目重新估值"内容被重复粘贴 **7 遍**（起点分别在第 12、130、248、365、482、599 行）；后又追加"开卡动画评价"整段重复 2 遍（第 717、763 行）。
  - 内含**已被证伪**的结论："测试覆盖 3/10 — Vitest 配置但缺少关键测试"（第 42、160、278、396、513、629… 行），而实际后端有 **52 个测试**覆盖核心链路。
  - 全文夹杂 emoji（📊 💡 ⚠️ ✅ 等），与项目 `PRODUCT.md` 的 anti-emoji 原则直接冲突。
- **风险**：该文件按设计"每次会话被完整注入系统前缀"，等于持续向后续 AI 喂**过时且错误**的估值与测试结论，污染所有下游判断。体量越大、越危险。
- **建议**：立即清空为**单条**最新结论（或删除该文件，改用项目既有的 `.claude/memory/` / `.workbuddy/memory/` 体系）。这是本次**最高杠杆、最低成本**的修复。

**P0-2｜`DESIGN.md` 正文与代码实现彻底脱节（设计文档说"纯黑"，代码是"浅色 macOS"）**
- **位置**：`D:\ninewood\DESIGN.md`（553 行）
- **现象**：
  - **frontmatter 已正确**（第 1 段）：`workspace: #F5F5F7`、`surface: #FFFFFF`、`accent: #007AFF`、`Light system surfaces`——与代码一致。
  - **正文仍整篇"纯黑"**：第 82、92、103、108、203、231、452 等 **十余处**仍写 `Pure Black #000000`、`#FFF on #000 = 21:1`、`Page background — zero light`。
  - 真实代码 `client-react/src/index.css` 第 60-61 行：`--bg-primary:#F5F5F7`（浅灰）、`--bg-secondary:#FFFFFF`，注释第 49 行明确"macOS 系统色：浅灰工作区"。
- **风险**：新 AI 若信正文去做深色主题，会整体跑偏，与已落地的浅色 macOS 风冲突。
- **建议**：废弃正文所有 `Pure Black #000000` 段落，使其与 frontmatter + `index.css` 对齐（单一事实来源 = 代码）。

### 🟠 P1 — 中严重度

**P1-1｜`index.css` 重复 import + 自相矛盾注释**
- **位置**：`D:\ninewood\client-react\src\index.css`
- **现象**：
  - 第 14、15 行**连续两行**完全相同：`@import "./styles/loop-services.css";`（重复引入）。
  - 第 44-47 行注释写"色彩策略：纯黑白灰底 + #3388FF 蓝强调色 / 纯黑 #000 打底"；紧接着第 49 行注释又写"macOS 系统色：浅灰工作区 + 单一蓝色强调（#007AFF）"——**两套说法并排**，且前者与代码实际 token 相反。
- **建议**：删除第 15 行重复 import；第 44-47 行注释统一为"浅色 macOS 工作区 + #007AFF 强调"，消除歧义。

**P1-2｜前端组件测试盲区**
- **位置**：`client-react/src/**`
- **现象**：前端仅 **16** 个测试，其中 views 下仅 **3** 个（Discover / Help / LoopDiscover）。需求创建、订单、钱包、卡池、消息等核心页面**几乎没有组件测试**。
- **风险**：UI 层回归无网兜底，交互/状态改动易引入静默回归。后端逻辑有测试，但用户最终感知在 UI。
- **建议**：优先为需求创建、订单、钱包、卡池补组件/集成测试；不必追求全量覆盖，先锁核心页面。

**P1-3｜`DESIGN.md` 第 11 节塞版本历史，且与独立 `RELEASE-NOTES.md` 冗余**
- **位置**：`D:\ninewood\DESIGN.md` 第 495 行起 "## 11. Version History" → "AI 1.6 — Agent 对话系统…发布说明"
- **现象**：设计规范文件承载 release notes；且 `docs/RELEASE-NOTES.md` 已存在，内容重复。
- **建议**：删除 DESIGN.md 第 11 节，改为指向 `docs/RELEASE-NOTES.md`。设计文件只保留设计 token 与规范。

### 🟡 P2 — 低严重度（治理类）

**P2-1｜根目录文档职责混乱 + AI 工具记忆缺乏统一治理**
- **现象**：根目录混放多个 AI 工具的记忆/配置（`CLAUDE.md` / `opencode.md` / `REASONIX.md`）+ 双层记忆（`.claude/` 与 `.workbuddy/`）。`opencode.md` 内容正常（合理边界铁律），无问题；但 `REASONIX.md` 污染（见 P0-1）暴露了"无清洗机制"的治理缺口。
- **建议**：明确"AI 工具记忆只保留一份权威源"，旧工具记忆文件清理或归档到 `docs/reports/` 或 `.archive/`。

---

## 四、优先级修复清单（建议执行顺序）

| 序 | 问题 | 严重度 | 预估工时 | 操作 |
|----|------|--------|---------|------|
| 1 | 清空 `REASONIX.md` 重复内容，保留单条 | P0 | 5 min | 编辑/删除文件 |
| 2 | 对齐 `DESIGN.md` 正文到代码（删纯黑段） | P0 | 20 min | 编辑文件 |
| 3 | 修 `index.css` 重复 import + 矛盾注释 | P1 | 5 min | 编辑文件 |
| 4 | 补前端核心页面组件测试 | P1 | 数小时 | 写测试 |
| 5 | 删 `DESIGN.md` 第 11 节，指向 `RELEASE-NOTES.md` | P1 | 5 min | 编辑文件 |
| 6 | 治理根目录 AI 记忆文件 | P2 | 15 min | 移动/归档 |

**一句话结论**：代码与架构本身没问题，**真正该修的是"会误导 AI 的那几份文档和那个被污染的记忆文件"**——先做 P0 两项（共约 25 分钟），项目对后续 AI 协作的可靠性会立刻上一个台阶。

---

## 附：本次纠偏记录（相对前两轮评估）

- ❌ 原判"CLAUDE.md 工具链/路径过期（npm workspaces / e:/Ninewood）" → **证伪**：实际文件已正确（pnpm / D:\ninewood）。
- ❌ 原判"测试覆盖与体量不匹配（测试差）" → **证伪**：后端 52 测试扎实，真实短板是**前端测试盲区**（16 测试 / 3 views）。
- ✅ 原判"DESIGN.md 与代码脱节" → **成立且精确化**：frontmatter 已正确，**正文**纯黑段才是该清理的过时残留。
- ✅ 原判"REASONIX.md 污染" → **成立且加重**：从 7 遍"重新估值"增至再叠加 2 遍"开卡动画评价"，809 行。
