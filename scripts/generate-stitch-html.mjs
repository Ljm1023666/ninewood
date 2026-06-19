/**
 * 批量生成 Ninewood Stitch v3 · Achromatic Precision HTML 稿
 * 用法: node scripts/generate-stitch-html.mjs
 * 输出: _tmp/stitch/*.html + index.html
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', '_tmp', 'stitch')
mkdirSync(OUT, { recursive: true })

const HEAD = `<!DOCTYPE html>
<html class="dark" lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta content="width=1280" name="viewport"/>
<title>{{TITLE}} — Ninewood Stitch v3</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<script>
tailwind.config={darkMode:"class",theme:{extend:{colors:{background:"#000000",surface:"#000000","surface-container":"#0F0F0F","surface-container-low":"#1A1C1C",primary:"#3388FF","on-primary":"#ffffff","on-surface":"#e2e2e2","on-surface-variant":"#c1c6d6",outline:"#5A5A5A","surface-variant":"#2A2A2A"},spacing:{gutter:"24px","margin-sm":"16px","margin-lg":"48px","vertical-rhythm":"48px","sidebar-width":"200px"},fontFamily:{body:["Hanken Grotesk"],"display-title":["Hanken Grotesk"],"mono-data":["JetBrains Mono"],"section-label":["JetBrains Mono"]},fontSize:{"display-title":["32px",{lineHeight:"1.2",letterSpacing:"-0.03em",fontWeight:"500"}],"section-label":["10px",{lineHeight:"16px",letterSpacing:"0.12em",fontWeight:"500"}],"body":["14px",{lineHeight:"20px"}], "mono-data":["12px",{lineHeight:"18px"}]},borderRadius:{xl:"12px"}}}}
</script>
<style>
body{background:#000;color:#e2e2e2;font-family:Hanken Grotesk,sans-serif;min-width:1280px}
.material-symbols-outlined{font-family:'Material Symbols Outlined';font-size:24px;line-height:1;vertical-align:middle}
.hairline{border:1px solid rgba(255,255,255,.06)}
.hairline-b{border-bottom:1px solid rgba(255,255,255,.06)}
.card-border{border:1px solid #2A2A2A}
.status-chip{font-family:JetBrains Mono;font-size:10px;padding:2px 6px;border:1px solid rgba(255,255,255,.15);text-transform:uppercase;letter-spacing:.06em}
.status-amber{color:#fcd34d;border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.08)}
.status-blue{color:#93c5fd;border-color:rgba(51,136,255,.35);background:rgba(51,136,255,.08)}
.status-green{color:#6ee7b7;border-color:rgba(16,185,129,.35);background:rgba(16,185,129,.08)}
.list-card{background:#0F0F0F;border:1px solid #2A2A2A;border-radius:12px;padding:16px;transition:background .2s}
.list-card:hover{background:#151515}
.seg{display:flex;padding:4px;border:1px solid rgba(255,255,255,.06);border-radius:8px;background:#1A1C1C;min-height:44px}
.seg button{flex:1;border:none;background:transparent;color:#c1c6d6;font-size:14px;padding:8px;cursor:pointer;border-radius:6px}
.seg button.on{background:#3388FF;color:#fff;font-weight:600}
.settings-panel{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.01)}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:24px;border-bottom:1px solid rgba(255,255,255,.06)}
.settings-row:last-child{border-bottom:none}
.toggle{width:14px;height:14px;border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;background:#3388FF;border-color:#3388FF}
.skeleton{background:#1a1c1c;height:16px;border-radius:4px}
.empty{border:1px dashed rgba(255,255,255,.12);padding:48px;text-align:center;color:#5a5a5a}
.sidebar{width:200px;border-right:1px solid rgba(255,255,255,.06);padding:48px 24px;flex-shrink:0}
.sidebar a{display:flex;align-items:center;gap:12px;padding:8px 12px;margin:0 -12px;font-family:JetBrains Mono;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5a5a5a;text-decoration:none}
.sidebar a:hover,.sidebar a.active{color:#3388FF;background:rgba(255,255,255,.02)}
.profile-hero{border:1px solid rgba(255,255,255,.06);padding:24px;background:rgba(255,255,255,.01)}
.profile-metrics{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid rgba(255,255,255,.06)}
.profile-metrics>div{padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,.06)}
.profile-metrics>div:last-child{border-right:none}
.profile-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid rgba(255,255,255,.06)}
.profile-grid>div{padding:16px 20px;display:flex;gap:12px;align-items:center;border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.profile-grid>div:nth-child(2n){border-right:none}
.profile-grid>div:nth-last-child(-n+2){border-bottom:none}
.profile-dock{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid rgba(255,255,255,.06)}
.profile-dock button{border:none;background:transparent;border-right:1px solid rgba(255,255,255,.06);padding:16px 8px;color:#5a5a5a;font-family:JetBrains Mono;font-size:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px}
.profile-dock button:last-child{border-right:none}
.search-input{width:100%;background:transparent;border:1px solid rgba(255,255,255,.1);padding:12px 16px;color:#e2e2e2;font-family:JetBrains Mono;font-size:14px}
.search-input:focus{outline:none;border-color:#3388FF}
.grid-tile{border:1px solid rgba(255,255,255,.06);padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:120px;color:#c1c6d6;font-size:13px;cursor:pointer;transition:background .15s}
.grid-tile:hover{background:rgba(255,255,255,.02)}
.stat-card{border:1px solid rgba(255,255,255,.06);padding:20px;background:rgba(255,255,255,.01)}
.chat-bubble{max-width:70%;padding:12px 16px;border:1px solid rgba(255,255,255,.06);font-size:14px;line-height:1.5}
.chat-user{margin-left:auto;background:rgba(51,136,255,.12);border-color:rgba(51,136,255,.25)}
.chat-ai{margin-right:auto;background:rgba(255,255,255,.02)}
</style>
</head>
<body class="antialiased min-h-screen">`

function header(title, back = true) {
  return `<header class="w-full h-[48px] flex items-center px-margin-lg hairline-b mb-4 max-w-[1000px] mx-auto">
${back ? `<a href="index.html" class="text-[#c1c6d6] hover:text-[#3388FF] flex items-center"><span class="material-symbols-outlined">chevron_left</span></a>` : ''}
<h1 class="font-display-title text-display-title ml-4 text-[#e2e2e2]">${title}</h1>
</header>`
}

function listCard(title, status, statusClass, date, price, completed = false) {
  const op = completed ? ' opacity-80' : ''
  const priceColor = completed ? 'text-[#e2e2e2]' : 'text-[#3388FF]'
  return `<article class="list-card flex flex-col gap-3 cursor-pointer${op}">
<div class="flex justify-between items-start gap-4">
<h2 class="font-semibold text-lg tracking-wide${op}">${title}</h2>
<span class="status-chip ${statusClass}">${status}</span>
</div>
<div class="flex justify-between items-end">
<span class="text-sm text-[#c1c6d6] flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">calendar_today</span>${date}</span>
<span class="font-mono font-semibold text-lg ${priceColor}">¥${price}</span>
</div>
</article>`
}

function segmented(tabs, active = 0) {
  return `<div class="seg">${tabs.map((t, i) => `<button class="${i === active ? 'on' : ''}">${t}</button>`).join('')}</div>`
}

function mainWrap(content, maxW = 'max-w-4xl') {
  return `<main class="w-full ${maxW} mx-auto px-margin-lg pb-margin-lg flex flex-col gap-vertical-rhythm">${content}</main>`
}

function listPage({ title, tabs, items, empty = '暂无数据' }) {
  const cards = items
    .map((it) =>
      listCard(it.title, it.status, it.cls, it.date, it.price, it.done),
    )
    .join('\n')
  return (
    HEAD.replace('{{TITLE}}', title) +
    header(title) +
    mainWrap(
      `${tabs ? `<section>${segmented(tabs)}</section>` : ''}
<section class="flex flex-col gap-3">${cards}</section>
<section class="empty mt-4"><span class="material-symbols-outlined text-4xl opacity-40 block mb-2">inbox</span>${empty}</section>`,
    ) +
    '</body></html>'
  )
}

function settingsProPage({ title, sections }) {
  const body = sections
    .map(
      (s) => `<section class="mb-vertical-rhythm">
<h2 class="font-section-label text-section-label uppercase tracking-widest text-[#5a5a5a] mb-6 pb-2 hairline-b">${s.label}</h2>
<div class="settings-panel">${s.rows
        .map(
          (r, i) => `<div class="settings-row${i === s.rows.length - 1 ? ' style="border:none"' : ''}">
<div><p class="text-body text-[#e2e2e2]">${r.label}</p>${r.desc ? `<p class="font-mono text-mono-data text-[#5a5a5a] mt-1">${r.desc}</p>` : ''}</div>
${r.control || '<span class="material-symbols-outlined text-[#5a5a5a]">chevron_right</span>'}
</div>`,
        )
        .join('')}</div></section>`,
    )
    .join('')
  return (
    HEAD.replace('{{TITLE}}', title) +
    `<div class="flex min-h-screen"><aside class="sidebar flex flex-col">
<div class="mb-12"><h1 class="text-[32px] font-medium tracking-tight">NINEWOOD</h1><p class="font-section-label text-section-label text-[#5a5a5a] mt-1">PRO SETTINGS</p></div>
<nav class="flex flex-col gap-2 flex-1">
<a href="stitch-settings.html" class="active"><span class="material-symbols-outlined text-[16px]">person</span>账户</a>
<a href="#"><span class="material-symbols-outlined text-[16px]">contrast</span>外观</a>
<a href="stitch-push-settings.html"><span class="material-symbols-outlined text-[16px]">notifications</span>通知</a>
</nav>
</aside>
<div class="flex-1 pt-[72px] pb-margin-lg px-12 max-w-[1000px]">${body}</div></div></body></html>`
  )
}

function profilePage() {
  return (
    HEAD.replace('{{TITLE}}', '个人主页') +
    header('张师傅水电') +
    mainWrap(
      `<section class="profile-hero">
<div class="flex gap-4 items-start">
<div class="w-[88px] h-[88px] border border-white/20 bg-[#1a1a1a] flex items-center justify-center text-2xl font-semibold grayscale">张</div>
<div><h2 class="text-lg font-semibold">张师傅水电</h2><p class="font-mono text-[10px] uppercase tracking-wider text-[#5a5a5a] mt-1">高级认证</p></div>
</div>
<p class="mt-5 text-sm text-[#c1c6d6] leading-relaxed">20年水电维修经验，持电工证，朝阳区随叫随到，擅长老旧线路改造和智能家居安装</p>
<p class="mt-2 text-sm text-[#5a5a5a] flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">location_on</span>IP 属地：110000</p>
<div class="mt-5 flex gap-2">
<button class="hairline px-4 py-2 text-sm font-mono text-[#e2e2e2] bg-transparent cursor-pointer"><span class="material-symbols-outlined text-[16px]">edit</span> 编辑资料</button>
<button class="hairline px-4 py-2 text-sm font-mono text-[#e2e2e2] bg-transparent cursor-pointer">更换背景</button>
</div></section>
<section class="profile-metrics">
<div><span class="text-[28px] font-semibold tabular-nums">2</span><p class="font-mono text-xs text-[#5a5a5a] mt-1">关注</p></div>
<div><span class="text-[28px] font-semibold tabular-nums">0</span><p class="font-mono text-xs text-[#5a5a5a] mt-1">粉丝</p></div>
<div class="flex flex-col items-center gap-1"><span class="material-symbols-outlined">verified_user</span><p class="font-mono text-xs text-[#5a5a5a]">高级认证</p></div>
</section>
<section class="profile-grid">
<div><span class="material-symbols-outlined text-[#c1c6d6]">star</span><div><p class="font-mono text-xs text-[#5a5a5a]">信誉积分</p><p class="font-semibold">92</p></div></div>
<div><span class="material-symbols-outlined text-[#c1c6d6]">bolt</span><div><p class="font-mono text-xs text-[#5a5a5a]">本月抢单</p><p class="font-semibold">3/3</p></div></div>
<div><span class="material-symbols-outlined text-[#c1c6d6]">trending_up</span><div><p class="font-mono text-xs text-[#5a5a5a]">完成订单</p><p class="font-semibold">68</p></div></div>
<div><span class="material-symbols-outlined text-[#c1c6d6]">group</span><div><p class="font-mono text-xs text-[#5a5a5a]">关注/粉丝比</p><p class="font-semibold">0%</p></div></div>
</section>
<nav class="profile-dock">
<button><span class="material-symbols-outlined">workspace_premium</span>认证</button>
<button><span class="material-symbols-outlined">description</span>需求</button>
<button><span class="material-symbols-outlined">favorite</span>收藏</button>
<button><span class="material-symbols-outlined">shopping_bag</span>订单</button>
<button><span class="material-symbols-outlined">chat</span>消息</button>
<button><span class="material-symbols-outlined">settings</span>设置</button>
</nav>`,
      'max-w-[1000px]',
    ) +
    '</body></html>'
  )
}

function searchPage(title, placeholder, results) {
  const cards = results
    .map(
      (r) => `<article class="list-card cursor-pointer"><div class="flex gap-4 items-center">
<div class="w-12 h-12 border border-white/15 bg-[#1a1a1a] flex items-center justify-center font-mono">${r.init}</div>
<div class="flex-1 min-w-0"><h3 class="font-semibold truncate">${r.name}</h3><p class="font-mono text-xs text-[#5a5a5a] mt-1">${r.meta}</p></div>
<span class="status-chip status-blue">${r.tag}</span></div></article>`,
    )
    .join('')
  return (
    HEAD.replace('{{TITLE}}', title) +
    header(title) +
    mainWrap(
      `<section><input class="search-input" placeholder="${placeholder}" value="水电"/></section>
<section class="flex flex-col gap-3">${cards}</section>`,
    ) +
    '</body></html>'
  )
}

function messagesPage() {
  return (
    HEAD.replace('{{TITLE}}', '消息') +
    `<div class="flex h-screen min-w-[1280px]">
<aside class="w-[320px] hairline-b-0 border-r border-white/6 flex flex-col">
<div class="h-[48px] flex items-center px-6 hairline-b"><h1 class="text-xl font-medium">消息</h1></div>
<div class="flex-1 overflow-y-auto">${[
      ['张师傅水电', '好的，明天上午见', '14:32', true],
      ['李工维修', '报价已更新', '昨天', false],
      ['系统通知', '认证审核通过', '周一', false],
    ]
      .map(
        ([n, m, t, a]) => `<div class="px-6 py-4 hairline-b cursor-pointer hover:bg-white/[0.02] flex gap-3">
<div class="w-10 h-10 bg-[#1a1a1a] border border-white/10 flex items-center justify-center font-mono text-sm">${n[0]}</div>
<div class="flex-1 min-w-0"><div class="flex justify-between"><span class="font-medium text-sm">${n}</span><span class="font-mono text-[10px] text-[#5a5a5a]">${t}</span></div>
<p class="text-sm text-[#5a5a5a] truncate mt-1">${m}</p></div>${a ? '<span class="w-2 h-2 rounded-full bg-[#3388FF] mt-2"></span>' : ''}</div>`,
      )
      .join('')}</div>
</aside>
<main class="flex-1 flex flex-col">
<div class="h-[48px] flex items-center px-6 hairline-b gap-3"><a href="index.html" class="text-[#c1c6d6]"><span class="material-symbols-outlined">chevron_left</span></a><span class="font-medium">张师傅水电</span></div>
<div class="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
<div class="chat-bubble chat-ai">您好，请问需要什么服务？</div>
<div class="chat-bubble chat-user">办公室网络布线，大概 200 平米</div>
<div class="chat-bubble chat-ai">了解，方便发一下平面图吗？</div>
</div>
<div class="p-4 hairline-t border-t border-white/6"><input class="search-input" placeholder="输入消息…"/></div>
</main></div></body></html>`
  )
}

function demandCreatePage() {
  return (
    HEAD.replace('{{TITLE}}', '发布需求') +
    `<div class="flex h-screen min-w-[1280px]">
<aside class="w-[400px] border-r border-white/6 flex flex-col">
<div class="h-[48px] flex items-center px-6 hairline-b gap-2"><a href="index.html"><span class="material-symbols-outlined">chevron_left</span></a><h1 class="font-medium">需求工作区</h1></div>
<div class="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
<div class="chat-bubble chat-user">我需要办公室网络布线，200平米，预算 5000 左右</div>
<div class="chat-bubble chat-ai">已识别：网络布线 · 办公场景 · 预算 ¥5000。正在生成需求卡片…</div>
</div>
<div class="p-4 border-t border-white/6"><input class="search-input" placeholder="描述你的需求，AI 将协助结构化…"/></div>
</aside>
<main class="flex-1 p-margin-lg flex items-center justify-center bg-black">
<div class="w-[420px] hairline rounded-xl p-6 bg-[#0F0F0F]">
<p class="font-section-label text-section-label text-[#5a5a5a] uppercase mb-4">预览卡片</p>
<h2 class="text-xl font-semibold mb-2">办公室网络布线</h2>
<p class="text-sm text-[#c1c6d6] mb-4">200㎡ 办公区，六类线 + AP 覆盖，含弱电间整理</p>
<div class="flex justify-between font-mono text-sm"><span class="text-[#5a5a5a]">预算</span><span class="text-[#3388FF]">¥5,000</span></div>
<button class="w-full mt-6 py-3 bg-[#3388FF] text-white font-mono text-sm border-none cursor-pointer">发布需求</button>
</div></main></div></body></html>`
  )
}

function cardPoolPage() {
  return (
    HEAD.replace('{{TITLE}}', '卡池') +
    header('卡池') +
    mainWrap(
      `<section class="grid grid-cols-5 gap-0 hairline">
${['桌面', '手牌', '卡包', '弃牌堆', '资源'].map((l) => `<div class="grid-tile"><span class="material-symbols-outlined text-[32px]">${l === '桌面' ? 'grid_view' : l === '手牌' ? 'style' : l === '卡包' ? 'layers' : l === '弃牌堆' ? 'delete' : 'folder'}</span>${l}</div>`).join('')}
</section>
<section class="hairline p-6 min-h-[320px] flex items-center justify-center text-[#5a5a5a] font-mono text-sm">桌面区域 · 拖拽卡片到此</section>`,
      'max-w-[1152px]',
    ) +
    '</body></html>'
  )
}

function dashboardPage() {
  return (
    HEAD.replace('{{TITLE}}', '管理后台') +
    header('管理后台', false) +
    mainWrap(
      `<section class="grid grid-cols-4 gap-4">
${[
        ['总用户', '12,480', 'trending_up'],
        ['活跃需求', '386', 'description'],
        ['成交额', '¥2.4M', 'payments'],
        ['待审核', '23', 'pending'],
      ]
        .map(
          ([l, v, ic]) => `<div class="stat-card"><p class="font-mono text-xs text-[#5a5a5a] uppercase">${l}</p><p class="text-2xl font-semibold mt-2 tabular-nums">${v}</p><span class="material-symbols-outlined text-[#5a5a5a] mt-4 text-[20px]">${ic}</span></div>`,
        )
        .join('')}
</section>
<section class="settings-panel p-6"><h3 class="font-section-label text-section-label text-[#5a5a5a] uppercase mb-4">最近订单</h3>
${listCard('办公室网络布线', '服务中', 'status-amber', '2026-06-10', '1,200')}</section>`,
      'max-w-[1152px]',
    ) +
    '</body></html>'
  )
}

function agentPage() {
  return (
    HEAD.replace('{{TITLE}}', 'AI 助手') +
    header('AI 助手') +
    mainWrap(
      `<section class="flex flex-col gap-4 min-h-[480px]">
<div class="chat-bubble chat-ai">你好，我是九木 AI 助手。可以帮你发布需求、匹配服务者或解读认证规则。</div>
<div class="chat-bubble chat-user">帮我写一条水电维修需求</div>
<div class="chat-bubble chat-ai">好的。建议标题：「朝阳区老旧小区电路检修」。需要我补充预算和标签吗？</div>
</section>
<section><input class="search-input" placeholder="向 AI 助手提问…"/></section>`,
      'max-w-[896px]',
    ) +
    '</body></html>'
  )
}

function prosePage(title, sections) {
  const body = sections
    .map(
      (s) => `<h2 class="text-lg font-semibold mt-8 mb-3">${s.h}</h2><p class="text-sm text-[#c1c6d6] leading-relaxed">${s.p}</p>`,
    )
    .join('')
  return (
    HEAD.replace('{{TITLE}}', title) +
    header(title) +
    mainWrap(`<article class="max-w-2xl">${body}</article>`, 'max-w-3xl') +
    '</body></html>'
  )
}

function certCenterPage() {
  return (
    HEAD.replace('{{TITLE}}', '认证中心') +
    header('认证中心') +
    mainWrap(
      `<section class="settings-panel p-6 flex gap-6 items-center">
<div class="w-20 h-20 border-2 border-[#3388FF]/40 flex items-center justify-center"><span class="material-symbols-outlined text-[40px] text-[#3388FF]">verified_user</span></div>
<div><p class="font-mono text-xs text-[#5a5a5a] uppercase">当前等级</p><h2 class="text-2xl font-semibold mt-1">高级认证</h2><p class="text-sm text-[#c1c6d6] mt-2">信誉积分 92 · 完成订单 68</p></div>
</section>
<section class="settings-panel">${[
        ['升级进度', '距离专家认证还需 8 单', '72%'],
        ['本月抢单额度', '已用 3/3 次', ''],
        ['认证材料', '电工证已核验', ''],
      ]
        .map(
          ([l, d, p]) => `<div class="settings-row"><div><p>${l}</p><p class="font-mono text-xs text-[#5a5a5a] mt-1">${d}</p></div>${p ? `<span class="font-mono text-[#3388FF]">${p}</span>` : '<span class="material-symbols-outlined text-[#5a5a5a]">chevron_right</span>'}</div>`,
        )
        .join('')}</section>`,
    ) +
    '</body></html>'
  )
}

function welfarePage() {
  return (
    HEAD.replace('{{TITLE}}', '公益中心') +
    header('公益中心') +
    mainWrap(
      `<section class="grid grid-cols-2 gap-4">
<div class="stat-card"><span class="material-symbols-outlined text-[#3388FF]">volunteer_activism</span><h3 class="font-semibold mt-3">公益需求</h3><p class="text-sm text-[#5a5a5a] mt-2">免费帮助社区老人水电检修</p></div>
<div class="stat-card"><span class="material-symbols-outlined text-[#c1c6d6]">favorite</span><h3 class="font-semibold mt-3">我的贡献</h3><p class="text-sm text-[#5a5a5a] mt-2">累计服务 12 小时</p></div>
</section>`,
    ) +
    '</body></html>'
  )
}

function tagStatsPage() {
  return (
    HEAD.replace('{{TITLE}}', '市场分析') +
    header('市场分析') +
    mainWrap(
      `<section class="grid grid-cols-3 gap-4">
${['水电', '网络布线', '安防监控'].map((t, i) => `<div class="stat-card"><p class="font-mono text-xs text-[#5a5a5a]">${t}</p><p class="text-2xl font-semibold mt-2 tabular-nums">${[128, 86, 54][i]}</p><p class="text-xs text-[#3388FF] mt-2">+${[12, 8, 3][i]}% 周环比</p></div>`).join('')}
</section>
<section class="settings-panel p-6 min-h-[240px] flex items-center justify-center text-[#5a5a5a] font-mono text-sm">标签热度趋势图占位</section>`,
    ) +
    '</body></html>'
  )
}

function circlesPage(title, items) {
  return listPage({
    title,
    tabs: ['全部', '我创建的', '已加入'],
    items,
    empty: '暂无圈子',
  })
}

const SAMPLE_ITEMS = [
  { title: '办公室网络布线', status: '服务中', cls: 'status-amber', date: '2026-06-10', price: '1,200' },
  { title: '服务器机架安装', status: '待确认', cls: 'status-blue', date: '2026-06-12', price: '3,500' },
  { title: '会议室投影调试', status: '已完成', cls: 'status-green', date: '2026-06-01', price: '850', done: true },
]

const DEMAND_ITEMS = [
  { title: '朝阳区电路检修', status: '进行中', cls: 'status-blue', date: '2026-06-14', price: '800' },
  { title: '智能家居安装', status: '待接单', cls: 'status-amber', date: '2026-06-13', price: '2,400' },
]

const BID_ITEMS = [
  { title: '机房温控告警排查', status: '已中标', cls: 'status-green', date: '2026-06-09', price: '450' },
  { title: '弱电间整理', status: '竞标中', cls: 'status-blue', date: '2026-06-11', price: '1,100' },
]

const CIRCLE_ITEMS = [
  { title: '北京水电互助圈', status: '128人', cls: 'status-blue', date: '活跃', price: '—' },
  { title: '弱电工程师联盟', status: '56人', cls: 'status-blue', date: '活跃', price: '—' },
]

const PAGES = [
  { file: 'stitch-demand-create.html', gen: () => demandCreatePage() },
  { file: 'stitch-providers.html', gen: () => searchPage('找服务者', '搜索服务者、技能标签…', [{ init: '张', name: '张师傅水电', meta: '高级认证 · 水电', tag: '可接单' }, { init: '李', name: '李工弱电', meta: '中级认证 · 网络', tag: '忙碌' }]) },
  { file: 'stitch-my-demands.html', gen: () => listPage({ title: '我的需求', tabs: ['全部', '进行中', '已结束'], items: DEMAND_ITEMS, empty: '暂无需求' }) },
  { file: 'stitch-orders.html', gen: () => listPage({ title: '我的订单', tabs: ['全部', '我接的单', '我发的单'], items: SAMPLE_ITEMS, empty: '暂无订单' }) },
  { file: 'stitch-cert-center.html', gen: () => certCenterPage() },
  { file: 'stitch-messages.html', gen: () => messagesPage() },
  { file: 'stitch-settings.html', gen: () => settingsProPage({ title: '设置', sections: [{ label: 'ACCOUNT', rows: [{ label: 'Admin Profile', desc: 'Manage core identity credentials.', control: '' }] }, { label: 'APPEARANCE', rows: [{ label: 'System Theme', desc: 'Select visual environment density.', control: '<div class="seg" style="width:auto"><button class="on">OLED</button><button>DARK</button></div>' }] }, { label: 'NOTIFICATIONS', rows: [{ label: 'Critical System Alerts', desc: 'Bypass mute for infrastructure failure.', control: '<div class="toggle"><span class="material-symbols-outlined text-[10px] text-white">check</span></div>' }] }] }) },
  { file: 'stitch-profile.html', gen: () => profilePage() },
  { file: 'stitch-card-pool.html', gen: () => cardPoolPage() },
  { file: 'stitch-circles.html', gen: () => circlesPage('圈子', CIRCLE_ITEMS) },
  { file: 'stitch-dead-pool.html', gen: () => listPage({ title: '死池', tabs: null, items: [{ title: '过期需求：旧线路改造', status: '已过期', cls: 'status-amber', date: '2026-05-01', price: '—', done: true }], empty: '死池为空' }) },
  { file: 'stitch-my-bids.html', gen: () => listPage({ title: '我的应标', tabs: ['全部', '竞标中', '已中标'], items: BID_ITEMS, empty: '暂无应标' }) },
  { file: 'stitch-my-tags-manage.html', gen: () => settingsProPage({ title: '标签管理', sections: [{ label: 'TAGS', rows: [{ label: '水电维修', desc: '状态：空闲 · 已认证', control: '<button class="hairline px-3 py-1 text-xs font-mono bg-transparent text-[#e2e2e2] cursor-pointer">下线</button>' }, { label: '添加标签', desc: '开通后可在检索中被发现', control: '<input class="search-input" style="width:160px" placeholder="标签名"/>' }] }] }) },
  { file: 'stitch-certified-search.html', gen: () => searchPage('认证服务者', '搜索已认证服务者…', [{ init: '王', name: '王工安防', meta: '专家认证 · 监控部署', tag: '已认证' }, { init: '赵', name: '赵师傅电工', meta: '高级认证 · 电路', tag: '已认证' }]) },
  { file: 'stitch-search.html', gen: () => searchPage('找人', '搜索用户、标签、需求…', [{ init: '陈', name: '陈工综合维修', meta: '朝阳区 · 中级认证', tag: '用户' }, { init: '周', name: '周姐家政水电', meta: '海淀区 · 初级认证', tag: '用户' }]) },
  { file: 'stitch-licenses.html', gen: () => prosePage('开源许可', [{ h: 'MIT License', p: 'Copyright (c) Ninewood Platform. Permission is hereby granted, free of charge, to any person obtaining a copy of this software…' }, { h: '第三方组件', p: '本项目使用 React、Electron、Prisma 等开源软件，各自遵循其原始许可证。' }]) },
  { file: 'stitch-push-settings.html', gen: () => settingsProPage({ title: '推送设置', sections: [{ label: 'NOTIFICATIONS', rows: [{ label: '接收需求推送', desc: '关闭后不再收到新需求相关通知', control: '<div class="toggle"><span class="material-symbols-outlined text-[10px] text-white">check</span></div>' }, { label: '推送频率', desc: '汇总推送可降低打扰', control: '<select class="search-input" style="width:auto"><option>每小时汇总</option></select>' }] }, { label: 'EXCLUDE', rows: [{ label: '排除关键词', desc: '含以下关键词的推送将被过滤', control: '<input class="search-input" style="width:140px" placeholder="关键词"/>' }] }] }) },
  { file: 'stitch-welfare.html', gen: () => welfarePage() },
  { file: 'stitch-circles-list.html', gen: () => circlesPage('需求圈', [{ title: '急单互助圈', status: '42人', cls: 'status-amber', date: '今日+3', price: '—' }, ...CIRCLE_ITEMS]) },
  { file: 'stitch-tag-stats.html', gen: () => tagStatsPage() },
  { file: 'stitch-dashboard.html', gen: () => dashboardPage() },
  { file: 'stitch-transactions.html', gen: () => listPage({ title: '交易记录', tabs: ['全部', '收入', '支出'], items: SAMPLE_ITEMS.map((i) => ({ ...i, status: '已结算', cls: 'status-green', done: true })), empty: '暂无交易' }) },
  { file: 'stitch-agent.html', gen: () => agentPage() },
]

// 启动器索引（不含首页/发现页/登录）
const LAUNCHER = [
  ['edit_document', '发布需求', 'stitch-demand-create.html'],
  ['person_search', '找服务者', 'stitch-providers.html'],
  ['assignment', '我的需求', 'stitch-my-demands.html'],
  ['inventory_2', '订单', 'stitch-orders.html'],
  ['verified_user', '认证中心', 'stitch-cert-center.html'],
  ['chat', '消息', 'stitch-messages.html'],
  ['settings', '设置', 'stitch-settings.html'],
  ['person', '个人主页', 'stitch-profile.html'],
  ['layers', '卡池', 'stitch-card-pool.html'],
  ['groups', '圈子', 'stitch-circles.html'],
  ['delete', '死池', 'stitch-dead-pool.html'],
  ['gavel', '我的应标', 'stitch-my-bids.html'],
  ['sell', '标签管理', 'stitch-my-tags-manage.html'],
  ['badge', '认证服务者', 'stitch-certified-search.html'],
  ['search', '找人', 'stitch-search.html'],
  ['description', '开源许可', 'stitch-licenses.html'],
  ['notifications', '推送设置', 'stitch-push-settings.html'],
  ['favorite', '公益中心', 'stitch-welfare.html'],
  ['diversity_3', '需求圈', 'stitch-circles-list.html'],
  ['bar_chart', '市场分析', 'stitch-tag-stats.html'],
  ['dashboard', '管理后台', 'stitch-dashboard.html'],
  ['receipt_long', '交易记录', 'stitch-transactions.html'],
  ['smart_toy', 'AI 助手', 'stitch-agent.html'],
]

function indexPage() {
  const tiles = LAUNCHER.map(
    ([icon, label, href]) =>
      `<a href="${href}" class="grid-tile no-underline text-[#c1c6d6]"><span class="material-symbols-outlined text-[28px]">${icon}</span><span>${label}</span></a>`,
  )
  // 5 列网格，中间 3×2 留空给标题（与启动器截图一致）
  const grid = []
  let ti = 0
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      const isCenter =
        (row === 1 && col >= 1 && col <= 3) ||
        (row === 2 && col >= 1 && col <= 3)
      if (row === 1 && col === 2) {
        grid.push(
          `<div class="col-span-3 row-span-2 flex items-center justify-center hairline bg-black text-center" style="grid-column:2/5;grid-row:2/4"><h1 class="text-3xl font-medium tracking-tight text-[#e2e2e2]">选择要前往的页面</h1><p class="font-mono text-xs text-[#5a5a5a] mt-3 uppercase tracking-widest">Stitch v3 · Achromatic · Windows Desktop</p></div>`,
        )
        continue
      }
      if (isCenter) continue
      if (ti < tiles.length) {
        grid.push(tiles[ti++])
      } else {
        grid.push(`<div class="grid-tile opacity-30 pointer-events-none"></div>`)
      }
    }
  }
  return (
    HEAD.replace('{{TITLE}}', '页面索引') +
    `<div class="min-h-screen p-margin-lg" style="box-shadow:inset 0 120px 80px -80px rgba(51,136,255,.15)">
<div class="max-w-[1280px] mx-auto mb-8 flex items-center justify-between hairline-b pb-4">
<h1 class="text-2xl font-medium">NINEWOOD</h1>
<p class="font-mono text-xs text-[#5a5a5a]">STITCH HTML 稿 · ${PAGES.length} 页 · 不含首页/登录</p>
</div>
<div class="max-w-[1280px] mx-auto grid grid-cols-5 gap-0 hairline" style="grid-template-rows:repeat(7,minmax(100px,auto))">${grid.join('')}</div>
</div></body></html>`
  )
}

for (const p of PAGES) {
  writeFileSync(join(OUT, p.file), p.gen(), 'utf8')
  console.log('✓', p.file)
}
writeFileSync(join(OUT, 'index.html'), indexPage(), 'utf8')
console.log('✓ index.html')
console.log(`\nGenerated ${PAGES.length + 1} files in ${OUT}`)
