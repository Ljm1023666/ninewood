/**
 * Layout 氛围：默认开启（液态玻璃依赖同一图层）。
 * 仅星空发现页关闭；其余工作区一律吃主题氛围图。
 */
const AMBIENT_SUPPRESS_PREFIXES = ['/discover'] as const

export function suppressLayoutAmbient(pathname: string): boolean {
  if (pathname === '/') return true
  return AMBIENT_SUPPRESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
