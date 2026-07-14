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
- Natural Loop authority: `docs/回的理念.md` + `docs/specs/NATURAL-LOOP-V2-ADR.md`.
