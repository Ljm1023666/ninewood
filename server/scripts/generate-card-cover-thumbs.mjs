/**
 * 为 card-covers + covers 生成 thumb / detail display 档
 *
 *   node scripts/generate-card-cover-thumbs.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  generateAllAssetDisplays,
  mergeManifestDisplays,
} from './card-cover-thumbs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads')
const MANIFEST_PATH = path.join(UPLOAD_ROOT, '.asset-manifest.json')

function loadManifestUrls() {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  }
  const cardCovers = fs.existsSync(path.join(UPLOAD_ROOT, 'card-covers'))
    ? fs
        .readdirSync(path.join(UPLOAD_ROOT, 'card-covers'))
        .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
        .sort()
        .map((n) => `/uploads/card-covers/${n}`)
    : []
  const covers = fs.existsSync(path.join(UPLOAD_ROOT, 'covers'))
    ? fs
        .readdirSync(path.join(UPLOAD_ROOT, 'covers'))
        .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
        .sort()
        .map((n) => `/uploads/covers/${n}`)
    : []
  return { cardCovers, covers }
}

async function main() {
  const manifest = loadManifestUrls()
  console.log(
    `\n生成 display 档（卡面 ${manifest.cardCovers?.length ?? 0} / 背景 ${manifest.covers?.length ?? 0}）…`,
  )

  const { card, profile } = await generateAllAssetDisplays(UPLOAD_ROOT, manifest)

  if (fs.existsSync(MANIFEST_PATH)) {
    mergeManifestDisplays(MANIFEST_PATH, {
      cardCoverThumbs: card.thumbs,
      cardCoverDetails: card.details,
      cardCoverInfoCards: card.infocards,
      coverThumbs: profile.thumbs,
      coverDetails: profile.details,
      coverInfoCards: profile.infocards,
    })
    console.log(
      `\n✅ manifest: card thumb=${card.thumbs.length} detail=${card.details.length} infocard=${card.infocards.length}, cover thumb=${profile.thumbs.length} detail=${profile.details.length} infocard=${profile.infocards.length}`,
    )
  } else {
    console.log('\n✅ 已生成（无 manifest，跳过写入）')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
