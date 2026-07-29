import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { certificationApi } from '@/api/certification'
import { useTagLoader } from '@/components/ui/tag-selector'
import { RegionCascader } from '@/components/ui/region-cascader'
import { LoadingState } from '@/components/ui/loading-state'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpBtnPrimary,
  DlpBtnGhost,
  DlpBadge,
  DlpEmpty,
} from '@/components/layout/desktop-page'
import { cn } from '@/lib/utils'
import { certLabel } from '@/constants/cert'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

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

const MAX_TAGS = 10

export default function CertifiedSearch() {
  const navigate = useNavigate()

  const { tags: allTags, loading: tagLoading, error: tagError } = useTagLoader()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [regionId, setRegionId] = useState<number | undefined>()
  const [minRating, setMinRating] = useState<number | undefined>()
  const [maxRating, setMaxRating] = useState<number | undefined>()

  const [data, setData] = useState<ProvidersData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, unknown> = { page, limit: 20 }
      if (selectedTags.length > 0) params.tags = selectedTags.join(',')
      if (regionId) params.regionId = regionId
      if (minRating) params.minRating = minRating
      if (maxRating) params.maxRating = maxRating
      const res = await certificationApi.getProviders(params)
      setData(res.data.data)
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined
      setError(msg || '加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [selectedTags, regionId, minRating, maxRating, page])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, tag]
    })
    setPage(1)
  }

  function handleRegionChange(id: number) {
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
  const isFirstPage = page <= 1
  const isLastPage = data ? page >= data.totalPages : true

  function buildProviderMeta(provider: ProviderItem) {
    const parts = [
      provider.tags?.slice(0, 3).join('、'),
      provider.region?.name,
      `${provider.avgRating.toFixed(1)} 分 · ${provider.totalCompleted} 单`,
    ].filter(Boolean)
    return parts.join(' · ')
  }

  return (
    <DesktopPageShell title="认证服务者" subtitle="查找已认证的优质服务提供者">
      <div className="dlp-split dlp-split--aside">
        <aside className="dlp-stack">
          <DlpGlass>
            <DlpGlassHead title="筛选条件" subtitle="标签、地域与评分范围" />
            <DlpGlassBody className="space-y-5">
              <div className="dlp-field !mb-0">
                <label className="dlp-label">服务标签</label>
                {tagLoading ? (
                  <LoadingState variant="internal" lines={2} />
                ) : tagError ? (
                  <p className="text-sm text-error">{tagError}</p>
                ) : allTags.length === 0 ? (
                  <p className="text-sm text-text-muted">暂无可用标签</p>
                ) : (
                  <div className="dlp-tag-grid max-h-48 overflow-y-auto thin-scroll">
                    {allTags.map((tag) => {
                      const on = selectedTags.includes(tag)
                      const disabled = !on && selectedTags.length >= MAX_TAGS
                      return (
                        <LiquidMetalButton
                          key={tag}
                          type="button"
                          disabled={disabled}
                          className={cn('dlp-tag', on && 'dlp-tag--on', disabled && 'opacity-45')}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </LiquidMetalButton>
                      )
                    })}
                  </div>
                )}
                {selectedTags.length > 0 ? (
                  <p className="mt-2 text-xs text-text-muted">
                    已选 {selectedTags.length}/{MAX_TAGS}
                  </p>
                ) : null}
              </div>

              <div className="dlp-field !mb-0">
                <label className="dlp-label">地域</label>
                <RegionCascader
                  layout="stack"
                  value={regionId}
                  onChange={handleRegionChange}
                />
              </div>

              <div className="dlp-field !mb-0">
                <label className="dlp-label">评分范围</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    placeholder="起始"
                    value={minRating ?? ''}
                    onChange={(e) => {
                      setMinRating(e.target.value ? Number(e.target.value) : undefined)
                      setPage(1)
                    }}
                    className="dlp-input !w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-text-muted">—</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    placeholder="结束"
                    value={maxRating ?? ''}
                    onChange={(e) => {
                      setMaxRating(e.target.value ? Number(e.target.value) : undefined)
                      setPage(1)
                    }}
                    className="dlp-input !w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-text-muted">星</span>
                </div>
              </div>

              {hasFilters ? (
                <DlpBtnGhost onClick={handleClearFilters} className="w-full">
                  <MsIcon name="close" size={16} />
                  清除全部筛选
                </DlpBtnGhost>
              ) : null}
            </DlpGlassBody>
          </DlpGlass>
        </aside>

        <div>
          {loading && <LoadingState variant="internal" lines={5} />}

          {!loading && error ? (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="error_outline" size={48} />}
                title="加载失败"
                description={error}
                action={
                  <DlpBtnPrimary onClick={fetchProviders}>重试</DlpBtnPrimary>
                }
              />
            </DlpGlass>
          ) : null}

          {!loading && !error && data && data.items.length === 0 ? (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="badge" size={48} />}
                title={hasFilters ? '没有匹配的认证服务者' : '暂无认证服务者'}
                description={
                  hasFilters
                    ? '试试调整筛选条件'
                    : '去认证中心提升你的认证等级'
                }
                action={
                  <DlpBtnPrimary onClick={() => navigate('/cert-center')}>
                    去认证中心
                  </DlpBtnPrimary>
                }
              />
            </DlpGlass>
          ) : null}

          {!loading && !error && data && data.items.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-text-muted">
                共{' '}
                <span className="font-semibold text-text-primary">{data.total}</span>{' '}
                位认证服务者
              </p>

              <div className="dlp-card-grid">
                {data.items.map((provider) => {
                  const certText =
                    provider.certificationLevel !== 'NONE'
                      ? certLabel[provider.certificationLevel as keyof typeof certLabel]
                      : null
                  return (
                    <LiquidMetalButton
                      key={provider.id}
                      type="button"
                      className="dlp-glass dlp-user-card"
                      onClick={() => navigate(`/profile/${provider.id}`)}
                    >
                      <div className="dlp-avatar">
                        {provider.avatarUrl ? (
                          <img src={provider.avatarUrl} alt="" />
                        ) : (
                          provider.nickname?.charAt(0) ?? '?'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-text-primary">
                            {provider.nickname}
                          </h3>
                          {certText ? (
                            <DlpBadge tone="gold">{certText}</DlpBadge>
                          ) : (
                            <DlpBadge tone="gold">已认证</DlpBadge>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                          {buildProviderMeta(provider)}
                        </p>
                      </div>
                    </LiquidMetalButton>
                  )
                })}
              </div>

              {data.totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <DlpBtnGhost
                    disabled={isFirstPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </DlpBtnGhost>
                  <span className="text-sm tabular-nums text-text-muted">
                    {data.page} / {data.totalPages}
                  </span>
                  <DlpBtnGhost
                    disabled={isLastPage}
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  >
                    下一页
                  </DlpBtnGhost>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </DesktopPageShell>
  )
}
