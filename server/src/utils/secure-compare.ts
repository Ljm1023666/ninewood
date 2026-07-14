import { timingSafeEqual } from 'crypto'

/** 恒定时间字符串比较，避免时序侧信道（H10） */
export function secureEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
