/**
 * 与 public/user-cover-presets 目录下实际文件一致。
 * 需求详情页：按发布者 userId 稳定映射到其中一张，作全页背景与 3D 卡主图。
 */
export const USER_COVER_PRESET_URLS = [
  '/user-cover-presets/10001.jpg',
  '/user-cover-presets/10002.jpg',
  '/user-cover-presets/10003.jpg',
  '/user-cover-presets/10004.jpg',
  '/user-cover-presets/10005.jpg',
  '/user-cover-presets/10006.jpg',
  '/user-cover-presets/10007.jpg',
  '/user-cover-presets/10008.jpg',
  '/user-cover-presets/10009.jpg',
  '/user-cover-presets/10010.jpg',
  '/user-cover-presets/10011.jpeg',
  '/user-cover-presets/10012.png',
  '/user-cover-presets/10013.png',
  '/user-cover-presets/10014.png',
] as const

function stableIndexFromUserId(userId: string, len: number): number {
  let h = 2166136261
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % len
}

/** 是否为「某条需求详情」路由（排除 /demands/create）；此类页面由子页自行铺发布者背景 */
export function isDemandDetailRoute(pathname: string): boolean {
  const m = pathname.match(/^\/demands\/([^/]+)\/?$/)
  if (!m) return false
  return m[1] !== 'create'
}

/** 发布者 id → 固定预设封面 URL */
export function publisherUserCoverPreset(publisherUserId: string | undefined): string {
  const fallback = USER_COVER_PRESET_URLS[0]!
  if (!publisherUserId || USER_COVER_PRESET_URLS.length === 0) return fallback
  const i = stableIndexFromUserId(publisherUserId, USER_COVER_PRESET_URLS.length)
  return USER_COVER_PRESET_URLS[i]!
}
