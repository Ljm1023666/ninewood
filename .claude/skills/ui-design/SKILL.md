---
name: ui-design
description: >
  组件设计品质规范。触发时机：新建/修改 UI 组件、调整样式、做布局决策、评审界面。
  覆盖间距节奏、色彩约束、动效标准、状态覆盖、响应式与触摸。
  每次改动前自查，改动后复审。
---

# UI Design SKILL

以下规则是强制性约束，不是建议。每一行都可以在代码审查时直接对照检查。

## 1. 间距节奏 — 4px Grid

**所有 padding / margin / gap / border-radius 必须落入 4px 倍数：**

```
允许: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80
禁止: 5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 33, 34, 35, 37, 38, 39

例外:
- line-height 可用无单位数字（1.4, 1.5, 1.6）
- font-size 可用 13, 14, 15 等（文字大小走 typography scale）
- 1px 边框、2px 光晕、3px 进度条等语义化极细线
- transform / transition 数值
```

**层级间距语义（函数式命名）：**

| 标记 | 值 | 用途 |
|---|---|---|
| xs | 4px | icon 与文字间、tag 内边距 |
| sm | 8px | 紧凑行内间距、按钮内水平 |
| md | 12px | 卡片内间距、列表项纵向 |
| lg | 16px | 区块内间距、输入框 padding |
| xl | 24px | 区块间间距、页标题下 |
| 2xl | 32px | 大区块分离、Hero 下 |
| 3xl | 48px | 页面级分隔 |

违反示例：`padding: 10px 15px` → 必须改为 `padding: 12px 16px`

## 2. 色彩 — Token 优先

**禁止在组件 scoped style 中裸写 hex 颜色。** 必须使用项目 token：

```
正确:
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border-color);

错误:
  color: #e0e0f0;
  background: #1a1a2e;
```

**新增语义色必须先在 global.css :root 中定义 token，再引用。**

**色彩使用层级：**

| 用途 | Token |
|---|---|
| 主要内容文字 | `--text-primary` |
| 辅助说明文字 | `--text-secondary` |
| 弱化/占位文字 | `--text-muted` |
| 禁用文字 | `--text-disabled` |
| 主背景 | `--bg-primary` |
| 次级背景（卡片/面板） | `--bg-card` |
| hover/active 按压态 | `--bg-tertiary` |
| 成功 | `--success-color` |
| 警告 | `--warning-color` |
| 错误 | `--error-color` |

**渐变使用：** 仅用于 Hero 标题、主按钮、品牌光晕，禁止用于正文。

## 3. 圆角 — 统一语义

| 尺寸 | 值 | 场景 |
|---|---|---|
| sm | 8px | 按钮、输入框、标签、小卡片 |
| md | 12px | 卡片、面板、弹窗 |
| lg | 16px | 大卡片、抽屉 |
| full | 9999px / 50% | 头像、徽章、药丸按钮 |

同一个元素的内外圆角必须协调：如果卡片是 12px，内部图片用 8px。

## 4. 动效 — 必须有曲线

**禁止 `transition: all 0.2s`。** 必须指定属性 + 缓动函数：

```
正确:
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

错误:
  transition: all 0.2s;
```

**预设缓动（来自项目 token）：**

| Token | 用途 |
|---|---|
| `var(--transition-fast)` 0.15s ease | hover 颜色变化、icon 切换 |
| `var(--transition-normal)` 0.3s ease | 卡片 hover、面板展开、模态进出 |
| `cubic-bezier(0.4, 0, 0.2, 1)` | 位移动效（slide-up/down、expand） |
| `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | 入场动效（fadeIn、scaleIn） |

**动效时长上限：** 入场 ≤400ms，出场 ≤300ms，hover ≤200ms。超过即拖沓。

**触感动效：** 按钮/列表项必须设 `:active` 态，用 `transform: scale(0.97)` 或 `brightness(0.9)` 反馈按压。

## 5. 状态覆盖 — 四态必修

每个展示组件 **必须覆盖** 这四种状态：

```
1. loading  — Skeleton / Spinner
2. empty    — 空状态插图 + 引导语 + 可选 action 按钮
3. error    — 错误信息 + 重试按钮
4. normal   — 正常数据展示
```

如果组件不覆盖 loading / empty / error 中的某一态，必须在 code review 中说明原因。

**边界态额外检查清单：**
- 文本过长 → `text-overflow: ellipsis` 或 line-clamp
- 图片缺失 → 显示首字母/默认图
- 数字溢出 → 超过 999 显示 "999+"
- 列表为空 → EmptyState 组件，不可白屏
- 网络失败 → ErrorState + retry

## 6. 响应式 — Mobile First

**CSS 用 min-width 断点，从移动端起写：**

```css
/* 移动端默认 */
.card { padding: 12px; }

/* ≥768px */
@media (min-width: 768px) { .card { padding: 16px; } }
```

**断点（复用项目现有）：**

| 断点 | 场景 |
|---|---|
| 默认 | 手机竖屏（<768px） |
| 768px | 平板 / 小桌面 |
| 1024px | 桌面内容区 max-width |
| 1440px | 大屏内容区 900px |

**移动端硬性要求：**
- 触摸目标 ≥44×44px（不足则扩 click 区域）
- 底部留出 `env(safe-area-inset-bottom)`
- 输入框 font-size ≥16px（防 iOS 缩放）

## 7. 排版 — 克制层级

**一个组件内不超过 4 种字号：**

| 层级 | 字号 | 粗细 | 场景 |
|---|---|---|---|
| 标题 | 18-24px | 700-900 | 页面/卡片标题 |
| 副标题 | 15-16px | 500-600 | 列表标题、对话名 |
| 正文 | 14px | 400-500 | 描述、正文 |
| 辅助 | 11-13px | 400 | 时间戳、计数、标签 |

**letter-spacing 规则：**
- 中文标题：+2-4px
- 英文标签/大写：+1-2px
- 正文：0

## 8. 组件自查清单

每次新建/修改组件，逐条自问：

```
□ 间距是否全部落入 4px grid？
□ 颜色是否全部引用 token 而非裸 hex？
□ 圆角是否符合语义层级？
□ 动效是否指定了具体属性 + 缓动函数？
□ loading / empty / error 三态是否覆盖？
□ 是否考虑过长文本截断？
□ 触摸目标是否 ≥44px（移动端）？
□ :active 按压反馈是否实现？
□ 是否使用了 safe-area-inset-bottom？
□ 是否在不必要时做了过度抽象？
```

## 9. 反模式 — 禁止

- **禁止** `transition: all` / `transition: all 0.3s`
- **禁止** 裸 hex/rgb 颜色在组件 scoped style 中
- **禁止** `border-radius: 4px/6px/10px`（非 grid 值，8 或 12）
- **禁止** 超出实际需要三层以上的 DOM 嵌套
- **禁止** 空态只写"暂无数据"没有引导 action
- **禁止** 骨架屏和实际内容高度不一致导致跳变
- **禁止** `font-size: 10px` 以下（可读性底线）
