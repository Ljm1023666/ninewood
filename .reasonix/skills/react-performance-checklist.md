---
name: react-performance-checklist
description: >
  React performance checklist for async flow, bundle size, and render efficiency.
  Use when building or refactoring React components, investigating UI lag, or reducing load time.
---

# React Performance Checklist

Source:
- https://github.com/vercel-labs/agent-skills
- `skills/react-best-practices/SKILL.md`

## High priority

### 1) Eliminate async waterfalls
- Parallelize independent requests with `Promise.all`.
- Delay `await` until values are actually required.
- Run cheap synchronous guards before expensive async calls.

### 2) Reduce bundle size
- Prefer direct imports over barrel imports.
- Use dynamic imports for heavy or infrequent UI modules.
- Defer analytics and non-critical third-party scripts.

### 3) Reduce unnecessary re-renders
- Do not define components inside other components.
- Keep dependency arrays stable using primitive values when possible.
- Use memoization for expensive computations only.
- Move interaction logic to event handlers instead of generic effects.

## Medium priority

- Use virtualization or `content-visibility` for long lists.
- Use `useDeferredValue` or `startTransition` for input-driven heavy updates.
- Deduplicate global event listeners and prefer passive listeners when applicable.
- Keep localStorage payloads versioned and minimal.

## Code review prompts

- Can these requests run in parallel?
- Can this module be loaded on demand?
- Is this state derivable instead of stored?
- Can this effect be moved to an explicit event?
- Is this component re-rendering due to parent churn?

## Ninewood adaptation

- Prioritize first-screen rendering and list interaction smoothness.
- Optimize for desktop usage patterns in Electron environments.
