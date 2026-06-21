import { useEffect, useState } from 'react'
import { Server, Gauge, FileText, RefreshCw } from 'lucide-react'
import {
  AdminPanel,
  AdminEmpty,
  AdminChartGrid,
  AdminChartCell,
  AdminMetricGrid,
  AdminMetricTile,
} from './admin-ui'
import { toast } from '@/components/ui/confirm-dialog'
import api from '@/api'

interface ServiceHealth {
  name: string
  port: number
  status: 'online' | 'offline' | 'error'
  responseTime: number
  error?: string
}

interface HealthResp {
  status: 'healthy' | 'degraded'
  services: ServiceHealth[]
  timestamp: string
  totalCheckTime: number
}

export default function AdminSystemTab() {
  const [data, setData] = useState<HealthResp | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/health/services')
      setData((r.data as any) || null)
    } catch (e: any) {
      toast(e?.response?.data?.message || '加载服务状态失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-24 border border-[var(--admin-hairline)] bg-white" />
        <div className="animate-pulse h-64 border border-[var(--admin-hairline)] bg-white" />
      </div>
    )
  }

  const services = data?.services || []
  const overall = data?.status

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
          系统状态
        </p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 border border-[var(--admin-hairline)] bg-white px-2 py-1 text-xs text-[var(--admin-text-secondary)] transition-colors hover:bg-black/[0.02]"
        >
          <RefreshCw className="size-3" />
          刷新
        </button>
      </div>

      <div id="admin-section-service-status">
        <AdminMetricGrid cols={Math.max(3, Math.min(services.length, 6)) as 3 | 6}>
          {services.length === 0 ? (
            <AdminMetricTile label="状态" value="暂无数据" />
          ) : (
            services.map((svc) => (
              <AdminMetricTile
                key={`${svc.name}-${svc.port}`}
                label={svc.name}
                value={svc.status === 'online' ? '在线' : svc.status === 'offline' ? '偏离线' : '异常'}
                hint={svc.error || `${svc.responseTime}ms`}
              />
            ))
          )}
        </AdminMetricGrid>
        {overall && (
          <p className="mt-2 font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-muted)]">
            总体：{overall === 'healthy' ? '全部正常' : '部分异常'} · 检测耗时 {data?.totalCheckTime ?? 0}ms
          </p>
        )}
      </div>

      <AdminChartGrid>
        <AdminChartCell span={2} id="admin-section-performance">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            服务响应时间
          </h3>
          {services.length === 0 ? (
            <AdminEmpty title="暂无性能数据" />
          ) : (
            <div className="space-y-2">
              {services.map((s) => (
                <div key={`p-${s.name}`} className="flex items-center gap-3">
                  <span className="w-32 truncate text-xs text-[var(--admin-text-secondary)]">{s.name}</span>
                  <div className="relative h-2 flex-1 bg-[var(--admin-hairline)]">
                    <div
                      className="absolute left-0 top-0 h-full"
                      style={{
                        width: `${Math.min(100, s.responseTime / 5)}%`,
                        background: s.status === 'online' ? '#22C55E' : s.status === 'offline' ? '#71717A' : '#F97316',
                      }}
                    />
                  </div>
                  <span className="font-[family-name:var(--admin-mono)] text-[11px] tabular-nums text-[var(--admin-text-secondary)] w-16 text-right">
                    {s.responseTime}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminChartCell>

        <AdminChartCell>
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            服务列表
          </h3>
          <ul className="space-y-2">
            {services.map((s) => (
              <li key={`l-${s.name}-${s.port}`} className="flex items-center gap-2 text-xs">
                <span
                  className="size-1.5"
                  style={{
                    background: s.status === 'online' ? '#22C55E' : s.status === 'offline' ? '#71717A' : '#F97316',
                  }}
                />
                <span className="font-[family-name:var(--admin-mono)] text-[var(--admin-text-secondary)]">
                  :{s.port} {s.name}
                </span>
              </li>
            ))}
          </ul>
        </AdminChartCell>
      </AdminChartGrid>

      <AdminPanel id="admin-section-logs" title="服务状态详情" description="最近一次检测记录">
        {services.length === 0 ? (
          <AdminEmpty title="暂无服务状态数据" />
        ) : (
          <div className="space-y-0 font-[family-name:var(--admin-mono)] text-[11px] leading-relaxed text-[var(--admin-text-secondary)]">
            {services.map((s) => (
              <div key={`log-${s.name}-${s.port}`} className="flex items-center gap-2 border-b border-[var(--admin-hairline)] py-2 last:border-b-0">
                <span className="text-[var(--admin-text-muted)]">{data?.timestamp ? new Date(data.timestamp).toLocaleString('zh-CN') : '—'}</span>
                <span className={s.status === 'online' ? 'text-emerald-600' : s.status === 'offline' ? 'text-zinc-500' : 'text-amber-500'}>
                  [{s.status.toUpperCase()}]
                </span>
                <span>:{s.port} {s.name}</span>
                {s.error && <span className="text-red-500 truncate">— {s.error}</span>}
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
