# MEMORY

Curated long-term project memory for AI sessions.

## Project Identity

- Project: Ninewood
- Stack: Electron + React + Express + Prisma
- Platform scope: Windows desktop only

## Stable Constraints

- Do not add mobile adaptation features unless explicitly requested.
- Keep changes surgical and tied directly to user requests.
- Prefer existing project conventions over introducing new abstractions.
- Applies to **all AI tools**: never read `archive/**`, `docs/archive/**`, `.workbuddy/memory/**`, `.agents/**`, or `.reasonix/**` as current truth unless the user explicitly requests archaeology. `.llmignore` / synced tool ignores exclude them; Claude adds `permissions.deny`.

## Working Agreements

- Record architecture decisions with rationale.
- Keep API contract changes synchronized across backend and frontend API layers.
- Prefer explicit verification steps after meaningful implementation.
- `/services` is the capability registry; `/loops` is the authenticated user's run-state center.
- The run center may expose HUMAN/EARTH/HEAVEN as display partitions, while `LoopRun.loopKind` remains immutable during view operations.
- `Demand` remains the demand-card domain object; `ServiceCard` is an independent public service declaration with its own owner and lifecycle.
- Objective service-card experience must be derived from completed orders and stored as aggregate facts only; never expose customer identity, order IDs, demand body, or private messages.
- Card consultation uses `CardAttachment` snapshots attached to messages; later card edits or unpublishing must not mutate historical message content.

## Current Runtime Notes

- Dev stack entrypoints:
  - `pnpm run dev`
  - `pnpm run dev:electron`
- Electron local startup uses project-local CLI (`node node_modules/electron/cli.js`) to avoid `npx` fallback download failures.
- Do not read `archive/**`, `docs/archive/**`, secondary AI logs, local `.env` files, uploads, temporary generator output, or `DEPLOY.md` unless the user explicitly authorizes it.
- Natural Loop authority: `docs/回的理念.md` + `docs/specs/NATURAL-LOOP-V2-ADR.md` + `docs/specs/NATURAL-LOOP-V3-ADR.md` + `docs/specs/NATURAL-LOOP-V4-ADR.md`.
- Loop paid runs use WalletLedger keys `loopRun:{id}:*` only; never `settleDemand` / demand-bound WalletHold.
- Loop V3：组合路径用代码 Recipe + `LoopLink`（不新增核心表）；地回成功必须天回核验；开放供给首轮仅 EXTERNAL_API；经济骨架只写结算资格事件，不接管钱包。
- 液态玻璃收纳：调 `--liquid-glass-*`（`index.css`）；氛围默认开，`html[data-layout-ambient='on']` 强制壳透明 + 收纳件同层玻璃；勿逐页硬编码白底。
- 全站页面氛围图：`/bg/ambient-light.png` / `/bg/ambient-dark.png`（随 appearance 切换）；不跟个人封面；个人主页有 `coverUrl` 时覆盖，无则透出主题图。
- 看不见 UI：`client-react/src/styles/liquid-glass-global.css` + `html[data-layout-ambient=on]`；调材质只改 `--liquid-glass-*`。
