---
name: electron-secure-development
description: >
  Security-first Electron process and IPC guidelines.
  Use when creating or modifying main process code, preload bridges, IPC channels, BrowserWindow options, or packaging behavior.
---

# Electron Secure Development

Sources:
- https://github.com/mweinbach/agent-coworker
- https://github.com/sickn33/antigravity-awesome-skills

Reference files:
- `.agents/skills/electron/SKILL.md`
- `skills/electron-development/SKILL.md`

## Objective

Enforce secure defaults across main, preload, and renderer process boundaries.

## Process responsibilities

- **Main**: application lifecycle, windows, native OS capabilities, trusted execution.
- **Preload**: strict bridge layer exposing only approved APIs.
- **Renderer**: UI logic only, no direct access to high-risk Node or Electron surfaces.

## BrowserWindow security baseline

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: /* absolute preload path */
}
```

If any setting is relaxed, document business justification and mitigations.

## IPC design rules

- Use `domain:action` channel naming.
- Expose only minimum required capabilities.
- Validate payloads in main process handlers.
- Normalize and return explicit error objects.
- Never pass unchecked user input into filesystem or command execution.

Preferred pattern:
- `ipcMain.handle` + `contextBridge.exposeInMainWorld`
- Preload wrapper namespace such as `window.electronAPI.*`

## Forbidden patterns

- Enabling `nodeIntegration: true` in renderer.
- Exposing full `ipcRenderer` directly on `window`.
- Executing system commands from unvalidated IPC payloads.
- Disabling security controls in production for convenience.

## Debugging and verification

- Main process issues: inspect startup logs and lifecycle hooks.
- IPC issues: log channel, payload, result, and stack trace.
- Blank window issues: verify preload path, CSP, resource paths, and `did-fail-load` events.
- Before release, perform a privilege regression check for new APIs.

## Pre-release checklist

- Re-verify `contextIsolation`, `sandbox`, and `nodeIntegration`.
- Ensure every `window.electronAPI` method maps to a preload whitelist.
- Ensure sensitive IPC endpoints include validation and error handling.
- Confirm packaging and signing settings match target platform requirements.
