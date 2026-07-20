# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

提交并推送：生产客户端指向 `tothetomorrow.com`、资料封面原图、Windows 云端接入文档，以及 **macOS 发布页 AI 复刻说明**。

## Changes Made

- 前端 `runtime-origin`：Electron/生产 API·Socket·静态资源走 `https://tothetomorrow.com`
- Profile 封面优先原图 `/uploads/covers/…`
- 文档：`docs/MACOS-PUBLISH-PAGE-AI.md`（发布页 AI 业务+实现）、`docs/WINDOWS-CURSOR-CLOUD-ACCESS.md`
- 云端 LLM 已切公网 + 本机 Key 同步（仅服务器 `.env`，不进 Git）

## Decisions

- 短信/LLM 密钥唯一源：`/opt/ninewood/server/.env`
- LLM 不经 Mac Tailscale；pm2 需干净重启以免旧 env 覆盖 dotenv

## Active Issues

- 无阻塞；用户验收发布页「分析」即可

## Next Steps

1. macOS 侧按 `docs/MACOS-PUBLISH-PAGE-AI.md` 对齐
2. 如需前端产物上云，另做 build/deploy（勿提交 `_frontend_dist.tgz`）
