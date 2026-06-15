/**
 * 与 public/user-cover-presets 目录下实际文件一致。
 * 需求详情页：按发布者 userId 稳定映射到其中一张，作全页背景与 3D 卡主图。
 */
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

/** @deprecated 请从 @/utils/internal-routes 导入 */
export { suppressLayoutAmbient } from '@/utils/internal-routes'

/** 发布者 id → 固定预设封面 URL */
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
