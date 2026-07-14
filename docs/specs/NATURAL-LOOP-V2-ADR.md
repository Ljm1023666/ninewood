# ADR · 自然回 V2：统一回中心与可验证运行

> **状态**：Accepted  
> **日期**：2026-07-14  
> **取代**：`docs/archive/specs/NATURAL-LOOP-ADR.md`（V1，已归档）  
> **最高产品准则**：`docs/回的理念.md`

## 背景

旧实现把“路径检索”“找服务”“回日志”拆成三个相互竞争的入口，并把回降格成后台记录。它无法直接表达《回的理念》要求的完整闭环：需求被理解、地回执行、天回验证、结果可追溯；找不到机器闭环时，也缺少诚实的人回回退。

## 决策

1. “回”是用户可见的核心产品概念，统一承载发现、执行、验证和运行历史。
2. 用户主链固定为：`需求表达 → 地回推荐 → 执行 → 天回验证 → 运行详情`。
3. `/loops/discover` 面向需求者；`/loops/mine` 展示与当前用户有关的全部人回、地回、天回；`/loops/accept` 保留服务者承接人回所需的路径检索。
4. 发现结果只允许可执行、端点在线、具备必要验证契约的 `EARTH` offering。`HEAVEN` 只在验证链和运行状态中出现，不作为可购买方案。
5. 地回执行器只能提交输出，不能宣布闭环成功。全部 required 天回通过后地回才进入 `SUCCEEDED`；明确不合格为 `FAILED`；异常、跳过或无法判断为 `INCONCLUSIVE`。
6. 每次必要验证必须创建真实 HEAVEN `LoopRun`，以 `parentRunId`、同一 `correlationId` 和 `LoopLink(VERIFY)` 连接父地回。
7. 无合格地回时生成本地人回草稿，必须由用户在现有 Demand 发布流程中确认，不得静默发布。
8. Demand/Order 暂时保留为 HUMAN 回的内部实现，以渐进接管降低迁移风险；首轮不开放普通用户发布地回。
9. 对外指标遵循最小披露：成交率和耗时可空；成功率只在 `successRatePublic=true` 时连同样本量公开，否则统一显示“验证适配中”。

## 状态与权限

地回正常状态链为：

`TRIGGERED → EXECUTING → VERIFYING → SUCCEEDED`

执行失败或验证不合格进入 `FAILED`；验证异常进入 `INCONCLUSIVE`，原发起者可以幂等重试验证。运行详情对发起者、关联 Demand/Order 参与方和管理员开放；天回继承父回可见性。

## 兼容与后果

- 旧 `/services*`、`/path-search` 和 `/loops?...` 保留为带查询参数的重定向。
- 不新增核心 Prisma 表，复用已有 LoopDefinition、LoopRun、LoopLink、VerificationRun。
- 旧演示指标只在整组值仍与已知 seed 元组完全一致时清理，之后不再持续回写。
- 暂停、恢复、通用补偿、第三方设备、真实计费和多回编排留待后续 ADR。
