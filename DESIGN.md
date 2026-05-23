---
name: Ninewood
version: 3.0
description: >
  A pure dark-themed professional workspace platform connecting freelancers and employers.
  Trust-first, efficiency-driven, visually restrained. Pure black & white foundation with color used freely.
  WCAG 2.1 AA compliant.
colors:
  pure-black:        { value: "#000000", role: neutral-bg }
  near-black:        { value: "#0A0A0A", role: neutral-surface }
  card-black:        { value: "#0F0F0F", role: neutral-card }
  elevated-gray:     { value: "#1A1A1A", role: neutral-elevated }
  pure-white:        { value: "#FFFFFF", role: neutral-text }
  off-white:         { value: "#9A9A9A", role: neutral-text-secondary }
  muted-gray:        { value: "#5A5A5A", role: neutral-text-muted }
  border-gray:       { value: "#2A2A2A", role: neutral-border }
  accent:            { value: "#3388FF", role: primary }
  accent-hover:      { value: "#5599FF", role: primary-hover }
  accent-muted:      { value: "rgba(51,136,255,0.12)", role: primary-muted }
  accent-ghost:      { value: "rgba(51,136,255,0.06)", role: primary-ghost }
  semantic-green:    { value: "#00CC66", role: success }
  semantic-orange:   { value: "#FF9900", role: warning }
  semantic-red:      { value: "#FF3333", role: error }
typography:
  body:  { family: "Montserrat, Segoe UI, system-ui, -apple-system, sans-serif",   size: 1.0625rem, weight: 400, lineHeight: 1.6 }
  label: { family: "Montserrat, Segoe UI, system-ui, -apple-system, sans-serif",   size: 0.8125rem, weight: 500, letterSpacing: 0.02em }
  mono:  { family: "Roboto Mono, JetBrains Mono, Fira Code, Cascadia Code, monospace", size: 0.875rem, weight: 400 }
radius:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  card-padding: 1.25rem
components:
  button-primary:
    bg: "{colors.pure-white}"
    color: "{colors.pure-black}"
    radius: "{radius.md}"
    padding: 12px 24px
  button-primary-hover:
    bg: "{colors.off-white}"
  button-ghost:
    bg: transparent
    color: "{colors.muted-gray}"
    radius: "{radius.md}"
    padding: 12px 16px
  button-ghost-hover:
    bg: "rgba(255,255,255,0.06)"
    color: "{colors.pure-white}"
  card-list-item:
    bg: "{colors.card-black}"
    radius: "{radius.md}"
  card-list-item-hover:
    bg: "{colors.near-black}"
    border: "{colors.border-gray}"
  input:
    bg: "{colors.near-black}"
    border: "{colors.border-gray}"
    radius: "{radius.md}"
    padding: 14px 16px
  toggle-on:
    bg: "{colors.pure-white}"
    radius: "{radius.full}"
    h: 28px
    w: 52px
  toggle-off:
    bg: "{colors.elevated-gray}"
    radius: "{radius.full}"
    h: 28px
    w: 52px
---

# Design System · Ninewood

> **Creative North Star** — Absolute Clarity.
> Pure black. Pure white. Color used with purpose.
> Contrast leads. Typography defines hierarchy.
> Every surface stripped to its essential function. Every pixel justified.

---

## 1. Design Principles

| # | Principle | Definition |
|---|-----------|------------|
| 1 | **Black & White Foundation** | Pure black `#000` for depth, pure white `#FFF` for signal. Grays bridge the extremes. This neutral base lets any color you introduce carry clear meaning. |
| 2 | **Color With Purpose** | No fixed color palette. Use any color that serves the function — a vibrant blue for links, green for success, amber for warning, etc. The only rule: color must communicate, not decorate. |
| 3 | **Contrast = Hierarchy** | Value contrast separates surfaces, text, and interactive elements. If a layout doesn't work in grayscale, adding color won't fix it. |
| 4 | **Complete State Coverage** | Every interactive element ships with: `default` · `hover` · `focus` · `active` · `disabled` · `loading` · `error`. No partial implementations. |
| 5 | **Motion With Meaning** | Animate `transform` and `opacity` only. Respect `prefers-reduced-motion`. Transitions provide feedback and show state change — never decoration alone. |
| 6 | **WCAG 2.1 AA Minimum** | Body text ≥ 4.5:1 contrast. Large text ≥ 3:1. Focus rings visible. All interactive elements keyboard-accessible. |

---

## 2. Color System

The palette is built on a **pure black → white** axis. Grays provide surface stepping. Beyond that, any color is available — use it when it serves the interface, leave it out when it doesn't. This is not a restrictive palette; it's a clean starting point.

### 2.1 Monochrome Foundation

```
  Pure Black      #000000    ████████    Page background — zero light, maximum depth
  Near Black      #0A0A0A    ████████    Sidebar, raised panels, input backgrounds
  Card Black      #0F0F0F    ████████    Card surfaces — barely lifted from page
  Elevated Gray   #1A1A1A    ████████    Toggle off-state, popover backgrounds
  Border Gray     #2A2A2A    ████████    Borders, dividers, input strokes
  ─────────────────────────────────────────────────────────────────
  Muted Gray      #5A5A5A    ████████    Placeholders, captions, tertiary text
  Off White       #9A9A9A    ████████    Secondary text, descriptions, icons (idle)
  Pure White      #FFFFFF    ████████    Primary text, active icons, primary buttons
```

### 2.2 Accent (Recommended)

Accent colors are entirely free. A clean blue is recommended for interactive cues (links, focus rings, selected states) based on its universal readability and professional association.

### 2.3 Semantic Colors

```
  Green   #00CC66    ████████    Success, confirmed, active, completed
  Orange  #FF9900    ████████    Warning, pending, attention needed
  Red     #FF3333    ████████    Error, destructive, expired, frozen
```

Semantic colors convey system status at a glance. Green for success, orange for warning, red for error. Use them in badges, toasts, form validation, and any status indicator.

### 2.4 Using Color Freely

The monochrome tokens above are the **neutral foundation**, not a cage. You are free to introduce any color for:

- **Brand elements** (logos, headers, marketing surfaces)
- **Feature identity** (AI panels, premium badges, thematic sections)
- **Data visualization** (charts, graphs, heatmaps)
- **Status and state** (badges, toasts, validation)
- **Interactive cues** (links, icons, accent buttons)

The only guideline: **don't let color undermine the pure black/white contrast hierarchy.** If the page reads well in grayscale, any color on top of it will work.

---

## 3. Typography

**Body:** Montserrat — geometric, clean, professional. Fallback: Segoe UI → system-ui → -apple-system → sans-serif
**Mono:** Roboto Mono — tabular, precise. Fallback: JetBrains Mono → Fira Code → Cascadia Code → monospace

### 3.1 Type Scale

| Token | `font-size` | `font-weight` | `line-height` | `letter-spacing` | Usage |
|-------|------------|---------------|---------------|-------------------|-------|
| **Heading XL** | `2rem` | `800` | `1.1` | `-0.02em` | Page titles only — max once per view |
| **Heading LG** | `1.5rem` | `700` | `1.2` | `-0.01em` | Section headers, card-list section titles |
| **Heading MD** | `1.125rem` | `600` | `1.3` | `0` | Card titles, subsection labels |
| **Body** | `1.0625rem` | `400` | `1.6` | `0` | All body copy — cap at 65–75ch for prose |
| **Label** | `0.8125rem` | `500` | `1.5` | `0.02em` | Form labels, nav items, metadata, overlines |
| **Mono** | `0.875rem` | `400` | `1.5` | `0` | Prices, order IDs, code, data values |

### 3.2 Type Rules

| Rule | Requirement |
|------|-------------|
| **Scale Gap** | Adjacent heading levels differ by ≥ 1.25× in font size. No flat scales. |
| **Single Sans** | One sans family for all headings, body, buttons, and labels. |
| **No Gradient Text** | `background-clip: text` is banned. Text is `#FFF`, `#9A9A9A`, or `#5A5A5A`. |
| **No Display Fonts** | Display/headline typefaces are prohibited in the UI layer. |
| **Weight = Hierarchy** | Three weights only: 400 (body), 600 (emphasis), 800 (headings). No 500, no 300. |

---

## 4. Spacing & Radius

### 4.1 Spacing Scale

```
  xs   0.5rem   (8px)     Tight internal gaps — icon+label, chip padding
  sm   0.75rem  (12px)    Compact gaps — list item internals, inline groups
  md   1rem     (16px)    Default gap — card internals, form groups
  lg   1.5rem   (24px)    Section gaps — between card groups, page sections
  xl   2rem     (32px)    Page-level gaps — hero sections, major dividers
  ─────────────────────────────────────────────────────────────────
  card-padding   1.25rem (20px)   Standard internal card padding
```

### 4.2 Radius Scale

```
  sm    6px     Chips, badges, small interactive elements
  md   10px     Buttons, inputs, cards, list items (DEFAULT)
  lg   14px     Larger cards, dialogs, featured panels
  xl   20px     Modal containers, prominent sections
  full 9999px   Toggle switches, avatar circles, pill badges
```

---

## 5. Elevation

Depth is conveyed through **pure luminance stepping**. Surfaces lift from black `#000` through subtle gray gradations. Shadows are small, structural, and state-driven.

### 5.1 Surface Tiers

```
  ┌─────────────────────────────────────────────────────────────┐
  │  Pure Black      #000000    Page background                 │  ← background
  │  Near Black      #0A0A0A    Sidebar, input backgrounds       │  ← surface
  │  Card Black      #0F0F0F    Cards, list items                │  ← card
  │  Elevated Gray   #1A1A1A    Popovers, toggle off-state       │  ← elevated
  └─────────────────────────────────────────────────────────────┘
```

### 5.2 Shadow Tokens

| Token | Value | Use Case |
|-------|-------|----------|
| **Shadow Small** | `0 2px 8px rgba(0,0,0,0.35)` | Cards on hover — subtle lift |
| **Shadow Medium** | `0 6px 20px rgba(0,0,0,0.45)` | Dropdowns, popovers, tooltips |
| **Shadow Large** | `0 12px 36px rgba(0,0,0,0.55)` | Modals, full-page overlays |
| **Elevation 1** | `0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)` | Cards at rest |
| **Elevation 2** | `0 6px 16px rgba(0,0,0,0.42), 0 2px 6px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.08)` | Raised cards, dialogs |

### 5.3 Elevation Rules

| Rule | Definition |
|------|------------|
| **Flat by Default** | Surfaces carry no shadow at rest. Shadows appear only as state feedback. |
| **Pure Value Stepping** | Depth comes from value steps (`#000` → `#0A0A0A` → `#0F0F0F` → `#1A1A1A`). This ensures the hierarchy works independently of any colors you layer on top. |

---

## 6. Component Specifications

### 6.1 Buttons

```
  ┌─────────────────────────────────────────────────────────┐
  │  Primary    bg: #FFFFFF    color: #000000                │
  │             radius: 10px   padding: 12px 24px            │
  │             font-weight: 600                             │
  │                                                         │
  │  Hover      bg: #DADADA (slightly muted white)           │
  │  Focus      box-shadow: 0 0 0 3px rgba(51,136,255,0.40) │
  │  Active     scale(0.98)                                  │
  │  Disabled   opacity: 0.35     cursor: not-allowed        │
  │  Loading    spinner replaces icon; label text remains;   │
  │             button width does not change                 │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  Ghost      bg: transparent    color: #9A9A9A            │
  │             radius: 10px       padding: 12px 16px         │
  │                                                         │
  │  Hover      bg: rgba(255,255,255,0.06)  color: #FFFFFF   │
  └─────────────────────────────────────────────────────────┘
```

### 6.2 List Item Cards

```
  ┌─────────────────────────────────────────────────────────┐
  │  Rest       bg: #0F0F0F                                   │
  │             border: 1px solid #2A2A2A                    │
  │             radius: 10px     padding: 1.25rem            │
  │                                                         │
  │  Hover      border-color: rgba(255,255,255,0.20)         │
  │             bg: #0A0A0A                                  │
  │                                                         │
  │  Active     transform: scale(0.99)                       │
  └─────────────────────────────────────────────────────────┘

  No side-stripe borders. No colored accents.
  The entire border shifts brightness on hover — full-frame feedback.
```

### 6.3 Toggle Switch

```
  ┌─────────────────────────────────────────────────────────┐
  │  Dimensions  52px × 28px    radius: 9999px (pill)        │
  │                                                         │
  │  ON          bg: #FFFFFF    knob at right edge           │
  │  OFF         bg: #1A1A1A    knob at left edge            │
  │                                                         │
  │  Knob        bg: #000000 (on white) / #FFFFFF (on dark) │
  │              width: 22px    height: 22px                 │
  │                                                         │
  │  Transition  200ms ease — background + knob position     │
  │              No bounce, no overshoot                     │
  │                                                         │
  │  a11y        role="switch"  aria-checked="true|false"    │
  │              aria-label on the toggle element            │
  └─────────────────────────────────────────────────────────┘
```

### 6.4 Input

```
  ┌─────────────────────────────────────────────────────────┐
  │  Rest       bg: #0A0A0A                                  │
  │             border: 1px solid #2A2A2A                   │
  │             radius: 10px     padding: 14px 16px          │
  │             color: #FFFFFF    width: 100%                │
  │                                                         │
  │  Focus      border-color: #3388FF                        │
  │             box-shadow: 0 0 0 3px rgba(51,136,255,0.15) │
  │                                                         │
  │  Placeholder  color: #5A5A5A                             │
  │                                                         │
  │  Error      border-color: #FF3333                        │
  │             box-shadow: 0 0 0 3px rgba(255,51,51,0.15)  │
  └─────────────────────────────────────────────────────────┘
```

### 6.5 Chips & Badges

```
  ┌─────────────────────────────────────────────────────────┐
  │  Shape      radius: 6px    border: 1px solid             │
  │                                                         │
  │  Selected   border: rgba(51,136,255,0.30)                │
  │             bg: rgba(51,136,255,0.12)                   │
  │             text: #3388FF                                │
  │                                                         │
  │  Neutral    border: #2A2A2A                              │
  │             bg: transparent                              │
  │             text: #9A9A9A                                │
  │                                                         │
  │  Success    Same structure — anchor to #00CC66           │
  │  Warning    Same structure — anchor to #FF9900           │
  │  Error      Same structure — anchor to #FF3333           │
  └─────────────────────────────────────────────────────────┘
```

### 6.6 Skeleton Loading

```
  ┌─────────────────────────────────────────────────────────┐
  │  Shape      Matches the content it replaces              │
  │             (text line height, card dimensions, etc.)    │
  │                                                         │
  │  Background linear-gradient(90deg,                       │
  │               rgba(255,255,255,0.04),                   │
  │               rgba(255,255,255,0.10),                   │
  │               rgba(255,255,255,0.04))                   │
  │                                                         │
  │  Animation  shimmer: bg-position 0 → -200% over 2s       │
  │             linear, infinite                             │
  │                                                         │
  │  a11y       Respects prefers-reduced-motion —             │
  │             disables animation, keeps static placeholder │
  └─────────────────────────────────────────────────────────┘

  Never use a centered spinner for content-area loading.
  Reserve spinners for inline actions: button submit, search.
```

### 6.7 Error State

```
  ┌─────────────────────────────────────────────────────────┐
  │  Container  centered on page    max-width: 420px         │
  │                                                         │
  │  Icon       48px, #5A5A5A, optional                     │
  │                                                         │
  │  Message    One sentence, specific.                      │
  │             NEVER: "Something went wrong"               │
  │             ALWAYS: "Failed to load demands —            │
  │                      the server returned a 500 error"    │
  │                                                         │
  │  Action     "重试" (Retry) button, ghost variant         │
  │             Always present alongside the error message   │
  └─────────────────────────────────────────────────────────┘
```

### 6.8 Sidebar Navigation

```
  ┌─────────────────────────────────────────────────────────┐
  │  Width      72px collapsed    240px expanded (settings)  │
  │                                                         │
  │  Background #0A0A0A                                      │
  │             backdrop-filter: blur(12px)                   │
  │                                                         │
  │  Active     bg: rgba(255,255,255,0.08)                   │
  │             icon: #FFFFFF    text: #FFFFFF               │
  │                                                         │
  │  Inactive   text: #5A5A5A    bg: transparent              │
  │             hover-bg: rgba(255,255,255,0.04)             │
  │                                                         │
  │  Brand      Left edge: 3px solid #FFFFFF                 │
  │  Accent     Clean, minimal, unmistakable                  │
  └─────────────────────────────────────────────────────────┘
```

---

## 7. Interaction & Motion

### 7.1 Timing

| Type | Duration | Easing | Use |
|------|----------|--------|-----|
| **Micro** | `150ms` | `ease-out` | Hover transitions, icon color shifts, focus ring appearance |
| **Standard** | `200ms` | `ease-in-out` | Toggle switches, card lift, expand/collapse |
| **Entrance** | `300ms` | `ease-out` | Modal appear, dropdown reveal, page section fade-in |
| **Exit** | `200ms` | `ease-in` | Modal dismiss, dropdown hide |

### 7.2 Motion Constraints

| Rule | Detail |
|------|--------|
| **Transform Only** | Animate `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, or any layout-triggering property. |
| **Reduced Motion** | Wrap all non-essential animations in `@media (prefers-reduced-motion: no-preference)`. Essential = focus rings, loading indicators. |
| **No Bounce** | Avoid spring/overshoot easing. Interfaces feel precise, not playful. |

---

## 8. Accessibility Baseline

| Standard | Requirement |
|----------|-------------|
| **WCAG 2.1 AA** | Minimum compliance target for all views |
| **Color Contrast** | Body text ≥ 4.5:1 (`#FFF` on `#000` = 21:1). Large text (≥18px bold or ≥24px) ≥ 3:1 |
| **Focus Indicators** | `:focus-visible` only — 3px `#3388FF` ring, never removed. Mouse users see no rings on click. |
| **Keyboard Navigation** | Tab order follows visual order. All interactive elements reachable via keyboard. |
| **Toggle Switches** | `role="switch"` + `aria-checked` — state must be announced to screen readers |
| **Error Messages** | Associated with inputs via `aria-describedby`. Live regions for async errors. |
| **Reduced Motion** | Respect `prefers-reduced-motion` — disable decorative animations |

---

## 9. Constraints

| # | Rule | Rationale |
|---|------|-----------|
| 1 | **No identical card grids** | Repeated `icon + heading + text` patterns create visual monotony. Vary layout, density, and hierarchy across sections. |
| 2 | **Modals are last resort** | Exhaust inline expansion, collapsible panels, and progressive disclosure before reaching for a modal. |
| 3 | **No inline styles** | All styling through Tailwind utility classes. Inline `style=` props indicate an incomplete migration. |
| 4 | **No incomplete components** | Every interactive element ships with: default · hover · focus · active · disabled · loading · error. Ship all states or don't ship the component. |

---

## 10. Quick Reference

### Color Cheatsheet

```
  PAGE BG      → #000000    Pure Black
  SIDEBAR BG   → #0A0A0A    Near Black
  CARD BG      → #0F0F0F    Card Black
  ELEVATED     → #1A1A1A    Elevated Gray
  BORDER       → #2A2A2A    Border Gray
  ─────────────────────────────────────
  TEXT PRIMARY → #FFFFFF    Pure White
  TEXT SECOND  → #9A9A9A    Off White
  TEXT MUTED   → #5A5A5A    Muted Gray
  ─────────────────────────────────────
  ACCENT       → #3388FF    Focus rings, links, selected
  ACCENT HOVER → #5599FF    Link hover
  ─────────────────────────────────────
  SUCCESS      → #00CC66    Confirmed, active, done
  WARNING      → #FF9900    Pending, attention
  ERROR        → #FF3333    Failed, destructive
```

### Iconography

```
  Provider: lucide-react (exclusively)
  Sizing:   size-4 (16px) for inline   ·   size-5 (20px) for standalone   ·   size-6 (24px) for decorative
  Stroke:   strokeWidth={2} default    ·   strokeWidth={1.5} for subtler contexts
  Color:    #FFFFFF for active/nav     ·   #9A9A9A for idle/secondary     ·   #5A5A5A for disabled
```

### Typography Cheatsheet

```
  PAGE TITLE    text-3xl (2rem)    font-extrabold (800)    leading-tight
  SECTION       text-2xl (1.5rem)  font-bold (700)         leading-snug
  CARD TITLE    text-lg (1.125rem) font-semibold (600)
  BODY          text-base (1.0625rem) font-normal (400)    leading-relaxed
  LABEL         text-xs (0.8125rem) font-medium (500)      tracking-wide
  MONO          text-sm (0.875rem)  font-normal (400)      font-mono
```

---

> **This document is the single source of truth for Ninewood's visual language.**
> Every component, page, and interaction is evaluated against these specifications.
> When a design decision is made, update this document. When a question arises, consult this document.

---

## 11. Version History

### AI 1.6 — Agent 对话系统 + AI 服务层重构 + Redis + 安全增强 (2026-05-23)

**Agent 对话系统**
- 新增 `AgentConversation` / `AgentMessage` Prisma 模型
- 后端：`routes/agent.ts` (CRUD + 流式对话)、`services/agent/conversation.ts`、`services/agent/executor.ts`
- 工具注册系统：`services/agent/tool-registry.ts`、`services/agent/tools.ts`（Ninewood 业务工具）
- Skill 加载器：`services/agent/skill-loader.ts`（.reasonix/skills 目录）
- 前端：`views/AgentChat.tsx`、`api/agent.ts`、路由 `/agent` 和 `/agent/:id`

**AI 服务层**
- 供应商：MiniMax 单供应商 + 多模型（`AI_MODEL` / `AI_THINK_MODEL` / `AI_FAST_MODEL`）
- `services/ai/client.ts` 统一封装：
  - `chatCompletion()` / `chatCompletionStream()` — 业务路由直接调用
  - `agentStream()` — Agent 模式带工具调用
  - `readSSEStream()` — 共享 SSE 流解析器，消除 7 处重复
  - `parseJSON()` / `extractThink()` — 公共工具函数
- `services/ai/types.ts` — `ChatCompletionParams` / `AgentStreamParams` / `ToolDefinition` 等类型

**Agent 执行器优化**
- `executor.ts` 使用共享 `readSSEStream`，不再重复 SSE 解析
- 工具调用批量化：收集所有工具结果后单次 AI 总结，避免 N+1 请求
- 错误链路完整：工具执行失败/总结失败统一通过 SSE 通知前端

**Redis 集成 + 限流**
- 新增 `lib/redis.ts`（ioredis 连接管理，`delCache` 使用 SCAN 而非 KEYS）
- 新增 `middleware/rate-limit.ts`（全局 / API / 认证 / 抢单 分层限流）

**Deposit 重构**
- Schema：`demandIds Json` → `DepositDemand` 关联表
- 新增 `CANCELLED` / `REFUNDED` 订单状态
- 更新 `deposit.service.ts`、`order.service.ts` 适配新模型

**安全增强**
- 请求体限制：500MB → 10MB
- JWT_SECRET 生产环境缺失时拒绝启动
- 全局限流中间件

**修复**
- `autoTitle` → `truncateTitle`（原名暗示 AI 摘要，实际是截断）
- skill-loader 路径修正：`.deepcode/skills/` → `.reasonix/skills/`
- AgentChat 临时消息 ID 改用 `crypto.randomUUID()`
- `config.ts` 简化：移除冗余的多供应商抽象，保持 MiniMax + 模型可配置

**UI 更新**
- 6 个新组件：`ai-input`、`animated-search-bar`、`animated-theme-toggle`、`limelight-nav`、`modern-timeline`、`pixel-logo-grid`
- 所有暗色主题 textSecondary / textMuted 亮度提升（对比度增强）
- Help 页面重写、Settings 页面重构、DemandCreate 工作区改造
- AgentChat 页面（对话列表 + 流式聊天界面）

**测试 & 工具**
- 新增 `deposit.test.ts`、`order.test.ts`
- 新增 `create-shortcut.ps1`、`fix_help.py`
- 新增 `.dockerignore`
- 移除 `package-lock.json`（统一使用 pnpm）
