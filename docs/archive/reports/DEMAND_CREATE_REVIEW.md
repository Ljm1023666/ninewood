# `/demands/create` 需求创建工作区 · 深度缺陷评审

> 评审对象：`client-react/src/views/DemandCreate.tsx` 及其直接依赖
> 依赖：`stores/demand-workspace.ts`、`utils/build-demand-form-data.ts`、`api/demand.ts`、`components/demand/WorkspaceFields.tsx`、`server/src/routes/demand.ts`
> 评审日期：2026-07-10

## 一、页面功能概览

这是一个 **AI 对话式需求创建工作区**（"需求工作区 / Codex"），布局为左中右三段：

- **左侧**：自然语言对话流。用户输入需求，AI 通过三条后端通道回应：
  - `agent-demand-stream`（默认 / Think 模式，Agent 多轮对话，可触发 tool_call 收集结构化字段）
  - `analyze-demand-stream`（Canvas 模式，直接抽取结构化字段）
  - `analyze-demand`（Speed 激进模式，一句话直接生成草稿）
- **右侧**：`WorkspaceSummary` + `WorkspaceFields` + `WorkspaceTools`，实时展示 AI 抽取出的结构化字段（标题、预算、分类、服务类型、地区、期望产出等），可被锁定/手动改。
- **Canvas 模式**：3D 翻转卡牌预览（封面 + 背面 InfoCard + 价格）。
- 顶部：`新建 / 强制发布 / 发布 / 会话历史 / 置信度芯片`。
- 草稿自动持久化到 localStorage（`demand-session-history`）。

设计意图很好：用对话降低发布门槛，用右侧工作区保证结构化质量。但实现层有多处会直接导致 **数据丢失、发布失败、关键字段缺位** 的严重问题。

---

## 二、严重缺陷（P0，直接影响发布成功与数据安全）

### D1 · Speed 模式每次发送清空全部历史（静默数据丢失）
- **位置**：`DemandCreate.tsx:421-424`
  ```ts
  if (speedMode) { setMessages([]); resetWorkspace() }
  ```
- **问题**：`speedMode` 默认即为 `true`（`demand-workspace.ts:125`）。用户只要开着默认模式，每发一条消息就把整段对话 + 右侧工作区全部抹掉、从头开始。虽然会先 `persistActiveSession()` 再覆盖，但本质是"发一句忘一句"。
- **后果**：长对话被切碎；用户误以为"对话还在"实则已丢；自动保存的草稿也会被空状态覆盖。这是默认开启的破坏性开关。
- **建议**：Speed 模式只应"跳过追问、直接成稿"，**不应清空历史**；或至少默认关闭、并在 UI 上明示"此模式不保留对话"。清空行为需二次确认。

### D2 · 发布必失败路径：`expectedOutcome` 后端必填但前端常为空
- **位置**：
  - 后端 `demand.ts:40`：`expectedOutcome: z.string().min(1).max(500)`（**必填**）
  - 前端 `build-demand-form-data.ts:34`：`if (f.expectedOutcome) fd.append('expectedOutcome', ...)`（**有才传**）
  - store 初始值 `expectedOutcome: ''`（`demand-workspace.ts:104`）
- **问题**：AI 抽取链路（`applyAnalyzeResult`）只在 `aiPayload.expectedOutcome` 为字符串时才写入，而多数快速发布流程里该字段为空。结果：构造 FormData 时**不携带** `expectedOutcome` → 后端严格校验 → **400**。
- **后果**：用户点"发布 / 强制发布"高频得到"发布失败"，且无针对性报错（前端只 toast 通用错误）。
- **建议**：
  - 前端 `buildDemandFormData` 对 `expectedOutcome` 给兜底默认值（如 `f.expectedOutcome || f.description || '按约定交付'`）；
  - 或后端将其改为 `.optional()` 并在_SERVICE_端补默认；
  - 发布失败时必须把后端 `zod` 错误字段回显给用户（目前 `demandApi.create` 仅 timeout，无 400 字段解析）。

### D3 · 地区（regionId）在整个发布闭环中无 UI 入口
- **位置**：
  - `WorkspaceFields.tsx` 全文 grep `region/地区/城市` → 仅 `expectedOutcome` 相关，**无地区字段**
  - `PublishPathsPage.tsx` 同样无任何 region 输入
  - store 有 `regionId?: number`，但**没有任何 UI 写入它**
- **问题**：后端 `demand.ts:31` `regionId` 可选，前端 `build-demand-form-data.ts:28` 仅在 `f.regionId` 存在时发送。由于 UI 从不收集地区，发布的需求 `regionId` 几乎恒为 `undefined`。
- **后果**：对"本地服务撮合"平台而言，**地区是匹配的核心维度**。需求无地区 → 检索端（项目已有的 path-search `rgn` facet）拿不到地区信号 → 供需错配。这与之前评测发现的"rgn 有数据+NLP 但无 UI 选择器"是同一类缺陷的延续。
- **建议**：在 `WorkspaceFields` 增加地区选择器（复用 TASK-11 已做的 `REGION_FACET_OPTIONS` 思路），并让 AI 抽取时回填 `regionId`；发布前若缺地区给提示。

### D4 · "强制发布"名不副实，且与校验逻辑自相矛盾
- **位置**：`DemandCreate.tsx:1021-1031, 1087-1094`
- **问题**：
  - `doPublish(true)` 仅给下一页加 `?force=true`，**并不绕过任何后端校验**；
  - 同时 `build-demand-form-data.ts:17` 标题缺省 `'未命名需求'`、`minPrice` 缺省 `'1'`、`category` 缺省 `'__force__'/'of-move'/'ol-game'`。
- **后果**：按钮叫"强制发布"暗示能破闸，实际仍走严格校验；而默认兜底值又会注入 `¥1`、`未命名需求`、假分类等垃圾数据。两端认知错位，既可能误让用户以为"强制=能发"，又可能在能发时污染市场。
- **建议**：要么让 force 真有语义（后端加白名单/管理员态），要么改名"直接发布"并去掉垃圾兜底值，改为**发布前硬性要求标题+预算+分类+地区齐备**。

---

## 三、较重缺陷（P1，影响可靠性与正确性）

### D5 · 流式（SSE）解析存在事件丢失与脆弱解析
- **位置**：`DemandCreate.tsx:654-700`（Canvas）、`809-844`（sync）、`899-963`（default）
- **问题**：
  - `buf.split('\n\n')` 后 `events.pop()` 保留"半截"。若服务端最后一条事件**不以双换行结尾**，该完整事件会被永久丢弃（典型：单 `\n` 收尾）。
  - `eventType = lines[0].replace('event: ', '')` 仅看首行，且只认 `event:` 后单空格；若有多余空格或 BOM 即失效。
  - 只处理 `event === 'result'` / `'think'` / `'text'` / `'tool_call'` / `'error'`，其余事件（如 `done`）被静默忽略。
- **后果**：AI 末轮结果偶发丢失 → 右侧工作区不更新、对话显示"填写中…"卡死。
- **建议**：用标准 `EventSource` 或成熟 SSE 解析库；至少补"循环结束后再把 `buf` 当一条完整事件尝试解析一次"。

### D6 · 多处网络/解析错误被静默吞掉
- **位置**：
  - `syncWorkspaceFromConversation` 调用处 `.catch(() => {})`（`DemandCreate.tsx:860`）——右侧工作区同步失败完全不可见；
  - `handleCanvasMode` `!res.ok` 仅推一条"分析异常"后 `return`，但**中途流断裂**时 `ensure` 已建消息，无错误提示，内容定格在半句；
  - `analyzeAndLog` / 各 `catch {}` 直接跳过。
- **后果**：用户面对空白/半截内容无从判断是网络问题、模型问题还是前端 bug。
- **建议**：统一错误边界 —— 任一流失败都应把对应 assistant 消息标记为错误态并可重试；`syncWorkspace` 失败至少 toast 一次。

### D7 · `tool_call` 每次事件都 `applyAgent` 且无校验即置 `readyToPublish`
- **位置**：`DemandCreate.tsx:939-946`、`demand-workspace.ts:252`
- **问题**：
  - 每收到一个 `tool_call` 事件就 `applyAgent(parsed.arguments)`；若模型把 arguments 分多片流式下发，会**反复用部分参数覆盖**字段；
  - `applyAgentResult` 末尾无条件 `readyToPublish: true`——只要触发过 tool_call（哪怕只抽到标题）就判定"可发布"。
- **后果**："AI 已确认信息完整"提示过早出现；置信度芯片与实际完整度脱节。
- **建议**：tool_call 应在流结束（`done`/消息尾）后**一次性**合并应用；`readyToPublish` 改为基于必填字段完整性判断，而非"出现过 tool_call"。

### D8 · 发布按钮用 `setTimeout(50)` 赌博式等待状态落库
- **位置**：`DemandCreate.tsx:1033-1042`
  ```ts
  applyAgent(toolCall.arguments)
  setTimeout(() => doPublish(), 50)
  ```
- **问题**：依赖"50ms 后 Zustand 状态已更新"的时序假设，无任何确认。慢设备/状态抖动下 `doPublish` 可能读到旧 `fields` → 发布内容缺字段。
- **建议**：`applyAgent` 改为返回 Promise 或在回调里直接 `doPublish(fields)` 透传，彻底去掉魔法延时。

---

## 四、一般缺陷（P2，健壮性与体验）

### D9 · `dangerouslySetInnerHTML` + 自写 `formatAIText` 反模式
- **位置**：`DemandCreate.tsx:51-94, 1210-1214`
- **问题**：先用正则手搓 markdown（加粗/列表/段落），再 `dangerouslySetInnerHTML` 注入。当前虽先转义 `<>` 挡住了 `<script>`，但：
  - 多段 `**加粗**` 跨换行失效（`.+?` 非多行）；
  - 任何未来改动漏掉转义即变 XSS；
  - 维护成本高。
- **建议**：换 `react-markdown` + `remark-gfm`，并显式 `rehype-raw` 关闭 / 用 `rehype-sanitize`。AI 文本渲染不应手搓。

### D10 · 自动保存未在卸载时 flush → 最后 1 秒改动丢失
- **位置**：`DemandCreate.tsx:350-356`
  ```ts
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(saveDraft, 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [messages, draftInput, workspaceFields, saveDraft])
  ```
- **问题**：依赖变化即清掉旧定时器，**卸载（点发布跳转）时定时器被清、不保存**。用户在跳转前 <1s 的编辑会丢。
- **建议**：卸载 cleanup 改为 `saveDraft()` 同步落盘（localStorage 同步，可即时写）。

### D11 · 渲染期副作用：handler 赋值给 ref
- **位置**：`DemandCreate.tsx:601, 710, 771, 1019`
  ```ts
  handleAggressiveModeRef.current = handleAggressiveMode
  ```
- **问题**：在组件函数体内（render 阶段）给 ref 赋值，StrictMode 双调用下虽幂等但属反模式，且依赖"ref 总是最新"的隐式契约，易在重构时引入 stale ref。
- **建议**：用 `useLatest` 或把 handler 直接作为依赖传入，避免 render 期写 ref。

### D12 · `window.confirm` 原生对话框破坏整体体验一致性
- **位置**：`DemandCreate.tsx:1062`
- **问题**：高定制动效的页面里突然弹出浏览器原生 confirm，且 `persistActiveSession` 在 confirm 之前已调用一次、clearDraft 内又调一次（双写）。
- **建议**：用项目已有的 `confirm-dialog`（同文件 import 的 `toast` 同族）做统一弹窗；并合并重复 save。

### D13 · 前后端字段契约漂移
- **位置**：
  - 前端 `build-demand-form-data` 发 `regionId`，后端还认 `cityCode`（`demand.ts:30`）但前端从不发；
  - `analyze` 端点返回 `scopePath`，`analyze-stream` / `sync` 期望 `scopeLabels`（`DemandCreate.tsx:566 vs 675/832`）——字段名不一致，任一边改名即静默失效。
- **建议**：抽取共享类型（`DemandAnalyzeResult`），前后端共用；用 zod schema 生成前端类型，消除手抖。

### D14 · 思考过程打字机用 `setInterval +1/25ms`，长文本性能差
- **位置**：`DemandCreate.tsx:111-148`（`ThinkingPanel`）
- **问题**：每 25ms 一次 `setState` 累加字符；reasoning 上千字时持续数十秒高频重渲染。
- **建议**：要么整段直接显示（思考过程无需逐字），要么用 `requestAnimationFrame` 按时间切片，而非字符计数 + 固定 25ms。

---

## 五、优化建议总表（按优先级）

| 优先级 | 缺陷 | 优化动作 | 风险/工作量 |
|---|---|---|---|
| P0 | D1 Speed 清空历史 | 改为不丢历史；默认关；明确文案 | 低 |
| P0 | D2 expectedOutcome 400 | 前端兜底默认 / 后端改 optional + 错误回显 | 低 |
| P0 | D3 地区无 UI | WorkspaceFields 加地区选择器 + AI 回填 | 中 |
| P0 | D4 强制发布名实不符 | 改名/去垃圾兜底/发布前硬校验 | 低 |
| P1 | D5 SSE 末事件丢失 | 标准解析库 / 收尾补解析 | 中 |
| P1 | D6 静默吞错 | 统一错误态 + 可重试 | 中 |
| P1 | D7 tool_call 早置 ready | 流末一次性合并 + 完整性判定 | 中 |
| P1 | D8 setTimeout 赌博 | 透传 fields / await 状态 | 低 |
| P2 | D9 dangerouslySetInnerHTML | react-markdown + sanitize | 中 |
| P2 | D10 卸载不 flush | cleanup 同步 saveDraft | 低 |
| P2 | D11 render 写 ref | useLatest / 直接依赖 | 低 |
| P2 | D12 window.confirm | 统一 confirm-dialog | 低 |
| P2 | D13 契约漂移 | 共享类型 + zod 生成 | 中 |
| P2 | D14 打字机性能 | rAF 切片 / 直出 | 低 |

## 六、一句话结论

页面"对话降门槛 + 工作区保质量"的产品思路是对的，但 **Speed 默认清空、expectedOutcome 必填却不传、地区全程无入口** 三处会让"发布"这个核心动作在真实流程里频繁失败或产出残缺需求；**SSE 末事件丢失 + 静默吞错** 则让 AI 结果不可信。建议先啃 D1–D4（P0），再补 D5–D8（P1）的可观测性与正确性，P2 可随迭代清理。
