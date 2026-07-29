import { Undo2, Redo2, FolderUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlackScope } from '@/components/card-pool/types'
import { scopeCurrentClassificationBasis } from '@/components/card-pool/scope'
import { TAXONOMY } from '@/components/card-pool/taxonomy'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

interface TableBreadcrumbProps {
  focus: BlackScope
  canUndo: boolean
  canRedo: boolean
  canGoParent: boolean
  onUndo: () => void
  onRedo: () => void
  onGoParent: () => void
  onJumpToPath?: (path: string[]) => void
  className?: string
}

export function TableBreadcrumb({
  focus,
  canUndo,
  canRedo,
  canGoParent,
  onUndo,
  onRedo,
  onGoParent,
  onJumpToPath,
  className,
}: TableBreadcrumbProps) {
  const label = scopeCurrentClassificationBasis(focus)
  const pathSegments = focus.path.map((id) => TAXONOMY[id]?.label ?? id)

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2',
        className,
      )}
    >
      <LiquidMetalButton
        type="button"
        variant="ghost"
        size="icon"
        className="card-pool-stitch__crumb-btn size-7 shrink-0"
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销"
      >
        <Undo2 className="size-4" />
      </LiquidMetalButton>
      <LiquidMetalButton
        type="button"
        variant="ghost"
        size="icon"
        className="card-pool-stitch__crumb-btn size-7 shrink-0"
        onClick={onRedo}
        disabled={!canRedo}
        title="重做"
      >
        <Redo2 className="size-4" />
      </LiquidMetalButton>
      <LiquidMetalButton
        type="button"
        variant="ghost"
        size="icon"
        className="card-pool-stitch__crumb-btn size-7 shrink-0"
        onClick={onGoParent}
        disabled={!canGoParent}
        title="返回上级"
      >
        <FolderUp className="size-4" />
      </LiquidMetalButton>

      <div className="mx-2 h-5 w-px shrink-0 bg-border card-pool-stitch__crumb-divider" />

      {onJumpToPath ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          {pathSegments.map((seg, i) => (
            <div
              key={`${i}-${seg}`}
              className="flex min-w-0 items-center gap-x-1.5"
            >
              {i > 0 ? (
                <span className="card-pool-stitch__crumb-sep text-text-muted">
                  ›
                </span>
              ) : null}
              {i < pathSegments.length - 1 ? (
                <button
                  type="button"
                  className="card-pool-stitch__crumb-link min-w-0 truncate border-0 bg-transparent p-0 text-left text-sm text-text-secondary hover:text-text-primary"
                  onClick={() => onJumpToPath(focus.path.slice(0, i + 1))}
                  title={`跳转到 ${seg}`}
                >
                  {seg}
                </button>
              ) : (
                <span
                  className={cn(
                    'card-pool-stitch__crumb-current min-w-0 truncate font-semibold',
                    'text-text-primary',
                  )}
                  title={label}
                >
                  {seg}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-semibold',
            'text-text-primary',
          )}
          title={label}
        >
          {label}
        </div>
      )}
    </div>
  )
}
