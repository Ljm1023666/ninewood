---
name: Ninewood
version: 3.1
description: >
  A macOS-inspired professional workspace platform connecting freelancers and employers.
  Trust-first, efficiency-driven, visually restrained. Light system surfaces with controlled Apple Blue emphasis.
  WCAG 2.1 AA compliant.
colors:
  workspace:         { value: "#F5F5F7", role: neutral-bg }
  surface:           { value: "#FFFFFF", role: neutral-surface }
  surface-secondary: { value: "#E5E5EA", role: neutral-elevated }
  text:              { value: "#1D1D1F", role: neutral-text }
  text-secondary:    { value: "#515154", role: neutral-text-secondary }
  muted-gray:        { value: "#86868B", role: neutral-text-muted }
  border-gray:       { value: "rgba(60,60,67,0.18)", role: neutral-border }
  accent:            { value: "#007AFF", role: primary }
  accent-hover:      { value: "#0A84FF", role: primary-hover }
  accent-muted:      { value: "rgba(0,122,255,0.12)", role: primary-muted }
  accent-ghost:      { value: "rgba(0,122,255,0.06)", role: primary-ghost }
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
    bg: "{colors.accent}"
    color: "#FFFFFF"
    radius: "{radius.md}"
    padding: 12px 24px
  button-primary-hover:
    bg: "{colors.accent-hover}"
  button-ghost:
    bg: transparent
    color: "{colors.muted-gray}"
    radius: "{radius.md}"
    padding: 12px 16px
  button-ghost-hover:
    bg: "{colors.accent-ghost}"
    color: "{colors.accent}"
  card-list-item:
    bg: "{colors.surface}"
    radius: "{radius.md}"
  card-list-item-hover:
    bg: "{colors.workspace}"
    border: "{colors.border-gray}"
  input:
    bg: "{colors.surface}"
    border: "{colors.border-gray}"
    radius: "{radius.md}"
    padding: 14px 16px
  toggle-on:
    bg: "{colors.accent}"
    radius: "{radius.full}"
    h: 28px
    w: 52px
  toggle-off:
    bg: "{colors.surface-secondary}"
    radius: "{radius.full}"
    h: 28px
    w: 52px
---

# Design System · Ninewood

> **Creative North Star** — Trusted desktop clarity.
> Light system surfaces, restrained Apple Blue, and dense-but-calm workspaces.
> Hierarchy comes from typography, spacing, and subtle surface contrast—not decoration.

---

## 1. Design Principles

| # | Principle | Definition |
|---|-----------|------------|
| 1 | **Light Workspace Foundation** | Use the neutral workspace, white surfaces, and soft separators from the frontmatter tokens. Avoid dark-theme assumptions. |
| 2 | **Blue With Purpose** | `#007AFF` identifies primary actions, focus, links, and selection. Semantic colors communicate status; color never replaces text or icons. |
| 3 | **Trust Through Restraint** | This is a service and transaction workspace. Prefer calm density, visible provenance, and predictable controls over visual spectacle. |
| 4 | **State Completeness** | Interactive controls cover default, hover, focus-visible, active, disabled, loading, and error states. |
| 5 | **Motion With Meaning** | Motion confirms state changes and preserves orientation. Animate `transform` and `opacity`; respect reduced-motion preferences. |
| 6 | **Desktop Accessibility** | Meet WCAG 2.1 AA contrast targets, preserve keyboard navigation, and show visible focus states. |

---

## 2. Color System

The YAML frontmatter above is the canonical token source. CSS variables in `client-react/src/index.css` must mirror it.

| Role | Token | Value | Usage |
|---|---|---|---|
| Workspace | `workspace` | `#F5F5F7` | Application canvas and grouped areas |
| Surface | `surface` | `#FFFFFF` | Cards, forms, popovers, primary content |
| Raised neutral | `surface-secondary` | `#E5E5EA` | Secondary controls and selected neutral surfaces |
| Primary text | `text` | `#1D1D1F` | Titles and high-emphasis content |
| Secondary text | `text-secondary` | `#515154` | Supporting copy and icons |
| Muted text | `muted-gray` | `#86868B` | Metadata and placeholders |
| Border | `border-gray` | `rgba(60,60,67,0.18)` | Surface separation and input outlines |
| Accent | `accent` | `#007AFF` | Primary actions, links, focus, selected state |
| Accent hover | `accent-hover` | `#0A84FF` | Hover feedback for accent controls |
| Success | `semantic-green` | `#00CC66` | Completed and confirmed states |
| Warning | `semantic-orange` | `#FF9900` | Pending or attention-required states |
| Error | `semantic-red` | `#FF3333` | Failed, destructive, expired, or frozen states |

Do not introduce a page-wide black background or a secondary default accent palette. Gradients may appear only in feature-specific accent surfaces, never as body text.

---

## 3. Typography

**Body:** Montserrat, Segoe UI, system-ui, -apple-system, sans-serif
**Mono:** Roboto Mono, JetBrains Mono, Fira Code, Cascadia Code, monospace

| Token | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| Heading XL | 2rem | 800 | 1.1 | One page title per view |
| Heading LG | 1.5rem | 700 | 1.2 | Section headings |
| Heading MD | 1.125rem | 600 | 1.3 | Cards and subsections |
| Body | 1.0625rem | 400 | 1.6 | Descriptive copy |
| Label | 0.8125rem | 500 | 1.5 | Metadata, navigation, form labels |
| Mono | 0.875rem | 400 | 1.5 | Prices, IDs, and operational data |

Keep prose to readable desktop line lengths. Use weight and size—not arbitrary colors or all-caps—to establish hierarchy.

---

## 4. Spacing, Radius, and Elevation

| Token | Value | Usage |
|---|---:|---|
| `xs` | 8px | Tight icon/label gaps |
| `sm` | 12px | Compact internal groups |
| `md` | 16px | Default control and form gaps |
| `lg` | 24px | Related section groups |
| `xl` | 32px | Major page separation |
| `card-padding` | 20px | Standard card interior |

Use 6px for compact chips, 10px for controls and cards, 14px for large panels, and 20px for prominent containers. Elevation should be subtle: white surfaces, low-opacity neutral shadows, and `border-gray` separators. Do not use heavy shadows as the primary hierarchy mechanism.

---

## 5. Component Specifications

- **Primary button:** accent background, white text, 10px radius, 12px × 24px padding. Hover uses `accent-hover`; disabled state remains legible.
- **Secondary and ghost controls:** white or transparent surfaces with neutral borders; hover may use `accent-ghost` when the action is interactive.
- **Inputs:** white background, `border-gray`, 10px radius, 14px × 16px padding. Focus uses a visible accent ring; validation supplies text plus a semantic color.
- **Cards and lists:** white surface, 10px radius, 20px padding. Use borders and spacing before shadows; hover feedback must not cause layout shift.
- **Toggles:** 52px × 28px with a full radius. On-state uses accent; off-state uses `surface-secondary`; expose `role="switch"` and `aria-checked`.
- **Loading and errors:** data surfaces need loading, empty, error, and normal states. Skeletons match the replaced content; errors state the failed operation and offer a clear retry action.

---

## 6. Interaction and Motion

| Type | Duration | Usage |
|---|---:|---|
| Micro | 150ms | Hover, icon, and focus feedback |
| Standard | 200ms | Controls, cards, expand/collapse |
| Entrance | 300ms | Dialogs and section reveals |
| Exit | 200ms | Dialog dismissal and transient surfaces |

Use property-specific transitions. Avoid `transition: all`, layout animations, and decorative motion that delays work. Honor `prefers-reduced-motion`.

---

## 7. Accessibility Baseline

- Body text has at least 4.5:1 contrast against its actual light surface; large text has at least 3:1.
- `:focus-visible` uses a clear accent focus indicator and is never removed.
- Keyboard order follows visual order; every control has an accessible name.
- Color is not the sole indicator for validation, status, or completion.
- Windows desktop is the target platform; do not add mobile-only breakpoints, touch interactions, or PWA behavior.

---

## 8. Maintenance

This document defines the visual language. When implementation tokens change, update the frontmatter and this guidance together. Historical delivery notes belong in [docs/RELEASE-NOTES.md](docs/RELEASE-NOTES.md), not in this specification.
