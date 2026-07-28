# ADR · 自然回 V3：组合路径、开放供给与可结算闭环

> **状态**：Accepted  
> **日期**：2026-07-28  
> **前置**：`docs/specs/NATURAL-LOOP-V2-ADR.md`  
> **最高产品准则**：`docs/回的理念.md`

## 背景

V2 已落实「天地人」一等公民、`VERIFY` 链、最小披露与回中心视图。对照《回的理念》，仍缺四块：

1. **回的组合（大回）**：用户应直面一条开箱即用路径，而不是多个孤立小回。
2. **真样板地回**：内置能力仍只服务需求卡工具链，缺少「地回产出 → 天回按声明核验」的外部问题样板。
3. **开放供给**：普通人无法上架地回；对接师/托管模式只有 schema 字段。
4. **经济与监督骨架**：验证失败应阻断结算；佣金与接口监控额度尚未进入回域。

## 决策

### 1. 组合路径（Recipe）

- 引入 **Loop Recipe**：有序步骤列表，每步引用一个可执行 `definitionCode`（或 offering），步间用 `LoopLinkRelation.DELEGATE`（主链）或 `TRIGGER`（并行触发）连接。
- 运行时由编排器创建 **父运行**（`loopKind=EARTH`，definition=`builtin.compose.*`），子步继承同一 `correlationId`，父 `parentRunId` 指向父运行。
- 步间字段映射声明在 recipe 的 `fieldMap`：`{ "to": "from.path" }`；缺失字段尝试从语义别名表推断（标题/文本/路径等），不做黑盒 LLM 调用（V3 明确边界，本地模型适配留 V4）。
- 父运行成功条件：所有必选步骤 `SUCCEEDED`；任一步 `FAILED` → 父 `FAILED`；任一步 `INCONCLUSIVE` 且无失败 → 父 `INCONCLUSIVE`。
- 发现页可返回 `composition` 摘要（步骤数、验证器数），天回仍不可单独购买。

### 2. 真样板：文本精简地回 + 声明核验天回

- `builtin.earth.text.condense`：输入长文本与宣称压缩比，输出精简文本与实际压缩比。
- `builtin.heaven.validate.text_claim`：按契约 `claimSchema`（如 `minCompressionRatio`）核验实际结果；不合格 → `FAILED`，地回不得 `SUCCEEDED`。
- 用途：兑现「双重剥夺判断权」；后续可用同类模式替换为论文降重 + 查重天回。

### 3. 开放地回供给（首轮）

- 认证用户可创建 **EXTERNAL_API** 地回：`CapabilityEndpoint`（owner=USER）+ `LoopDefinition`（非 builtin）+ `LoopOffering`。
- 必须绑定至少一个 required 天回验证契约，否则不可 `ACTIVE`。
- 上架后健康未知；调用 `health-check`（复用 `endpoint_ping`）后才允许进入推荐池（`ONLINE`）。
- 首轮不开放 PLATFORM_HOSTED 用户部署、不计真实扣款；`pricePolicyJson` 只做报价预览。

### 4. 经济骨架

- 统一报价结构（回域）：`platformFeeRate` 默认 5%，`monitorFeeCapRate` 默认 1%，`verificationFee` 可配置。
- 验证 `FAILED`：写入 `SETTLEMENT_BLOCKED` 事件，并标记 offering 侧「本轮不可结算」；不改现有 Order 钱包主路径（影子优先）。
- 验证 `PASSED`：写入 `SETTLEMENT_ELIGIBLE`；真实扣款仍由后续 ADR 接管。

### 5. 语义 IO 文档

- 每个可编排定义必须提供可读 `ioDoc`（存在 definition.description 增强段 + schema `description`）。
- 公开 API 在 offering 详情返回 `ioDoc`，供对接师与未来本地模型读取。

## 非目标（V3 明确不做）

- 天天回 / 地地回 / 人人回降级直连。
- 真实算力计费、举报分账、封禁工作流。
- 用户任意托管代码到平台服务器。
- 通用多回暂停/恢复/补偿。

## 后果

- 新增服务：`composition`、`supply`、`loop-economy`；扩展 builtin 种子与执行器。
- Recipe 以代码种子 + 运行时 `LoopLink` 实现，**不新增 Prisma 核心表**（复用 V2 表）。
- `/loops/recommend` 与 `/loops/offerings/:id/run` 支持组合与样板；新增 `/loops/my-offerings*` 供给面。
- 前端：发现结果展示组合徽标；详情展示 ioDoc 与步骤；可选上架入口。
