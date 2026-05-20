import { cn } from '@/lib/utils'

/** Material UI 风格不定长进度条：列表/路由加载时顶栏一条（与 MUI LinearProgress indeterminate 视觉同类） */
export function LinearProgress({
  className,
  'aria-label': ariaLabel = '加载中',
}: {
  className?: string
  'aria-label'?: string
}) {
  return (
    <div
      className={cn('linear-progress-mui relative h-1 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-busy="true"
    >
      <div className="linear-progress-mui__bar absolute inset-y-0 left-0 w-[38%] rounded-full bg-[linear-gradient(90deg,var(--primary-start),var(--primary-end))]" />
    </div>
  )
}
