/**
 * 封面预取：登录成功后提前把个人主页 covers 原图送进浏览器缓存。
 */
import {
  isManagedDisplayJpegUrl,
  toDisplayCoverSources,
  toPreferOriginalProfileCoverUrl,
  type DisplayCoverSources,
} from '@/utils/user-cover-presets'

const warmed = new Set<string>()

function supportsImageType(mime: string): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL(mime).startsWith(`data:${mime}`)
  } catch {
    return false
  }
}

function pickBestDisplaySrc(sources: DisplayCoverSources): string {
  if (!isManagedDisplayJpegUrl(sources.jpeg)) return sources.jpeg
  if (supportsImageType('image/avif')) return sources.avif
  if (supportsImageType('image/webp')) return sources.webp
  return sources.jpeg
}

function warmImageUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed || warmed.has(trimmed)) return
  warmed.add(trimmed)
  const img = new Image()
  img.decoding = 'async'
  img.src = trimmed
}

function injectPreload(url: string, type?: string) {
  const trimmed = url.trim()
  if (!trimmed || typeof document === 'undefined') return
  const key = `preload:${trimmed}`
  if (warmed.has(key)) return
  warmed.add(key)
  const existing = document.head.querySelectorAll('link[rel="preload"][as="image"]')
  for (const node of existing) {
    if ((node as HTMLLinkElement).href.endsWith(trimmed) || (node as HTMLLinkElement).getAttribute('href') === trimmed) {
      return
    }
  }
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = trimmed
  if (type) link.type = type
  document.head.appendChild(link)
}

function scheduleIdle(cb: () => void, timeoutMs = 1200) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(cb, { timeout: timeoutMs })
    return
  }
  window.setTimeout(cb, Math.min(240, timeoutMs))
}

/** 预取个人主页封面（covers 原图） */
export function prefetchProfileCover(coverUrl?: string | null) {
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : ''
  if (!trimmed) return

  const jpeg = toPreferOriginalProfileCoverUrl(trimmed)
  const sources = toDisplayCoverSources(jpeg)
  // 原图不是 managed display 档时，三格式同 URL，直接预热即可
  const best = pickBestDisplaySrc(sources)

  queueMicrotask(() => {
    injectPreload(best)
    warmImageUrl(best)
  })
}

/** 列表/氛围等多图场景：仅空闲预热 thumb，不抢主页带宽 */
export function prefetchCoverThumbIdle(url?: string | null) {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  if (!trimmed) return
  scheduleIdle(() => warmImageUrl(trimmed), 3000)
}
