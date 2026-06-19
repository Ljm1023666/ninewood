#!/usr/bin/env bash
# Clear ELECTRON_RUN_AS_NODE before starting Electron.
unset ELECTRON_RUN_AS_NODE
cd "$(dirname "$0")/.."

# Use project-local Electron CLI to avoid npx fallback installs.
node node_modules/electron/cli.js client-react
