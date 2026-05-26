import { useEffect, useMemo, useState } from 'react'
import type { BlackScope, HandEntry } from '@/components/card-pool/types'
import { scopeKey } from '@/components/card-pool/scope'
import { fetchTotalForScope } from '@/components/card-pool/search-params'

const DESKTOP_GRID_ROWS_LS = 'ninewood.cardPool.desktopGridRows'

/** 读取持久化的桌面网格行数 */
function readDesktopGridRows(): number {
  try {
    const raw = localStorage.getItem(DESKTOP_GRID_ROWS_LS)
    const n = raw === null ? 2 : parseInt(raw, 10)
    if (!Number.isFinite(n)) return 2
    return Math.min(5, Math.max(1, n))
  } catch {
    return 2
  }
}

/** 桌面网格行数状态 + 持久化 */
export function useDesktopGridRows() {
  const [desktopGridRows, setDesktopGridRows] = useState(readDesktopGridRows)
  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_GRID_ROWS_LS, String(desktopGridRows))
    } catch {
      /* ignore */
    }
  }, [desktopGridRows])
  return { desktopGridRows, setDesktopGridRows } as const
}

/** 从手牌列表中提取唯一 scope 列表 */
export function useUniqueHandScopes(hand: HandEntry[]) {
  return useMemo(() => {
    const m = new Map<string, BlackScope>()
    for (const h of hand) {
      const k = scopeKey(h.scope)
      if (!m.has(k)) m.set(k, h.scope)
    }
    return [...m.values()]
  }, [hand])
}

/** 批量拉取手牌中各 scope 的需求总数 */
export function useHandTotals(uniqueHandScopes: BlackScope[]) {
  const [handTotals, setHandTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    if (uniqueHandScopes.length === 0) {
      setHandTotals({})
      return
    }
    let cancelled = false
    void Promise.all(
      uniqueHandScopes.map(async (s) => {
        const k = scopeKey(s)
        try {
          const n = await fetchTotalForScope(s)
          return [k, n] as const
        } catch {
          return [k, 0] as const
        }
      }),
    ).then((pairs) => {
      if (cancelled) return
      setHandTotals((prev) => {
        const next = { ...prev }
        for (const [k, v] of pairs) next[k] = v
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [uniqueHandScopes])

  return handTotals
}

/** 批量拉取子 scope 的需求总数 */
export function useChildTotals(children: BlackScope[]) {
  const [childTotals, setChildTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    if (children.length === 0) return
    let cancelled = false
    void Promise.all(
      children.map(async (s) => {
        const key = scopeKey(s)
        try {
          const n = await fetchTotalForScope(s)
          return [key, n] as const
        } catch {
          return [key, 0] as const
        }
      }),
    ).then((pairs) => {
      if (cancelled) return
      const next: Record<string, number> = {}
      for (const [k, v] of pairs) next[k] = v
      setChildTotals(next)
    })
    return () => {
      cancelled = true
    }
  }, [children])

  return childTotals
}
