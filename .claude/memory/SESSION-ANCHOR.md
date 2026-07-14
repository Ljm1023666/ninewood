# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

落地统一卡片体系：需求卡保留原链路，新增服务卡、经验聚合、统一检索和消息卡片附件；同时保留已完成的 `/loops` 回运行中心。

## Changes Made

- `server/src/services/loop/loop-run.service.ts`: 增加按用户汇总回运行、进度和分区统计。
- `server/src/services/loop/offering.service.ts`: 用户运行能力时创建 LoopRun，并记录开始/结果/失败事件。
- `server/src/routes/loop.ts`: 新增鉴权接口 `GET /api/loops/runs/mine`。
- `client-react/src/views/loop/MyLoopsPage.tsx`: 新增 `/loops`，支持天地人单区、并列、横纵排列、比例滑块和排序。
- `client-react/src/components/layout/Sidebar.tsx` / `router/index.tsx` / `index.css`: 增加导航入口、路由和样式导入。
- `server/src/services/loop/offering-run.service.test.ts`: 补充 LoopRun mock，保持运行能力单测覆盖。
- `server/prisma/schema.prisma` / `server/prisma/migrations/20260712190000_add_service_cards/migration.sql`: 新增 ServiceCard、Claim、Evidence、CardAttachment 模型及迁移。
- `server/src/services/service-card.service.ts` / `server/src/routes/service-card.ts`: 服务卡 CRUD、发布/下架、所有权校验、公开详情与经验接口。
- `server/src/services/service-card-evidence.service.ts`: 已完成订单按需求标签/路径匹配服务卡声明，异步更新公开聚合事实。
- `server/src/routes/card-search.ts` / `client-react/src/api/card-search.ts` / `client-react/src/views/Search.tsx`: 需求卡/服务卡统一结果和需求者/服务者排序偏好。
- `server/src/services/card-attachment.service.ts` / `server/src/routes/message.ts` / `client-react/src/views/ChatDetail.tsx`: 卡片附件权限校验、发送时快照和会话渲染。
- `client-react/src/views/PublishPage.tsx`, `ServiceCardCreate.tsx`, `ServiceCardsPage.tsx`, `ServiceCardDetail.tsx`: 统一发布入口、我的服务卡和服务卡详情状态。
- `docs/specs/DEMAND-SERVICE-CARD-ADR.md`: 记录领域边界、权限、聚合和迁移策略。

## Decisions

- 天地人按 `LoopRun.loopKind` 分区；查看、排序、调布局不会改变回的类型。
- `/services` 继续表示能力目录；`/loops` 表示与当前用户有关的运行实例。
- 用户运行能力现在进入 LoopRun 轨迹，便于回中心显示阶段和结果。
- `Demand` 与 `ServiceCard` 保持独立生命周期；统一检索只通过 `resultType` 和身份偏好连接两类卡片。
- 服务卡经验只消费 `OrderStatus.COMPLETED` 聚合事实，消息附件保存不可变快照，卡片编辑不回写历史消息。

## Active Issues

- 全量前端 lint 仍有仓库既有错误；本次修改文件的定向 eslint 已通过。
- 并列比例当前是独立滑块，未做自动归一化；调试阶段先保留可观察性。
- 天回周期能力现在只做真实检测/上报，订单结算、福利发放、推送和任务调度等主流程仍由原业务调度器执行，避免看板伪装成事务执行器。
- 资源型天回已接入需求创建、卡片附件发送、订单确认三个触发点；计数看板按真实 `LoopRun` 状态计算，不再使用演示计数。
- 天回播种按 `definitionId` 幂等，并会合并热重载产生的重复上架物；服务可用性检测不再把所有平台接口盲写为 ONLINE。
- `/publish` 已重做为两栏发布方向选择工作台，保留需求卡/服务卡模式切换与 AI 发布入口，减少嵌套卡片和重复文案。
- Stitch 项目 `projects/144940796668441751` 已生成“发布工作台”桌面设计，实际页面按 Ninewood Industrial Intelligence 设计系统落地为黑白工业风、锐利边框和两步流程。
- `/publish` 在保持 Stitch 视觉语言的基础上增加了 AI 整理字段和三步工作流预览，缩小顶部空白并提高桌面端信息密度。
- 根据实际截图继续修正 `/publish`：移除 `max-w-6xl` 宽度限制，改为填满主栏；扩大标题、正文和选项行，降低小字密度，避免右侧空白。

## Next Steps

1. 登录后打开 `/publish`，创建并发布一张服务卡，验证 `/my-service-cards` 和公开详情。
2. 用需求者/服务者身份在 `/search` 搜索同一关键词，验证需求卡与服务卡类型区分和排序。
3. 从服务卡详情进入咨询，验证消息保存卡片快照；编辑服务卡后历史消息内容不变。
4. 完成一个订单后验证对应 claim 的 ServiceCardEvidence 更新，并确认订单-钱包资源天回产生 LoopRun。

