/**
 * 封面 URL 策略：
 * - **卡包开包**：thumb 400px（性能）
 * - **静态卡面正面**：detail 800px q98（9:16）
 * - **3D 开包画廊**：原图合成 WebP，宽 800–1080px
 * - **InfoCard 顶图**：*-infocard 800×682 cover（与翻面卡 48% 顶区同比例，独立裁切）
 * - **主页背景全屏/氛围**：covers 原图或 thumb；detail 保留原图比例
 * - **display 档**：同时生成 JPEG / WebP / AVIF，前端用 DisplayCoverPicture 选用
 */

/** display 档三格式 URL（JPEG 为主键，WebP/AVIF 同路径换扩展名） */
export type DisplayCoverSources = {
  jpeg: string
  webp: string
  avif: string
}

const MANAGED_DISPLAY_JPEG_RE =
  /^\/uploads\/(?:card-covers-(?:thumb|detail|infocard)|covers-(?:thumb|detail|infocard))\/[^/]+\.jpe?g$/i

export function isManagedDisplayJpegUrl(url: string): boolean {
  return MANAGED_DISPLAY_JPEG_RE.test(url)
}

/** 由 display 档 JPEG URL 推导 WebP/AVIF；非 display 档则三格式相同（仅走 <img>） */
export function toDisplayCoverSources(jpegOrUrl: string): DisplayCoverSources {
  const trimmed = jpegOrUrl.trim()
  if (!isManagedDisplayJpegUrl(trimmed)) {
    return { jpeg: trimmed, webp: trimmed, avif: trimmed }
  }
  const base = trimmed.replace(/\.jpe?g$/i, '')
  return { jpeg: trimmed, webp: `${base}.webp`, avif: `${base}.avif` }
}
/** 与 uploads/.asset-manifest.json cardCovers 一致 */
export const USER_COVER_PRESET_URLS = [
  '/uploads/card-covers/10001.jpg',
  '/uploads/card-covers/10002.jpg',
  '/uploads/card-covers/10003.jpg',
  '/uploads/card-covers/10004.jpg',
  '/uploads/card-covers/10005.jpg',
  '/uploads/card-covers/10006.jpg',
  '/uploads/card-covers/10007.jpg',
  '/uploads/card-covers/10008.jpg',
  '/uploads/card-covers/10009.jpg',
  '/uploads/card-covers/10010.jpg',
  '/uploads/card-covers/10011.jpg',
  '/uploads/card-covers/10012.jpg',
  '/uploads/card-covers/10013.jpg',
  '/uploads/card-covers/10014.jpg',
  '/uploads/card-covers/10015.jpg',
  '/uploads/card-covers/10016.jpg',
  '/uploads/card-covers/10017.jpg',
  '/uploads/card-covers/10018.jpg',
  '/uploads/card-covers/10019.jpg',
  '/uploads/card-covers/10020.jpg',
  '/uploads/card-covers/10021.jpg',
] as const

/** 解析卡面原图 URL */
export function resolveDemandCardCoverUrl(input: {
  coverImage?: string | null
  demandCardCoverUrl?: string | null
  mediaUrls?: string[] | null
  userId?: string | null
}): string {
  const media = (input.mediaUrls || []).filter(
    (u): u is string =>
      typeof u === 'string' && /\.(jpg|jpeg|png|gif|webp)/i.test(u),
  )
  for (const candidate of [
    input.coverImage,
    input.demandCardCoverUrl,
    ...media,
  ]) {
    const trimmed = typeof candidate === 'string' ? candidate.trim() : ''
    if (trimmed) return trimmed
  }
  return publisherUserCoverPreset(input.userId ?? undefined)
}

/** 仅卡包开包：400px thumb */
export function toCardCoverThumbUrl(fullUrl: string): string {
  if (!fullUrl.startsWith('/uploads/card-covers/')) return fullUrl
  const base = fullUrl.slice('/uploads/card-covers/'.length).replace(/\.[^.]+$/, '')
  return `/uploads/card-covers-thumb/${base}.jpg`
}

/** 静态卡面：800px detail */
export function toCardCoverDetailUrl(fullUrl: string): string {
  if (!fullUrl.startsWith('/uploads/card-covers/')) return fullUrl
  const base = fullUrl.slice('/uploads/card-covers/'.length).replace(/\.[^.]+$/, '')
  return `/uploads/card-covers-detail/${base}.jpg`
}

export function toProfileCoverThumbUrl(fullUrl: string): string {
  if (!fullUrl.startsWith('/uploads/covers/')) return fullUrl
  const base = fullUrl.slice('/uploads/covers/'.length).replace(/\.[^.]+$/, '')
  return `/uploads/covers-thumb/${base}.jpg`
}

export function toProfileCoverDetailUrl(fullUrl: string): string {
  if (!fullUrl.startsWith('/uploads/covers/')) return fullUrl
  const base = fullUrl.slice('/uploads/covers/'.length).replace(/\.[^.]+$/, '')
  return `/uploads/covers-detail/${base}.jpg`
}

/** InfoCard 顶图：主页背景同素材、独立裁切比例 */
export function toProfileCoverInfoCardUrl(fullUrl: string): string {
  if (!fullUrl.startsWith('/uploads/covers/')) return fullUrl
  const base = fullUrl.slice('/uploads/covers/'.length).replace(/\.[^.]+$/, '')
  return `/uploads/covers-infocard/${base}.jpg`
}

/** InfoCard 顶图：卡面同素材、独立裁切比例 */
export function toCardCoverInfoCardUrl(fullUrl: string): string {
  if (!fullUrl.startsWith('/uploads/card-covers/')) return fullUrl
  const base = fullUrl.slice('/uploads/card-covers/'.length).replace(/\.[^.]+$/, '')
  return `/uploads/card-covers-infocard/${base}.jpg`
}

/** 静态展示：主页背景 detail */
export function resolveProfileCoverDetailUrl(coverUrl?: string | null): string | null {
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : ''
  if (!trimmed) return null
  return toProfileCoverDetailUrl(trimmed)
}

/** 将 detail / thumb / infocard 档还原为 card-covers 原图路径 */
export function normalizeCardCoverOriginalUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  const prefixes = [
    '/uploads/card-covers-detail/',
    '/uploads/card-covers-thumb/',
    '/uploads/card-covers-infocard/',
  ] as const
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      const base = trimmed.slice(prefix.length).replace(/\.[^.]+$/, '')
      return `/uploads/card-covers/${base}.jpg`
    }
  }
  return trimmed
}

/** InfoCard 顶图（翻面卡背面 / 发布预览背面等） */
export function resolveProfileBackCoverUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return toCardCoverInfoCardUrl(publisherUserCoverPreset(undefined))
  }
  const cardOriginal = normalizeCardCoverOriginalUrl(trimmed)
  if (cardOriginal.startsWith('/uploads/card-covers/')) {
    return toCardCoverInfoCardUrl(cardOriginal)
  }
  if (trimmed.startsWith('/uploads/covers/')) {
    return toProfileCoverInfoCardUrl(trimmed)
  }
  return trimmed
}

/** 翻面卡背面顶图：与正面同源卡面素材，仅裁切为 InfoCard 比例 */
export function resolveDemandCardBackHeroUrl(input: {
  coverImage?: string | null
  demandCardCoverUrl?: string | null
  mediaUrls?: string[] | null
  userId?: string | null
}): string {
  return resolveProfileBackCoverUrl(resolveDemandCardCoverUrl(input))
}

/** display 档 404 时回退原图（兼容 .webp / .avif 请求） */
export function fallbackDisplayCoverSrc(current: string): string | null {
  const asJpeg = current.replace(/\.(avif|webp)$/i, '.jpg')
  const steps: [string, string][] = [
    ['/uploads/card-covers-infocard/', '/uploads/card-covers/'],
    ['/uploads/card-covers-detail/', '/uploads/card-covers/'],
    ['/uploads/card-covers-thumb/', '/uploads/card-covers/'],
    ['/uploads/covers-infocard/', '/uploads/covers/'],
    ['/uploads/covers-detail/', '/uploads/covers/'],
    ['/uploads/covers-thumb/', '/uploads/covers/'],
  ]
  for (const [from, to] of steps) {
    if (asJpeg.includes(from)) return asJpeg.replace(from, to)
  }
  return null
}

/** 仅卡包开包 */
export function resolveDemandCardCoverThumbUrl(input: {
  coverImage?: string | null
  demandCardCoverUrl?: string | null
  mediaUrls?: string[] | null
  userId?: string | null
}): string {
  return toCardCoverThumbUrl(resolveDemandCardCoverUrl(input))
}

/** 静态卡面展示（发布预览 / 详情 3D 卡正面等） */
export function resolveDemandCardCoverDetailUrl(input: {
  coverImage?: string | null
  demandCardCoverUrl?: string | null
  mediaUrls?: string[] | null
  userId?: string | null
}): string {
  return toCardCoverDetailUrl(resolveDemandCardCoverUrl(input))
}

/** 将 thumb / detail 档 URL 升级为原图（3D 画廊纹理，高于 detail 800px） */
export function upgradeCardCoverUrlForGallery(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed

  const displayPrefixes = [
    '/uploads/card-covers-thumb/',
    '/uploads/card-covers-detail/',
    '/uploads/card-covers-infocard/',
  ] as const

  for (const prefix of displayPrefixes) {
    if (trimmed.includes(prefix)) {
      const base = trimmed.slice(prefix.length).replace(/\.[^.]+$/, '')
      return `/uploads/card-covers/${base}.jpg`
    }
  }

  if (
    trimmed.startsWith('/uploads/card-covers/') &&
    !trimmed.includes('-detail/') &&
    !trimmed.includes('-thumb/') &&
    !trimmed.includes('-infocard/')
  ) {
    return trimmed
  }

  return trimmed
}

/** 将 thumb / 原图 URL 升级为 detail 档 */
export function upgradeCardCoverUrlToDetail(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes('/uploads/card-covers-thumb/')) {
    return trimmed.replace('/uploads/card-covers-thumb/', '/uploads/card-covers-detail/')
  }
  if (
    trimmed.startsWith('/uploads/card-covers/') &&
    !trimmed.includes('-detail/') &&
    !trimmed.includes('-thumb/') &&
    !trimmed.includes('-infocard/')
  ) {
    return toCardCoverDetailUrl(trimmed)
  }
  return trimmed
}

export function toCardCoverThumbSources(fullUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(toCardCoverThumbUrl(fullUrl))
}

export function toCardCoverDetailSources(fullUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(toCardCoverDetailUrl(fullUrl))
}

export function toProfileCoverThumbSources(fullUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(toProfileCoverThumbUrl(fullUrl))
}

export function toProfileCoverDetailSources(fullUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(toProfileCoverDetailUrl(fullUrl))
}

export function toProfileCoverInfoCardSources(fullUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(toProfileCoverInfoCardUrl(fullUrl))
}

export function toCardCoverInfoCardSources(fullUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(toCardCoverInfoCardUrl(fullUrl))
}

export function resolveDemandCardCoverThumbSources(input: {
  coverImage?: string | null
  demandCardCoverUrl?: string | null
  mediaUrls?: string[] | null
  userId?: string | null
}): DisplayCoverSources {
  return toCardCoverThumbSources(resolveDemandCardCoverUrl(input))
}

export function resolveDemandCardCoverDetailSources(input: {
  coverImage?: string | null
  demandCardCoverUrl?: string | null
  mediaUrls?: string[] | null
  userId?: string | null
}): DisplayCoverSources {
  return toCardCoverDetailSources(resolveDemandCardCoverUrl(input))
}

export function resolveProfileBackCoverSources(rawUrl: string): DisplayCoverSources {
  return toDisplayCoverSources(resolveProfileBackCoverUrl(rawUrl))
}

function stableIndexFromUserId(userId: string, len: number): number {
  let h = 2166136261
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % len
}

export function isDemandDetailRoute(pathname: string): boolean {
  const m = pathname.match(/^\/demands\/([^/]+)\/?$/)
  if (!m) return false
  return m[1] !== 'create'
}

export { suppressLayoutAmbient } from '@/utils/internal-routes'

export function publisherUserCoverPreset(
  publisherUserId: string | undefined,
): string {
  const fallback = USER_COVER_PRESET_URLS[0]!
  if (!publisherUserId) return fallback
  const i = stableIndexFromUserId(
    publisherUserId,
    USER_COVER_PRESET_URLS.length,
  )
  return USER_COVER_PRESET_URLS[i]!
}
