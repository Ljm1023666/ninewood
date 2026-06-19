import { useState } from 'react'
import { Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlackScope } from '@/components/card-pool/types'
import {
  scopeTaxonomySpectrumStyle,
  scopeTitle,
} from '@/components/card-pool/scope'

interface TableDiscardProps {
  discard: BlackScope[]
  onRestore: (card: BlackScope) => void
}

export function TableDiscard({ discard, onRestore }: TableDiscardProps) {
  const [open, setOpen] = useState(false)

  if (discard.length === 0) return null

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
      >
        <Trash2 className="size-4" />
        弃牌区 ({discard.length})
        {open ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>

      {open ? (
        <div className="flex flex-wrap gap-2">
          {discard.map((card) => {
            const spectrum = scopeTaxonomySpectrumStyle(card)
            return (
              <div
                key={`${card.path.join('/')}|${card.leafFilter?.join(',') ?? ''}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2',
                )}
              >
                <span
                  className={cn(
                    'text-xs line-through',
                    !spectrum && 'text-text-muted',
                  )}
                  style={spectrum}
                >
                  {scopeTitle(card)}
                </span>
                <button
                  type="button"
                  onClick={() => onRestore(card)}
                  className="rounded p-0.5 text-text-muted hover:text-accent transition-colors"
                  title="恢复到手牌"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
