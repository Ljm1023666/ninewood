/**
 * 封面 URL 策略：
 * - **卡包开包**：thumb 400px（性能）
 * - **静态卡面正面**：detail 800px q98（9:16）
 * - **3D 开包画廊 / 多卡同时**：detail 档（约 800px，勿按原图尺寸加载）
 * - **InfoCard 顶图**：*-infocard 800×682 cover（与翻面卡 48% 顶区同比例，独立裁切）
 * - **个人主页封面**：covers 原图（带宽充足，全屏高清，不走 covers-detail 压缩档）
 * - **列表/氛围/消息预览等「多张同时」**：thumb，勿拉原图
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

/** @deprecated 全站氛围已改为纯 CSS 柔光，不再使用固定背景图 */
export const THEME_AMBIENT_BG = {
  light: '/bg/ambient-light.png',
  dark: '/bg/ambient-dark.png',
} as const

/** @deprecated 见 THEME_AMBIENT_BG */
export function themeAmbientBgUrl(isDark: boolean): string {
  return isDark ? THEME_AMBIENT_BG.dark : THEME_AMBIENT_BG.light
}

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

/** 将 covers-detail / thumb / infocard 还原为 covers 原图路径 */
export function normalizeProfileCoverOriginalUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  const prefixes = [
    '/uploads/covers-detail/',
    '/uploads/covers-thumb/',
    '/uploads/covers-infocard/',
  ] as const
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      const base = trimmed.slice(prefix.length).replace(/\.[^.]+$/, '')
      return `/uploads/covers/${base}.jpg`
    }
  }
  return trimmed
}

/** 个人主页全屏：始终用 covers 原图（高清，不压缩） */
export function toPreferOriginalProfileCoverUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  const original = normalizeProfileCoverOriginalUrl(trimmed)
  if (original.startsWith('/uploads/covers/')) return original
  // 误配成卡面路径时也还原原图，避免再落到 detail
  const cardOriginal = normalizeCardCoverOriginalUrl(original)
  if (cardOriginal.startsWith('/uploads/card-covers/')) return cardOriginal
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

/** display 档 404 时先回退同素材更小/更大档，最后才原图（避免一失败就拉 1–2MB） */
export function fallbackDisplayCoverSrc(current: string): string | null {
  const asJpeg = current.replace(/\.(avif|webp)$/i, '.jpg')
  const steps: [string, string][] = [
    ['/uploads/card-covers-infocard/', '/uploads/card-covers-detail/'],
    ['/uploads/card-covers-thumb/', '/uploads/card-covers-detail/'],
    ['/uploads/card-covers-detail/', '/uploads/card-covers/'],
    ['/uploads/covers-infocard/', '/uploads/covers-detail/'],
    ['/uploads/covers-thumb/', '/uploads/covers-detail/'],
    ['/uploads/covers-detail/', '/uploads/covers/'],
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

/**
 * 3D 画廊纹理：统一到 detail（约 800px）。
 * 带宽受限时不再拉原图（1–2MB）；detail 已够纹理清晰度。
 */
export function upgradeCardCoverUrlForGallery(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  const original = normalizeCardCoverOriginalUrl(trimmed)
  if (original.startsWith('/uploads/card-covers/')) {
    return toCardCoverDetailUrl(original)
  }
  return trimmed
}

/** 全屏/大图展示：covers / card-covers 原图 → detail */
export function toPreferDetailCoverUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('/uploads/covers/')) return toProfileCoverDetailUrl(trimmed)
  if (trimmed.startsWith('/uploads/card-covers/')) return toCardCoverDetailUrl(trimmed)
  return trimmed
}

/** 列表/氛围/小预览：covers / card-covers 原图 → thumb */
export function toPreferThumbCoverUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('/uploads/covers/')) return toProfileCoverThumbUrl(trimmed)
  if (trimmed.startsWith('/uploads/card-covers/')) return toCardCoverThumbUrl(trimmed)
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
