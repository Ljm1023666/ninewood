/**
 * 仅重生成主页 covers-detail（1440q90），不动卡面与其它档。
 *   node scripts/regenerate-profile-cover-details.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  generateDisplaysForUrls,
  mergeManifestDisplays,
} from './card-cover-thumbs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads')
const MANIFEST_PATH = path.join(UPLOAD_ROOT, '.asset-manifest.json')

const covers = fs
  .readdirSync(path.join(UPLOAD_ROOT, 'covers'))
  .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
  .sort()
  .map((n) => `/uploads/covers/${n}`)

console.log(`\n重生成主页 covers-detail（${covers.length}）…`)
const details = await generateDisplaysForUrls(
  UPLOAD_ROOT,
  covers,
  'profileCovers',
  'detail',
)

if (fs.existsSync(MANIFEST_PATH)) {
  mergeManifestDisplays(MANIFEST_PATH, { coverDetails: details })
  console.log(`\n✅ coverDetails=${details.length}`)
} else {
  console.log(`\n✅ 已生成 ${details.length}（无 manifest）`)
}
