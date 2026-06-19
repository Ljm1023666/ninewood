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

## Current Runtime Notes

- Dev stack entrypoints:
  - `npm run dev`
  - `npm run dev:electron`
- Electron local startup uses project-local CLI (`node node_modules/electron/cli.js`) to avoid `npx` fallback download failures.
