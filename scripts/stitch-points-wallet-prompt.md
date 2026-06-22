# Ninewood 点数钱包 · Stitch 生成 Prompt

> 目标：桌面端 1280px，简体中文，开发期点数（1 点 = 1 元）

## 基础屏（generate_screen_from_text）

```
Ninewood Desktop Points Wallet Page (1280px wide, Electron desktop app).
Language: Chinese (Simplified).

Page: 点数钱包 — user's virtual currency balance and transaction ledger.

Content sections:
1. Header: back arrow + title "点数钱包", subtitle "开发期模拟货币 · 1 点 = 1 元"
2. Balance Hero:
   - Large balance: "986,420.50 点"
   - Secondary: "可用余额" badge
   - Quick stats row: 托管中 1,200 点 · 本月支出 3,580 点 · 本月收入 12,000 点
3. Action row: primary "充值点数（开发）" · secondary "查看订单"
4. Transaction Ledger (table or list):
   - Columns: 时间 | 类型 | 金额 | 余额 | 备注
   - Sample rows:
     - 06-22 14:30 | 扣款 | -50.00 | 986,420.50 | 订单服务费 5%
     - 06-21 09:12 | 托管 | -200.00 | 986,470.50 | 发布需求押金
     - 06-20 18:45 | 结算 | +380.00 | 986,670.50 | 服务完成到账
     - 06-19 11:00 | 退款 | +199.98 | 986,290.50 | 需求撤回退还
5. Footer note: "上线前将替换为真实支付渠道"

Style: Dark glassmorphism, Geist font, accent #3388FF, borders #2A2A2A, WCAG AA contrast.
Use Ninewood Desktop design system tokens.
```

## 5 套风格变体（generate_variants · variantCount: 5 · REIMAGINE）

```
Generate 5 radically different visual styles for this Points Wallet page.
Keep ALL Chinese text and data content identical. Only change layout, color, typography mood.

Variant directions (make each visually unmistakable):
1. DARK GLASS — Ninewood default: dark glass cards, #3388FF accent, subtle blur
2. BENTO DASHBOARD — modular bento grid: balance card, stats tiles, ledger panel
3. SPLIT LEDGER — fixed left panel (balance + actions), right scrollable transaction feed
4. TERMINAL BRUTALIST — monospace font, high-contrast green-on-black, raw table, no rounded corners
5. WARM LUXURY — dark navy + gold accents, premium fintech feel, serif display numbers

Desktop only (1280px). No mobile breakpoints.
```
