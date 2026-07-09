import { certLabel } from '@/constants/cert'

/** 各等级月度抢单额度上限（与权益表一致） */
export function snatchCreditLimit(level?: string): number | null {
  switch (level) {
    case 'BASIC':
      return 1
    case 'INTERMEDIATE':
      return 3
    case 'ADVANCED':
    case 'MASTER':
      return null
    default:
      return 0
  }
}

export function formatSnatchCredits(remaining: number, level?: string): string {
  const limit = snatchCreditLimit(level)
  if (limit === null) return '不限'
  if (limit === 0) return String(remaining)
  return `${remaining}/${limit}`
}

export function timelineStepDesc(
  stepLevel: string,
  state: 'done' | 'current' | 'locked',
  fallback: string,
): string {
  if (state === 'locked') return '尚未解锁'
  if (state === 'current') return '当前认证等级'
  if (stepLevel === 'BASIC') return '已完成基础考核'
  if (stepLevel === 'NONE') return '基础账户创建'
  return fallback
}

export function levelDisplay(level?: string): string {
  if (!level) return '—'
  return certLabel[level as keyof typeof certLabel] || level
}
