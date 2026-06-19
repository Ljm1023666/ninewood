# 大模型（LLM）配置说明

> 适用目录：`server/`  
> 环境文件：`server/.env`（从 `server/.env.example` 复制）  
> 最后更新：2026-06-15

---

## 1. 设计原则：BYOK（Bring Your Own Key）

九木的大模型调用采用 **用户自带 API Key** 为主、**平台 Key 兜底** 为辅：

| 模式 | 谁付费 | 配额 | 适用场景 |
|------|--------|------|----------|
| **用户 Key（BYOK）** | 用户自己的厂商账户 | 不受平台日限额约束（仅受厂商侧限制） | 正式使用、Agent 对话、需求工作区 AI |
| **平台 Key（兜底）** | 平台 `.env` 中的 Key | `AI_PLATFORM_*` 限额，易触顶 | 开发调试、未绑 Key 的试用 |

未绑定个人 Key 时，请求走平台 `.env` 里的 Key，并计入平台配额（默认每日 150 次、每小时 50 次，见 `server/src/services/agent/quota.ts`）。

设置 `AI_BYOK_REQUIRED=true` 可强制要求用户必须先绑定 Key（生产环境推荐在 BYOK 功能上线后开启）。

---

## 2. 支持的提供商

均通过 **OpenAI 兼容** `POST {baseUrl}/chat/completions` 调用。

### 2.1 MiniMax

| 变量 | 说明 | 示例 |
|------|------|------|
| `AI_BASE_URL` | API 根地址 | `https://api.minimaxi.com/v1` |
| `AI_API_KEY` | 平台兜底 Key | 在 [MiniMax 开放平台](https://platform.minimaxi.com/) 创建 |
| `AI_MODEL` | 默认对话模型 | `MiniMax-M2.5` |
| `AI_THINK_MODEL` | 思考/推理模式 | `MiniMax-M2.5` |
| `AI_FAST_MODEL` | 快速分析（需求澄清等） | `MiniMax-M2.5` |

环境变量 `AI_PROVIDER=minimax` 时作为默认提供商。

### 2.2 DeepSeek

| 变量 | 说明 | 示例 |
|------|------|------|
| `DS_BASE_URL` | API 根地址 | `https://api.deepseek.com/v1` |
| `DS_API_KEY` | 平台兜底 Key | 在 [DeepSeek 开放平台](https://platform.deepseek.com/) 创建 |
| `DS_MODEL` | 默认模型 | `deepseek-chat` |
| `DS_THINK_MODEL` | 推理模型 | `deepseek-v4-pro` |
| `DS_FAST_MODEL` | 轻量模型 | `deepseek-v4-flash` |

Agent 中选择 `deepseek-*` 前缀模型时自动路由到 DeepSeek。

### 2.3 通义千问（Qwen / DashScope）

| 变量 | 说明 | 示例 |
|------|------|------|
| `QWEN_BASE_URL` | 兼容模式地址 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `QWEN_API_KEY` | 平台兜底 Key | 在 [阿里云百炼](https://bailian.console.aliyun.com/) → API-KEY 管理 创建（`sk-` 开头） |
| `QWEN_MODEL` | 默认模型 | `qwen3.7-plus` |
| `QWEN_THINK_MODEL` | 深度任务 | `qwen3.7-plus` |
| `QWEN_FAST_MODEL` | 快速任务 | `qwen3.7-plus` |

Agent 中选择 `qwen-*` 前缀模型时路由到 Qwen。

---

## 3. 快速开始

```bash
cd server
cp .env.example .env
# 编辑 .env，至少填入一家厂商的 API Key，例如：
#   AI_API_KEY=sk-xxxxxxxx
```

启动后端：

```bash
# 仓库根目录
npm run dev -w server
```

未配置任何 Key 时，启动日志会提示 `AI_API_KEY 未设置，AI 功能将不可用`，AI 相关接口将失败。

---

## 4. 平台配额环境变量

仅在使用 **平台兜底 Key** 时生效（用户已绑 BYOK 时不应再扣平台配额）。

| 变量 | 默认值 | 含义 |
|------|--------|------|
| `AI_PLATFORM_DAILY_LIMIT` | `150` | 每用户每日调用上限 |
| `AI_PLATFORM_HOURLY_LIMIT` | `50` | 每用户每小时上限 |
| `AI_PLATFORM_SESSION_LIMIT` | `250` | 单会话累计上限 |
| `AI_BYOK_REQUIRED` | `false` | `true` = 必须绑定用户 Key |

---

## 5. 代码中的使用位置

| 模块 | 路径 | 说明 |
|------|------|------|
| 环境读取 | `server/src/config.ts` | 统一 `providers.minimax / deepseek / qwen` |
| 凭证解析 | `config.resolveLlmCredentials(model?)` | 按模型名选 baseUrl + apiKey |
| 需求工作区 AI | `server/src/routes/ai.ts` | `/api/ai/analyze-demand*` 等 |
| Agent 对话 | `server/src/services/agent/executor.ts` | 流式 + 工具调用 |
| 配额 | `server/src/services/agent/quota.ts` | 平台 Key 限流 |

### 模型名 → 提供商路由规则

```
deepseek*  → DeepSeek（DS_*）
qwen*      → Qwen（QWEN_*）
其他       → MiniMax（AI_*，默认）
```

---

## 6. 用户 BYOK（规划与约定）

> 用户 Key 存储与设置页 UI 将在后续迭代实现；以下为约定，便于前后端对齐。

### 6.1 存储（计划）

- 表：`UserLlmCredential`（或 `User.metadata.llmKeys` 加密字段）
- 字段：`userId`, `provider`（`minimax` | `deepseek` | `qwen`）, `apiKeyEncrypted`, `defaultModel?`, `updatedAt`
- 传输：仅 HTTPS；日志与错误信息 **不得** 打印完整 Key

### 6.2 调用优先级

```
1. 用户已绑定的对应 provider Key
2. 若 AI_BYOK_REQUIRED=true → 拒绝，提示去设置页绑 Key
3. 否则回退平台 .env Key + 计入平台配额
```

### 6.3 前端设置页（计划）

路径建议：`/settings/llm` 或设置 → 大模型

- 三个 Tab：MiniMax / DeepSeek / 通义千问
- 输入 API Key（密码框）、可选默认模型
- 测试连接按钮：`POST /api/users/me/llm-credentials/test`
- 保存：`PUT /api/users/me/llm-credentials`

---

## 7. 安全须知

1. **切勿** 将 `server/.env` 提交到 Git（已在根 `.gitignore`）
2. 生产环境使用密钥管理服务或 CI 注入，不要明文写在镜像里
3. 平台 Key 仅作兜底，额度小、需监控用量
4. 用户 Key 落库必须加密（AES-256-GCM + 服务端 `LLM_CREDENTIALS_SECRET`）

---

## 8. 常见问题

**Q：只配了 MiniMax，能用 DeepSeek 吗？**  
A：可以。在 `.env` 同时填写 `DS_API_KEY`，或在用户设置里绑定 DeepSeek Key。Agent 选 `deepseek-chat` 等模型即可。

**Q：需求工作区 `/api/ai/*` 用哪家？**  
A：当前默认走 MiniMax（`AI_*`）。多提供商支持需在各路由传入 `model` 或读取用户默认 provider（待 BYOK UI 完成后统一）。

**Q：429 / 配额用尽？**  
A：若未绑个人 Key，说明触达平台限额。请在设置中绑定自己的 API Key，或次日再试。

**Q：Qwen 和 DashScope 是什么关系？**  
A：Qwen 模型通过阿里云 DashScope 的 OpenAI 兼容接口调用，Base URL 使用 `compatible-mode/v1`。

---

## 9. 相关文档

- [ENGINEERING-ROADMAP.md](./ENGINEERING-ROADMAP.md) — 产品规则与 AI 2.5 标签认可流程  
- [ENGINEERING_OVERVIEW.md](./ENGINEERING_OVERVIEW.md) — 仓库结构与启动命令
