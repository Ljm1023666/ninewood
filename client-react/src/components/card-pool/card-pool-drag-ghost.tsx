import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import type { CSSProperties } from 'react'
import {
  HandEntryCardPackFace,
  HandPackGhostAtPoint,
} from '@/components/card-pool/HandPile'

export function BrowseBlackScopeDragGhost({
  dragInVisual,
  basis,
  n,
  spectrum,
}: {
  dragInVisual: { x: number; y: number } | null
  basis: string
  n: number | null | undefined
  spectrum: CSSProperties | undefined
}) {
  const [holdExit, setHoldExit] = useState(false)
  useLayoutEffect(() => {
    if (dragInVisual != null) setHoldExit(true)
  }, [dragInVisual])
  const show = dragInVisual != null || holdExit
  if (!show || typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence mode="sync" onExitComplete={() => setHoldExit(false)}>
      {dragInVisual != null ? (
        <HandPackGhostAtPoint
          key="browse-drag-in"
          x={dragInVisual.x}
          y={dragInVisual.y}
          exitOnUnmount
        >
          <HandEntryCardPackFace
            basis={basis}
            n={n}
            spectrum={spectrum}
            className="ring-2 ring-accent/40"
          />
        </HandPackGhostAtPoint>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
