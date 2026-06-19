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

export function usePagination<T>(
  fetchFn: (page: number) => Promise<PaginationResult<T>>,
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [snapshot, setSnapshot] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
  })
  const totalRef = useRef(0)
  const pageRef = useRef(1)
  const totalPagesRef = useRef(0)
  const loadingRef = useRef(false)
  /** 列表条件变更时递增，丢弃仍在飞行中的旧请求结果，避免 loadMore(true) 被 loading 短路 */
  const fetchGeneration = useRef(0)

  const loadMore = useCallback(
    async (reset = false) => {
      if (!reset && loadingRef.current) return

      if (reset) {
        fetchGeneration.current += 1
        pageRef.current = 1
        setItems([])
        totalPagesRef.current = 0
        setHasMore(true)
        setSnapshot({ page: 1, totalPages: 1, totalCount: 0 })
      }

      const gen = fetchGeneration.current
      loadingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const res = await fetchFn(pageRef.current)
        if (gen !== fetchGeneration.current) return
        const data =
          res.items || res.demands || res.orders || res.complaints || []
        setItems((prev) => [...prev, ...data])
        totalRef.current = res.total
        totalPagesRef.current = res.totalPages
        setSnapshot({
          page: pageRef.current,
          totalPages: res.totalPages,
          totalCount: res.total,
        })
        pageRef.current++
        setHasMore(pageRef.current <= res.totalPages)
      } catch (e: any) {
        if (gen === fetchGeneration.current) {
          setError(e.response?.data?.message || e.message || '加载失败')
        }
      } finally {
        if (gen === fetchGeneration.current) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    },
    [fetchFn],
  )

  const goToPage = useCallback(
    async (target: number) => {
      if (target < 1 || loadingRef.current) return
      fetchGeneration.current += 1
      const gen = fetchGeneration.current
      pageRef.current = target
      loadingRef.current = true
      setLoading(true)
      setError(null)
      setHasMore(true)
      try {
        const res = await fetchFn(target)
        if (gen !== fetchGeneration.current) return
        const data =
          res.items || res.demands || res.orders || res.complaints || []
        setItems(data)
        totalRef.current = res.total
        totalPagesRef.current = res.totalPages
        setSnapshot({
          page: target,
          totalPages: res.totalPages,
          totalCount: res.total,
        })
        pageRef.current = target + 1
        setHasMore(target < res.totalPages)
      } catch (e: any) {
        if (gen === fetchGeneration.current) {
          setError(e.response?.data?.message || e.message || '加载失败')
        }
      } finally {
        if (gen === fetchGeneration.current) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    },
    [fetchFn],
  )

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    goToPage,
    total: totalRef,
    page: snapshot.page,
    totalPages: snapshot.totalPages,
    totalCount: snapshot.totalCount,
  }
}
