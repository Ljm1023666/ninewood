/**
 * 下载 Stitch 暖金奢华 Hub 子页 HTML
 * 用法: node scripts/fetch-stitch-wallet-hub-subpages.mjs <stitch-output.txt> [tab]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'docs/stitch-wallet-hub-subpages')

const inputPath = process.argv[2]
const tabFilter = process.argv[3]
if (!inputPath) {
  console.error('Usage: node scripts/fetch-stitch-wallet-hub-subpages.mjs <output.txt> [tab]')
  process.exit(1)
}

const raw = fs.readFileSync(path.resolve(inputPath), 'utf8')
let data
try {
  const outer = JSON.parse(raw)
  const inner = outer.result?.content?.[0]?.text ?? outer
  data = typeof inner === 'string' ? JSON.parse(inner) : outer
} catch {
  data = JSON.parse(raw)
}

const screens = data.outputComponents?.[0]?.design?.screens ?? []
if (!screens.length) {
  console.error('No screens in JSON')
  process.exit(1)
}

const tab = tabFilter || data._tab || 'page'
fs.mkdirSync(outDir, { recursive: true })

const manifestPath = path.join(outDir, 'manifest.json')
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : []

for (let i = 0; i < screens.length; i++) {
  const s = screens[i]
  const htmlUrl = s.htmlCode?.downloadUrl
  if (!htmlUrl) continue
  const res = await fetch(htmlUrl)
  const html = await res.text()
  const filename = `${tab}.html`
  fs.writeFileSync(path.join(outDir, filename), html, 'utf8')
  const entry = {
    tab,
    file: filename,
    title: s.title,
    screenId: s.id,
    screenshot: s.screenshot?.downloadUrl ?? null,
  }
  const idx = manifest.findIndex((m) => m.tab === tab)
  if (idx >= 0) manifest[idx] = entry
  else manifest.push(entry)
  console.log('Wrote', filename)
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
