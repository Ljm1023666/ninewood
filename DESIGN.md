---
name: 九木 (Ninewood)
description: Warm amber dark-themed professional workspace for freelancers and employers — trust-first, efficiency-driven, visually restrained.
colors:
  warm-amber:
    value: oklch(58% 0.16 45)
    role: primary
  warm-amber-hover:
    value: oklch(65% 0.17 48)
    role: primary-hover
  warm-amber-deep:
    value: oklch(52% 0.18 35)
    role: primary-deep
  warm-amber-muted:
    value: oklch(58% 0.16 45 / 0.12)
    role: primary-muted
  warm-amber-ghost:
    value: oklch(58% 0.16 45 / 0.06)
    role: primary-ghost
  dark-earth:
    value: oklch(14% 0.005 60)
    role: neutral-bg
  dark-earth-raised:
    value: oklch(17% 0.004 55)
    role: neutral-surface
  dark-earth-elevated:
    value: oklch(21% 0.004 50)
    role: neutral-elevated
  card-surface:
    value: oklch(58% 0.16 45 / 0.06)
    role: neutral-card
  warm-white:
    value: oklch(95% 0 0)
    role: neutral-text
  warm-gray:
    value: oklch(78% 0.003 60)
    role: neutral-text-secondary
  warm-muted:
    value: oklch(58% 0.003 60)
    role: neutral-text-muted
  warm-border:
    value: oklch(32% 0.003 60)
    role: neutral-border
  semantic-green:
    value: oklch(60% 0.15 150)
    role: success
  semantic-amber:
    value: oklch(68% 0.16 80)
    role: warning
  semantic-red:
    value: oklch(55% 0.19 22)
    role: error
typography:
  body:
    fontFamily: "Montserrat, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.02em"
  mono:
    fontFamily: "Roboto Mono, JetBrains Mono, Fira Code, Cascadia Code, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  card-padding: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.warm-amber}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.warm-amber-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.warm-muted}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.warm-amber-ghost}"
    textColor: "{colors.warm-amber}"
  card-list-item:
    backgroundColor: "{colors.card-surface}"
    rounded: "{rounded.md}"
  card-list-item-hover:
    backgroundColor: "{colors.warm-amber-ghost}"
  input-glass:
    backgroundColor: "{colors.warm-amber-ghost}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  toggle-on:
    backgroundColor: "{colors.warm-amber}"
    rounded: "{rounded.full}"
    height: "28px"
    width: "52px"
  toggle-off:
    backgroundColor: "{colors.dark-earth-elevated}"
    rounded: "{rounded.full}"
    height: "28px"
    width: "52px"
---

# Design System: 九木 (Ninewood)

## 1. Overview

**Creative North Star: "The Warm Workshop"**

A freelancer leans into their monitor at 11 PM, the only light in the room is the screen. The interface doesn't compete for attention; it recedes into the task. Warm amber accents mark what's actionable against a deep earth-toned backdrop. Every pixel earns its place. The tool feels solid and reliable, like a well-built workbench you don't think about because it just works.

Ninewood is a product-register system. Restrained color strategy: one accent (warm amber) used on ~8% of any given surface. The dark theme isn't a stylistic choice; it's an ergonomic one for users spending hours managing demands, orders, and conversations.

This system rejects the aesthetic of cyberpunk terminals, purple-blue AI-generated slop, and decorative glassmorphism. It embraces familiarity that earns trust: standard navigation patterns, consistent component vocabulary, motion that conveys state rather than decoration.

**Key Characteristics:**
- Dark with purpose: warm-toned dark backgrounds reduce fatigue during long work sessions
- One accent, used sparingly: warm amber appears only on primary actions, selections, and state indicators
- Flat at rest, subtle on interaction: surfaces gain depth only when hovered or focused
- Standardized component vocabulary: every interactive element has seven consistent states (default, hover, focus, active, disabled, loading, error)
- Efficiency-forward: content density matches work pace; skeleton loading states instead of spinners; empty states that teach

## 2. Colors: The Warm Earth + Amber Palette

A single-saturation accent family over a gradient of tinted dark neutrals. The accent is warm amber (OKLCH hue 45), chosen because it signals warmth and urgency without the aggression of red or the artificiality of neon. Every neutral is tinted toward the accent hue at chroma 0.003–0.005, so the background feels cohesive rather than sterile.

### Primary
- **Warm Amber** (`oklch(58% 0.16 45)`): Primary actions (buttons, toggles), selected states, focus rings, current navigation indicator. Used on at most ~8% of any screen surface. The rarity is the point.
- **Warm Amber Hover** (`oklch(65% 0.17 48)`): Hover state for primary buttons and interactive elements. Slightly lighter and more saturated to signal availability.
- **Warm Amber Deep** (`oklch(52% 0.18 35)`): Gradient end-point for accent gradient surfaces (profile covers). Not used standalone.
- **Warm Amber Muted** (`oklch(58% 0.16 45 / 0.12)`): Focus ring outer glow, selected chip backgrounds.
- **Warm Amber Ghost** (`oklch(58% 0.16 45 / 0.06)`): Hover backgrounds, card tint, subtle accent presence on inactive surfaces.

### Secondary
None. This system uses a single accent. A second named color role would dilute the restraint.

### Neutral
- **Dark Earth** (`oklch(14% 0.005 60)`): Page background. The deepest surface; barely tinted warm to avoid pure-black sterility.
- **Dark Earth Raised** (`oklch(17% 0.004 55)`): Secondary surfaces: sidebars, secondary panels, muted backgrounds.
- **Dark Earth Elevated** (`oklch(21% 0.004 50)`): Tertiary surfaces: toggle off-states, elevated panels, hover targets on dark surfaces.
- **Card Surface** (`oklch(58% 0.16 45 / 0.06)`): Card backgrounds. Translucent amber tint over the dark base for subtle tonal distinction.
- **Warm White** (`oklch(95% 0 0)`): Primary text. Near-white, slightly warm.
- **Warm Gray** (`oklch(78% 0.003 60)`): Secondary text. Readable but clearly subordinate to primary.
- **Warm Muted** (`oklch(58% 0.003 60)`): Muted text, placeholders, captions. Visible but not attention-grabbing.
- **Warm Border** (`oklch(32% 0.003 60)`): Borders, dividers, input strokes. Visible but not prominent.

### Semantic
- **Green** (`oklch(60% 0.15 150)`): Success states, active indicators, confirmed transactions.
- **Amber** (`oklch(68% 0.16 80)`): Warning states, low-activity indicators, pending actions.
- **Red** (`oklch(55% 0.19 22)`): Errors, destructive actions, expired/frozen states.

### Named Rules
**The One Voice Rule.** The warm amber accent is used on ≤10% of any given screen. Its rarity is the point. An interface that's 40% amber has no accent at all.

**The No-Black Rule.** Never use `#000` or `#fff`. Every neutral is tinted toward the accent hue (chroma 0.003–0.005). Pure black feels cold and digital; warm-tinted dark feels physical and trustworthy.

## 3. Typography

**Display Font:** Not used. Product UI has no display typography needs.
**Body Font:** Montserrat, with Segoe UI and system-ui fallback. Montserrat brings warmth and geometry without distracting.
**Label/Mono Font:** Roboto Mono for data, prices, and code-like values.

**Character:** One well-tuned sans carries the entire interface. Montserrat's geometric warmth complements the amber accent; Roboto Mono signals precision for numbers and data.

### Hierarchy

- **Heading XL** (`font-weight: 800, font-size: 2rem, line-height: 1.1, letter-spacing: -0.02em`): Page titles only (Settings, Demand Detail). Maximum once per page.
- **Heading LG** (`font-weight: 700, font-size: 1.5rem, line-height: 1.2, letter-spacing: -0.01em`): Section headers, card-list section titles.
- **Heading MD** (`font-weight: 600, font-size: 1.125rem, line-height: 1.3`): Card titles, subsection labels.
- **Body** (`font-weight: 400, font-size: 1.0625rem, line-height: 1.6`): All body copy. Capped at 65–75ch for prose; denser for data.
- **Label** (`font-weight: 500, font-size: 0.8125rem, letter-spacing: 0.02em`): Form labels, nav items, metadata. Uppercase section overlines where needed (tracking: 0.05em).
- **Mono** (`font-weight: 400, font-size: 0.875rem`): Prices, order IDs, codes, data values.

### Named Rules
**The Scale Gap Rule.** Adjacent heading sizes differ by at least 1.25:1. No flat scales; hierarchy must be instantly readable.

**The No-Display Rule.** Display fonts are prohibited in UI context. One sans family carries headings, body, buttons, and labels. Product UI doesn't need editorial contrast; it needs consistency.

## 4. Elevation

This system conveys depth through tonal layering, not heavy shadows. The three background tiers (Dark Earth → Raised → Elevated) create a ladder of surfaces. Shadows are small and structural, not atmospheric.

When an interactive element is hovered or focused, it lifts subtly with a small shadow and a one-pixel amber-tinted border. At rest, surfaces are effectively flat.

### Shadow Vocabulary

- **Shadow Small** (`0 2px 8px rgba(0, 0, 0, 0.35)`): Subtle card lift on hover.
- **Shadow Medium** (`0 6px 20px rgba(0, 0, 0, 0.45)`): Dropdowns, popovers, tooltips.
- **Shadow Large** (`0 12px 36px rgba(0, 0, 0, 0.55)`): Modals, full-page overlays.
- **Elevation 1** (`0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.35), 0 0 0 1px oklch(58% 0.16 45 / 0.08)`): Structural lift for cards at rest.
- **Elevation 2** (`0 6px 16px rgba(0,0,0,0.42), 0 2px 6px rgba(0,0,0,0.32), 0 0 0 1px oklch(58% 0.16 45 / 0.12)`): Raised cards (hover, selected, dialog surfaces).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus). A card that always has a shadow is always shouting; a card that rises on hover is speaking when it matters.

## 5. Components

### Buttons
**Character:** Tactile and confident. Primary buttons carry the full amber weight; secondary and ghost variants use transparency for hierarchy.

- **Shape:** Rounded at 10px (`--radius`). Consistent across all variants.
- **Primary:** `background: oklch(58% 0.16 45)`, `color: #fafafa`, `padding: 12px 24px`. High-contrast, unmistakably actionable.
- **Hover:** `background: oklch(65% 0.17 48)`. Slightly lighter; signals readiness.
- **Focus:** `box-shadow: 0 0 0 3px oklch(58% 0.16 45 / 0.35)`. Amber ring, 3px offset, sufficient for WCAG 2.1 AA.
- **Disabled:** `opacity: 0.5`. Standard disengagement.
- **Loading:** Spinner icon replaces label icon; button text remains. Width does not change.
- **Secondary/Ghost:** Transparent background with muted text. Hover gains `oklch(58% 0.16 45 / 0.06)` background and amber text.

### List Item Cards
**Character:** Quiet containers that lift on approach. No side-stripe — the entire border shifts color.

- **Shape:** Rounded at 10px. Full border, not accent stripe.
- **Rest:** `background: oklch(58% 0.16 45 / 0.06)`, `border: 1px solid oklch(32% 0.003 60)`.
- **Hover:** Border shifts to `oklch(58% 0.16 45 / 0.5)`, background warms to `oklch(58% 0.16 45 / 0.06)`. Subtle scale-down on active: `scale(0.99)`.
- **Internal padding:** 1.25rem (`--card-padding`).

### Toggle Switch
**Character:** Small but unmistakable. Full amber gradient when on; dark elevated surface when off.

- **Shape:** Fully rounded pill: 52px wide, 28px tall.
- **On:** `background: linear-gradient(135deg, oklch(58% 0.16 45), oklch(52% 0.18 35))`, knob at right.
- **Off:** `background: oklch(21% 0.004 50)`, knob at left.
- **Accessibility:** Must have `role="switch"` and `aria-checked`. Label linked via `aria-label`.
- **Transition:** 200ms on background and knob position. No bounce.

### Glass Input
**Character:** Subtle amber-tinted field that intensifies on focus. Not decorative glass — functional feedback.

- **Shape:** Rounded at 10px, full width, 14px vertical padding.
- **Rest:** `background: oklch(58% 0.16 45 / 0.06)`, `border: 1px solid oklch(32% 0.003 60)`.
- **Focus:** Border shifts to `oklch(58% 0.16 45)`, outer glow `0 0 0 3px oklch(58% 0.16 45 / 0.12)`.
- **Placeholder:** `color: oklch(58% 0.003 60)`.

### Chips / Badges
**Character:** Small, scannable tags for status and categorization. Border + translucent background.

- **Shape:** Rounded at 6px (`--radius-sm`), with border.
- **Active/Selected:** `border-color: oklch(58% 0.16 45 / 0.3)`, `background: oklch(58% 0.16 45 / 0.12)`, `text: oklch(58% 0.16 45)`.
- **Neutral:** `border-color: oklch(32% 0.003 60)`, `background: transparent`, `text: oklch(78% 0.003 60)`.
- **Semantic variants:** Green (success/active), Amber (warning/pending), Red (error/expired). Same structure, different chroma anchor.

### Skeleton Loading
**Character:** Content-shaped waiting states. Never a center spinner for content areas.

- **Shape:** Matches the content it replaces (text line, card, image block).
- **Animation:** `shimmer` keyframe: background-position sweeps from 0 to -200% over 2s linear.
- **Background:** `linear-gradient(90deg, oklch(78% 0.003 60 / 0.08), oklch(78% 0.003 60 / 0.16), oklch(78% 0.003 60 / 0.08))`.
- **Respects:** `prefers-reduced-motion` — removes animation, keeps static placeholder.

### Error State
**Character:** Honest failure communication. Tells the user what happened and offers a remedy.

- **Container:** Centered on page, max-width 420px.
- **Icon:** 48px, muted, optional.
- **Message:** Primary text, one sentence. Never "Something went wrong" alone — be specific.
- **Action:** "重试" (Retry) button as secondary variant. Always present alongside the error message.

### Sidebar Navigation
**Character:** Fixed left rail. Warm amber accent marks the current location; everything else recedes.

- **Width:** 72px collapsed (sidebar-w), 240px for settings sub-nav.
- **Background:** `oklch(17% 0.004 55)` with `backdrop-filter: blur(12px)`.
- **Active item:** Amber accent tint background, amber icon color, white text.
- **Inactive item:** Muted text, transparent background. Hover gains subtle tertiary background.
- **Brand strip:** Left-edge amber gradient line (sidebar-ct-accent): `linear-gradient(90deg, oklch(58% 0.16 45), oklch(52% 0.18 35) 3px, transparent 3px)`.

## 6. Do's and Don'ts

### Do:
- **Do** use the warm amber accent on primary actions, selected states, and focus rings only. Its power is in its rarity.
- **Do** tint every neutral surface toward the accent hue (chroma 0.003–0.005). This prevents sterile gray-black backgrounds.
- **Do** use skeleton loading for content areas; reserve spinners for inline actions (button loading, search submitting).
- **Do** provide a retry action alongside every error message. Never leave the user stranded.
- **Do** use `role="switch"` and `aria-checked` on toggle controls. State must be announced to assistive technology.
- **Do** use Tailwind utility classes for all styling. Inline styles are prohibited; they indicate a component that hasn't been migrated.
- **Do** respect `prefers-reduced-motion` — disable all non-essential animations when the user requests it.
- **Do** use `focus-visible` for focus rings (not `:focus`), so mouse users don't see rings on click.
- **Do** maintain WCAG 2.1 AA contrast for all text: 4.5:1 for body, 3:1 for large text (≥18px bold or ≥24px).

### Don't:
- **Don't** use gradient text (`background-clip: text`). This is an absolute ban. Use solid amber color for emphasis.
- **Don't** use side-stripe borders (`border-left` or `border-right` > 1px as accent). Full border + background shift communicates the same hierarchy without the visual hack.
- **Don't** use glassmorphism as a default surface treatment. Translucent amber tints are acceptable; decorative blurs and frosted glass are not.
- **Don't** use purple-blue gradients as brand colors. This is the #1 AI slop signal and contradicts the trust-first brand personality.
- **Don't** use emoji as icons. Always use lucide-react icons for consistent sizing, stroke width, and color inheritance.
- **Don't** use `#000` or `#fff`. Every neutral must carry a hint of the accent hue.
- **Don't** create identical card grids (icon + heading + text repeated). Vary card layout, density, and visual hierarchy across sections.
- **Don't** use modals as a first resort. Exhaust inline disclosure, expandable panels, and progressive reveal before reaching for a modal.
- **Don't** animate CSS layout properties (`width`, `height`, `top`, `left`). Use `transform` and `opacity` only.
- **Don't** ship a component with missing states. Every interactive element needs: default, hover, focus, active, disabled, loading, error.
