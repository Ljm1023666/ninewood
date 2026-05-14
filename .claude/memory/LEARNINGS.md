# LEARNINGS

Append-only operational lessons to reduce repeated mistakes.

## 2026-05-14

- Browser extension interference can make GitHub appear slow even when network/proxy settings are correct.
- `npx electron` may trigger on-demand binary downloads and fail under unstable network conditions.
- Using project-local Electron CLI (`node node_modules/electron/cli.js`) is more reliable for repeatable startup.
- For long troubleshooting sessions, keep a short artifact trail: changed files, key commands, exact errors, and final fix.

