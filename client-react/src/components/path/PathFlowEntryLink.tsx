import { Link } from 'react-router-dom'
import { Route } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 轻量挂件：跳转路径相关后置/前置页 */
export function PathFlowEntryLink({
  to,
  label = '匹配路径',
  className,
}: {
  to: string
  label?: string
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-white/10',
        'bg-bg-secondary/50 px-3 py-2 text-sm text-text-secondary',
        'transition-colors hover:border-[var(--accent-color)]/40 hover:text-text-primary',
        className,
      )}
    >
      <Route className="size-4 shrink-0 text-[var(--accent-color)]" />
      {label}
    </Link>
  )
}
