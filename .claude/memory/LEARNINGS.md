# LEARNINGS

Append-only operational lessons to reduce repeated mistakes.

## 2026-07-28（前端性能）

- 懒加载路由的专属 CSS 必须由对应页面入口导入；仅拆 JS、不拆全局 `index.css`，冷启动仍会下载并解析无关页面样式。
- `visibility: hidden` 不会停止 WebGL Shader 或 `requestAnimationFrame`；不可见且不需要运行时应直接卸载/释放，或把动画速度严格设为 0。
- JSX 条件渲染不会自动拆包；Three.js 等重依赖必须放进动态 `import()` 的组件边界，才能做到真正按需加载。
- Recharts `ResponsiveContainer` 默认初始尺寸为 `-1 × -1`；已知桌面布局可提供合理的 `initialDimension`，避免首帧告警和无效渲染，再由 ResizeObserver 校正实际尺寸。

## 2026-07-28（金属描边时机）

- 金属描边 ≠ 常显品牌框：空闲只留玻璃细边；`active`/按下才出金属 rim。`metalGlow` 是能力开关，不是「永远发光」。
- 「有输入才激活主 CTA」：`active={Boolean(query.trim())}` 挂在搜索/寻找回等确认钮；分段 Tab 仍只给选中项 `active`。

## 2026-07-28（全局选择按钮）

- 主 CTA / 搜索确认 / 提交：优先 `LiquidMetalButton`；封装入口（`DlpBtnPrimary` / `SettingsActionButton primary` / `AcetPrimaryButton`）一并改，避免业务页各写一套实心蓝。
- 复杂 children 或表单内小钮可先 CSS 玻璃化（`ws-btn--primary`、`psa-search__go`）；`liquid-glass-global.css` 对 `.bg-accent`/`.bg-primary` 按钮做兜底，但 **destructive/danger 必须排除**。
- `AcetPrimaryButton` 曾用 `--primary-gradient` 实心渐变，是订单/费用确认漏网之鱼；改封装比逐页替换更稳。

## 2026-07-28（加载灰条）

- `LoadingState variant="internal"` 禁止再用 `internal-list-card`（氛围玻璃会渲成刷新时左侧灰条）；默认延迟 200ms 再显示，快请求不闪。
- 列表页首屏 `loading` 应初始为 `true`，否则会先闪空态再闪骨架。

## 2026-07-28（订单/讨论吸纳）

- 对接系统「讨论」可先用圈子公告聚合出 `/discussions`，不要一上来新建 Topic 全栈；发布入口落到圈主 Home 发公告即可。
- 订单广场统计与角色筛选可先客户端过滤；列表 API 已按 role 分页时，统计另拉一份「全部角色」以免口径漂移。

## 2026-07-28（圈子广场对齐）

- 对接系统圈子广场可借鉴布局（推荐大卡 + 三列网格 + 筛选排序），但九木 `Circle` 无 `category` 字段时勿硬造后端；用名称启发式主题标签即可，真分类再加 migration。
- `GET /circles/public` 要排除「已加入」必须挂 `optionalAuthMiddleware`，否则 `req.user` 永远为空、排除逻辑失效。

## 2026-07-28（发布候选收口）

- 订单“prepay”只预扣服务费，服务本金在发布需求时已托管；FeeQuote/UI 必须分开显示 `heldAmount` 与 `totalDue`，否则会让用户误以为重复扣款。
- 资金 quote 必须由服务端签名并覆盖状态、价格、公益口径、paidAt 与部分完成提议；执行前重算，不匹配返回 `FEE_QUOTE_CHANGED`。
- 单进程 Map 不可承载生产验证码或调度互斥；验证码需持久化、哈希、限频、限次、单次消费，轮询调度需数据库租约。
- `Review.orderId @unique` 只允许单向评价；双向评价唯一键应为 `(orderId, reviewerId)`。
- “真实生活地回”必须有真实 endpoint、验证、回退和有效用户样本；平台内部字段处理不能改名冒充 Phase 4。

## 2026-07-28

- 产品时间主权 Phase 2：Quiet 必须幂等（`resourceType+resourceId` 唯一）；`quietTaskSafe` 失败不得阻断订单/回/需求主路径；决策层除 `intent.taskQuiet` 外还要查 `TaskQuietRecord`。
- Phase 2 注意力清理只改语义文案与展示权重，不删 Follow 表/API；粉丝数对外弱化为「有/无」，禁止「关注/粉丝比」类炫耀指标。
- 产品时间主权 Phase 1B：`canTakeOverNotificationTraffic(eventType)` 白名单接管；Demand/AgentTask 成功投递必须落站内 Message；迁移脚本默认 dry-run；`receivePushes=true` 只作排除建议。
- 产品时间主权 Phase 1A：通知表只增迁移；决策服务默认非必要 OFF；preview 必须零副作用；`NOTIFICATION_SOVEREIGNTY_ENABLED=1` 仍禁止接管 legacy 发送（Phase 1B）。
- `receivePushes=true` / 无 PushPreference **不得**映射为正向订阅；仅 `UserTag.autoReceive` 与启用且含 MESSAGE 的 AgentTask 可作为明确意图（本轮只写映射函数，不执行迁移）。
- 产品时间主权 Phase 0：`NODE_ENV=production` 时强制不挂 `/api/shorts`，开发仅 `ENABLE_LEGACY_SHORTS=1`；Accepted 规格不自动授权云端部署。
- `PushPreference.receivePushes` 默认 true / 无记录全接受，**不得**映射为 NotificationSubscription 的永久开启；Phase 1 须正向订阅重建。
- 注意力审计默认 WARN（CI）；`ATTENTION_AUDIT_STRICT=1` 才因明确机制词失败。基线脚本只输出聚合，不读排除词/媒体/正文。
- 「看不见 UI」全站策略：`styles/liquid-glass-global.css`（须在 `index.css` 之后加载）。氛围开启时重映射 `--bg-card` / `--internal-*` 等为半透明，页壳透明，表面补 blur；禁止再给壳写实色。仅 `/` 与 `/discover` suppress 氛围。
- 「看不见 UI」：收纳壳禁止 `var(--bg-primary|card|secondary)` 实色；页底透明，块面只用 `--liquid-glass-*`。回中心 `my-loops` / `loop-query-form` 曾因 `--loops-bg: var(--bg-primary)` 整页炭黑。
- 全站页面氛围必须用浅/深固定图（`THEME_AMBIENT_BG`），禁止绑用户 `coverUrl` 或按 userId 抽卡面预设；个人主页有封面才覆盖。
- 液态玻璃「收纳」必须全局：Layout 默认开主题氛围（`data-layout-ambient`），壳层透明；只对星空/独占背景页 suppress。逐页改玻璃会因实色底/冲突 CSS 立刻回灰白板。
- `backdrop-filter` 父级若有 `will-change: transform` / `isolation: isolate` 会让玻璃看起来像实色；收纳瓷砖用 `isolation: auto`。
- 交易可信度 ADR 在 Accepted 前若存在资金守恒、operationKey 事务语义、幂等租约、状态自洽、前端 key 契约任一项未钉死，必须保持 Proposed 并改文档，禁止开工实现。
- 部分完成不得直接 `settleDemand`（会整笔 consumeHold）；须拆分托管并满足「期末可用+HELD+对方入账+平台收入 = 期初可用+HELD」。
- 交易可信度改代码前必须先冻结 ADR（`docs/specs/ORDER-TRANSACTION-TRUST-ADR.md`）：部分完成与全额完成一样走双方确认；确认前禁止 settle/建剩余需求/hold；资金写路径要 Idempotency-Key + ledger operationKey + 条件状态更新。
- P0：匿名运维写口（`/api/health/restart|start-all`、`/api/tag-stats/refresh`）必须管理员鉴权；生产应彻底禁用 health-actions，容器健康检查只用 `/api/health/live`，勿在 Alpine 里跑 Windows `sc`。
- Express 静态段路由（如 `/messages/unread-count`）必须注册在动态段 `/:userId` 之前，否则会被吞掉且难从业务日志发现。
- pnpm monorepo 的 server Dockerfile 生产阶段不可用根 `package.json` 覆盖 `server/package.json`，否则会丢 Express/Prisma 等后端依赖；应保持 workspace 布局并对 `--filter server --prod` 安装。
- Windows 上 Vite watch `public/fonts/*.woff2` 可能 `EBUSY` 直接崩掉 client-react；表现常是懒加载页 `Failed to fetch dynamically imported module`。应在 `vite.config.ts` 的 `server.watch.ignored` 排除 `**/public/fonts/**`，崩后需重启 `pnpm --filter client-react run dev`（端口常 3080）。
- Material Symbols 外链全量字体 + 超时强制 `ms-icons-ready` 会露出 ligature 原文；应同源托管精简 woff2，且仅在 `fonts.load` 成功后显示图标。
- 主题默认值若同时写在 `index.css`（如 `#007AFF`）与 `theme.ts` / `design-tokens`（九木青），hydrate 前会闪色；FOUC 脚本 + CSS 默认值必须与 runtime preset 同源。
- 桌面侧栏「固定」与沉浸页收起冲突时，用临时 `immersiveStowed` 覆盖 pin，而不是改写 localStorage 里的 pin 偏好。

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

## 2026-07-28

- `MsIcon` 依赖 Material Symbols ligature：若 `ms-icons-ready` 在字体未就绪时超时强制加上，会持久显示 `edit_document` 等英文名。勿用「失败/超时也 ready」；图标字体应同源托管，且 `@font-face` 必须写在 head 里、早于 `document.fonts.load`。
- Google Fonts 全量可变 Material Symbols 可达 ~4MB；桌面端优先用固定 opsz/wght 的 ~320KB woff2。
