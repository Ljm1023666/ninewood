import { forwardRef, type MutableRefObject } from 'react'
import { toast } from '@/components/ui/confirm-dialog'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import { scopeTitle } from '@/components/card-pool/scope'
import { HandPile } from '@/components/card-pool/HandPile'
import { TableDiscard } from '@/components/card-pool/TableDiscard'

interface CardPoolFooterProps {
  hand: HandEntry[]
  discard: BlackScope[]
  handTotals: Record<string, number>
  openingCarousel: boolean
  onOpenDesktop: (entry: HandEntry) => void
  onRemove: (id: string) => void
  onPin: (id: string) => void
  onDiscard: (id: string) => void
  onRestore: (card: BlackScope) => void
  onClearHand: () => void
  onDropBlackScope?: (scope: BlackScope) => void
  celebrateBlackScopeDropRef?: MutableRefObject<
    ((scope: BlackScope, clientX: number, clientY: number) => void) | null
  >
  pointerDropHighlight?: boolean
  forceOpen?: boolean
}

export const CardPoolFooter = forwardRef<HTMLDivElement, CardPoolFooterProps>(
  function CardPoolFooter(
    {
      hand,
      discard,
      handTotals,
      openingCarousel,
      onOpenDesktop,
      onRemove,
      onPin,
      onDiscard,
      onRestore,
      onClearHand,
      onDropBlackScope,
      celebrateBlackScopeDropRef,
      pointerDropHighlight,
      forceOpen = false,
    },
    handDropZoneRef,
  ) {
    const handlePreview = (entry: HandEntry) => {
      import('@/components/card-pool/search-params')
        .then(({ fetchTotalForScope }) =>
          fetchTotalForScope(entry.scope).then((n) => {
            toast(`「${scopeTitle(entry.scope)}」约 ${n} 条需求`, 'success')
          }),
        )
        .catch(() => {})
    }

    return (
      <>
        <HandPile
          ref={handDropZoneRef}
          entries={hand}
          scopeTotals={handTotals}
          busy={openingCarousel}
          onOpenDesktop={onOpenDesktop}
          onRemove={onRemove}
          onPin={onPin}
          onDiscardToPile={onDiscard}
          onPreview={handlePreview}
          celebrateBlackScopeDropRef={celebrateBlackScopeDropRef}
          pointerDropHighlight={pointerDropHighlight}
          forceOpen={forceOpen}
          onDropBlackScope={(scope) => {
            if (onDropBlackScope) {
              onDropBlackScope(scope)
            } else {
              toast('该范围已在手牌中', 'info')
            }
          }}
          onClearHand={hand.length > 0 ? onClearHand : undefined}
        />
        <TableDiscard
          discard={discard}
          onRestore={(c) => {
            const ok = onRestore(c)
            if (!ok) toast('该范围已在手牌中', 'info')
          }}
        />
      </>
    )
  },
)
