/**
 * 用户手动补充检索关键词（默认 kw:）
 */
import { parsePath } from './path-codec'

export function pathFromUserKeyword(keyword: string): string | null {
  const trimmed = keyword.trim()
  if (!trimmed) return null
  const explicit = parsePath(trimmed)
  if (explicit) return explicit.raw
  return parsePath(`kw:${trimmed}`)?.raw ?? null
}
