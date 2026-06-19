import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, MapPin, CheckCircle } from 'lucide-react'
import { certificationApi } from '@/api/certification'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { RegionCascader } from '@/components/ui/region-cascader'
import { Chip } from '@/components/ui/chip'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { certLabel, certColor, certGlow } from '@/constants/cert'

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

  // Filters
  const { tags: allTags, loading: tagLoading, error: tagError } = useTagLoader()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [regionId, setRegionId] = useState<number | undefined>()
  const [minRating, setMinRating] = useState<number | undefined>()

  // Data
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
      const res = await certificationApi.getProviders(params)
      setData(res.data.data)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [selectedTags, regionId, minRating, page])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  // Reset page when filters change
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
    setPage(1)
  }

  const hasFilters = selectedTags.length > 0 || regionId !== undefined || minRating !== undefined
  const isFirstPage = page <= 1
  const isLastPage = data ? page >= data.totalPages : true

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-text-primary">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-3xl shrink-0 flex-col self-center">
        <div className="shrink-0 px-4 pt-6 pb-2 sm:px-6">
          <PageHeader title="认证服务者" subtitle="查找已认证的优质服务提供者" onBack="back" />
        </div>

        {/* ── 筛选栏 ── */}
        <div className="shrink-0 space-y-4 px-4 pb-4 sm:px-6">
          {/* 标签筛选 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
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

          {/* 地域 + 最低评分 */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                地域
              </label>
              <RegionCascader value={regionId} onChange={handleRegionChange} />
            </div>
            <div className="w-32">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                最低评分
              </label>
              <select
                value={minRating ?? ''}
                onChange={(e) => {
                  setMinRating(e.target.value ? Number(e.target.value) : undefined)
                  setPage(1)
                }}
                className="h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm text-text-primary outline-none focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[3px]"
              >
                <option value="">不限</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} 星以上
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 清除筛选 */}
          {hasFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                清除筛选
              </Button>
            </div>
          )}
        </div>

        {/* ── 结果列表 ── */}
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          {loading && <LoadingState lines={5} />}

          {!loading && error && <ErrorState message={error} onRetry={fetchProviders} />}

          {!loading && !error && data && data.items.length === 0 && (
            <EmptyState
              type="search"
              message="暂无认证服务者，去认证中心提升你的认证等级吧"
              actionLabel="去认证中心"
              onAction={() => navigate('/cert-center')}
            />
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <>
              <p className="mb-3 text-sm text-text-muted">
                共 {data.total} 位认证服务者
              </p>
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
                  <span className="text-sm text-text-muted">
                    {data.page} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLastPage}
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
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

// ── 单张服务者卡片 ──

interface ProviderCardProps {
  provider: ProviderItem
  onClick: () => void
}

function ProviderCard({ provider, onClick }: ProviderCardProps) {
  const level = provider.certificationLevel
  const bgColor = certColor[level] || '#6b7280'
  const glow = certGlow[level] || 'none'

  return (
    <Card
      className="cursor-pointer p-5 transition-all hover:border-white/20 hover:bg-bg-secondary"
      onClick={onClick}
    >
      <CardContent className="flex items-start gap-4 p-0">
        {/* 头像 */}
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white shadow-md"
          style={{ background: bgColor, boxShadow: glow }}
        >
          {provider.avatarUrl ? (
            <Avatar className="h-full w-full">
              <AvatarImage src={provider.avatarUrl} className="h-full w-full object-cover" />
              <AvatarFallback className="h-full w-full bg-transparent text-xl font-bold text-white">
                {provider.nickname?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            provider.nickname?.charAt(0)
          )}
        </div>

        {/* 信息 */}
        <div className="min-w-0 flex-1">
          {/* 昵称 + 认证等级 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="truncate text-base font-semibold text-text-primary">
              {provider.nickname}
            </span>
            {level !== 'NONE' && (
              <Badge
                variant="outline"
                className="shrink-0 text-xs"
                style={{
                  color: bgColor,
                  borderColor: bgColor + '40',
                  backgroundColor: bgColor + '12',
                }}
              >
                {certLabel[level] || level}
              </Badge>
            )}
          </div>

          {/* 评分 + 完成数 */}
          <div className="mb-2 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-amber-400">
              <Star className="size-3.5 fill-amber-400" />
              {provider.avgRating.toFixed(1)}
            </span>
            <span className="text-text-muted">
              <CheckCircle className="mr-0.5 inline size-3.5 align-text-top text-green-400" />
              {provider.totalCompleted} 单完成
            </span>
          </div>

          {/* 地域 */}
          {provider.region?.name && (
            <p className="mb-2 flex items-center gap-1 text-sm text-text-muted">
              <MapPin className="size-3.5" />
              {provider.region.name}
            </p>
          )}

          {/* 标签 */}
          {provider.tags && provider.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {provider.tags.map((tag) => (
                <Chip key={tag} variant="outlined" className="h-6 px-2 text-xs" tabIndex={-1}>
                  {tag}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
