import { useState, useCallback, useMemo } from 'react'
import type { BlackScope } from '@/components/card-pool/types'
import { nextBlackScopes, parentScope } from '@/components/card-pool/scope'
import { categoryToLeafBlackScope } from '@/components/card-pool/category-to-scope'
import { usePersistedGlobalHand } from '@/components/card-pool/usePersistedGlobalHand'

const MAX_HISTORY = 10

export function useTableState(initialFocus?: BlackScope | null) {
  const [focus, setFocus] = useState<BlackScope>(
    () => initialFocus ?? { path: ['root'], leafFilter: null },
  )
  const [history, setHistory] = useState<BlackScope[]>([])
  const [forward, setForward] = useState<BlackScope[]>([])

  const {
    hand,
    discard,
    addToHand,
    removeHandEntry,
    pinToFront,
    discardHandEntryById,
    restoreCard,
  } = usePersistedGlobalHand()

  const children = useMemo(() => nextBlackScopes(focus), [focus])
  const mode = useMemo(() => {
    const n = children.length
    if (n === 0) return 'leaf' as const
    if (n <= 4) return 'simple' as const
    if (n <= 12) return 'hand' as const
    return 'paged' as const
  }, [children.length])

  /** @returns added | duplicate | invalid */
  const addDemandToHand = useCallback(
    (category: string, serviceType: string, taxonomyLeafId?: string | null) => {
      const scope = categoryToLeafBlackScope(
        category,
        serviceType,
        taxonomyLeafId,
      )
      if (!scope) return 'invalid' as const
      const added = addToHand(scope)
      return added ? 'added' : 'duplicate'
    },
    [addToHand],
  )

  const expandNode = useCallback(
    (card: BlackScope) => {
      setHistory((prev) => {
        const next = [...prev, focus]
        if (next.length > MAX_HISTORY) next.shift()
        return next
      })
      setForward([])
      setFocus(card)
    },
    [focus],
  )

  const goParent = useCallback(() => {
    const p = parentScope(focus)
    if (!p) return
    setHistory((prev) => {
      const next = [...prev, focus]
      if (next.length > MAX_HISTORY) next.shift()
      return next
    })
    setForward([])
    setFocus(p)
  }, [focus])

  const goToScope = useCallback(
    (target: BlackScope) => {
      setHistory((prev) => {
        const next = [...prev, focus]
        if (next.length > MAX_HISTORY) next.shift()
        return next
      })
      setForward([])
      setFocus(target)
    },
    [focus],
  )

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]!
    setHistory((h) => h.slice(0, -1))
    setForward((f) => [focus, ...f])
    setFocus(prev)
  }, [focus, history])

  const redo = useCallback(() => {
    if (forward.length === 0) return
    const next = forward[0]!
    setForward((f) => f.slice(1))
    setHistory((h) => [...h, focus])
    setFocus(next)
  }, [focus, forward])

  /** 递归（工具栏）：叶子黑卡回手牌并回到父级浏览；同范围不重复加入 */
  const recurseFromDesktop = useCallback(
    (leafScopeArg: BlackScope) => {
      const added = addToHand(leafScopeArg)
      const p = parentScope(leafScopeArg)
      if (p) {
        setHistory((prev) => {
          const next = [...prev, focus]
          if (next.length > MAX_HISTORY) next.shift()
          return next
        })
        setForward([])
        setFocus(p)
      }
      return added
    },
    [focus, addToHand],
  )

  const restoreFocus = useCallback((target: BlackScope) => {
    setHistory([])
    setForward([])
    setFocus(target)
  }, [])

  return {
    focus,
    hand,
    discard,
    history,
    forward,
    mode,
    children,
    parent: parentScope(focus),
    addToHand,
    removeHandEntry,
    pinToFront,
    discardHandEntryById,
    restoreCard,
    addDemandToHand,
    expandNode,
    goParent,
    goToScope,
    restoreFocus,
    undo,
    redo,
    recurseFromDesktop,
  }
}
