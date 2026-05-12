#!/usr/bin/env bash
# 启动 Electron 前清除 ELECTRON_RUN_AS_NODE 环境变量
unset ELECTRON_RUN_AS_NODE
cd "$(dirname "$0")/.."
npx electron client-react
