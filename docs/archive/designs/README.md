# 前端设计稿归档

> 默认勿读。考古或对照旧 UI 视觉时再打开。

本目录存放页面级 Stitch HTML/PNG、风格探索变体与毕设演示截图。  
它们 **不是** 现行 UI 规格；实现以代码与现行 ADR 为准。

运行时预览资源若仍在使用，位于 `client-react/public/stitch/`（勿与本稿混淆）。

## 内容一览

| 路径 | 说明 |
|------|------|
| `design/` | 登录 / 路径检索等 Stitch HTML+PNG |
| `designs/` | 路径检索风格变体 PNG |
| `stitch/` | 找服务 loop-services 渲染图（原 `docs/specs/stitch`） |
| `stitch-circle-*` | 圈子详情 / Hub 子页变体 |
| `stitch-desktop-redesign/` | 桌面改版一批页面稿 |
| `stitch-points-wallet/` / `stitch-wallet-hub-subpages/` | 钱包相关变体 |
| `stitch-tax-visualizer/` | 税务可视化变体 |
| `thesis-demo-screenshots/` | 毕设演示用页面截图 |
| `ui-renderings-gallery.html` 等 | 根目录迁入的浏览 / 审计 / 后台预览页 |
| `_fetch-scripts/` | 当时一次性下载/生成脚本（输出路径已指向本归档） |

重新生成浏览页：`node scripts/generate-ui-renderings-gallery.mjs`（输出写回本目录）。
