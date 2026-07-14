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
  - `npm run dev`
  - `npm run dev:electron`
- Electron local startup uses project-local CLI (`node node_modules/electron/cli.js`) to avoid `npx` fallback download failures.
