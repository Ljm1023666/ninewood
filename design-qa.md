# 路径检索 V3 — Design QA

## 对照基准

- 参考图：`C:\Users\19617\AppData\Local\Temp\codex-clipboard-9618cad8-ba6a-4dd6-aa06-d2a242808df0.png`
- 实现页面：`/loops/accept?q=打野`
- 验证视口：1920×1080、1440×900、1280×800（Windows 桌面）

## 视觉差异审查

| 优先级 | 初检问题 | 修正结果 |
| --- | --- | --- |
| P1 | 搜索装置受旧样式上限影响，视觉权重不足 | 提升至内容区约 72–82%，补齐厚玻璃内高光、折射边、抛光金属环与底部暗部 |
| P1 | 旧三栏网格残留第三列，轨道和控制台右侧出现空白色块 | 强制两列控制台与跨列轨道，恢复连续仪表台结构 |
| P1 | 活动服务匣受旧定位影响偏左 | 将活动项锁定轨道中心，相邻项按 63% 位移、0.78 缩放露出 |
| P2 | 相邻服务匣过暗，像不透明色块 | 移除旧 dim 滤镜，以低透明度和轻微去饱和表现层级 |
| P2 | 搜索按钮仍使用流程箭头 | 改为钴蓝搜索图标，强化“搜索装置”语义 |
| P2 | 顶部技术性 kicker 抢占标题层级 | 隐藏 kicker，保持标题、搜索装置、结果匣三级焦点 |

## 工程与交互检查

- 页面使用真实 DOM；未使用参考图作为背景，未使用 Canvas 或 SVG 假界面。
- 结果由 `PathSearchItem[]` 数据驱动，中央项与相邻项共享 `PathSearchResultCard`。
- 搜索、清除、筛选、排序、详情进入继续使用既有 URL 状态与 API 契约。
- 结果轨道支持前后按钮与键盘左右方向键；切换更新活动服务匣。
- 所有新增按钮具备可见 hover、active、focus-visible；轨道带 ARIA 标签和 live region。
- 动画时长为 250–350ms，并通过 `prefers-reduced-motion` 降级。
- 三档桌面视口的 `scrollWidth === clientWidth`，无页面级横向溢出。
- 隔离 Chromium 中无 React/CSS 控制台错误。

## 最终结论

final result: passed
