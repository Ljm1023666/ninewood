# SESSION ANCHOR

Use this file as the compact handoff state between sessions.

## Intent

回中心顶栏：消除 Tab 错位、初次切换闪烁；Tab 切换做成登录页同款滑块。

## Changes Made

- `LoopHubLayout`：三 Tab 共用持久壳；挂载时预取三页 chunk；HubLazy fallback=null。
- 路由：`discover/mine/accept` 收拢到 Auth Layout 下的 `loops` 父路由（此前 discover/accept 与 mine 分属两棵树易整页闪）。
- `LoopHubNav`：登录页 `sign-in-flow-login-methods` 式 `::before` 滑块。
- `PageTransition`：`/loops/(discover|mine|accept)` 共用 key `/loops-hub`。
- 各页去掉重复 `LoopHubNav` 包裹。

## Decisions

- **全 AI 隔离（用户已定，勿改）**：`.llmignore` 为权威源。

## Active Issues

- 承接人回 PathSearch 仍重，首次进 hub 预取可能略增网络；可接受以换无闪烁。
- `/cert-center`、PRODUCT/DESIGN YAML 对齐仍待。

## Next Steps

1. 浏览器验收：连续点三 Tab——滑块应平滑，初次不应整页 loader。
2. （可选）详情页 `/loops/runs|/offerings` 也可挂进同一壳。
