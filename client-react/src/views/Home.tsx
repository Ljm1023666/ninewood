import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PenSquare, MapPin } from 'lucide-react'
import { demandApi } from '@/api/demand'
import { usePagination } from '@/hooks/usePagination'
import { ListItemCard } from '@/components/ui/list-item-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar'
import { certColor } from '@/constants/cert'
import { cn } from '@/lib/utils'

type DemandRow = {
  id: string
  title: string
  minPrice: number
  category: string
  serviceType: string
  applicantCount: number
  createdAgo?: string
  isExample?: boolean
  user?: { id: string; nickname: string; avatarUrl: string | null; certificationLevel?: string }
}

const PAGE_SIZE = 20

export default function Home() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [serviceType, setServiceType] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL')

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 320)
    return () => window.clearTimeout(t)
  }, [keyword])

  const fetchPage = useCallback(
    async (page: number) => {
      const r = await demandApi.list({
        page,
        limit: PAGE_SIZE,
        ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
        ...(serviceType !== 'ALL' ? { serviceType } : {}),
      })
      return r.data.data as {
        demands: DemandRow[]
        total: number
        page: number
        totalPages: number
      }
    },
    [debouncedKeyword, serviceType],
  )

  const { items, loading, error, hasMore, loadMore } = usePagination<DemandRow>(fetchPage)

  useEffect(() => {
    void loadMore(true)
  }, [debouncedKeyword, serviceType, loadMore])

  useEffect(() => {
    const root = scrollRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit && hasMore && !loading) void loadMore()
      },
      { root, rootMargin: '120px', threshold: 0 },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [hasMore, loading, loadMore])

  return (
    <div
      ref={scrollRef}
      className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-background text-foreground"
    >
      {/* items-stretch：子项默认拉满栏宽；标题区等用内部 items-center / text-center 居中，避免整列被压成左对齐窄条 */}
      <div className="relative z-10 box-border mx-auto flex w-full max-w-3xl shrink-0 flex-col items-stretch self-center px-4 pb-8 pt-6 sm:px-6">
        <div className="mb-6 flex w-full flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">发现</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-secondary sm:text-[15px]">
            浏览最新需求，接单赚钱；多一个人发布，就多一个机会——欢迎发布你的需求。
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" size="lg" className="gap-2" onClick={() => navigate('/demands/create')}>
              <PenSquare className="size-4" />
              发布需求
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="gap-2 border-border"
              onClick={() => navigate('/search')}
            >
              <Search className="size-4" />
              找人
            </Button>
          </div>
        </div>

        <div className="mb-6 flex w-full flex-col items-stretch gap-4">
          <div className="flex w-full justify-center">
            <AnimatedGlowingSearchBar
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索需求标题或描述"
            />
          </div>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {(
              [
                { k: 'ALL' as const, l: '全部' },
                { k: 'ONLINE' as const, l: '线上' },
                { k: 'OFFLINE' as const, l: '线下' },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setServiceType(t.k)}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                  serviceType === t.k
                    ? 'bg-[var(--primary-gradient)] text-white'
                    : 'border border-border bg-card text-text-secondary hover:border-accent/50',
                )}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="w-full rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-text-muted">{error}</p>
            <Button type="button" variant="outline" className="mt-4 border-border" onClick={() => loadMore(true)}>
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
            />
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-3">
          {items.map((d) => (
            <ListItemCard key={d.id} onClick={() => navigate(`/demands/${d.id}`)} className="p-4">
              <div className="flex gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
                  style={{
                    background: certColor[d.user?.certificationLevel ?? 'NONE'] || certColor.NONE,
                  }}
                >
                  {d.user?.avatarUrl ? (
                    <img src={d.user.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    (d.user?.nickname || '?').charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-semibold text-text-primary">{d.title}</span>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {d.isExample ? (
                        <span className="rounded bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-muted">
                          示例
                        </span>
                      ) : null}
                      <span className="rounded bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                        {d.serviceType === 'ONLINE' ? '线上' : '线下'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    <span>{d.category}</span>
                    <span>{d.applicantCount ?? 0} 人申请</span>
                    {d.createdAgo ? <span>{d.createdAgo}</span> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-text-muted">
                      <MapPin className="size-3.5 opacity-70" />
                      <span className="truncate">{d.user?.nickname || '用户'}</span>
                    </span>
                    <span className="font-semibold text-[var(--primary-start)]">¥{d.minPrice}</span>
                  </div>
                </div>
              </div>
            </ListItemCard>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">加载中…</p>
        ) : null}
        {loading && items.length > 0 ? (
          <p className="py-6 text-center text-xs text-text-muted">加载更多…</p>
        ) : null}
        {!hasMore && items.length > 0 ? (
          <p className="py-6 text-center text-xs text-text-muted">没有更多了</p>
        ) : null}

        <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
      </div>
    </div>
  )
}
