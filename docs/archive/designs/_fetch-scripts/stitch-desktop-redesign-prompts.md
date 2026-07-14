# Ninewood 桌面端 UI 重设计 · Stitch Prompt 基线

> 目标：1440px Windows 桌面应用（左侧已有 72px 全局侧栏，本稿只设计主内容区）
> 禁止：手机窄栏、居中 max-width 400px、触摸巨型按钮、竖屏单列堆叠

## 通用前缀（所有页面）

```
Ninewood Windows Desktop Application — Main Content Area (1440px viewport, 72px global sidebar already exists outside this frame).
Language: Chinese (Simplified).

CRITICAL — NOT MOBILE:
- Full desktop width content (min 1100px usable)
- Multi-column layouts, split panes, data tables, command toolbars
- Mouse/keyboard UX: hover, precise click targets (not thumb-sized)
- Professional Windows desktop software aesthetic (modern Fluent / enterprise dashboard)
- Typography: Montserrat for headings, system sans for body, 14-16px readable body text
- Dark theme: #000/#0A0A0A surfaces, white/gray text hierarchy, white accent
- Generous but efficient desktop spacing (24-32px sections, not mobile padding)

Include: top command bar with back affordance + page title + primary actions on the right.
```

## 页面规格

### welfare — 公益中心 `/welfare`
- Hero stats row: 公益资金池 ¥12,580 · 我的贡献 ¥320 · 本月认领 2
- Left 60%: 可认领公益需求 table (标题/区域/赏金/状态/认领按钮)
- Right 40%: 发布公益需求 form panel (标题/描述/预期效果/区域ID/发布按钮)
- Bottom: 我的公益奖励 timeline

### cert-center — 认证中心 `/cert-center`
- Left sidebar 280px: 认证路径 stepper (未认证→初级→中级→高级), current highlighted
- Main: 当前等级 hero card + 信誉积分/完成订单 stats
- Progress section: 升级进度 bar 44%, 本月抢单额度, 认证材料状态
- Primary CTA: 申请升级
- Right panel: 认证权益对比 table

### search — 找人 `/search`
- Top: wide search command bar with filters (用户/标签/需求 tabs)
- Below: 3-column grid of user result cards OR split view (filters left 240px, results grid right)
- Sample results with avatar, nickname, cert badge, bio snippet
- Empty state only in results panel, not full page

### my-tags — 我的标签 `/my-tags`
- Left 320px: 已开通标签 list with remove actions + 忙碌状态 toggle panel
- Right: 标签库 grid (multi-column chip grid, categorized: 技术/家政/教育/其他)
- Desktop toggle switches, not mobile sliders
- Status bar: 已开通 3 个标签 · 忙碌中关闭

### payment — 点数支付 `/payment/:id`
- Split: left order summary card, right payment confirmation panel
- Show 订单金额、服务费 5%、实付点数
- Large confirm button but desktop proportions (not full-width mobile)

### follows — 关注 `/follows/:userId`
- Tab bar: 关注 / 粉丝
- Desktop data table: 用户/认证/简介/操作
- Side stats panel

### providers — 找服务者 `/providers`
- Filter sidebar 280px + results table/grid
- Columns: 服务者/标签/区域/状态/操作

### my-bids — 我的应标 `/my-bids`
- Kanban or table view with status columns
- Desktop density
