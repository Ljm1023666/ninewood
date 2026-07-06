import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const agentDir = 'C:/Users/19617/.cursor/projects/d-ninewood/agent-tools'
const outDir = path.join(root, 'docs/stitch-circle-hub-subpages')

const batches = [
  { file: '62b87ec9-bca5-4b65-b81c-39e3019b2a24.txt', tab: 'home', label: '首页', route: '/circles/:id/home' },
  { file: 'd9ff788a-9293-485e-9395-b8c1eb240da4.txt', tab: 'community', label: '圈子社区', route: '/circles/:id/community' },
  { file: 'bbba44a9-f2e1-41d6-b3d7-cd32138c3a26.txt', tab: 'resources', label: '资源文件', route: '/circles/:id/resources' },
  { file: '7b2e292b-d116-4752-bd43-9fcac03bb1a6.txt', tab: 'analytics', label: '分析数据', route: '/circles/:id/analytics' },
  { file: '228d373d-3808-4990-93ee-839417a24562.txt', tab: 'teams', label: '我的团队', route: '/circles/:id/teams' },
  { file: '5829894f-6709-4295-b70c-d3af276b97b2.txt', tab: 'help', label: '帮助中心', route: '/circles/:id/help' },
]

fs.mkdirSync(outDir, { recursive: true })

const manifest = []

for (const batch of batches) {
  const raw = fs.readFileSync(path.join(agentDir, batch.file), 'utf8')
  const data = JSON.parse(raw)
  const screens = data.outputComponents?.[0]?.design?.screens ?? []
  const variants = []

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i]
    const variantSlug = `variant-${String.fromCharCode(97 + i)}`
    const baseName = `${batch.tab}-${variantSlug}`
    const htmlUrl = s.htmlCode?.downloadUrl
    const shotUrl = s.screenshot?.downloadUrl
    if (!htmlUrl) continue

    const res = await fetch(htmlUrl)
    const html = await res.text()
    fs.writeFileSync(path.join(outDir, `${baseName}.html`), html, 'utf8')

    variants.push({
      slug: variantSlug,
      title: s.title,
      screenId: s.id,
      html: `${baseName}.html`,
      screenshot: shotUrl,
    })
  }

  manifest.push({ ...batch, variants })
}

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>圈子 Hub 侧栏子页 · Stitch 预览</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; background: #0b0e15; color: #e0e2ec; margin: 0; padding: 32px 40px 64px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .sub { color: #c1c6d6; margin-bottom: 32px; line-height: 1.6; max-width: 960px; }
    section { margin-bottom: 48px; }
    h2 { font-size: 20px; margin: 0 0 4px; color: #abc7ff; }
    .route { font-size: 12px; color: #8b919f; margin-bottom: 16px; font-family: ui-monospace, monospace; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    a.card { display: block; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; overflow: hidden; background: rgba(28,32,39,.75); text-decoration: none; color: inherit; transition: border-color .15s; }
    a.card:hover { border-color: rgba(171,199,255,.35); }
    img { width: 100%; aspect-ratio: 16/10; object-fit: cover; object-position: top; display: block; background: #10131a; }
    .meta { padding: 14px 16px; }
    .tag { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #abc7ff; }
    .title { font-size: 14px; margin-top: 6px; line-height: 1.4; }
  </style>
</head>
<body>
  <h1>圈子 Hub 侧栏子页 · 每页 3 种布局</h1>
  <p class="sub">路由均在 <strong>/circles/:id/*</strong> 下，左侧 280px Productivity Hub 侧栏保持不变，仅右侧主内容区变化。由 Stitch MCP 基于 Bento 圈子详情生成。</p>
${manifest
  .map(
    (m) => `  <section id="${m.tab}">
    <h2>${m.label}</h2>
    <div class="route">${m.route}</div>
    <div class="grid">
${m.variants
  .map(
    (v, i) => `      <a class="card" href="${v.html}" target="_blank">
        <img src="${v.screenshot}" alt="${v.title}" loading="lazy" />
        <div class="meta"><div class="tag">方案 ${String.fromCharCode(65 + i)}</div><div class="title">${v.title}</div></div>
      </a>`,
  )
  .join('\n')}
    </div>
  </section>`,
  )
  .join('\n')}
</body>
</html>
`

fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8')
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
console.log('Wrote', outDir, 'variants:', manifest.reduce((n, m) => n + m.variants.length, 0))
