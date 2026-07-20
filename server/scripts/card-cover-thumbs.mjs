/**
 * uploads display 档（原图保留）：
 *
 * card-covers:
 *   thumb 400px q85 — 仅卡包开包
 *   detail 800px q98 — 静态卡面展示（9:16，sharp 预缩）
 *   infocard 800×682 cover — InfoCard 顶图（与 9:16 翻面卡 48% 顶区同比例）
 *
 * covers（用户主页背景）:
 *   thumb 400px q85 — 氛围模糊层
 *   detail 1440px q90 — 个人主页全屏（略压缩，保清晰；优先 AVIF/WebP）
 *   infocard 800×682 cover — InfoCard 顶图（与背景原图同素材、不同裁切）
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

/** 9:16 翻面卡内 InfoCard 顶图区：宽 × (0.48 × 16/9) ≈ 1.172:1 */
export const INFOCARD_HERO_WIDTH = 800
export const INFOCARD_HERO_HEIGHT = Math.round(
  INFOCARD_HERO_WIDTH / (9 / (0.48 * 16)),
)

export const ASSET_DISPLAY_KINDS = {
  cardCovers: {
    sourcePrefix: '/uploads/card-covers/',
    tiers: {
      thumb: { dir: 'card-covers-thumb', width: 400, quality: 85 },
      detail: { dir: 'card-covers-detail', width: 800, quality: 98 },
      infocard: {
        dir: 'card-covers-infocard',
        width: INFOCARD_HERO_WIDTH,
        height: INFOCARD_HERO_HEIGHT,
        quality: 98,
        fit: 'cover',
        position: 'attention',
      },
    },
    manifest: {
      thumb: 'cardCoverThumbs',
      detail: 'cardCoverDetails',
      infocard: 'cardCoverInfoCards',
    },
  },
  profileCovers: {
    sourcePrefix: '/uploads/covers/',
    tiers: {
      thumb: { dir: 'covers-thumb', width: 400, quality: 85 },
      detail: { dir: 'covers-detail', width: 1440, quality: 90 },
      infocard: {
        dir: 'covers-infocard',
        width: INFOCARD_HERO_WIDTH,
        height: INFOCARD_HERO_HEIGHT,
        quality: 98,
        fit: 'cover',
        position: 'attention',
      },
    },
    manifest: {
      thumb: 'coverThumbs',
      detail: 'coverDetails',
      infocard: 'coverInfoCards',
    },
  },
}

export function displayBaseName(sourceFileName) {
  return path.basename(sourceFileName, path.extname(sourceFileName))
}

export function displayFileName(sourceFileName, ext = '.jpg') {
  return `${displayBaseName(sourceFileName)}${ext}`
}

/** AVIF quality 刻度与 JPEG 不同，按档位映射到相近观感 */
export function avifQualityFromJpeg(jpegQuality) {
  if (jpegQuality >= 95) return 65
  if (jpegQuality >= 85) return 55
  return 45
}

export async function generateDisplayFromFile(sourcePath, uploadRoot, kind, tier) {
  const cfg = ASSET_DISPLAY_KINDS[kind]
  const tierCfg = cfg.tiers[tier]
  const { dir, width, quality } = tierCfg
  const outDir = path.join(uploadRoot, dir)
  const base = displayBaseName(path.basename(sourcePath))
  const jpegName = `${base}.jpg`
  const webpName = `${base}.webp`
  const avifName = `${base}.avif`
  const jpegPath = path.join(outDir, jpegName)
  const webpPath = path.join(outDir, webpName)
  const avifPath = path.join(outDir, avifName)

  fs.mkdirSync(outDir, { recursive: true })

  let pipeline = sharp(sourcePath).rotate()
  if (tierCfg.height) {
    pipeline = pipeline.resize({
      width: tierCfg.width,
      height: tierCfg.height,
      fit: tierCfg.fit ?? 'cover',
      position: tierCfg.position ?? 'centre',
    })
  } else {
    pipeline = pipeline.resize({ width, withoutEnlargement: true })
  }

  await Promise.all([
    pipeline
      .clone()
      .jpeg({ quality, mozjpeg: true })
      .toFile(jpegPath),
    pipeline
      .clone()
      .webp({ quality, effort: 4 })
      .toFile(webpPath),
    pipeline
      .clone()
      .avif({ quality: avifQualityFromJpeg(quality), effort: 4 })
      .toFile(avifPath),
  ])

  return `/uploads/${dir}/${jpegName}`
}

export async function generateDisplaysForUrls(uploadRoot, urls, kind, tier) {
  const cfg = ASSET_DISPLAY_KINDS[kind]
  const tierCfg = cfg.tiers[tier]
  const { width } = tierCfg
  const out = []
  for (const url of urls) {
    if (!url.startsWith(cfg.sourcePrefix)) continue
    const rel = url.slice('/uploads/'.length)
    const src = path.join(uploadRoot, rel)
    if (!fs.existsSync(src)) {
      console.warn(`  跳过（原图不存在）: ${url}`)
      continue
    }
    const displayUrl = await generateDisplayFromFile(src, uploadRoot, kind, tier)
    out.push(displayUrl)
    const srcKb = Math.round(fs.statSync(src).size / 1024)
    const relBase = displayUrl.slice('/uploads/'.length).replace(/\.jpe?g$/i, '')
    const fmtKb = (suffix) =>
      Math.round(
        fs.statSync(path.join(uploadRoot, `${relBase}${suffix}`)).size / 1024,
      )
    const sizeLabel = tierCfg.height
      ? `${width}×${tierCfg.height} cover`
      : `${width}px`
    console.log(
      `  [${sizeLabel}] ${path.basename(src)} ${srcKb}KB → jpg ${fmtKb('.jpg')}KB / webp ${fmtKb('.webp')}KB / avif ${fmtKb('.avif')}KB`,
    )
  }
  return out
}

export function mergeManifestDisplays(manifestPath, patch) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  Object.assign(manifest, patch)
  manifest.displaysGeneratedAt = new Date().toISOString()
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
}

export async function generateDisplaysForKind(uploadRoot, urls, kind) {
  const label = kind === 'cardCovers' ? '卡面' : '主页背景'
  console.log(`\n── ${label} thumb ──`)
  const thumbs = await generateDisplaysForUrls(uploadRoot, urls, kind, 'thumb')
  console.log(`\n── ${label} detail ──`)
  const details = await generateDisplaysForUrls(uploadRoot, urls, kind, 'detail')
  console.log(`\n── ${label} infocard ──`)
  const infocards = await generateDisplaysForUrls(
    uploadRoot,
    urls,
    kind,
    'infocard',
  )
  return { thumbs, details, infocards }
}

export async function generateAllAssetDisplays(uploadRoot, manifest) {
  const card = manifest.cardCovers?.length
    ? await generateDisplaysForKind(uploadRoot, manifest.cardCovers, 'cardCovers')
    : { thumbs: [], details: [], infocards: [] }
  const profile = manifest.covers?.length
    ? await generateDisplaysForKind(uploadRoot, manifest.covers, 'profileCovers')
    : { thumbs: [], details: [], infocards: [] }
  return { card, profile }
}
