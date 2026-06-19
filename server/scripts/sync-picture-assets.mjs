/**
 * 从本地素材目录同步头像 / 个人主页背景 / 需求卡封面到 server/uploads
 *
 * 默认源目录：D:\picture
 *   avatar/       → uploads/avatars/avatar_01.{ext}
 *   backgrounds/  → uploads/covers/cover_01.{ext}
 *   cards/        → uploads/card-covers/10001.{ext}
 *
 * 用法：
 *   node scripts/sync-picture-assets.mjs
 *   PICTURE_SOURCE_DIR=E:/assets node scripts/sync-picture-assets.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads')
const SOURCE_ROOT = process.env.PICTURE_SOURCE_DIR || 'D:\\picture'

const MAP = [
  { from: 'avatar', to: 'avatars', prefix: 'avatar_', pad: 2, start: 1 },
  { from: 'backgrounds', to: 'covers', prefix: 'cover_', pad: 2, start: 1 },
  { from: 'cards', to: 'card-covers', prefix: '100', pad: 2, start: 1 },
]

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function listImages(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en'))
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function main() {
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error(`素材目录不存在: ${SOURCE_ROOT}`)
    process.exit(1)
  }

  const manifest = {
    sourceDir: SOURCE_ROOT,
    syncedAt: new Date().toISOString(),
    avatars: [],
    covers: [],
    cardCovers: [],
  }

  for (const rule of MAP) {
    const srcDir = path.join(SOURCE_ROOT, rule.from)
    const destDir = path.join(UPLOAD_ROOT, rule.to)
    const files = listImages(srcDir)
    const key =
      rule.to === 'avatars'
        ? 'avatars'
        : rule.to === 'covers'
          ? 'covers'
          : 'cardCovers'

    console.log(`\n${rule.from} → ${rule.to} (${files.length} 张)`)

    files.forEach((name, i) => {
      const ext = path.extname(name).toLowerCase()
      const num = rule.start + i
      const destName =
        rule.to === 'card-covers'
          ? `${rule.prefix}${String(num).padStart(rule.pad, '0')}${ext}`
          : `${rule.prefix}${String(num).padStart(rule.pad, '0')}${ext}`
      const src = path.join(srcDir, name)
      const dest = path.join(destDir, destName)
      copyFile(src, dest)
      const url = `/uploads/${rule.to}/${destName}`
      manifest[key].push(url)
      console.log(`  ${name} → ${destName}`)
    })
  }

  const manifestPath = path.join(UPLOAD_ROOT, '.asset-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  console.log('\n✅ 同步完成')
  console.log(`  头像: ${manifest.avatars.length}`)
  console.log(`  主页背景: ${manifest.covers.length}`)
  console.log(`  卡面: ${manifest.cardCovers.length}`)
  console.log(`  清单: ${manifestPath}`)
}

main()
