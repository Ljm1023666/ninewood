import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/ui/back-button'
import api from '@/api'

const COLOR_MAP: Record<number, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#22c55e',
  4: '#06b6d4',
  5: '#6b7280',
}

function getColor(avgAmount: number, all: number[]): string {
  if (all.length === 0) return COLOR_MAP[5]
  const sorted = [...all].sort((a, b) => a - b)
  const idx = sorted.indexOf(avgAmount)
  const pct = idx / sorted.length
  if (pct >= 0.9) return COLOR_MAP[1]
  if (pct >= 0.75) return COLOR_MAP[2]
  if (pct >= 0.5) return COLOR_MAP[3]
  if (pct >= 0.25) return COLOR_MAP[4]
  return COLOR_MAP[5]
}

export default function TagStatsDashboard() {
  const [stats, setStats] = useState<any[]>([])
  const [allAmounts, setAllAmounts] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState('')

  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/tag-stats', {
        params: tagFilter ? { tagName: tagFilter } : {},
      })
      setStats(r.data?.data?.stats || [])
      if (!tagFilter) {
        setAllAmounts((r.data?.data?.stats || []).map((s: any) => s.avgAmount))
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshStats() {
    setRefreshing(true)
    try {
      await api.post('/tag-stats/refresh')
      await load()
    } catch {
      /* noop */
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <BarChart3 className="size-5 text-foreground" />
          标签市场分析
        </h1>
        <p className="text-sm text-text-primary/40 mb-6">
          按标签×区域查看市场指标，颜色越红价值越高
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30 flex-1"
            placeholder="筛选标签名..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load()
            }}
          />
          <Button
            onClick={load}
            variant="outline"
            className="border-border text-text-primary/60"
          >
            <RefreshCw className="size-4 mr-1" />
            刷新
          </Button>
          <Button
            onClick={handleRefreshStats}
            disabled={refreshing}
            variant="outline"
            className="border-border text-text-primary/60"
          >
            <RefreshCw
              className={`size-4 mr-1 ${refreshing ? 'animate-spin' : ''}`}
            />
            重新计算
          </Button>
        </div>

        {loading && (
          <p className="text-text-primary/40 text-sm text-center py-8">
            <RefreshCw className="size-4 inline animate-spin mr-1" />
            加载中...
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <Card
              key={i}
              className="border-border bg-bg-secondary backdrop-blur-md overflow-hidden"
            >
              <div
                className="h-1"
                style={{ backgroundColor: getColor(s.avgAmount, allAmounts) }}
              />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text-primary">
                    {s.tagName}
                  </span>
                  <Badge className="text-xs">R{s.regionId || '全国'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-text-primary/50">
                  <span>成交: {s.totalCards} 单</span>
                  <span>总金额: ¥{s.totalAmount?.toFixed(0) || 0}</span>
                  <span>均价: ¥{s.avgAmount?.toFixed(0) || 0}</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    服务者: {s.activeProviders || 0}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (s.activeProviders / Math.max(1, s.activeDemands || 1)) * 50)}%`,
                        backgroundColor: getColor(s.avgAmount, allAmounts),
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-primary/30">
                    {s.activeProviders || 0}/{s.activeDemands || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && stats.length === 0 && (
            <p className="text-text-primary/30 text-center py-8 col-span-2">
              暂无统计数据
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Fix Badge import reference
function Badge({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs bg-bg-tertiary text-text-primary/60 ${className || ''}`}
    >
      {children}
    </span>
  )
}
