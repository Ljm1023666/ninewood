# macOS 部署说明：发布页面 AI（需求工作区）

> **读者：** macOS Cursor / 本机联调工程师，需在本地或云端复刻「发布页 AI 整理字段」能力。  
> **生产真相：** API `https://tothetomorrow.com/api`；服务器 `/opt/ninewood`；pm2 进程名 `ninewood`。  
> **密钥唯一源：** `/opt/ninewood/server/.env`（勿另建 secrets 副本进 Git）。  
> **硬约束：** LLM **必须走公网** DashScope / DeepSeek / MiniMax；**禁止**把 `*_BASE_URL` 指到 Mac Tailscale / 本机 Ollama。

本文只讲**发布页 AI**的业务逻辑与实现路径。通用 LLM 环境变量见 [`LLM-CONFIG.md`](./LLM-CONFIG.md)；需求卡 vs 服务卡边界见 [`specs/DEMAND-SERVICE-CARD-ADR.md`](./specs/DEMAND-SERVICE-CARD-ADR.md)。

---

## 1. 产品意图（AI 做什么 / 不做什么）

| 做 | 不做 |
|----|------|
| 把自然语言整理成结构化字段（标题、描述、线上/线下、预算、时间、分类、scope、关键词、追问） | **直接写库**（分析成功 ≠ 已发布） |
| 多轮澄清：对话追问 + 右侧工作区同步 | 代替用户点「发布」 |
| Speed / Canvas / Think 三种交互变体 | 服务卡模式下的会话持久化（服务模式不恢复历史） |
| Agent 可发出 `publish_requirement` tool_call，前端填字段并引导发布 | 覆盖用户已锁定（lock）的字段 |

统一入口 `/publish` **本身不调 LLM**，只选「需求卡 / 服务卡」。真正 AI 在 **`/demands/create`**（服务卡：`/demands/create?mode=service`）。

---

## 2. 用户旅程（端到端）

```
侧栏「发布」→ /publish
  → 选需求卡 / 服务卡 →「开始用 AI 整理」
  → /demands/create 或 /demands/create?mode=service

左侧 PromptInputBox 输入
  ├─ 默认：agent-demand-stream（对话）+ 并行 analyze-demand-stream（填右侧）
  ├─ Speed：analyze-demand（一次性非流式草稿）
  ├─ Canvas：analyze-demand-stream（偏结构化）
  └─ Think：agent-demand-stream(thinkMode=true)，可展示推理行

右侧 Workspace：字段可编辑 / 锁定；missingInfo 可勾选逐项回答
  → 全部答完 → analyze-demand 再跑一轮

点「发布」
  ├─ 需求：校验 → /demands/create/paths → 确认路径 → POST /api/demands（FormData）
  └─ 服务：serviceCardApi.create → /service-cards/:id
```

会话草稿：需求模式存 `localStorage` 键 `ninewood_demand_sessions_v1`；服务模式挂载时清空工作区、不恢复会话。

---

## 3. 前端架构（复刻时按此打开）

### 3.1 路由

| Path | 组件 | 是否调 AI |
|------|------|-----------|
| `/publish` | `client-react/src/views/PublishPage.tsx` | 否 |
| `/demands/create` | `client-react/src/views/DemandCreate.tsx` | **是（主编排）** |
| `/demands/create/paths` | `client-react/src/views/demand-paths/PublishPathsPage.tsx` | 否（确认匹配路径后落库） |

路由表：`client-react/src/router/index.tsx`。

### 3.2 关键文件

| 文件 | 职责 |
|------|------|
| `views/DemandCreate.tsx` | `sendMessage` / 各 mode / `doPublish` |
| `components/ui/prompt-input-box.tsx` | Composer；前缀 `[Think: …]` / `[Canvas: …]`；Speed |
| `stores/demand-workspace.ts` | Zustand：`fields`、锁、`applyAnalyzeResult` / `applyAgentResult` |
| `types/demand-analyze.ts` | `DemandAnalyzeResult` + `normalizeAnalyzePayload` |
| `utils/demand-publish.ts` | `validateDemandForPublish` / `isDemandReadyToPublish` |
| `utils/build-demand-form-data.ts` | 发布 FormData |
| `utils/parse-sse.ts` | SSE 缓冲拆包 |
| `utils/demand-session-history.ts` | 会话快照 |
| `components/demand/WorkspaceFields.tsx` | 右侧表单 |
| `components/demand/WorkspaceTools.tsx` | 润色 + missing 队列 |
| `api/demand.ts` | `create` → `POST /demands` |
| `api/service-card.ts` | 服务卡 create |

### 3.3 模式路由（`DemandCreate.sendMessage`）

```
rawMessage
  startsWith "[Think:"  → handleDefaultMode(history, thinkMode=true)
  startsWith "[Canvas:" → handleCanvasMode → POST /api/ai/analyze-demand-stream
  store.speedMode       → handleAggressiveMode → POST /api/ai/analyze-demand
  else                  → handleDefaultMode(history, false)
                          ├─ syncWorkspaceFromConversation → analyze-demand-stream
                          └─ POST /api/ai/agent-demand-stream
```

若 `missingQueue.length > 0`：本条输入当作答案；全部答完 → `handleMissingInfoBatchAnalysis` → `analyze-demand`。

### 3.4 Store 规则（易踩坑）

- `fieldOverrides` / 锁定字段：后续 AI **不得覆盖**。
- `applyAnalyzeResult`：后端 `summary` → 前端 `description`；`readyToPublish` **以** `validateDemandForPublish` 为准，不完全信模型。
- `applyAgentResult`：消费 `publish_requirement` 的 arguments。
- `getConfirmedContext()`：锁定字段拼成 `[已确认] …` 前缀塞进用户消息。

### 3.5 鉴权注意（发布 AI 特有）

`DemandCreate` / `WorkspaceTools` 用 **裸 `fetch('/api/ai/...')`**，一般**不显式**带 `Authorization: Bearer`。

同 origin 下浏览器默认带 Cookie；服务端登录会设 HttpOnly `ninewood_token`（见 `server/src/utils/auth-cookie.ts`）。Axios 路径另有内存 Bearer。

若 Cookie 未设、或跨域/Electron 源不一致 → AI 接口 **401 未登录**。对照：`client-react/src/api/agent.ts` 流式会显式带 Bearer。

发布门槛（前端）：`title≥2`、`serviceType`、`description`、`budget`、`category`；`OFFLINE` 还要 `regionId`。

---

## 4. 后端架构

### 4.1 挂载与守卫

- `server/src/index.ts` → `app.use('/api/ai', aiRouter)`
- 实现：`server/src/routes/ai.ts`
- 全路由：`authMiddleware` + `aiLimiter`（生产约 **30 次/用户/分钟**）

### 4.2 发布相关三个端点

| Method | Path | 用途 | LLM |
|--------|------|------|-----|
| POST | `/api/ai/analyze-demand` | 非流式结构化；Speed / 批量补答 / 润色 | `chatCompletion`（`aiFastModel`） |
| POST | `/api/ai/analyze-demand-stream` | 流式 JSON + 可选 Think | 直连 OpenAI 兼容 `/chat/completions` SSE |
| POST | `/api/ai/agent-demand-stream` | Agent 对话 + `publish_requirement` | `agentStream` |

Prompt **内联在 `ai.ts`**，无独立 prompt 文件。分类：`server/src/taxonomy.ts` 的 `findNodeByLabels` → 注入 `taxonomyLeafId`。

LLM 客户端：`server/src/services/ai/client.ts`（`chatCompletion` / `agentStream` / `parseJSON` / `extractThink` / `readSSEStream`）。  
凭证解析：`server/src/config.ts` 的 `resolveLlmCredentials`（按模型前缀路由到 `QWEN_*` / `DS_*` / `AI_*`）。

合规：流式首包必须带 `meta.isAIGenerated`（生成式 AI 标识）。

### 4.3 请求 / 响应契约（摘要）

**`analyze-demand`**

```ts
// Req
{ text: string; mode?: 'DEMAND' | 'SERVICE_CARD' }

// res.data（节选）
{
  title, category, scopePath, serviceType, confidence,
  missingInfo, summary, suggestedKeywords, budget, schedule,
  taxonomyLeafId?  // 服务端注入
}
```

前端 `normalizeAnalyzePayload` 把 `scopePath` 归一成 `scopeLabels`。

**`analyze-demand-stream` SSE**

1. `meta` → `{ isAIGenerated: true, source: 'analyze-demand-stream' }`
2. 可选 `think` → `{ line }`，最后 `think-end`
3. `result` → 结构化 JSON（含 `readyToPublish` / `requirementState` 等）
4. `done` / `error`

**`agent-demand-stream` SSE**

`meta` → `think` → `text` `{ delta }` → `tool_call` `{ name: 'publish_requirement', arguments }` → `done` / `error`。

前端类型：`client-react/src/types/demand-analyze.ts` 的 `DemandAnalyzeResult`。

落库（分析之后）：

- 需求：`POST /api/demands`（`server/src/routes/demand.ts`）
- 服务卡：`service-cards` create 路由

---

## 5. 数据流（一图）

```
User text
  → PromptInputBox（可选 Think / Canvas / Speed）
  → DemandCreate.sendMessage
  → /api/ai/*（Cookie JWT）
  → resolveLlmCredentials → 公网 OpenAI 兼容 chat/completions
  → parseJSON / SSE result | tool_call
  → normalizeAnalyzePayload / applyAnalyzeResult | applyAgentResult
  → WorkspaceFields（可改 / 锁）
  → doPublish → paths → POST /api/demands
```

---

## 6. 环境变量与生产部署（复刻必做）

### 6.1 变量名（勿提交真实 Key）

| 组 | 变量 |
|----|------|
| 选择 | `AI_PROVIDER` = `qwen` \| `deepseek` \| `minimax` |
| MiniMax | `AI_BASE_URL` `AI_API_KEY` `AI_MODEL` `AI_THINK_MODEL` `AI_FAST_MODEL` |
| DeepSeek | `DS_BASE_URL` `DS_API_KEY` `DS_MODEL` `DS_THINK_MODEL` `DS_FAST_MODEL` |
| Qwen | `QWEN_BASE_URL` `QWEN_API_KEY` `QWEN_MODEL` `QWEN_THINK_MODEL` `QWEN_FAST_MODEL` |
| 配额 | `AI_PLATFORM_*_LIMIT` `AI_BYOK_REQUIRED` |

模板：`server/.env.example`。说明：`docs/LLM-CONFIG.md`。

### 6.2 公网 BASE_URL（现行生产意图）

```env
AI_PROVIDER=qwen
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-plus
QWEN_THINK_MODEL=qwen3.7-plus
QWEN_FAST_MODEL=qwen3.7-plus
DS_BASE_URL=https://api.deepseek.com/v1
AI_BASE_URL=https://api.minimaxi.com/v1
```

**禁止：** `*.ts.net`、Mac 主机名、`http://localhost:11434`、Key 填 `ollama` 占位符却指望公网 200。

### 6.3 pm2 干净重启（非常重要）

`dotenv.config()` **不会覆盖**进程里已有环境变量。若 pm2 dump 里仍残留旧 Tailscale URL，改 `.env` 后 `pm2 restart` **无效**。

推荐：

```bash
# 在生产机 /opt/ninewood/server
# 1) 编辑 .env（公网 BASE_URL + 真实 Key）
# 2) 干净拉起
pm2 delete ninewood
NODE_ENV=production pm2 start ./node_modules/tsx/dist/cli.mjs --name ninewood --time -- src/index.ts
pm2 save

# 3) 自检
node scripts/check-llm-env.mjs
curl -sS http://127.0.0.1:3001/api/agent/provider | head
```

Windows 侧运维入口：[`WINDOWS-CURSOR-CLOUD-ACCESS.md`](./WINDOWS-CURSOR-CLOUD-ACCESS.md)。

### 6.4 本地 macOS 最短验收

1. `pnpm install` → `pnpm run dev`
2. `server/.env` 至少配一家真实 Key，`AI_PROVIDER` 与模型前缀一致
3. 登录后打开 `/demands/create`
4. 试：默认对话、Speed、Canvas、Think 各一次
5. 右侧字段应更新；锁定后不应被覆盖
6. 信息够时点发布 → 路径页 → 落库

生产验收：同路径，确认「分析」不再报网络/分析异常。

---

## 7. 常见失败模式

| 现象 | 原因 | 处理 |
|------|------|------|
| 前端「分析异常」/ `fetch failed` | `*_BASE_URL` 指 Mac Tailscale / Ollama 已下线 | 改为公网 DashScope 等 |
| 改 `.env` 不生效 | pm2 旧 env 盖过 dotenv | `pm2 delete` + 干净启动 |
| 上游 401 | Key 空 / `ollama` 占位 / 过期 | 写入真实 `QWEN_API_KEY` 等 |
| 接口 401 未登录 | 裸 fetch 依赖 Cookie | 确认登录 Cookie；或与 `agent.ts` 一样显式 Bearer |
| 429 | `aiLimiter` | 降频或调限流 |
| 右侧不更新 | stream 失败 / 字段被锁 | 看 toast；检查 lock |
| AI 说可发仍灰 | `readyToPublish` ≠ 前端校验 | 以 `validateDemandForPublish` 为准 |

---

## 8. 函数名速查

**前端：** `sendMessage` `handleDefaultMode` `handleAggressiveMode` `handleCanvasMode` `syncWorkspaceFromConversation` `handleMissingInfoBatchAnalysis` `doPublish` `applyAnalyzeResult` `applyAgentResult` `normalizeAnalyzePayload` `validateDemandForPublish` `buildDemandFormData`

**后端：** `POST /analyze-demand` `/analyze-demand-stream` `/agent-demand-stream`；`chatCompletion` `agentStream` `resolveLlmCredentials` `findNodeByLabels` `parseJSON` `extractThink`

---

## 9. 相关文档

| 文档 | 用途 |
|------|------|
| 本文 | 发布页 AI 业务 + 实现复刻 |
| [`LLM-CONFIG.md`](./LLM-CONFIG.md) | 全站 LLM 配置 |
| [`WINDOWS-CURSOR-CLOUD-ACCESS.md`](./WINDOWS-CURSOR-CLOUD-ACCESS.md) | Windows Cursor → 云端 SSH |
| [`specs/DEMAND-SERVICE-CARD-ADR.md`](./specs/DEMAND-SERVICE-CARD-ADR.md) | 需求卡 / 服务卡边界 |
| [`AGENTS.md`](../AGENTS.md) | 项目地图 |

**不要**从 `archive/`、`docs/archive/` 读「现行」实现。

---

## 10. 给 macOS Agent 的最短提示词（可复制）

```
先读 docs/MACOS-PUBLISH-PAGE-AI.md。
发布 AI 主路径：PublishPage → DemandCreate → /api/ai/analyze-demand* 与 agent-demand-stream。
生产 LLM 只读 /opt/ninewood/server/.env，必须公网 BASE_URL + 真实 Key；改完 pm2 delete 再干净启动。
不要把 BASE_URL 指回 Mac Tailscale/Ollama。复刻时对照 DemandCreate 的 mode 路由与 demand-workspace 的锁定规则。
```
