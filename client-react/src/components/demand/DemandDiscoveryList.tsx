import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { demandApi } from '@/api/demand'
import { usePagination } from '@/hooks/usePagination'
import { ListItemCard } from '@/components/ui/list-item-card'
import { Timeline } from '@/components/ui/modern-timeline'
import { Button } from '@/components/ui/button'
import { AcetInvertButton } from '@/components/ui/tailwindcss-buttons-variants'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

export type DemandRow = {
  id: string
  title: string
  minPrice: number
  category: string
  taxonomyLeafId?: string | null
  serviceType: string
  applicantCount: number
  createdAgo?: string
  isExample?: boolean
  user?: {
    id: string
    nickname: string
    avatarUrl: string | null
    certificationLevel?: string
  }
}

const DEFAULT_PAGE_SIZE = 20
const CERT_BG_CLASS: Record<string, string> = {
  NONE: 'bg-gray-500',
  BASIC: 'bg-blue-500',
  INTERMEDIATE: 'bg-violet-500',
  ADVANCED: 'bg-amber-500',
  MASTER: 'bg-red-500',
}

export function DemandCardInner({ d }: { d: DemandRow }) {
  const isDark = useThemeStore((s) => s.current.dark)
  const certLevel = d.user?.certificationLevel ?? 'NONE'
  const certBgClass = CERT_BG_CLASS[certLevel] ?? CERT_BG_CLASS.NONE
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white',
          certBgClass,
        )}
      >
        {d.user?.avatarUrl ? (
          <img
            src={d.user.avatarUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          (d.user?.nickname || '?').charAt(0)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="font-semibold text-text-primary">{d.title}</span>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {d.isExample ? (
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-sm font-medium',
                  isDark ? 'bg-bg-secondary text-text-muted' : 'text-gray-400',
                )}
              >
                示例
              </span>
            ) : null}
            <span
              className={cn(
                'rounded px-2 py-0.5 text-sm font-semibold',
                isDark ? 'bg-bg-secondary text-text-muted' : 'text-gray-500',
              )}
            >
              {d.serviceType === 'ONLINE' ? '线上' : '线下'}
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span>{d.category}</span>
          <span>{d.applicantCount ?? 0} 人申请</span>
          {d.createdAgo ? <span>{d.createdAgo}</span> : null}
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-text-muted">
            <MapPin className="size-3.5 opacity-70" />
            <span className="truncate">{d.user?.nickname || '用户'}</span>
          </span>
          <span className="font-semibold text-[var(--primary-start)]">
            ¥{d.minPrice}
          </span>
        </div>
      </div>
    </div>
  )
}

type ServiceFilter = 'ALL' | 'ONLINE' | 'OFFLINE'

/** 与 URL / 首屏解析一致的 keyword + serviceType，驱动需求列表与分页 */
export function DemandDiscoveryList({
  listScope,
  keyword,
  serviceType,
  taxonomyLeafIds,
  scrollRootRef,
  className,
  interactionMode,
  layoutVariant,
  desktopGridRowCount,
  onDesktopGridRowCountChange,
  onDemandRowRecurse,
  tags,
  exact,
  paginationMode = 'infinite',
  pageSize = DEFAULT_PAGE_SIZE,
  renderMode = 'list' as 'list' | 'timeline',
}: {
  listScope?: Record<string, string>
  keyword: string
  serviceType: ServiceFilter
  taxonomyLeafIds?: string[]
  scrollRootRef: React.RefObject<HTMLElement | null>
  className?: string
  interactionMode?: 'default' | 'cardPoolDesktop'
  layoutVariant?: 'list' | 'grid'
  desktopGridRowCount?: number
  onDesktopGridRowCountChange?: (n: number) => void
  onDemandRowRecurse?: (d: DemandRow) => void
  tags?: string[]
  exact?: boolean
  paginationMode?: 'infinite' | 'paged'
  pageSize?: number
  renderMode?: 'list' | 'timeline'
}) {
  void interactionMode
  void layoutVariant
  void desktopGridRowCount
  void onDesktopGridRowCountChange
  void onDemandRowRecurse
  const timelineMode = renderMode === 'timeline'
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 稳定数组依赖：用字符串 key 避免每次渲染 [] !== [] 触发连锁重建
  const tagsKey = tags?.join(',') ?? ''
  const leafIdsKey = taxonomyLeafIds?.join(',') ?? ''

  const fetchPage = useCallback(
    async (page: number) => {
      const kw = keyword.trim()
      const apiParams: Record<string, string | number> = {
        ...(listScope ?? {}),
        page,
        limit: pageSize,
      }
      if (kw) apiParams.keyword = kw
      if (serviceType !== 'ALL') apiParams.serviceType = serviceType
      if (tags && tags.length > 0) apiParams.tags = tags.join(',')
      if (taxonomyLeafIds && taxonomyLeafIds.length > 0)
        apiParams.taxonomyLeafIds = taxonomyLeafIds.join(',')
      if (exact) apiParams.exact = 'true'
      const r = await demandApi.list({
        ...apiParams,
      })
      return r.data.data as {
        demands: DemandRow[]
        total: number
        page: number
        totalPages: number
      }
    },
    [keyword, serviceType, listScope, pageSize, tagsKey, leafIdsKey, exact],
  )

  const {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    goToPage,
    page,
    totalPages,
    totalCount,
  } = usePagination<DemandRow>(fetchPage)

  const loadMoreRef = useRef(loadMore)
  const hasMoreRef = useRef(hasMore)
  const loadingUiRef = useRef(loading)
  loadMoreRef.current = loadMore
  hasMoreRef.current = hasMore
  loadingUiRef.current = loading

  useEffect(() => {
    if (paginationMode === 'paged') {
      void goToPage(1)
      return
    }
    void loadMore(true)
  }, [keyword, serviceType, leafIdsKey, loadMore, goToPage, paginationMode])

  /** 勿把 loading/hasMore 放进依赖：否则会反复 disconnect 观察器，在 rootMargin 下 sentinel 常相交，导致连续 loadMore 拉完全部分页 */
  useLayoutEffect(() => {
    if (paginationMode === 'paged') return
    const root = scrollRootRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit && hasMoreRef.current && !loadingUiRef.current)
          void loadMoreRef.current()
      },
      { root, rootMargin: '48px', threshold: 0 },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [scrollRootRef, paginationMode])

  /** loading 结束时 IntersectionObserver 可能因比例未变不发事件，补一次几何检测以继续翻页（仍受 usePagination 内 loadingRef 去重） */
  useEffect(() => {
    if (paginationMode === 'paged') return
    if (loading || !hasMore) return
    let cancelled = false
    const id = requestAnimationFrame(() => {
      if (cancelled) return
      const root = scrollRootRef.current
      const target = sentinelRef.current
      if (!root || !target) return
      const rr = root.getBoundingClientRect()
      const tr = target.getBoundingClientRect()
      const margin = 48
      const near = tr.top <= rr.bottom + margin && tr.bottom >= rr.top - margin
      if (near && hasMoreRef.current && !loadingUiRef.current)
        void loadMoreRef.current()
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [loading, hasMore, scrollRootRef, paginationMode])

  return (
    <div className={cn('flex w-full flex-col', className)}>
      {error ? (
        <div className="w-full rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-text-muted">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-border"
            onClick={() => loadMore(true)}
          >
            重试
          </Button>
        </div>
      ) : null}

      {!error && !loading && items.length === 0 ? (
        <div className="w-full">
          <EmptyState
            type="demand"
            message="暂时还没有匹配的需求，先发一条占个坑吧。"
            actionLabel="发布需求"
            onAction={() => navigate('/demands/create')}
            actionSlot={
              <AcetInvertButton
                type="button"
                className="w-full max-w-xs"
                onClick={() => navigate('/demands/create')}
              >
                发布需求
              </AcetInvertButton>
            }
          />
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-3">
        {timelineMode ? (
          <Timeline
            items={items.map((d) => ({
              title: d.title,
              description: `${d.serviceType === 'ONLINE' ? '线上服务' : '线下服务'} · ¥${d.minPrice} · ${d.applicantCount} 人申请`,
              date: d.createdAgo ? `${d.createdAgo}前` : undefined,
              status: 'current' as const,
              image: d.user?.avatarUrl || undefined,
              onClick: () => {
                const params = new URLSearchParams()
                const kw = keyword.trim()
                if (kw) params.set('q', kw)
                if (serviceType !== 'ALL') params.set('type', serviceType)
                const qs = params.toString()
                navigate(`/demands/${d.id}${qs ? '?' + qs : ''}`)
              },
              onAvatarClick: d.user?.id
                ? () => navigate(`/profile/${d.user!.id}`)
                : undefined,
            }))}
          />
        ) : (
          items.map((d) => (
            <ListItemCard
              key={d.id}
              onClick={() => {
                const params = new URLSearchParams()
                const kw = keyword.trim()
                if (kw) params.set('q', kw)
                if (serviceType !== 'ALL') params.set('type', serviceType)
                const qs = params.toString()
                navigate(`/demands/${d.id}${qs ? '?' + qs : ''}`)
              }}
              className="p-4"
            >
              <DemandCardInner d={d} />
            </ListItemCard>
          ))
        )}
      </div>

      {loading && items.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">加载中…</p>
      ) : null}
      {loading && items.length > 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">加载更多…</p>
      ) : null}
      {!hasMore && items.length > 0 && paginationMode === 'infinite' ? (
        <p className="py-6 text-center text-sm text-text-muted">没有更多了</p>
      ) : null}

      {paginationMode === 'paged' && totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-sm text-text-muted">
            第 {page}/{totalPages} 页 · 共 {totalCount} 条
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => {
                if (page > 1) void goToPage(page - 1)
              }}
            >
              上一页
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading || page >= totalPages}
              onClick={() => {
                if (page < totalPages) void goToPage(page + 1)
              }}
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}

      {paginationMode === 'infinite' ? (
        <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
      ) : null}
    </div>
  )
}
