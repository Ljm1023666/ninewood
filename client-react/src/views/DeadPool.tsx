import { useState, useEffect, useRef, useCallback } from 'react'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SectionLabel,
} from '@/components/layout/internal-ui'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

interface RegionNode {
  id: number
  name: string
}
interface TagCard {
  name: string
  activeCount: number
  avgPrice: number
  totalAmount: number
}

export default function DeadPool() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [regions, setRegions] = useState<RegionNode[]>([])
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [tagCards, setTagCards] = useState<TagCard[]>([])
  const [untagged, setUntagged] = useState(0)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTags = useCallback(async (regionId: number | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        withCounts: 'true',
        stage: 'completed',
      })
      if (regionId) params.set('regionId', String(regionId))
      const r = await fetch(`/api/tags?${params}`)
      const d = await r.json()
      const data = d.data || d
      setTagCards(data.tags || [])
      setUntagged(data.untagged || 0)
    } catch {
      setTagCards([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/regions')
      .then((r) => r.json())
      .then((d) => setRegions(Array.isArray(d) ? d : d.data || []))
      .catch(() => {})
    loadTags(null)
  }, [loadTags])

  const activeTags = tagCards.filter((t) => t.activeCount > 0)

  return (
    <InternalPageShell width="wide" containerRef={scrollRef}>
      <PageHeader title="死池 · 荣耀墙" onBack="back" />

      <InternalContentBlock>
        <section>
          <SectionLabel>地域</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <RegionChip
              name="全国"
              active={!provinceId}
              onClick={() => {
                setProvinceId(null)
                loadTags(null)
              }}
            />
            {regions.map((r) => (
              <RegionChip
                key={r.id}
                name={r.name}
                active={provinceId === r.id}
                onClick={() => {
                  setProvinceId(r.id)
                  loadTags(r.id)
                }}
              />
            ))}
          </div>
        </section>

        {selectedTag ? (
          <section>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="mb-3 text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              ← 返回标签列表
            </button>
            <DemandDiscoveryList
              key={`${provinceId}-${selectedTag}`}
              keyword=""
              serviceType="ALL"
              taxonomyLeafIds={[]}
              scrollRootRef={scrollRef}
              tagName={selectedTag === '__untagged__' ? undefined : selectedTag}
              listScope={{
                stage: 'completed',
                ...(provinceId ? { regionId: String(provinceId) } : {}),
                ...(selectedTag === '__untagged__' ? { tagName: '__untagged__' } : {}),
              }}
              paginationMode="paged"
              pageSize={12}
              renderMode="list"
              cardVariant="internal"
            />
          </section>
        ) : loading ? (
          <LoadingState variant="internal" lines={4} />
        ) : activeTags.length === 0 && untagged === 0 ? (
          <EmptyState type="demand" variant="internal" />
        ) : (
          <section>
            <SectionLabel>标签卡包</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {untagged > 0 ? (
                <TagPackCard
                  name="未分类"
                  icon="?"
                  count={untagged}
                  onClick={() => setSelectedTag('__untagged__')}
                />
              ) : null}
              {activeTags.map((t) => (
                <TagPackCard
                  key={t.name}
                  name={t.name}
                  count={t.activeCount}
                  avgPrice={t.avgPrice}
                  totalAmount={t.totalAmount}
                  onClick={() => setSelectedTag(t.name)}
                />
              ))}
            </div>
          </section>
        )}
      </InternalContentBlock>
    </InternalPageShell>
  )
}

function RegionChip({
  name,
  active,
  onClick,
}: {
  name: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'border-[var(--internal-accent)] bg-[color-mix(in_srgb,var(--internal-accent)_12%,transparent)] font-medium text-[var(--internal-accent)]'
          : 'border-[var(--internal-border)] bg-[var(--internal-card)] text-text-secondary hover:border-[var(--internal-accent)]/30 hover:text-text-primary',
      )}
    >
      {name}
    </button>
  )
}

function TagPackCard({
  name,
  icon,
  count,
  avgPrice,
  totalAmount,
  onClick,
}: {
  name: string
  icon?: string
  count: number
  avgPrice?: number
  totalAmount?: number
  onClick: () => void
}) {
  const hue = (name.length * 37 + name.charCodeAt(0) * 7) % 360

  return (
    <button
      type="button"
      onClick={onClick}
      className="internal-list-card flex cursor-pointer flex-col p-4 text-left transition-colors"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: `hsl(${hue}, 55%, 45%)`,
      }}
    >
      <div className="relative z-[1] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: `hsl(${hue}, 55%, 42%)` }}
          >
            {icon || name.slice(0, 2)}
          </span>
          <span className="rounded-full bg-[var(--internal-surface)] px-1.5 py-0.5 font-mono text-xs text-text-muted">
            {count}
          </span>
        </div>
        <span className="truncate text-sm font-medium text-text-primary">
          {name}
        </span>
        {(avgPrice ?? 0) > 0 || (totalAmount ?? 0) > 0 ? (
          <span className="font-mono text-xs text-text-secondary">
            ¥{(avgPrice ?? 0).toLocaleString()} / ¥
            {(totalAmount ?? 0).toLocaleString()}
          </span>
        ) : null}
      </div>
    </button>
  )
}
