import { Undo2, Redo2, FolderUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BlackScope } from '@/components/card-pool/types'
import { scopeCurrentClassificationBasis } from '@/components/card-pool/scope'
import { TAXONOMY } from '@/components/card-pool/taxonomy'

interface TableBreadcrumbProps {
  focus: BlackScope
  canUndo: boolean
  canRedo: boolean
  canGoParent: boolean
  onUndo: () => void
  onRedo: () => void
  onGoParent: () => void
  onJumpToPath?: (path: string[]) => void
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
}: TableBreadcrumbProps) {
  const label = scopeCurrentClassificationBasis(focus)
  const pathSegments = focus.path.map((id) => TAXONOMY[id]?.label ?? id)

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={onRedo}
        disabled={!canRedo}
        title="重做"
      >
        <Redo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={onGoParent}
        disabled={!canGoParent}
        title="返回上级"
      >
        <FolderUp className="size-4" />
      </Button>

      <div className="mx-2 h-5 w-px shrink-0 bg-border" />

      {onJumpToPath ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
          {pathSegments.map((seg, i) => (
            <div
              key={`${i}-${seg}`}
              className="flex min-w-0 items-center gap-1"
            >
              {i > 0 ? <span className="text-text-muted">›</span> : null}
              {i < pathSegments.length - 1 ? (
                <button
                  type="button"
                  className="min-w-0 truncate rounded px-1 py-0.5 text-text-secondary hover:bg-accent/10 hover:text-text-primary"
                  onClick={() => onJumpToPath(focus.path.slice(0, i + 1))}
                  title={`跳转到 ${seg}`}
                >
                  {seg}
                </button>
              ) : (
                <span
                  className={cn(
                    'min-w-0 truncate rounded px-1 py-0.5 font-semibold',
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
            'min-w-0 flex-1 truncate rounded px-2 py-0.5 text-sm font-semibold',
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
