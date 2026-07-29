import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPathDisplay } from '@/constants/path-search'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

export function PathChip({
  path,
  coverage,
  onRemove,
  className,
}: {
  path: string
  coverage?: number
  onRemove?: () => void
  className?: string
}) {
  const colon = path.indexOf(':')
  const type = colon > 0 ? path.slice(0, colon) : ''

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--wallet-glass-border)]',
        'bg-[var(--wallet-btn-ghost-bg)] px-3 py-1 text-xs font-medium text-text-primary',
        className,
      )}
    >
      <span className="rounded-sm bg-[var(--price-surface)] px-1 py-0.5 text-[10px] font-bold uppercase text-[var(--price-foreground)]">
        {type}
      </span>
      <span>{formatPathDisplay(path)}</span>
      {coverage !== undefined ? (
        <span className="text-text-muted tabular-nums">({coverage})</span>
      ) : null}
      {onRemove ? (
        <LiquidMetalButton
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-text-muted hover:bg-white/10 hover:text-text-primary"
          aria-label={`移除 ${path}`}
        >
          <X className="size-3" />
        </LiquidMetalButton>
      ) : null}
    </span>
  )
}
