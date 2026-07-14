# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

完成全仓历史残留归档、全 AI 工具上下文隔离与设计规范对齐；此前：`/cert-center` Layout 收敛。

## Changes Made

- 历史工程文档、Task/Stage handoff、一次性报告、Stitch 设计稿/预览/截图已迁入 `docs/archive/**`。
- 一次性路径检索验收、历史重建、seed/fix/诊断脚本已迁入 `archive/scripts/**` 或 `archive/tooling/**`；未移动任何 Vitest、CI 或 package script 依赖。
- `.llmignore` 现在排除 `archive/**`、`docs/archive/**`、`.workbuddy/memory/**`、`.agents/**`、`.reasonix/**`、`.codex-logs/**`、本地 `.env`、上传、`_tmp/**` 与 `DEPLOY.md`。
- `scripts/sync-ai-ignores.mjs` 已同步所有工具 ignore；Claude `permissions.deny`、Copilot 指令、AGENTS / onboarding / CLAUDE / MEMORY 已对齐。
- `.dockerignore` 排除归档和非运行时 AI 工具树，减少构建上下文。
- 根目录污染的 `REASONIX.md` 已迁入 `docs/archive/tooling/`，不再作为会话前缀注入源；一次性问题报告已迁入 `docs/archive/reports/`。
- `DESIGN.md` 已以 `index.css` 的浅色 macOS token 为准重写正文，并移除冗余 Version History；`index.css` 已删除重复 `loop-services.css` import 并修正过时注释。
- `/login` 已完成浅色 macOS 认证界面重构：去除运行时 Canvas 黑底和玻璃导航，保留认证、验证码、合规与法律流程；hCaptcha 改为 light theme。

## Decisions

- `.claude/memory/` 是唯一默认会话记忆入口；`.workbuddy/memory/` 只保留追溯价值并默认隔离。
- `archive/**` 与 `docs/archive/**` 仅在用户明确要求考古时可读。
- **保留** `client-react/public/stitch/**`、`server/ai-knowledge/**`、所有测试、CI 门禁与 package script 依赖。
- 根目录 `DESIGN.md` / `PRODUCT.md` 仍为设计系统规范，未归档。
- 根目录不保留第二份 AI 会话记忆；历史工具记忆须归档并由默认忽略规则隔离。

## Active Issues

- `PRODUCT.md` 的产品表述仍应在下次设计/产品调整时复核，避免重新引入与浅色 token 相冲突的说明。
- GitHub Copilot 企业「内容排除」若启用仍需在网页配置；仓内已用 ignore + 指令双保险。
- `sign-in-flow-1.tsx` 保留了未路由使用的 Three.js 演示导出，定向 lint 仍有其既有 React Three Fiber 规则错误；当前登录入口已不再调用它。

## Next Steps

1. 新开会话验证任意 AI 工具默认不会读取隔离路径。
2. 为需求创建、订单、钱包、卡池等核心前端页面补充组件/集成测试。
