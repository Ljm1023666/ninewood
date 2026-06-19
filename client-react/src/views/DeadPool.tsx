import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock } from 'lucide-react'
import { RegionCascader } from '@/components/ui/region-cascader'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { Chip } from '@/components/ui/chip'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/layout/PageHeader'
import { poolApi } from '@/api/pool'

function DeadDemandCard({ d }: { d: any }) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer overflow-hidden p-0 gap-0 transition-all duration-200 hover:border-accent/40"
      onClick={() => navigate(`/demands/${d.id}`)}
    >
      {/* 顶部渐变色条 */}
      <div className="h-1.5 w-full bg-linear-to-r from-[var(--primary-start)] to-[var(--primary-end)]" />

      {d.coverImage && (
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={d.coverImage}
            alt={d.title || ''}
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-2.5 p-4">
        <h3 className="font-semibold text-text-primary line-clamp-2 leading-snug">
          {d.title}
        </h3>

        {d.tags && d.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {d.tags.slice(0, 4).map((tag: string) => (
              <Chip key={tag} variant="outlined" selected className="h-6 px-2 text-xs">
                {tag}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Clock className="size-3" />
          {d.completedAt
            ? `完成于 ${new Date(d.completedAt).toLocaleDateString('zh-CN')}`
            : '已关闭'}
        </div>
      </div>
    </Card>
  )
}

export default function DeadPool() {
  const navigate = useNavigate()
  const { tags, loading: tagsLoading, error: tagsError } = useTagLoader()

  const [regionId, setRegionId] = useState<number | undefined>()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalPages, setTotalPages] = useState(1)
  const [forbidden, setForbidden] = useState(false)

  const loadDead = async (p: number) => {
    setLoading(true)
    setError('')
    setForbidden(false)
    try {
      const res = await poolApi.getDead({
        regionId,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        page: p,
        pageSize: 20,
      })
      const data = res.data.data
      setDemands(data.demands || [])
      setTotalPages(data.totalPages || 1)
    } catch (e: any) {
      const status = e.response?.status
      if (status === 403) {
        setForbidden(true)
      } else {
        setError(e.response?.data?.message || '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }

  // 首次加载
  useEffect(() => {
    loadDead(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    setPage(1)
    loadDead(1)
  }

  const goToPage = (p: number) => {
    setPage(p)
    loadDead(p)
  }

  // 403 权限不足
  if (forbidden) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          <PageHeader title="死池" onBack="back" />
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              type="demand"
              message="请先查看您的完成列表，再浏览死池"
              actionLabel="查看完成列表"
              onAction={() => navigate('/my-demands')}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        <PageHeader
          title="死池"
          subtitle="已关闭或超时的需求归档"
          onBack="back"
        />

        {/* 筛选栏 */}
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-bg-secondary/50 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">地区</label>
            <RegionCascader
              value={regionId}
              onChange={(id) => setRegionId(id)}
            />
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">标签</label>
            <TagSelector
              tags={tags}
              selected={selectedTags}
              onChange={setSelectedTags}
              loading={tagsLoading}
              error={tagsError}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={handleSearch}
          >
            <Search className="size-4" />
            搜索
          </Button>
        </div>

        {/* 内容区：三个状态 */}
        {error && <ErrorState message={error} onRetry={() => loadDead(page)} />}

        {!error && loading && <LoadingState lines={4} />}

        {!error && !loading && demands.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState type="demand" message="死池中暂无需求" />
          </div>
        )}

        {!error && !loading && demands.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {demands.map((d: any) => (
                <DeadDemandCard key={d.id} d={d} />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm tabular-nums text-text-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
