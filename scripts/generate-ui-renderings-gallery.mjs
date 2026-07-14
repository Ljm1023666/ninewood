/**
 * 扫描 docs/archive/designs/ 下所有 Stitch 渲染稿与截图，生成统一编号浏览页。
 * 运行: node scripts/generate-ui-renderings-gallery.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const OUT = path.join(DOCS, 'archive', 'designs', 'ui-renderings-gallery.html');

/** @type {{ id: string, label: string, desc: string, dir: string, order: number }[]} */
const CATEGORIES = [
  {
    id: 'thesis-demo',
    label: '论文演示截图',
    desc: '当前产品实机截图，作为基线对照',
    dir: 'archive/designs/thesis-demo-screenshots',
    order: 1,
  },
  {
    id: 'login',
    label: '登录 / 注册',
    desc: 'Stitch 登录流三屏',
    dir: 'archive/designs/design/login-stitch',
    order: 2,
  },
  {
    id: 'path-search',
    label: '路径搜索',
    desc: 'Aurora 路径搜索与发布工作区',
    dir: 'archive/designs/design/path-search-stitch',
    order: 3,
  },
  {
    id: 'path-search-styles',
    label: '路径搜索 · 风格探索',
    desc: '仅 Stitch 概念 PNG（赛博 / 全息 / 瑞士），仓库内无对应 HTML。可交互稿见上一分类「路径搜索」#019 起',
    dir: 'archive/designs/designs/path-search-stitch',
    order: 4,
  },
  {
    id: 'desktop-redesign',
    label: '桌面端重设计',
    desc: '窄栏页面 → 桌面多栏布局',
    dir: 'archive/designs/stitch-desktop-redesign',
    order: 5,
  },
  {
    id: 'circle-detail',
    label: '圈子详情',
    desc: '圈子落地页 4 套方案',
    dir: 'archive/designs/stitch-circle-detail',
    order: 6,
  },
  {
    id: 'circle-hub',
    label: '圈子 Hub 子页',
    desc: '侧栏子路由，每页 3 种布局变体',
    dir: 'archive/designs/stitch-circle-hub-subpages',
    order: 7,
  },
  {
    id: 'wallet-hub',
    label: '钱包 Hub 子页',
    desc: '暖金奢华统一风格子页',
    dir: 'archive/designs/stitch-wallet-hub-subpages',
    order: 8,
  },
  {
    id: 'points-wallet',
    label: '点数钱包',
    desc: '钱包页 5 种视觉变体',
    dir: 'archive/designs/stitch-points-wallet',
    order: 9,
  },
  {
    id: 'tax-visualizer',
    label: '税务可视化',
    desc: '标签统计 / 税务终端',
    dir: 'archive/designs/stitch-tax-visualizer',
    order: 10,
  },
];

const SKIP_FILES = new Set(['index.html']);
const SKIP_PREFIX = ['_', 'audit-'];

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function humanize(filename) {
  return filename
    .replace(/\.(html|png|jpg|jpeg|webp)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function shouldSkip(name) {
  if (SKIP_FILES.has(name)) return true;
  return SKIP_PREFIX.some((p) => name.startsWith(p));
}

/**
 * @param {string} relDir
 * @returns {import('node:fs').Dirent[]}
 */
function listAssets(relDir) {
  const abs = path.join(DOCS, relDir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).filter((d) => {
    if (!d.isFile()) return false;
    const ext = path.extname(d.name).toLowerCase();
    if (!['.html', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return false;
    if (shouldSkip(d.name)) return false;
    return true;
  });
}

/** @typedef {{ title: string, subtitle?: string, route?: string, thumb?: string, href: string, kind: 'html'|'image', badge?: string }} ItemMeta */

/**
 * @param {string} relDir
 * @param {string} filename
 * @returns {ItemMeta}
 */
function metaFromManifest(relDir, filename) {
  const absDir = path.join(DOCS, relDir);
  const href = `${relDir}/${filename}`.replace(/\\/g, '/');
  const ext = path.extname(filename).toLowerCase();
  const kind = ext === '.html' ? 'html' : 'image';

  const base = { href, kind, title: humanize(filename) };

  if (relDir === 'archive/designs/stitch-desktop-redesign') {
    const manifest = readJsonSafe(path.join(absDir, 'manifest.json')) ?? [];
    const hit = manifest.find((m) => m.file === filename);
    if (hit) {
      return {
        ...base,
        title: hit.title ?? hit.id,
        route: hit.route,
        thumb: hit.screenshot,
        subtitle: hit.priority,
      };
    }
  }

  if (relDir === 'archive/designs/stitch-points-wallet') {
    const manifest = readJsonSafe(path.join(absDir, 'manifest.json')) ?? [];
    const hit = manifest.find((m) => m.file === filename);
    if (hit) {
      return {
        ...base,
        title: hit.title,
        thumb: hit.screenshot,
        subtitle: hit.style,
      };
    }
  }

  if (relDir === 'archive/designs/stitch-wallet-hub-subpages') {
    const manifest = readJsonSafe(path.join(absDir, 'manifest.json')) ?? [];
    const hit = manifest.find((m) => m.file === filename);
    if (hit) {
      return {
        ...base,
        title: hit.title,
        thumb: hit.screenshot,
        subtitle: hit.tab,
      };
    }
  }

  if (relDir === 'archive/designs/stitch-circle-hub-subpages') {
    const manifest = readJsonSafe(path.join(absDir, 'manifest.json')) ?? [];
    for (const tab of manifest) {
      for (const v of tab.variants ?? []) {
        if (v.html === filename) {
          return {
            ...base,
            title: `${tab.label} · ${v.slug.replace('variant-', '方案 ').toUpperCase()}`,
            route: tab.route,
            thumb: v.screenshot,
            subtitle: v.title,
          };
        }
      }
    }
  }

  if (relDir === 'archive/designs/stitch-circle-detail') {
    const labels = {
      'variant-a-glass-dark.html': '方案 A · 暗色玻璃',
      'variant-b-cinematic.html': '方案 B · 电影感 Hero',
      'variant-c-split.html': '方案 C · 左右分栏',
      'variant-d-bento.html': '方案 D · Bento 网格',
    };
    const screenshots = {
      'variant-a-glass-dark.html':
        'https://lh3.googleusercontent.com/aida/AP1WRLvxlrE-RWnPArr8RI9BYLYKKv9HM_EzNko7FCswpd7WfYEyQ50AXu4evMxHlIe_B4OtvWSX02ah9T4Njtm-SpFMksSyypvuacrXtDFbHf1tUxFDb7IK8iQ0TtUZnr7Cx3ZUpg_GJ1LnHwwgxUNae_V2EPr224CXR1jcHrRX5vLbs2bup-FexUVNh-fMDGP9xB3rDIgRcB_awYkBS30_ujMo6oo3LFBbaCHPAOwpBbGiWy2SQL0BGfy3L_Q',
      'variant-d-bento.html':
        'https://lh3.googleusercontent.com/aida/AP1WRLvD9F8nN503t1OmK9W-2Bu8_E2hCYkfbnsEXUpLOP9bDfSD31Pb931F_z-fDhQcg9eUlRtzszChMYeQX-krA9_5bleLoaGNL3Eg5eCFuyYmzSjKCTANP8rSEM6rFt4wO6vqr3sC7YEjUI2NhyqCFRFYyvi6QHfC2BbDMLnkjZoq-XyYFhAKXDaZwfchD65bx_2zBb9El36FXXI8TZjSchK_Gs7ZzOo0Fz3dWMkO9aRY_aYv3GHGiV0t_Q',
      'variant-c-split.html':
        'https://lh3.googleusercontent.com/aida/AP1WRLtZ3TuJlEJX4wAW5X8MyF7ZA9p0a5LYbESIykWwiYdkzXr5oXFhw1UuUotg6Atc6p2CQnhPOp8FXbjVk7sHbsShR0n8bojKv9yKWf3QkC7CtPMrudJp0pmsIjcgPYrG7sMYC0FgMQw45AENwGYtMs4Wpj90O7yhsO3YXNYjxbVbofPoA9Z6nRKjEVQoDW1bVp5oxy6y2tFBVXAhBaDX-HxLbzDK-jZ4dw2LOYT04t-RuFVXYgacn63sitM',
      'variant-b-cinematic.html':
        'https://lh3.googleusercontent.com/aida/AP1WRLu1TS6FTOU-ykz8p9G0HkRhsjy_nfFmqltVYK0Eqqjlc9jYCPBwvwpI3OGE_1IbGKVvTabe1TQRSotlGvO2hA0BDvGK0QjysSZUTKpULoGdp2xIHSJJLUIgYcz8o52A6R3d-UPWnPkFm9Ap6nx48dXMn7axay5yrSY5pyOEKAd6uDeMdCG7Um1lSoKJUFKaBn3rvQqmrXyt2lfroTy6cyaTA1Hs9kg6XKhH1FzI1AxOZ96-dmk_gfLQxLc',
    };
    if (labels[filename]) {
      return {
        ...base,
        title: labels[filename],
        route: '/circles/:id',
        thumb: screenshots[filename],
      };
    }
  }

  if (relDir === 'archive/designs/design/login-stitch') {
    const labels = {
      '01-login-password.html': '密码登录',
      '02-register.html': '注册账号',
      '03-sms-verification.html': '短信验证',
    };
    if (labels[filename]) return { ...base, title: labels[filename], route: '/login' };
  }

  if (relDir === 'archive/designs/design/path-search-stitch') {
    const labels = {
      '00-premium-aurora-neural.html': 'Premium Aurora Neural',
      '01-path-search-results.html': '路径搜索结果',
      '02-path-search-empty.html': '路径搜索空态',
      '03-publish-workspace-paths.html': '发布工作区路径',
      '04-demand-detail-owner-paths.html': '需求详情 · 发布者路径',
      '10-flagship-aurora.html': 'Flagship Aurora',
    };
    const png = filename.replace('.html', '.png');
    const pngPath = path.join(absDir, png);
    if (labels[filename]) {
      return {
        ...base,
        title: labels[filename],
        route: '/path-search',
        thumb: fs.existsSync(pngPath) ? `${relDir}/${png}` : undefined,
      };
    }
  }

  if (relDir === 'archive/designs/designs/path-search-stitch') {
    const labels = {
      'style-a-cyberpunk-terminal.png': '赛博终端',
      'style-b-holographic-lab.png': '全息实验室',
      'style-c-swiss-engineering.png': '瑞士工程',
    };
    if (labels[filename]) return { ...base, title: labels[filename], thumb: href, badge: '概念 PNG · 无 HTML' };
  }

  if (relDir === 'archive/designs/stitch-tax-visualizer') {
    const labels = {
      'baseline.png': '基线截图',
      'variant-a-hero-driven.png': '方案 A · Hero 驱动',
      'variant-b-analytical-split.png': '方案 B · 分析分栏',
      'variant-b.html': '方案 B · 分析分栏（HTML）',
      'variant-c-modular-grid.png': '方案 C · 模块化网格',
    };
    if (labels[filename]) {
      return { ...base, title: labels[filename], route: '/my-tags', thumb: href, badge: '渲染 PNG' };
    }
  }

  if (relDir === 'archive/designs/thesis-demo-screenshots') {
    const labels = {
      '01-login.png': '登录',
      '02-discover.png': '发现',
      '03-demand-create.png': '发布需求',
      '04-my-demands.png': '我的需求',
      '05-orders.png': '订单',
      '06-messages.png': '消息',
      '07-circles.png': '圈子',
      '08-card-pool.png': '卡池',
      '09-tag-stats.png': '标签统计',
      '10-agent-chat.png': 'Agent 对话',
      '11-wallet.png': '钱包',
      '12-cert-center.png': '认证中心',
      '13-help.png': '帮助',
      '14-admin-dashboard.png': '管理后台',
      '15-path-search.png': '路径搜索',
    };
    if (labels[filename]) {
      return { ...base, title: `实机 · ${labels[filename]}`, thumb: href, badge: '实机截图' };
    }
  }

  // 同名 png 作为 html 缩略图
  if (kind === 'html') {
    const png = filename.replace(/\.html$/i, '.png');
    if (fs.existsSync(path.join(absDir, png))) {
      return { ...base, thumb: `${relDir}/${png}` };
    }
  }
  if (kind === 'image') {
    return { ...base, thumb: href };
  }

  return base;
}

function sortFiles(relDir, files) {
  return [...files].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
}

function buildCatalog() {
  /** @type {{ category: typeof CATEGORIES[0], items: (ItemMeta & { num: number, globalId: string })[] }[]} */
  const sections = [];
  let counter = 0;

  for (const cat of [...CATEGORIES].sort((a, b) => a.order - b.order)) {
    const files = sortFiles(cat.dir, listAssets(cat.dir).map((d) => d.name));
    const items = files.map((filename) => {
      counter += 1;
      const meta = metaFromManifest(cat.dir, filename);
      return {
        ...meta,
        num: counter,
        globalId: String(counter).padStart(3, '0'),
      };
    });
    if (items.length) sections.push({ category: cat, items });
  }

  return { sections, total: counter };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {ItemMeta & { globalId: string }} item */
function renderPreview(item) {
  if (item.kind === 'image') {
    const src = item.thumb ?? item.href;
    return `<img src="${escapeHtml(src)}" alt="" loading="lazy" />`;
  }

  const iframeFallback = `<div class="iframe-wrap" data-src="${escapeHtml(item.href)}">
    <iframe src="${escapeHtml(item.href)}" title="${escapeHtml(item.title)}" loading="lazy" tabindex="-1"></iframe>
  </div>`;

  if (item.thumb) {
    return `<img src="${escapeHtml(item.thumb)}" alt="" loading="lazy" class="preview-img" data-fallback="iframe" data-href="${escapeHtml(item.href)}" data-title="${escapeHtml(item.title)}" />`;
  }

  return iframeFallback;
}

function renderHtml({ sections, total }) {
  const navItems = sections
    .map(
      (s) =>
        `<a class="nav-link" href="#cat-${s.category.id}" data-cat="${s.category.id}">${escapeHtml(s.category.label)}<span class="nav-count">${s.items.length}</span></a>`,
    )
    .join('\n');

  const bodySections = sections
    .map((s) => {
      const cards = s.items
        .map((item) => {
          const thumb = renderPreview(item);
          const openAttr =
            item.kind === 'html'
              ? `href="${escapeHtml(item.href)}" target="_blank" rel="noopener"`
              : `href="${escapeHtml(item.thumb ?? item.href)}" target="_blank" rel="noopener"`;
          const route = item.route
            ? `<div class="route">${escapeHtml(item.route)}</div>`
            : '';
          const sub = item.subtitle
            ? `<div class="sub">${escapeHtml(item.subtitle)}</div>`
            : '';
          const badge = item.badge
            ? `<span class="format-badge">${escapeHtml(item.badge)}</span>`
            : item.kind === 'html'
              ? `<span class="format-badge html">HTML 可交互</span>`
              : '';
          const htmlLink =
            item.kind === 'html'
              ? `<a class="open-html" href="${escapeHtml(item.href)}" target="_blank" rel="noopener">打开 HTML ↗</a>`
              : item.badge?.includes('无 HTML')
                ? `<a class="open-html muted" href="${escapeHtml(item.thumb ?? item.href)}" target="_blank" rel="noopener">查看大图 ↗</a>`
                : '';

          return `<article class="card" id="item-${item.globalId}" data-id="${item.globalId}" data-cat="${s.category.id}">
  <div class="card-top">
    <span class="num">#${item.globalId}</span>
    <button type="button" class="mark-btn" title="标记为即将构建" aria-pressed="false">☆</button>
  </div>
  <a class="thumb-link" ${openAttr}>${thumb}</a>
  <div class="meta">
    <div class="title-row"><div class="title">${escapeHtml(item.title)}</div>${badge}</div>
    ${route}
    ${sub}
    <div class="actions">
      <button type="button" class="copy-btn" data-copy="#${item.globalId}">复制编号</button>
      ${htmlLink}
    </div>
  </div>
</article>`;
        })
        .join('\n');

      return `<section class="category" id="cat-${s.category.id}" data-cat="${s.category.id}">
  <header class="cat-header">
    <div>
      <h2>${escapeHtml(s.category.label)}</h2>
      <p>${escapeHtml(s.category.desc)}</p>
    </div>
    <span class="cat-range">#${s.items[0].globalId} – #${s.items[s.items.length - 1].globalId}</span>
  </header>
  <div class="grid">${cards}</div>
</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1280" />
  <title>UI 渲染稿总览 · Ninewood</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      --bg: #080a10;
      --panel: rgba(20, 24, 34, 0.92);
      --border: rgba(255, 255, 255, 0.08);
      --text: #e8eaf2;
      --muted: #8b93a8;
      --accent: #6eb4ff;
      --gold: #d4af37;
      --mark: #34d399;
    }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-width: 1280px;
    }
    .layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
    }
    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      border-right: 1px solid var(--border);
      background: rgba(12, 14, 20, 0.96);
      padding: 24px 16px 40px;
    }
    aside h1 {
      font-size: 15px;
      margin: 0 0 4px;
      letter-spacing: 0.02em;
    }
    .aside-sub {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .stat {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 16px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel);
    }
    .stat strong { color: var(--gold); }
    .nav-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      margin: 2px 0;
      border-radius: 8px;
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      transition: background 0.12s, color 0.12s;
    }
    .nav-link:hover, .nav-link.active {
      background: rgba(110, 180, 255, 0.1);
      color: var(--text);
    }
    .nav-count {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 16px 0 8px;
    }
    .toolbar button {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
    }
    .toolbar button:hover { border-color: rgba(110,180,255,0.4); }
    .selection-panel {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid rgba(52, 211, 153, 0.25);
      border-radius: 10px;
      background: rgba(52, 211, 153, 0.06);
      font-size: 12px;
      line-height: 1.6;
      display: none;
    }
    .selection-panel.visible { display: block; }
    .selection-panel code {
      font-family: ui-monospace, monospace;
      color: var(--mark);
    }
    main {
      padding: 32px 40px 80px;
      max-width: 1600px;
    }
    .hero h2 {
      font-size: 28px;
      margin: 0 0 8px;
    }
    .hero p {
      color: var(--muted);
      max-width: 720px;
      line-height: 1.65;
      margin: 0;
    }
    .category { margin-top: 48px; }
    .cat-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .cat-header h2 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #abc7ff;
    }
    .cat-header p {
      margin: 0;
      font-size: 13px;
      color: var(--muted);
    }
    .cat-range {
      font-size: 12px;
      color: var(--muted);
      font-family: ui-monospace, monospace;
      white-space: nowrap;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      background: var(--panel);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .card.marked {
      border-color: rgba(52, 211, 153, 0.55);
      box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.2);
    }
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px 0;
    }
    .num {
      font-family: ui-monospace, monospace;
      font-size: 13px;
      font-weight: 700;
      color: var(--gold);
    }
    .mark-btn {
      border: none;
      background: transparent;
      color: var(--muted);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .mark-btn:hover { color: var(--gold); background: rgba(255,255,255,0.05); }
    .card.marked .mark-btn { color: var(--mark); }
    .thumb-link {
      display: block;
      margin: 8px 12px 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .thumb-link img {
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      object-position: top;
      display: block;
      background: #0f1218;
    }
    .iframe-wrap {
      aspect-ratio: 16 / 10;
      overflow: hidden;
      background: #0f1218;
      position: relative;
    }
    .iframe-wrap iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 1280px;
      height: 800px;
      border: 0;
      transform-origin: top left;
      pointer-events: none;
    }
    .placeholder {
      aspect-ratio: 16 / 10;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #121620, #1a2030);
      color: var(--muted);
      font-size: 13px;
    }
    .meta { padding: 12px 14px 14px; }
    .title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
    }
    .title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .format-badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(255,255,255,0.06);
      color: var(--muted);
      white-space: nowrap;
    }
    .format-badge.html {
      background: rgba(110, 180, 255, 0.12);
      color: var(--accent);
    }
    .open-html.muted { opacity: 0.85; }
    .route {
      margin-top: 4px;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: var(--muted);
    }
    .sub {
      margin-top: 6px;
      font-size: 12px;
      color: #a8b0c4;
      line-height: 1.45;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .copy-btn, .open-html {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      color: var(--muted);
      cursor: pointer;
      text-decoration: none;
    }
    .copy-btn:hover, .open-html:hover {
      color: var(--accent);
      border-color: rgba(110,180,255,0.35);
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 10px 16px;
      border-radius: 10px;
      background: rgba(20, 28, 40, 0.95);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 13px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
      z-index: 100;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .filter-marked .card:not(.marked) { display: none; }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <h1>UI 渲染稿总览</h1>
      <p class="aside-sub">全局编号 <strong>#001–#${String(total).padStart(3, '0')}</strong>，点击 ☆ 标记即将构建的页面，复制编号告诉我即可。</p>
      <div class="stat">共 <strong>${total}</strong> 张渲染稿 · ${sections.length} 个分类</div>
      <nav>${navItems}</nav>
      <div class="toolbar">
        <button type="button" id="btn-copy-selected">复制已选编号</button>
        <button type="button" id="btn-clear-selected">清空标记</button>
        <button type="button" id="btn-filter-marked">只看已选</button>
      </div>
      <div class="selection-panel" id="selection-panel">
        已标记：<code id="selection-list"></code>
      </div>
    </aside>
    <main id="main">
      <header class="hero">
        <h2>Ninewood UI 渲染稿库</h2>
        <p>整合 Stitch 设计稿、风格探索 PNG 与论文演示实机截图。每张卡片左上角有全局编号（如 #042），请用编号指定要落地的 UI。</p>
      </header>
      ${bodySections}
    </main>
  </div>
  <div class="toast" id="toast"></div>
  <script>
    const STORAGE_KEY = 'ninewood-ui-gallery-marked';
    const marked = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    let filterMarked = false;

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...marked].sort()));
      updateUI();
    }

    function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('show'), 1800);
    }

    function updateUI() {
      document.querySelectorAll('.card').forEach((card) => {
        const id = card.dataset.id;
        const on = marked.has(id);
        card.classList.toggle('marked', on);
        const btn = card.querySelector('.mark-btn');
        if (btn) {
          btn.textContent = on ? '★' : '☆';
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      });

      const list = [...marked].sort();
      const panel = document.getElementById('selection-panel');
      const listEl = document.getElementById('selection-list');
      if (list.length) {
        panel.classList.add('visible');
        listEl.textContent = list.map((n) => '#' + n).join(', ');
      } else {
        panel.classList.remove('visible');
      }

      document.getElementById('main').classList.toggle('filter-marked', filterMarked);
      document.getElementById('btn-filter-marked').textContent = filterMarked ? '显示全部' : '只看已选';
    }

    document.querySelectorAll('.mark-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.card');
        const id = card.dataset.id;
        if (marked.has(id)) marked.delete(id);
        else marked.add(id);
        save();
      });
    });

    document.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        await navigator.clipboard.writeText(text);
        toast('已复制 ' + text);
      });
    });

    document.getElementById('btn-copy-selected').addEventListener('click', async () => {
      const text = [...marked].sort().map((n) => '#' + n).join(', ');
      if (!text) { toast('尚未标记任何渲染稿'); return; }
      await navigator.clipboard.writeText(text);
      toast('已复制 ' + text);
    });

    document.getElementById('btn-clear-selected').addEventListener('click', () => {
      marked.clear();
      save();
      toast('已清空标记');
    });

    document.getElementById('btn-filter-marked').addEventListener('click', () => {
      filterMarked = !filterMarked;
      updateUI();
    });

    const sections = document.querySelectorAll('.category');
    const navLinks = document.querySelectorAll('.nav-link');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.cat;
            navLinks.forEach((a) => a.classList.toggle('active', a.dataset.cat === id));
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => observer.observe(s));

    updateUI();
  </script>
  <script>
    // 按卡片宽度缩放 iframe，使 HTML 稿在网格里可见
    function fitIframePreviews() {
      document.querySelectorAll('.iframe-wrap').forEach((wrap) => {
        const iframe = wrap.querySelector('iframe');
        if (!iframe) return;
        const w = wrap.clientWidth || 280;
        const scale = w / 1280;
        iframe.style.transform = 'scale(' + scale + ')';
        wrap.style.height = 800 * scale + 'px';
      });
    }
    fitIframePreviews();
    window.addEventListener('resize', fitIframePreviews);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => fitIframePreviews());
      document.querySelectorAll('.grid').forEach((g) => ro.observe(g));
    }

    // 外链截图加载失败时，回退为 iframe 实时预览
    document.querySelectorAll('img.preview-img').forEach((img) => {
      const swap = () => {
        const wrap = document.createElement('div');
        wrap.className = 'iframe-wrap';
        wrap.dataset.src = img.dataset.href;
        wrap.innerHTML = '<iframe src="' + img.dataset.href + '" title="' + img.dataset.title + '" loading="lazy" tabindex="-1"></iframe>';
        img.replaceWith(wrap);
        fitIframePreviews();
      };
      img.addEventListener('error', swap, { once: true });
      if (img.complete && img.naturalWidth === 0) swap();
    });
  </script>
</body>
</html>`;
}

const catalog = buildCatalog();
fs.writeFileSync(OUT, renderHtml(catalog), 'utf8');
console.log(`Generated ${OUT}`);
console.log(`Total items: ${catalog.total} across ${catalog.sections.length} categories`);
