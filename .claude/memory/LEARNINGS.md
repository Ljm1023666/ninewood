# LEARNINGS

Append-only operational lessons to reduce repeated mistakes.

## 2026-05-14

- Browser extension interference can make GitHub appear slow even when network/proxy settings are correct.
- `npx electron` may trigger on-demand binary downloads and fail under unstable network conditions.
- Using project-local Electron CLI (`node node_modules/electron/cli.js`) is more reliable for repeatable startup.
- For long troubleshooting sessions, keep a short artifact trail: changed files, key commands, exact errors, and final fix.

## 2026-07-12

- 运行实例中心应查询 `LoopRun`，能力目录 `/services` 与用户运行态 `/loops` 必须分开。
- 用户主动运行能力如果不创建 `LoopRun`，后续无法在「回」中心显示阶段、事件和成功统计；执行入口必须同步写入开始、结果或失败事件。
- 全量 eslint 受仓库既有错误阻断时，使用定向 eslint 验证本次修改文件，并在交付中明确区分两者。

## 2026-07-12

- Prisma `generate --no-engine` 会让正在运行的服务无法执行数据库查询；只可用于临时类型生成，运行前必须恢复普通 `prisma generate`。
- 迁移失败后不要直接标记 applied；先确认目标表是否存在，必要时清理错误迁移记录，再重新部署修正后的 SQL。
- 统一检索应在后端生成稳定的 `resultType` 投影，前端只负责显示类型差异和排序偏好，避免需求卡与服务卡各自请求造成排序不一致。
- 天回看板的成功率必须基于 `LoopRun` 的终态计数；不能把种子数据里的演示 `recentSuccessN` 与真实运行次数混算，否则会出现超过 100% 的成功率。
- 只统计资源而声称“自动结算/发放/推送”会造成能力语义失真；如果主流程由既有调度器执行，天回应明确命名为检测并通过资源写入点记录真实校验运行。
- 按展示标题查找天回上架物不具备幂等性：启动时更新标题后下一次会重新创建；应按稳定的 `definitionId` 查找，并清理重复上架物。
- 发布入口应只承担方向选择和预期说明，复杂字段与 AI 对话放入下一步工作区；避免在入口重复展示完整表单信息和多个同级 CTA。
- 使用 Stitch 时先复用已有项目和设计系统，再把生成结果映射到现有路由与交互，避免只生成静态稿而丢失业务行为。
- 桌面端工作台过空时，优先增加与当前决策直接相关的结构化信息和流程预览，而不是单纯放大容器或堆装饰。
- 实际截图验收必须检查页面是否被 `max-width` 意外限制；桌面工作台通常应优先填满主栏，再用列比例控制层级。

