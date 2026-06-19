import { useCallback, useEffect, useRef, useState } from 'react'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import { scopeKey } from '@/components/card-pool/scope'
import {
  loadGlobalHandBundle,
  saveGlobalHandBundle,
} from '@/components/card-pool/tablePersistence'

const SAVE_DEBOUNCE_MS = 400

function newHandId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 全局手牌 / 弃牌（IndexedDB），供卡池主界面与资源管理器等多处挂载共享，
 * 避免各页面各自 useState 导致不同步。
 */
export function usePersistedGlobalHand() {
  const [hand, setHand] = useState<HandEntry[]>([])
  const [discard, setDiscard] = useState<BlackScope[]>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canPersistRef = useRef(false)

  useEffect(() => {
    canPersistRef.current = false
    let cancelled = false
    void loadGlobalHandBundle().then((b) => {
      if (cancelled) return
      if (b) {
        setHand(b.hand)
        setDiscard(b.discard)
      }
      canPersistRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!canPersistRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void saveGlobalHandBundle({ hand, discard })
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [hand, discard])

  const addToHand = useCallback((scope: BlackScope) => {
    const k = scopeKey(scope)
    let added = false
    setHand((prev) => {
      if (prev.some((h) => scopeKey(h.scope) === k)) return prev
      added = true
      return [...prev, { id: newHandId(), scope }]
    })
    return added
  }, [])

  const removeHandEntry = useCallback((id: string) => {
    setHand((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const pinToFront = useCallback((id: string) => {
    setHand((prev) => {
      const i = prev.findIndex((h) => h.id === id)
      if (i <= 0) return prev
      const next = [...prev]
      const [x] = next.splice(i, 1)
      return [x!, ...next]
    })
  }, [])

  const discardHandEntryById = useCallback((id: string) => {
    setHand((prev) => {
      const found = prev.find((h) => h.id === id)
      if (!found) return prev
      setDiscard((d) => [...d, found.scope])
      return prev.filter((h) => h.id !== id)
    })
  }, [])

  const restoreCard = useCallback((card: BlackScope) => {
    const k = scopeKey(card)
    let added = false
    setHand((prev) => {
      if (prev.some((h) => scopeKey(h.scope) === k)) return prev
      added = true
      return [...prev, { id: newHandId(), scope: card }]
    })
    if (added) {
      setDiscard((prev) => prev.filter((c) => scopeKey(c) !== k))
    }
    return added
  }, [])

  return {
    hand,
    discard,
    addToHand,
    removeHandEntry,
    pinToFront,
    discardHandEntryById,
    restoreCard,
  }
}
