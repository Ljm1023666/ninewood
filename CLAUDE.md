# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Development Environment

- OS: **Windows 11 Home China** (version 10.0.26200)
- Shell: **bash** (Git Bash / MSYS2), Unix-style syntax, forward-slash paths
- Note: filesystem is Windows, but commands and paths follow Unix conventions

## Language Guidelines

- Internal reasoning: Keep English (efficiency first)
- Task plans, execution strategies, problem explanations: Use Chinese
- Code comments: Use Chinese
- Final summaries: Use Chinese
- Short replies: Use Chinese

## Auto Effort Switching (Quality-First)

### Rules (lower number = higher priority)

| # | Condition | Effort |
|---|-----------|--------|
| 1 | User explicitly sets effort level | user |
| 2 | Runtime bug, logic error, broken behavior | max |
| 3 | Architecture design, tech decision, planning | max |
| 4 | Refactoring with behavioral changes | max |
| 5 | Logic changes spanning 3+ files | high |
| 6 | Unfamiliar codebase (no prior context) | high |
| 7 | New feature/component (non-boilerplate) | medium |
| 8 | Boilerplate, scaffold, template generation | low |
| 9 | Visual tweak: style, color, spacing | low |
| 10 | Typo, copy, spelling (no logic change) | low |

**Keyword routing** (maps ambiguous phrases to rules above):

```
"fix typo" / "fix spelling"      → #10 (low)
"fix" / "debug" / "broken"       → #2  (max)
"refactor" / "restructure"       → #4  (max)
"create" / "add" / "implement"   → #7  (medium)
"generate" / "scaffold"          → #8  (low)
```

**Tie-breaking:** highest priority wins. "Refactor + fix typo" → #4 > #10 → `max`

**Fallback:** default `high`, uncertain → `max`

**Visibility:** 每次 effort 因规则切换时，必须在回复开头显式输出 `【Effort: <level>】`（如 `【Effort: max】`），并注明触发规则编号。同一 effort 连续多轮不变时不需要重复提示。

## Available Skills

通过 `/` 命令或 Skill 工具调用。按需使用，不猜测不存在的 skill。

| Skill | 用途 |
|---|---|
| `ui-design` | 组件设计品质规范：间距/色彩/动效/状态覆盖/响应式（项目级） |
| `update-config` | 修改 settings.json：hooks、权限、环境变量等 |
| `keybindings-help` | 自定义键盘快捷键绑定 |
| `simplify` | 审查改动代码：复用性、质量、效率 |
| `fewer-permission-prompts` | 扫描历史记录，自动添加常用工具 allowlist，减少权限弹窗 |
| `loop` | 定时循环执行命令或 prompt |
| `claude-api` | 构建/调试/优化 Anthropic SDK 应用（含 prompt caching） |
| `init` | 为新项目初始化 CLAUDE.md |
| `review` | Review Pull Request |
| `security-review` | 对当前分支改动做安全检查 |

## Ninewood 项目执行约定（Electron + React）

以下约定用于减少错误上下文，按“仓库当前实际配置”执行。

### 目录边界

- 仓库根目录：`e:/Ninewood`
- 前端：`client-react/`
- 后端：`server/`
- Electron 代码：`client-react/electron/`
- 归档目录：`archive/`（默认只读，不在无明确要求时改动）
- 构建产物目录（如 `dist/`、`build/`）不手动编辑

### Monorepo 与运行命令

- 包管理：npm workspaces（`server`、`client-react`）
- 联调开发：`npm run dev`（根目录，并行启动 server + client）
- Electron 联调：`npm run dev:electron`（根目录）
- 全量构建：`npm run build`（根目录）
- 类型检查：`npm run typecheck`（根目录）
- 仅前端开发：`npm run dev -w client-react`
- 仅后端开发：`npm run dev -w server`

### 前端技术栈与约定

- React + TypeScript + Vite
- 路由：`react-router-dom`（当前版本 7.x），路由入口在 `client-react/src/router/index.tsx`
- 状态管理：Zustand（新增 store 时保持现有模式）
- 请求库：Axios（优先复用现有 API 层封装）
- 样式：Tailwind CSS v4（配合 `@tailwindcss/vite`）
- 路径别名：`@` -> `client-react/src`（见 `vite.config.ts` 与 `tsconfig.app.json`）
- 组件命名：组件名 PascalCase；文件名优先沿用所在目录既有风格并保持一致

### 后端与接口协作

- 后端框架：Express + Prisma（`server/`）
- 本地 API 地址：`http://localhost:3001`（前端通过 Vite proxy 走 `/api`、`/uploads`、`/socket.io`）
- 涉及前后端字段变更时，优先保证类型与接口契约一致，再改调用方

### Electron 通信约定

- 渲染进程通过 `window.electronAPI` 调用主进程能力
- 预加载脚本入口：`client-react/electron/preload.cjs`
- IPC channel 采用 `domain:action` 风格（示例：`window:quit`、`window:minimize`、`window:maximize`）

### 代码变更完成标准（DoD）

- 只改与需求直接相关的文件，避免顺手重构
- 至少执行并通过相关检查（按改动范围选择）：
  - `npm run typecheck`（根目录，推荐）
  - `npm run lint -w client-react`（若改动前端）
- 若改动运行/构建路径，补充最小可复现验证步骤

## 代码质量工具

- **ESLint**：检查语法与规则问题，运行 `npm run lint`
- **Prettier**：统一格式化，运行 `npm run format`
- **Vitest**：执行前端单元测试，运行 `npm run test`
- **Husky**：提交前触发 `lint-staged`

## 组件测试规范

- 测试文件优先放在 `client-react/src/**/__tests__/`，或使用 `.test.tsx` 命名
- 使用 `vi` 进行 mock 和桩函数控制
- 使用 `screen` 与 `userEvent` 模拟用户交互
- 覆盖率目标：核心逻辑大于 80%

## 开发范围锁定（Windows 电脑端优先）

本项目当前阶段 **只开发 Windows 电脑端**，不考虑移动端适配。

### 强制约束
- 所有 UI 组件默认假设运行在宽屏（>=1280px）环境下
- 不使用 `@media (max-width: 768px)` 等移动端断点
- 不添加 `touch` 相关事件（如 `onTouchStart`、`onTouchEnd`）
- 不引入移动端专用库（如 `@capacitor/*`、`react-swipeable`、`@ionic/react`）
- 不考虑 PWA、Service Worker、离线缓存等移动端特性
- 不考虑移动端底栏安全区（`safe-area-inset-bottom`）

### 允许的范围
- 可以使用 Electron 原生 API（如系统托盘、全局快捷键、本地文件读写）
- 可以使用大屏交互（右键菜单、拖拽、悬浮效果）
- 可以假定用户使用鼠标键盘操作

### 代码审查检查点
- 如果 AI 生成的代码包含移动端适配逻辑，需主动询问并移除
- 默认不生成响应式布局代码

## 新会话快速提示（Windows-only）

项目当前仅做 Windows 电脑端（Electron + React），默认宽屏交互，不做移动端适配。  
禁止生成 touch 事件、移动端断点（max-width:768）、safe-area/PWA/Service Worker 相关代码与依赖。  
如需求与此冲突，请先询问我再实现。