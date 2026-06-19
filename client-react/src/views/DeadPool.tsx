import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { PageHeader } from '@/components/layout/PageHeader'

interface RegionNode { id: number; name: string }
interface TagCard { name: string; activeCount: number; avgPrice: number; totalAmount: number }

export default function DeadPool() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [regions, setRegions] = useState<RegionNode[]>([])
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [tagCards, setTagCards] = useState<TagCard[]>([])
  const [untagged, setUntagged] = useState(0)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/regions')
      .then(r => r.json()).then(d => setRegions(Array.isArray(d) ? d : d.data || [])).catch(() => {})
    loadTags(null)
  }, [])

  const loadTags = async (regionId: number | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ withCounts: 'true', stage: 'completed' })
      if (regionId) params.set('regionId', String(regionId))
      const r = await fetch(`/api/tags?${params}`)
      const d = await r.json()
      const data = d.data || d
      setTagCards(data.tags || [])
      setUntagged(data.untagged || 0)
    } catch { setTagCards([]) }
    finally { setLoading(false) }
  }

  const handleSelect = (r: RegionNode) => { setProvinceId(r.id); loadTags(r.id) }

  return (
    <div ref={scrollRef} className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground overflow-y-auto thin-scroll">
      <div className="mx-auto w-full max-w-6xl px-4 py-4">
        <PageHeader title="死池 · 荣耀墙" onBack={() => navigate(-1)} />

        {/* 地域选择 */}
        <div className="flex flex-wrap gap-1.5 mb-4 mt-2">
          <RegionChip name="全国" active={!provinceId} onClick={() => { setProvinceId(null); loadTags(null) }} />
          {regions.map(r => (
            <RegionChip key={r.id} name={r.name} active={provinceId === r.id} onClick={() => handleSelect(r)} />
          ))}
        </div>

        {selectedTag ? (
          <>
            <button onClick={() => setSelectedTag(null)} className="mb-3 text-sm text-text-muted hover:text-text-primary">← 返回标签列表</button>
            <DemandDiscoveryList
              key={`${provinceId}-${selectedTag}`}
              keyword="" serviceType="ALL" taxonomyLeafIds={[]}
              scrollRootRef={scrollRef} tagName={selectedTag === '__untagged__' ? undefined : selectedTag}
              listScope={{
                stage: 'completed',
                ...(provinceId ? { regionId: String(provinceId) } : {}),
                ...(selectedTag === '__untagged__' ? { tagName: '__untagged__' } : {}),
              }}
              paginationMode="paged" pageSize={12} renderMode="list"
            />
          </>
        ) : loading ? (
          <p className="text-text-muted text-sm">加载中...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <TagPackCard name="未分类" icon="?" count={untagged} avgPrice={0} totalAmount={0}
              onClick={() => setSelectedTag('__untagged__')} />
            {tagCards.filter(t => t.activeCount > 0).map(t => (
              <TagPackCard key={t.name} name={t.name} count={t.activeCount}
                avgPrice={t.avgPrice} totalAmount={t.totalAmount}
                onClick={() => setSelectedTag(t.name)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RegionChip({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-lg border px-2.5 py-1 text-xs transition-colors cursor-pointer ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:border-accent/30'}`}>
      {name}
    </button>
  )
}

function TagPackCard({ name, icon, count, avgPrice, totalAmount, onClick }: { name: string; icon?: string; count: number; avgPrice: number; totalAmount: number; onClick: () => void }) {
  const hue = (name.length * 37 + name.charCodeAt(0) * 7) % 360
  return (
    <button onClick={onClick}
      className="flex flex-col rounded-xl border border-border bg-bg-card p-4 hover:border-accent/30 hover:bg-bg-tertiary transition-all cursor-pointer text-left"
      style={{ borderLeftWidth: '3px', borderLeftColor: `hsl(${hue},60%,50%)` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold" style={{ color: `hsl(${hue},60%,45%)` }}>{icon || name.slice(0, 2)}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-muted">{count}</span>
      </div>
      <span className="text-sm text-text-primary truncate">{name}</span>
      {(avgPrice > 0 || totalAmount > 0) && (
        <span className="text-xs text-text-muted mt-1">¥{avgPrice.toLocaleString()} / ¥{totalAmount.toLocaleString()}</span>
      )}
    </button>
  )
}
