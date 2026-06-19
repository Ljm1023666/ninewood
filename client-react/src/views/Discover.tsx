import { useState, useEffect } from 'react'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RegionNode {
  id: number
  name: string
  level: number
  parentId: number
}

export default function Discover() {
  const [regions, setRegions] = useState<RegionNode[]>([])
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [provinceName, setProvinceName] = useState('')
  const [poolTab, setPoolTab] = useState('active')

  useEffect(() => {
    fetch('/api/regions')
      .then(r => r.json())
      .then(d => setRegions(Array.isArray(d) ? d : d.data || []))
      .catch(() => {})
  }, [])

  const handleRegionClick = (r: RegionNode) => {
    setProvinceId(r.id)
    setProvinceName(r.name)
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll thin-scroll">
        <div className="mx-auto w-full max-w-4xl px-4 py-6">
          {/* 顶部切换 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-text-primary">
              {provinceName || '全国'}
            </h1>
            <Tabs value={poolTab} onValueChange={setPoolTab}>
              <TabsList>
                <TabsTrigger value="active">活池</TabsTrigger>
                <TabsTrigger value="dead">死池</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {!provinceId ? (
            /* 省份列表 */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <RegionCard
                name="全国"
                count={null}
                onClick={() => { setProvinceId(null); setProvinceName('') }}
              />
              {regions.map(r => (
                <RegionCard
                  key={r.id}
                  name={r.name}
                  count={null}
                  onClick={() => handleRegionClick(r)}
                />
              ))}
            </div>
          ) : (
            /* 选中省份后的需求列表 */
            <>
              <button
                onClick={() => { setProvinceId(null); setProvinceName('') }}
                className="mb-4 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                ← 返回全国
              </button>
              <DemandDiscoveryList
                key={poolTab + provinceId}
                keyword=""
                serviceType="ALL"
                taxonomyLeafIds={[]}
                scrollRootRef={{ current: null }}
                listScope={{
                  ...(poolTab === 'dead' ? { stage: 'completed' } : {}),
                  regionId: String(provinceId),
                }}
                paginationMode="paged"
                pageSize={12}
                renderMode="list"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RegionCard({
  name,
  count,
  onClick,
}: {
  name: string
  count: number | null
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-bg-card px-4 py-6 hover:border-accent/50 hover:bg-bg-tertiary transition-all cursor-pointer"
    >
      <span className="text-2xl">{name.length <= 3 ? name : name.slice(0, 3)}</span>
      <span className="text-sm text-text-secondary truncate max-w-full">{name}</span>
      {count !== null && (
        <span className="text-xs text-text-muted">{count} 条</span>
      )}
    </button>
  )
}
