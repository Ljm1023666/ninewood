import { useState, useCallback, useRef } from 'react'

interface PaginationResult<T> {
  total: number
  page: number
  totalPages: number
  items?: T[]
  demands?: T[]
  orders?: T[]
  complaints?: T[]
  [key: string]: any
}

export function usePagination<T>(fetchFn: (page: number) => Promise<PaginationResult<T>>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const totalRef = useRef(0)
  const pageRef = useRef(1)
  const totalPagesRef = useRef(0)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    if (reset) {
      pageRef.current = 1
      setItems([])
      totalPagesRef.current = 0
      setHasMore(true)
    }
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn(pageRef.current)
      const data = res.items || res.demands || res.orders || res.complaints || []
      setItems((prev) => [...prev, ...data])
      totalRef.current = res.total
      totalPagesRef.current = res.totalPages
      pageRef.current++
      setHasMore(pageRef.current <= res.totalPages)
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || '加载失败')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [fetchFn])

  return { items, loading, error, hasMore, loadMore, total: totalRef }
}
