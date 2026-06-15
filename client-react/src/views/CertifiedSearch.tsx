import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { certificationApi } from '@/api/certification'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { RegionCascader } from '@/components/ui/region-cascader'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SettingsPanel,
  SettingsRow,
  SettingsActionButton,
  SearchResultRow,
} from '@/components/layout/internal-ui'
import { cn } from '@/lib/utils'
import { certLabel } from '@/constants/cert'

interface ProviderItem {
  id: string
  nickname: string
  avatarUrl?: string
  certificationLevel: string
  tags: string[]
  avgRating: number
  totalCompleted: number
  region?: { id: number; name: string }
}

interface ProvidersData {
  items: ProviderItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function CertifiedSearch() {
  const navigate = useNavigate()

  const { tags: allTags, loading: tagLoading, error: tagError } = useTagLoader()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [regionId, setRegionId] = useState<number | undefined>()
  const [minRating, setMinRating] = useState<number | undefined>()
  const [maxRating, setMaxRating] = useState<number | undefined>()
  const [filterOpen, setFilterOpen] = useState(false)

  const [data, setData] = useState<ProvidersData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, any> = { page, limit: 20 }
      if (selectedTags.length > 0) params.tags = selectedTags.join(',')
      if (regionId) params.regionId = regionId
      if (minRating) params.minRating = minRating
      if (maxRating) params.maxRating = maxRating
      const res = await certificationApi.getProviders(params)
      setData(res.data.data)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [selectedTags, regionId, minRating, maxRating, page])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleTagChange = (tags: string[]) => {
    setSelectedTags(tags)
    setPage(1)
  }

  const handleRegionChange = (id: number) => {
    setRegionId(id)
    setPage(1)
  }

  function handleClearFilters() {
    setSelectedTags([])
    setRegionId(undefined)
    setMinRating(undefined)
    setMaxRating(undefined)
    setPage(1)
  }

  const hasFilters =
    selectedTags.length > 0 ||
    regionId !== undefined ||
    minRating !== undefined ||
    maxRating !== undefined
  const activeFilterCount =
    (selectedTags.length > 0 ? 1 : 0) +
    (regionId ? 1 : 0) +
    (minRating || maxRating ? 1 : 0)
  const isFirstPage = page <= 1
  const isLastPage = data ? page >= data.totalPages : true

  function buildProviderMeta(provider: ProviderItem) {
    const parts = [
      provider.certificationLevel !== 'NONE'
        ? certLabel[provider.certificationLevel] || provider.certificationLevel
        : null,
      provider.tags?.slice(0, 2).join('、'),
      provider.region?.name,
      `${provider.avgRating.toFixed(1)} 分 · ${provider.totalCompleted} 单`,
    ].filter(Boolean)
    return parts.join(' · ')
  }

  return (
    <InternalPageShell width="wide" contentClassName="flex min-h-full flex-col">
      <PageHeader
        title="认证服务者"
        subtitle="查找已认证的优质服务提供者"
        onBack="back"
      />

      <InternalContentBlock className="flex-1">
        <SettingsPanel>
          <div className="flex items-center justify-between px-6 py-4">
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                'inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider transition-colors',
                filterOpen ? 'text-text-primary' : 'text-text-muted hover:text-text-primary',
              )}
            >
              <MsIcon name="filter_list" size={14} />
              筛选
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center border border-[var(--internal-hairline)] font-mono text-[10px] text-[var(--internal-accent)]">
                  {activeFilterCount}
                </span>
              )}
              <MsIcon
                name="expand_more"
                size={12}
                className={cn('transition-transform', filterOpen && 'rotate-180')}
              />
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1 font-mono text-xs text-text-muted transition-colors hover:text-text-primary"
              >
                <MsIcon name="close" size={12} />
                清除全部
              </button>
            )}
          </div>

          {filterOpen && (
            <div className="space-y-4 border-t border-[var(--internal-hairline)] px-6 py-4">
              <div>
                <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-muted">
                  服务标签
                </label>
                <TagSelector
                  tags={allTags}
                  selected={selectedTags}
                  onChange={handleTagChange}
                  loading={tagLoading}
                  error={tagError}
                  max={10}
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-muted">
                    地域
                  </label>
                  <RegionCascader value={regionId} onChange={handleRegionChange} />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-text-muted">
                    评分范围
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      placeholder="起始"
                      value={minRating ?? ''}
                      onChange={(e) => {
                        setMinRating(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                        setPage(1)
                      }}
                      className="settings-input h-9 w-16 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-text-muted">—</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      placeholder="结束"
                      value={maxRating ?? ''}
                      onChange={(e) => {
                        setMaxRating(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                        setPage(1)
                      }}
                      className="settings-input h-9 w-16 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-text-muted">星</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SettingsPanel>

        {loading && <LoadingState variant="internal" lines={5} />}

        {!loading && error && (
          <ErrorState message={error} onRetry={fetchProviders} variant="internal" />
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            type="search"
            variant="internal"
            message={
              hasFilters
                ? '没有匹配的认证服务者'
                : '暂无认证服务者，去认证中心提升你的认证等级吧'
            }
            actionLabel="去认证中心"
            onAction={() => navigate('/cert-center')}
          />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <p className="font-mono text-xs text-text-muted">
              共{' '}
              <span className="font-semibold text-text-primary">{data.total}</span>{' '}
              位认证服务者
            </p>

            <div className="flex flex-col gap-3">
              {data.items.map((provider) => (
                <SearchResultRow
                  key={provider.id}
                  title={provider.nickname}
                  meta={buildProviderMeta(provider)}
                  badge="已认证"
                  avatar={
                    provider.avatarUrl ? (
                      <img
                        src={provider.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : undefined
                  }
                  avatarFallback={provider.nickname?.charAt(0)}
                  onClick={() => navigate(`/profile/${provider.id}`)}
                />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <SettingsActionButton
                  disabled={isFirstPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </SettingsActionButton>
                <span className="font-mono text-sm text-text-muted">
                  {data.page} / {data.totalPages}
                </span>
                <SettingsActionButton
                  disabled={isLastPage}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                >
                  下一页
                </SettingsActionButton>
              </div>
            )}
          </>
        )}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
