# SESSION ANCHOR

## Profile 个人中心（2026-07-28）

- `client-react/src/views/Profile.tsx` 已重构为封面身份区、五项概览与服务工作台。
- 顶部标题栏只保留返回与“个人中心”文字，背景透明。
- 概览、业务面板、收藏区与右上菜单复用 `liquid-glass-surface` 高透明液态玻璃。
- **左侧全局导航必须保留**：禁止在 Profile 挂 `profile-workspace-active` 或通过页面 CSS 隐藏 `.app-sidebar`。
- 验证：`typecheck:client`、Profile 定向 ESLint 通过；浏览器确认侧栏 `display:flex`、宽 56px，页面无新增 console error。

## Intent（2026-07-28 前端性能评估与优化：已完成）

本轮针对 `client-react` 的冷启动延迟、滚动卡顿和稳定态性能开销做了生产构建实测与外科手术式优化，未改业务契约、未提交。

### 已完成

- Sentry 改为配置存在时动态加载，错误上报按需加载；`Profile`、`Settings` 路由懒加载。
- Agent、消息、需求工作区、钱包、税务、路径、认证、回中心等页面 CSS 从全局入口拆为随路由加载。
- 卡池 3D 开包体验拆到 `PackOpeningExperience` 动态模块，卡池入口不再直接加载 Three.js。
- `LiquidMetalButton` 在 `showMetalGlow=false` 时直接释放 Shader，不再用隐藏 canvas 持续跑 rAF；现有默认金属契约未改变。
- Material Symbols 使用 `font-display: swap`，删除重复 Inter 外链导入。
- 税务图表补稳定初始尺寸，Recharts `width(-1)/height(-1)` 告警已消失。

### 生产实测结果

- 主 JS gzip：289.96 KB → 212.75 KB（-27%）；全局 CSS gzip：97.36 KB → 67.73 KB（-30%）。
- 卡池入口 gzip：72.44 KB → 5.11 KB；Three.js 仍为 184.30 KB gzip，但仅在真正开包时加载。
- 登录页冷启动：FCP 924 ms → 784 ms；传输 734 KB → 652 KB；解压资源 1.95 MB → 1.56 MB；空闲 canvas 数为 0。
- 税务页冷启动：FCP 596 ms → 484 ms；传输 978 KB → 922 KB；JS 堆 40.7 MB → 22.3 MB。
- 税务页稳定 3 秒 TaskDuration：约 537 ms → 22 ms；滚动 P95 6.2 ms、最大 6.3 ms、无 >50 ms 卡顿；稳定态无长任务。

### 验证与已知阻断

- 定向 ESLint 通过；直接 Vite 生产构建通过；浏览器最终 warn/error 日志为空。
- 正式 `pnpm --filter client-react run build` 仍被仓库既有 TypeScript 错误阻断，错误集中在 `api/agent.ts`、旧认证演示、旧 CardPool/Recharts 类型等，本轮新增模块未引入新的报错。
- 生产预览 4173 已关闭；原有开发服务未停止。

## Previous Intent（2026-07-28 用户最高优先级新指令：已反转旧约定）

**金标准组件**：`client-react/src/components/ui/liquid-metal-button.tsx`（`LiquidMetalButton`）。
**金标准调用点**：`client-react/src/views/PublishPage.tsx`「开始用 AI 整理」——`<LiquidMetalButton label="开始用 AI 整理" fullWidth height={48} onClick={...} />`，无 `active`/`metalGlow` 覆盖，纯默认态。

用户原话：「去找这个组件的源代码，完全以他为标准」→ 已改组件默认，**不再逐页调**：

1. `metalGlow` 默认 `true` = 空闲即常驻铬/金属折射描边（旧「空闲无金属」约定已废弃）。
2. `active`/`isPressed` 不再决定描边是否出现，只提升强调程度（加粗文字/动效速度/阴影）。
3. **2026-07-28 晚**：已彻底移除 `cssRim` 旧 CSS 描边途径与 `SegmentedFilter` classic 变体。分段 Tab：`metalGlow={active}`——选中有金属边，未选中无边框（flat 去 glass-core border）。icon 圆钮也改 none+圆角，避免 circle shader 发虚成「白边旧按钮」。

## Done

### 组件契约（已更新，见上方 Intent）
- `LiquidMetalButton`：`showMetalGlow = Boolean(metalGlow)`（默认 `true`，不再看 `active`/`isPressed`）
- `SegmentedFilter`：显式 `metalGlow={active}` 收窄为仅选中 Tab 出现描边
- `DlpBtnPrimary` / `AuthPrimaryButton`：支持/透传 `active`（仅影响强调程度，不再影响是否出现描边）

### 有输入 → 激活主 CTA
- `LoopDiscoverPage`：「寻找合适的回」`active={Boolean(query.trim())}`
- `search-bar` / `DlpSearchBar`：有字时搜索钮 `active`
- `CircleHubHelp`、`Providers`、`PathSearchPage` go、`ChatDetail` 举报提交、`NewGroupChat` 完成

### 金属描边范围边界（重要教训，已定案）
- **金属只出现在按钮/CTA 上，绝不出现在输入框/搜索栏的外框（容器边框）上。**
- 曾短暂尝试给 `.dlp-search-bar` 整栏加 `LiquidMetalFrame`（铺满容器的 shader rim），用户截图反馈：整条搜索框外缘出现锯齿/彩虹金属边，明确纠正「只需要给搜索按钮加金属，不是给搜索框」。已完整回滚：删除 `LiquidMetalFrame` 组件（`liquid-metal-button.tsx`）、`DlpSearchBar` 里的 `<LiquidMetalFrame>` 用法与 `dlp-search-bar--metal` 相关 CSS。
- 现状（正确）：`DlpSearchBar` 外框 `.dlp-search-bar` 是普通玻璃细边（`border` + `:focus-within` cyan glow），**不带任何 shader/金属**；只有右侧「搜索」`LiquidMetalButton` 在 `hasValue` 时 `active`。`search-bar.tsx`（`SearchBar` 组件）同理：外层 `div` 用普通 Tailwind border，只有内部「搜索」`LiquidMetalButton` 承担金属。
- 教训：不要为了让「有字→金属」更醒目就把 shader 铺到整个容器；金属描边是按钮/CTA 的强调语义，不是输入框装饰。

### 宽扁 pill（SegmentedFilter）金属描边彩噪 → 曾用 `fullWidth` 一刀切关 WebGL → 引发全站金属按钮回归（已修复，教训见下）
- **第一次现象**：`/circles`「我的圈子」「发现圈子」两个 `SegmentedFilter` pill 描边处出现红蓝彩噪/锯齿。
- **根因**：`liquid-metal-button.tsx` 中 `fullWidth`（`SegmentedFilter`/全宽 CTA 共用同一个 prop）会把 `shaderShape` 设为 `LiquidMetalShapes.none`。该 shader 分支按 `pixel_thickness = min(250/canvasPx, 0.5)` 逐轴计算边框厚度；分段 Tab 高度只有 36–44px，y 轴恒被 clamp 到 0.5，导致"边框"渐变横跨整个高度而非贴边细线，配合色散动画出现红蓝彩噪。
- **第一次修复（错误，已撤销）**：把 `useCssRim` 直接绑定到 `fullWidth`，导致**所有** `fullWidth` 按钮（不只 `SegmentedFilter`）都被强制改成纯 CSS 描边——登录主按钮 `AuthPrimaryButton`、`LoopDiscoverPage`「寻找合适的回」、`ServiceCardDetail`/`confirm-dialog`/`new-group-dialog`/`PublishPage` 等全宽 CTA 全部失去正常 WebGL 金属描边。用户反馈「你成功把所有金属按钮全修坏了」。
- **教训（重要，勿重犯）**：`fullWidth`（是否占满容器宽度的布局语义）和「是否该用 CSS rim 兜底花屏」（`SegmentedFilter` 矮扁形态特有的视觉退化）是两件不相关的事，**不能用同一个 prop 判断**。之后任何类似"某类特殊场景要豁免"的需求，禁止用已有的通用布局 prop（如 `fullWidth`/`className` 正则匹配等）去动态推断，必须用**显式、独立、默认关闭**的新 prop，且只在真正需要豁免的那一个封装/调用点传入。
- **最终修复（组件级，正确）**：新增独立 prop `cssRim?: boolean`（默认 `false`）。`useCssRim = cssRim`（不再看 `fullWidth`）。只有 `internal-ui.tsx` 里 `SegmentedFilter` 的 `<LiquidMetalButton>` 调用显式传 `cssRim`；其余所有 `fullWidth` 用法（无论现在还是将来新增）默认自动恢复正常 WebGL 金属描边，无需逐页改动。
- **改动文件（仅两处，符合"只修共享组件"约束）**：
  - `client-react/src/components/ui/liquid-metal-button.tsx`：加 `cssRim` prop + JSDoc，`useCssRim = cssRim`。
  - `client-react/src/components/layout/internal-ui.tsx`：`SegmentedFilter`（liquid-metal 变体）的 `<LiquidMetalButton>` 调用加 `cssRim`。
- **验证**：硬刷新后抽查 `/login` 主按钮、`/search`（有字后「搜索」）、`/loops/discover`（有字后「寻找合适的回」）——应为正常 WebGL 金属描边（非纯色渐变流光）；`/circles`、`/orders`、`/my-demands` 的 `SegmentedFilter` 选中 Tab 仍是 CSS 流光描边、无红蓝彩噪。

## Verify

1. `/loops/discover`：输入「999」→「寻找合适的回」出金属边；清空后消失
2. `/search`：硬刷新（Ctrl+Shift+R）后输入任意字符 →**只有**右侧「搜索」按钮出现金属描边，**外框始终是普通玻璃细边**（无锯齿/彩虹边）；删空文字 → 按钮金属消失、变 disabled
3. 分段 Tab：仅选中有金属边；空闲 CTA 无金属（按下才有）

## Next

- 已修：`ChatDetail.tsx` 消息发送圆钮、`profile-edit-dialog.tsx`「保存」→ 换成 `LiquidMetalButton`（原实心蓝 `msg-composer__send--active` / `profile-edit-dialog__save`）
- `Circles.tsx` 刷新钮/创建圈子/SegmentedFilter 已是 LiquidMetal，无需改
- 未查：Login.tsx 表单 submit 按钮（已是玻璃态非实心，未换成组件，风险为原生 form submit 行为，暂缓）
- 未要求不提交

## Do NOT

- 不再逐页手调样式去凑「开始用 AI 整理」的效果——只改 `liquid-metal-button.tsx` 组件层，调用方自动继承
- 不改危险/destructive 按钮语义
- **不给输入框/搜索栏等容器外框加金属描边（LiquidMetalFrame 类实现）；金属只属于按钮/CTA**
- **不用通用布局 prop（如 `fullWidth`）去动态判断"是否该用 CSS rim/特殊豁免"；`SegmentedFilter` 花屏豁免只能用独立的 `cssRim` prop，只在其自身调用点传入，不影响其它 `fullWidth` 按钮**
- **金属相关问题优先只改 `liquid-metal-button.tsx`（组件级）；调用方已使用该组件即自动受益，禁止逐页改 Login/Search/LoopDiscover/Circles/Orders 等按钮**
