import { cn } from '@/lib/utils'

/** 路径文字：同值 kw+tag 时对角双色（左上银·关键词，右下金·标签） */
export function PathDualLabel({
  value,
  dualKwTag,
  className,
}: {
  value: string
  dualKwTag?: boolean
  className?: string
}) {
  return (
    <span
      className={cn('psa-path-label', dualKwTag && 'psa-path-label--kw-tag', className)}
      title={dualKwTag ? '关键词 · 标签' : undefined}
    >
      {value}
    </span>
  )
}
