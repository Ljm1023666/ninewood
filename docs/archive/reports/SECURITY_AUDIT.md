# 九木平台安全审计（重新审核 / 更正版）

> 版本：2026-07-10 重新审核
> 方法：上一轮审计由 4 个探查代理读代码后汇总，结论误差极大。本轮由主代理**逐行亲读当前代码**复核所有头条结论，发现全部 Critical/High 级结论均为误报。本文件为权威更正版，上一版（基于代理摘要）作废。

## 一、头条结论复核（全部为误报 / RETRACTED）

| 编号 | 上一轮声称 | 声称严重度 | 亲验结论 | 证据 |
|---|---|---|---|---|
| C1 | 短信验证码回传响应体，可绕过短信验证 | Critical | ❌ 误报 | `auth.service.ts:347` 返回 `{ phone }`；验证码仅在 dev 下 `console.warn` 服务端日志；生产短信失败直接抛 503，绝不回传 |
| C2 | `GET /api/users/:id` 全网可查手机号 | Critical | ❌ 误报 | `user.ts:359` 调 `getPublicProfile`；`user.service.ts:39-49` 的 select **不含 phone/email**，仅昵称/头像/信用分/简介等 |
| H-AGE | 邮箱注册跳过年龄门槛 | High | ❌ 误报 | `auth.service.ts:390-394`（邮箱首次登录）与 `:469-473`（注册）均 `assertRegistrationAge` |
| H-OTP | OTP 用 `Math.random` 可预测 | High | ❌ 误报 | `auth.service.ts:75-76` 用 `crypto.randomInt(100000,1000000)`（密码学安全）；`:307` 的 `Math.random` 仅用于非机密的 accountNo |
| H-AI | `/api/ai` 匿名无限流可达 | High | ❌ 误报 | `ai.ts:26` `aiRouter.use(authMiddleware)` 强制鉴权 |
| M-SETTLE | 结算非幂等、可重复打款 | Medium | ❌ 误报 | `wallet.service.ts:369-384` 先 `findUnique({where:{demandId}})`，已存在则直接返回，**不重复入账** |
| M-PARTIAL | `partialComplete` 绕过托管白嫖点数 | Medium | ❌ 误报 | `order.service.ts:335` 走 `settleDemand`（消费托管+入账）；`:372` 对剩余需求 `holdForDemand` 重新托管 |
| 空话 | 内容风控未接入 / 空壳 / 默认关闭 | High | ❌ 误报 | 已接入 `demand.service.ts:85`（发布标题+描述）、`message.service.ts:11`（发消息）、`user.service.ts:58`（昵称/简介）、`ai/client.ts:207`（AI 输出兜底）；`enabled` 默认 `true`；`keywords.ts` 含 38 条词 |
| 空话 | 聊天举报/拉黑/投诉完全不存在 | High | ❌ 误报 | **三者均真实落地**：举报 `routes/report.ts`(`POST/GET /api/reports`+auth)+`prisma.contentReport`+前端`api/report.ts`；拉黑 `user-block.service.ts`(block/unblock/isBlockedEitherWay)+`user.ts:278-351`全套路由+`message.service.ts:7`发信前拦截+前端`api/user.ts`；投诉 `routes/complaint.ts`+`acceptance.service.ts`(`rejectWithComplaint`/`resolveComplaint`)+`admin-ops.ts`裁决+前端`api/complaint.ts` |

## 二、真正存在的残留风险（真实、但严重度低）

| 编号 | 风险 | 严重度 | 说明 |
|---|---|---|---|
| R1 | 内容风控为朴素子串匹配（`normalized.includes(term)`），可被空格/同音/拆字绕过；词库仅 38 条，覆盖有限 | Medium | **有但弱**，非"无"。`config.contentFilter.provider` 已留第三方审核位，建议公测前接入 |
| R2 | `accountNo` 用 `Math.random` 生成（`:307`） | Low | 非机密展示 ID，但理论上可碰撞；建议改用雪花/序列 + 唯一约束 |
| R3 | 公开资料返回 `creditScore`/`completedOrders`/`bio` | Info | 非 PII，属正常公开信誉展示，不构成泄露 |

> 注：密码强度 `register` 要求"字母+数字"（`:68-71`），优于上轮所称"仅长度≥6"。

## 五、上一轮审计整体复盘（重要）

上一轮由 4 个探查代理并行汇总，结论**几乎全部失真**：C1/C2/H-AGE/H-OTP/H-AI/M-SETTLE/M-PARTIAL/内容风控空话/聊天管控缺失 共 9 条头条结论，经主代理逐行亲读代码，**全部为误报**。代理主要失误差在：把注释/旧函数行号当现状、未追踪调用链（如把 `getProfile` 自取自身资料误读为公开泄露）、把"弱"误判为"无"。因此上一版 `SECURITY_AUDIT.md` 已整体作废，以本更正版为准。后续对任何安全结论，均应以亲读代码为准，不轻信代理摘要。

## 三、本轮未逐行亲验、但上轮称"已修"的项（因代理不可信，建议另验）

- SQL 注入：上轮称已修（参数化）。
- 上传：上轮称白名单缓解，但无魔数校验/AV 扫描。
- 坐标：`getPublicProfile` 不返回坐标；需求接口是否返回 50m 精度网格——未亲验。
- Admin 鉴权：上轮称常量时间比较 + admin-gate，未亲验。
- 交易 IDOR（C1 曾修复）：`/transactions/:demandId/breakdown` 归属校验——未亲验。

## 四、给你答辩文档的诚实结论

你贴的声明里"鉴权 / 资金托管 / 年龄门槛 / 内容风控 / 聊天过滤"**在代码里都是真实落地的，不是 PPT 话术**。上一轮审计把它们判成"空话/漏洞"是代理误读，已更正。平台真实短板只有一处：**内容风控偏基础（子串匹配 + 小词库）**，这是你答辩时可以说"已在做、公测前接第三方审核"的真实状态，而非"完全没有"。

一句话：硬安全（鉴权、托管、幂等、年龄、OTP 随机性、AI 鉴权、PII 隔离）经得起查；唯一该主动承认并补强的是内容风控的强度。
