/**
 * 从 Stitch MCP 输出 JSON 下载点数钱包 HTML 变体
 * 用法: node scripts/fetch-stitch-points-wallet.mjs <agent-tools-output.txt>
 * 输出: docs/stitch-points-wallet/
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'docs/stitch-points-wallet')

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/fetch-stitch-points-wallet.mjs <stitch-output.txt>')
  process.exit(1)
}

const raw = fs.readFileSync(path.resolve(inputPath), 'utf8')
let data
try {
  const outer = JSON.parse(raw)
  const inner = outer.result?.content?.[0]?.text ?? outer
  data = typeof inner === 'string' ? JSON.parse(inner) : inner
} catch {
  data = JSON.parse(raw)
}

const screens = data.outputComponents?.[0]?.design?.screens ?? []
if (!screens.length) {
  console.error('No screens found in input JSON')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const STYLE_LABELS = [
  '暗色玻璃 · 品牌默认',
  'Bento 仪表盘',
  '左右分栏 · 流水账',
  '终端风 · 硬核数据',
  '暖金奢华 · 金融感',
]

const manifest = []

for (let i = 0; i < screens.length; i++) {
  const s = screens[i]
  const slug = `variant-${String.fromCharCode(97 + i)}`
  const htmlUrl = s.htmlCode?.downloadUrl
  if (!htmlUrl) continue

  const res = await fetch(htmlUrl)
  const html = await res.text()
  const filename = `${slug}.html`
  fs.writeFileSync(path.join(outDir, filename), html, 'utf8')

  manifest.push({
    slug,
    file: filename,
    title: s.title,
    screenId: s.id,
    style: STYLE_LABELS[i] ?? `方案 ${String.fromCharCode(65 + i)}`,
    screenshot: s.screenshot?.downloadUrl ?? null,
  })
  console.log('Wrote', filename)
}

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>点数钱包 UI 方案 · Ninewood</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; background: #0b0e15; color: #e0e2ec; margin: 0; padding: 32px 40px 64px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .sub { color: #c1c6d6; margin-bottom: 32px; line-height: 1.6; max-width: 720px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    a.card { display: block; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; overflow: hidden; background: rgba(28,32,39,.75); text-decoration: none; color: inherit; transition: border-color .15s; }
    a.card:hover { border-color: rgba(51,136,255,.45); }
    img { width: 100%; aspect-ratio: 16/10; object-fit: cover; object-position: top; display: block; background: #10131a; }
    .meta { padding: 14px 16px; }
    .tag { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #3388ff; }
    .title { font-size: 14px; margin-top: 6px; line-height: 1.4; }
  </style>
</head>
<body>
  <h1>点数钱包 UI 方案</h1>
  <p class="sub">Stitch 为九木「点数钱包」生成的 ${manifest.length} 套桌面端 HTML 预览（1 点 = 1 元，含余额、托管、流水）。点击在新标签页打开全屏对比。</p>
  <div class="grid">
${manifest
  .map(
    (v, i) => `    <a class="card" href="${v.file}" target="_blank">
      ${v.screenshot ? `<img src="${v.screenshot}" alt="${v.title}" loading="lazy" />` : '<div style="aspect-ratio:16/10;background:#10131a"></div>'}
      <div class="meta"><div class="tag">方案 ${String.fromCharCode(65 + i)}</div><div class="title">${v.style}</div></div>
    </a>`,
  )
  .join('\n')}
  </div>
</body>
</html>
`

fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8')
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
console.log('Done:', outDir, `(${manifest.length} variants)`)
