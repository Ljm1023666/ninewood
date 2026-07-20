/**
 * 运行时 API / 静态资源同源。
 * - Web（同域托管）：相对路径 `/api`、`/uploads`、`/socket.io`
 * - Electron `file:` / `app:`：必须用绝对生产域名（勿硬编码 IP）
 * - 可用 `VITE_API_ORIGIN` 覆盖（末尾无斜杠）
 */

export const PRODUCTION_ORIGIN = 'https://tothetomorrow.com'

function envOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\/$/, '')
}

/** 非空时表示需要绝对 origin（Electron 本地 dist 或显式覆盖） */
export function getApiOrigin(): string {
  const fromEnv = envOrigin()
  if (fromEnv) return fromEnv

  if (typeof window !== 'undefined') {
    const { protocol } = window.location
    if (protocol === 'file:' || protocol === 'app:') {
      return PRODUCTION_ORIGIN
    }
  }
  return ''
}

/** Axios / fetch 用的 API 根路径，例如 `/api` 或 `https://tothetomorrow.com/api` */
export function getApiBaseURL(): string {
  const origin = getApiOrigin()
  return origin ? `${origin}/api` : '/api'
}

/** Socket.IO 连接目标：同域用 `/`，Electron 用生产域名 */
export function getSocketURL(): string {
  return getApiOrigin() || '/'
}

/**
 * 把 `/uploads/...` 等站内路径解析为浏览器可加载的 URL。
 * 已是 http(s)/data/blob 则原样返回。
 */
export function resolvePublicUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return ''
  const trimmed = pathOrUrl.trim()
  if (!trimmed) return ''
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed

  const origin = getApiOrigin()
  if (!origin) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}
