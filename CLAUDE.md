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