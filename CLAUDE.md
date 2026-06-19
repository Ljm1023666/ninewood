# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Do not assume. Do not hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them instead of choosing silently.
- If a simpler approach exists, say so.
- If something is unclear, stop and ask.

## 2. Simplicity First

**Write the minimum code that solves the problem. Nothing speculative.**

- No features beyond what was requested.
- No abstractions for single-use code.
- No configurability that was not requested.
- No defensive handling for impossible scenarios.
- If 200 lines can be 50, rewrite.

Ask: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what is required. Clean up only your own mess.**

When editing existing code:
- Do not improve adjacent code, comments, or formatting unless needed.
- Do not refactor healthy code.
- Match existing style.
- If unrelated dead code is noticed, mention it rather than deleting it.

When your change creates orphans:
- Remove imports/variables/functions made unused by your change.
- Do not remove pre-existing dead code unless asked.

Every changed line should directly trace to the user's request.

## 4. Goal-Driven Execution

**Define verifiable success criteria and loop until verified.**

Examples:
- "Add validation" -> "Write tests for invalid inputs, then make them pass."
- "Fix the bug" -> "Write a failing reproduction test, then make it pass."
- "Refactor X" -> "Ensure tests pass before and after."

For multi-step tasks, keep a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong criteria support independent execution. Weak criteria require repeated clarification.

---

**Guidelines are working when:** diffs are smaller, rewrites are fewer, and clarifying questions happen before implementation mistakes.

## Development Environment

- OS: **Windows 11 Home China** (version 10.0.26200)
- Shell: **bash** (Git Bash / MSYS2), Unix-style syntax, forward-slash paths
- Note: filesystem is Windows, but commands and paths follow Unix conventions

## Language Guidelines

- Internal reasoning: use English
- Task plans, execution strategy, and explanations: use Chinese
- Code comments: use Chinese
- Final summaries: use Chinese
- Short replies: use Chinese

## Auto Effort Switching (Quality-First)

### Rules (lower number = higher priority)

| # | Condition | Effort |
|---|-----------|--------|
| 1 | User explicitly sets effort level | user |
| 2 | Runtime bug, logic error, broken behavior | max |
| 3 | Architecture design, technical decisions, planning | max |
| 4 | Refactoring with behavioral changes | max |
| 5 | Logic changes across 3+ files | high |
| 6 | Unfamiliar codebase (no prior context) | high |
| 7 | New feature/component (non-boilerplate) | medium |
| 8 | Boilerplate, scaffold, template generation | low |
| 9 | Visual tweak: style, color, spacing | low |
| 10 | Typo or wording fix (no logic change) | low |

**Keyword routing**:
```
"fix typo" / "fix spelling"    -> #10 (low)
"fix" / "debug" / "broken"     -> #2  (max)
"refactor" / "restructure"     -> #4  (max)
"create" / "add" / "implement" -> #7  (medium)
"generate" / "scaffold"        -> #8  (low)
```

**Tie-breaker:** highest priority wins.  
**Fallback:** default `high`, if uncertain then `max`.

**Visibility:** each time effort level changes due to rule matching, output `【Effort: <level>】` at the start of the reply and mention the triggering rule number. If effort does not change across consecutive turns, repeating it is not required.

## Available Skills

Use through `/` commands or the Skill tool as needed. Do not assume missing skills exist.

| Skill | Purpose |
|---|---|
| `ui-design` | UI quality rules for spacing, colors, motion, and state coverage (project-level) |
| `update-config` | Update `settings.json` (hooks, permissions, environment variables) |
| `keybindings-help` | Configure custom keyboard shortcuts |
| `simplify` | Review code changes for reuse, quality, and efficiency |
| `fewer-permission-prompts` | Scan history and add common allowlist entries to reduce permission prompts |
| `loop` | Run commands/prompts on an interval |
| `claude-api` | Build/debug/optimize Anthropic SDK applications (including prompt caching) |
| `init` | Initialize `CLAUDE.md` for new projects |
| `review` | Review pull requests |
| `security-review` | Perform a security review of current branch changes |

## Ninewood Project Conventions (Electron + React)

Follow these conventions to reduce context mismatch and align with the repository's current setup.

### Directory boundaries

- Repository root: `e:/Ninewood`
- Frontend: `client-react/`
- Backend: `server/`
- Electron code: `client-react/electron/`
- Archive directory: `archive/` (read-only by default unless explicitly requested)
- Build artifacts (`dist/`, `build/`, etc.): do not edit manually

### Monorepo and run commands

- Package management: npm workspaces (`server`, `client-react`)
- Full-stack dev: `npm run dev` (root, runs server + client in parallel)
- Electron dev: `npm run dev:electron` (root)
- Full build: `npm run build` (root)
- Type checking: `npm run typecheck` (root)
- Frontend only: `npm run dev -w client-react`
- Backend only: `npm run dev -w server`

### Frontend stack and conventions

- React + TypeScript + Vite
- Router: `react-router-dom` (7.x), entry at `client-react/src/router/index.tsx`
- State: Zustand (follow existing store patterns)
- HTTP client: Axios (prefer existing API wrappers)
- Styling: Tailwind CSS v4 with `@tailwindcss/vite`
- Path alias: `@` -> `client-react/src` (see `vite.config.ts`, `tsconfig.app.json`)
- Naming: components in PascalCase; file naming should follow local directory style

### Backend and API collaboration

- Backend framework: Express + Prisma (`server/`)
- Local API base: `http://localhost:3001` (frontend uses Vite proxy for `/api`, `/uploads`, `/socket.io`)
- For frontend/backend field changes, keep type and API contract consistency first, then update callers

### Electron communication conventions

- Renderer calls main-process capabilities via `window.electronAPI`
- Preload entry: `client-react/electron/preload.cjs`
- IPC channels use `domain:action` style (for example: `window:quit`, `window:minimize`, `window:maximize`)

### Definition of Done (DoD) for code changes

- Change only files directly related to the request
- Run and pass relevant checks:
  - `npm run typecheck` (root, recommended)
  - `npm run lint -w client-react` (when frontend is changed)
- If run/build paths changed, provide minimal reproducible verification steps

## Code Quality Tooling

- **ESLint**: syntax and rule checks via `npm run lint`
- **Prettier**: formatting via `npm run format`
- **Vitest**: frontend unit tests via `npm run test`
- **Husky**: pre-commit hooks via `lint-staged`

## Component Testing Standards

- Prefer test files in `client-react/src/**/__tests__/` or use `.test.tsx`
- Use `vi` for mocks/stubs
- Use `screen` and `userEvent` for interaction simulation
- Coverage target: core logic above 80%

## Scope Lock (Windows Desktop First)

At the current stage, this project targets **Windows desktop only** and does not support mobile adaptation.

### Mandatory constraints
- Assume wide-screen desktop environment (>=1280px) for UI components
- Do not add mobile breakpoints like `@media (max-width: 768px)`
- Do not add touch events (`onTouchStart`, `onTouchEnd`, etc.)
- Do not add mobile-specific libraries (`@capacitor/*`, `react-swipeable`, `@ionic/react`)
- Do not introduce PWA, Service Worker, or offline/mobile cache features
- Do not add mobile safe-area handling such as `safe-area-inset-bottom`

### Allowed scope
- Electron native APIs are allowed (tray, global shortcuts, local file read/write)
- Large-screen interactions are allowed (context menus, drag-and-drop, hover-heavy flows)
- Assume keyboard and mouse usage

### Code review checkpoints
- If generated code includes mobile adaptation logic, ask and remove it
- Do not generate responsive mobile layout by default

## New Session Quick Prompt (Windows-only)

The project is Windows desktop only (Electron + React), with default wide-screen interaction and no mobile adaptation.  
Do not generate touch events, mobile breakpoints (`max-width:768`), or safe-area/PWA/Service Worker related code and dependencies.  
If a requirement conflicts with this scope, ask for confirmation before implementation.

## Session Memory Policy

At the end of each substantial session, run the `session-memory-loop` skill and persist continuity artifacts:

- Update `.claude/memory/SESSION-ANCHOR.md`
- Append durable lessons to `.claude/memory/LEARNINGS.md`
- Update `.claude/memory/MEMORY.md` only for stable, long-lived constraints or decisions

At the beginning of a new session, read these files before implementation to reduce repeated mistakes.
