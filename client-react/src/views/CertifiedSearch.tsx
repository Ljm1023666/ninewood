import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  MapPin,
  CheckCircle,
  Award,
  X,
  Filter,
  ChevronDown,
} from 'lucide-react'
import { certificationApi } from '@/api/certification'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { RegionCascader } from '@/components/ui/region-cascader'
import { Chip } from '@/components/ui/chip'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/layout/PageHeader'
import { BorderBeam } from '@/components/ui/border-beam'
import { cn } from '@/lib/utils'
import { certLabel, certColor } from '@/constants/cert'

/* ── 类型 ── */

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

const LEVEL_ORDER = ['MASTER', 'ADVANCED', 'INTERMEDIATE', 'BASIC', 'NONE']

/* ── 主页面 ── */

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

  const levelCounts = data?.items
    ? LEVEL_ORDER.map((lvl) => ({
        level: lvl,
        label: certLabel[lvl] || lvl,
        count: data.items.filter((p) => p.certificationLevel === lvl).length,
      })).filter((x) => x.count > 0)
    : []

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-4xl shrink-0 flex-col self-center">
        {/* 页面标题 */}
        <div className="shrink-0 px-4 pt-6 pb-4 sm:px-6">
          <PageHeader
            title="认证服务者"
            subtitle="查找已认证的优质服务提供者"
            onBack="back"
          />
        </div>

        {/* 筛选工具条 */}
        <div className="shrink-0 px-4 pb-4 sm:px-6">
          <div className="rounded-xl border border-border bg-bg-secondary/80 backdrop-blur-md p-4">
            {/* 折叠开关 */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors',
                    filterOpen
                      ? 'bg-bg-tertiary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Filter className="size-3.5" />
                  筛选
                  {activeFilterCount > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-black">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      'size-3 transition-transform',
                      filterOpen && 'rotate-180',
                    )}
                  />
                </button>

                {/* 快捷评分范围 */}
                <div className="hidden items-center gap-1 sm:flex">
                  <Star className="size-3 text-muted-foreground" />
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
                    className="h-7 w-12 rounded border border-border bg-transparent px-1.5 text-center text-xs text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-muted-foreground">-</span>
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
                    className="h-7 w-12 rounded border border-border bg-transparent px-1.5 text-center text-xs text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] text-muted-foreground">星</span>
                </div>
              </div>

              {hasFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                  清除全部
                </button>
              )}
            </div>

            {/* 展开的筛选面板 */}
            <div
              className={cn(
                'mt-4 space-y-4 border-t border-border pt-4',
                !filterOpen && 'hidden',
              )}
            >
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    地域
                  </label>
                  <RegionCascader
                    value={regionId}
                    onChange={handleRegionChange}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
                      className="h-9 w-16 rounded-md border border-border bg-transparent px-2 text-center text-sm text-foreground outline-none focus-visible:border-accent/30 focus-visible:ring-[3px] focus-visible:ring-accent/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
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
                      className="h-9 w-16 rounded-md border border-border bg-transparent px-2 text-center text-sm text-foreground outline-none focus-visible:border-accent/30 focus-visible:ring-[3px] focus-visible:ring-accent/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-muted-foreground">星</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 结果区 */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          {loading && <LoadingState lines={5} />}

          {!loading && error && (
            <ErrorState message={error} onRetry={fetchProviders} />
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <EmptyState
              type="search"
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
              {/* 等级分布 + 数量 */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    共{' '}
                    <span className="font-semibold text-foreground">
                      {data.total}
                    </span>{' '}
                    位
                  </span>
                  {levelCounts.map(({ level, label, count }) => {
                    const color = certColor[level] || '#6b7280'
                    return (
                      <span
                        key={level}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {label} {count}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* 列表 */}
              <div className="flex flex-col gap-3">
                {data.items.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    onClick={() => navigate(`/profile/${provider.id}`)}
                  />
                ))}
              </div>

              {/* 分页 */}
              {data.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFirstPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {data.page} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLastPage}
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 服务者卡片 ── */

interface ProviderCardProps {
  provider: ProviderItem
  onClick: () => void
}

function ProviderCard({ provider, onClick }: ProviderCardProps) {
  const level = provider.certificationLevel
  const color = certColor[level] || '#6b7280'
  const isElite = level === 'MASTER' || level === 'ADVANCED'

  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-elevation-2',
        isElite && 'border-white/10',
      )}
      onClick={onClick}
    >
      {isElite && (
        <BorderBeam
          size={600}
          duration={10}
          anchor={85}
          borderWidth={1.5}
          colorFrom={color}
          colorTo="transparent"
          delay={level === 'MASTER' ? 0 : 5}
        />
      )}
      <CardContent className="relative z-10 p-5">
        <div className="flex items-start gap-4">
          {/* 头像 */}
          <div className="relative shrink-0">
            <div
              className="flex size-14 items-center justify-center rounded-2xl text-xl font-bold shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${color}44, ${color}18)`,
              }}
            >
              {provider.avatarUrl ? (
                <img
                  src={provider.avatarUrl}
                  alt={provider.nickname}
                  className="size-full rounded-2xl object-cover"
                />
              ) : (
                <span style={{ color }}>{provider.nickname?.charAt(0)}</span>
              )}
            </div>
            {level !== 'NONE' && (
              <div
                className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-bg-card"
                style={{ backgroundColor: color }}
              >
                <Award className="size-3 text-white" />
              </div>
            )}
          </div>

          {/* 信息 */}
          <div className="min-w-0 flex-1">
            {/* 名称行 */}
            <div className="mb-2 flex items-center gap-2">
              <span className="truncate text-base font-semibold text-foreground">
                {provider.nickname}
              </span>
              {level !== 'NONE' && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color,
                    backgroundColor: `${color}18`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {certLabel[level] || level}
                </span>
              )}
            </div>

            {/* 数据行 */}
            <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {/* 评分 */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'size-3.5',
                        star <= Math.round(provider.avgRating)
                          ? 'fill-warning text-warning'
                          : 'text-border',
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {provider.avgRating.toFixed(1)}
                </span>
              </div>

              {/* 完成数 */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <CheckCircle className="size-3.5 text-success" />
                <span className="font-medium text-foreground">
                  {provider.totalCompleted}
                </span>{' '}
                单完成
              </div>

              {/* 地域 */}
              {provider.region?.name && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {provider.region.name}
                </div>
              )}
            </div>

            {/* 标签 */}
            {provider.tags && provider.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {provider.tags.slice(0, 6).map((tag) => (
                  <Chip
                    key={tag}
                    variant="outlined"
                    className="h-6 px-2 text-xs"
                    tabIndex={-1}
                  >
                    {tag}
                  </Chip>
                ))}
                {provider.tags.length > 6 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{provider.tags.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
