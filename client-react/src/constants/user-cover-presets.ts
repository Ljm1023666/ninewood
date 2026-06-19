/**
 * 仅用于【需求详情页】大图/卡片背景（与发布者个人主页封面无关）。
 *
 * 静态资源目录：`client-react/public/user-cover-presets`
 * 开发访问：`{origin}/user-cover-presets/文件名`
 *
 * 个人主页封面走用户上传的 `coverUrl`（服务端静态目录如 `server/uploads/covers`，由 API 返回路径）。
 */
export const USER_COVER_PRESET_FILES = [
  '10001.jpg',
  '10002.jpg',
  '10003.jpg',
  '10004.jpg',
  '10005.jpg',
  '10006.jpg',
  '10007.jpg',
  '10008.jpg',
  '10009.jpg',
  '10010.jpg',
  '10011.jpeg',
  '10012.png',
  '10013.png',
  '10014.png',
] as const

function hashUserId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 按发布者 userId 稳定映射到 public/user-cover-presets 下的一张图（需求详情专用） */
export function userCoverPresetUrl(userId: string): string {
  const n = USER_COVER_PRESET_FILES.length
  if (n === 0) return ''
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  const i = hashUserId(userId) % n
  return `${prefix}user-cover-presets/${USER_COVER_PRESET_FILES[i]}`
}
