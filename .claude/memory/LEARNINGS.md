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

## 2026-07-14

- HD 画廊纹理若在 GPU `useTexture.preload` / Canvas 仍引用时立刻 `revokeObjectURL`，会抛出 `Could not load blob:` 并冒泡成路由级白屏。必须先发布新 URL、作废预载队列，旧 blob 延后回收；并为画廊加 ErrorBoundary。
- 浏览画廊期间热换 HD 纹理会导致卡面错位；HD 应在离开画廊后再启动。

## 2026-07-14

- 开包/3D 画廊若硬编码 `#000` + Tailwind `dark:`，会跟 OS 偏好而不是 `data-appearance`；控件可能在黑场上消失。舞台色必须用跟随 App 主题的 `--pack-stage-*`。
- 底弧滚轮若用 `setState(wheelScroll)` 驱动 20 路 Framer spring，会整页重渲；circle 阶段应与 falling 一样走 MotionValue。
- `prefetchPackGallery` 已存在但未接入会导致冷启动必等 API+纹理；加手牌时应立即预取，快纹理 ready 后勿再 defer GPU 预载。
- `ready:true` 且 `items:[]` 时 Canvas 不挂载，`onSceneReady` 永不触发 → 永久「正在初始化场景」；必须超时/空纹理回退。

## 2026-07-14

- 顶层文档会互相污染新会话（Roadmap / 冻结 Task handoff / 旧 ADR）。过期主线、已完成 Stage·Task、一次性报告应迁入 `docs/archive/`，并用 **全 AI 工具**忽略机制阻断：权威清单 `.llmignore` → `node scripts/sync-ai-ignores.mjs` 同步到各工具 ignore；Claude Code 加 `permissions.deny`；行为层靠 `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md`。勿只配 `.cursorignore`。
- 自然回现行权威是 `docs/回的理念.md` + `NATURAL-LOOP-V2-ADR.md`；勿再默认打开已归档的 `NATURAL-LOOP-ADR.md` 或 Task-12「找服务」终态叙事。
- `CLAUDE.md` / `MEMORY.md` 的包管理与仓库路径若与 `AGENTS.md` 冲突，以 `AGENTS.md` + `README.md`（pnpm）为准并应立即对齐，否则协作纪律名存实亡。


## 2026-07-14

- 前端页面 Stitch 设计稿、风格变体 PNG、毕设演示截图与根目录预览 HTML 应归入 docs/archive/designs/，勿留在 docs/ 顶层；运行时资源才放 client-react/public/stitch/。
- 归档后一次性拉取脚本需同步迁入并修正相对路径（脚本位于 `docs/archive/designs/_fetch-scripts/` 时，输出目录应相对该归档树，而非再拼 `docs/...`）。
- 全仓上下文治理不能只排除 `docs/archive/**`：代码归档、二级会话日志、重复工具树、`.env`、上传、临时输出和含部署密钥的文档也必须进入 `.llmignore`；但 Vitest、CI、package script 与运行时资源必须先以调用链为准保留。
- 任何会自动注入会话的工具记忆，若不再维护为权威事实，就不能留在根目录：应归档并从注入路径移除。一次性诊断报告同样应归档，避免它的过期统计重新成为默认上下文。
- 设计规范以已落地的全局 CSS token 为准；当 frontmatter、正文和实现不一致时，重写过时正文并删除设计文档中的发布历史，发布记录只保留在 `docs/RELEASE-NOTES.md`。
- 认证页的视觉重构必须把业务状态机与展示层分开：可替换背景、导航、字段外观和动效，但不得改变验证码、合规同意、年龄校验与法律弹窗的触发条件。

## 2026-07-15

- 香港 ECS 公网约 1 Mbps 时，封面原图 1.5–2MB 体感「十几秒」；同素材 `covers-detail`/`thumb` 约 100KB/25KB，免费侧应默认走 display 档 + nginx 直出缓存，勿擅自点阿里云「立即支付并更改」。
- Profile 开屏若直接绑 `user.coverUrl`（`/uploads/covers/*` 原图），会成为首屏最大阻塞；须走 `toPreferDetailCoverUrl` + `DisplayCoverPicture`（AVIF/WebP）。
- 3D 画廊 `upgradeCardCoverUrlForGallery` 拉原图在窄带上得不偿失；统一 detail 足够纹理清晰度。
