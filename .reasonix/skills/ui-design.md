---
name: ui-design
description: >
  UI quality standards for spacing, color tokens, motion, and component states.
  Use when creating or updating UI components, styles, layout rules, or visual reviews in this project.
---

# UI Design Skill

These are project-level constraints for consistent UI work.

## 1) Spacing rhythm (4px grid)

- Use spacing and radii in 4px increments: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64`.
- Avoid irregular spacing values unless there is a clear visual requirement.
- Keep spacing hierarchy consistent across related components.

## 2) Color usage

- Prefer design tokens and CSS variables over hardcoded colors.
- Add new semantic colors in global tokens before using them in component styles.
- Reserve gradients for accent areas (hero, primary CTA, brand highlights), not body text.

## 3) Corner radius

- Use semantic levels consistently:
  - Small controls: `8px`
  - Cards and panels: `12px`
  - Large containers: `16px`
  - Pills/avatars: full radius
- Keep nested radii visually aligned (inner radius should be smaller than outer radius).

## 4) Motion and transitions

- Do not use `transition: all`.
- Always specify exact properties and easing curves.
- Keep interactions responsive:
  - Hover transitions <= `200ms`
  - Enter transitions <= `400ms`
  - Exit transitions <= `300ms`

## 5) Required states

Every data-driven UI should handle:
- Loading
- Empty
- Error
- Normal

Also verify edge cases:
- Long text truncation or wrapping policy
- Missing image fallback
- Safe display for large numeric values

## 6) Typography

- Keep typography levels limited and clear.
- Prefer readable defaults for desktop UI.
- Avoid tiny text that hurts readability.

## 7) Project scope constraints

- This project is desktop-first (Windows + Electron).
- Do not introduce mobile-only interaction patterns or touch-only behavior unless explicitly requested.

## 8) Quick self-check

- Are spacing and radius values consistent?
- Are colors token-based?
- Are loading/empty/error states implemented?
- Are transitions property-specific and fast enough?
- Does the component remain clear with long or missing data?
