import { Server, Gauge, Activity, CheckCircle2 } from 'lucide-react'
import type { DashboardData } from './use-admin-data'
import { AdminMetricCard, AdminPanel } from './admin-ui'

interface AdminSystemTabProps {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

const SERVICES = [
  {
    label: 'API 服务',
    status: '运行中',
    icon: Server,
    accent: 'green' as const,
  },
  { label: '数据库', status: '运行中', icon: Gauge, accent: 'blue' as const },
  {
    label: '缓存服务',
    status: '运行中',
    icon: Activity,
    accent: 'teal' as const,
  },
]

const METRICS = [
  { label: 'CPU 使用率', value: '23%', width: '23%' },
  { label: '内存使用率', value: '45%', width: '45%' },
  { label: '磁盘使用率', value: '62%', width: '62%' },
]

const LOGS = [
  '[2026-05-27 10:23:15] INFO  Admin dashboard loaded',
  '[2026-05-27 10:20:02] INFO  System health check: OK',
  '[2026-05-27 09:45:30] INFO  Scheduled cleanup completed',
  '[2026-05-27 08:00:00] INFO  Daily backup started',
  '[2026-05-27 07:59:55] INFO  Server uptime: 7d 12h 34m',
]

export default function AdminSystemTab({ data, loading }: AdminSystemTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[var(--admin-border)] bg-white p-5"
            >
              <div className="mb-3 size-10 rounded-lg bg-zinc-200" />
              <div className="h-3 w-16 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="animate-pulse h-64 rounded-xl border border-[var(--admin-border)] bg-white" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div id="admin-section-service-status" className="grid grid-cols-3 gap-4">
        {SERVICES.map((svc) => (
          <AdminMetricCard
            key={svc.label}
            icon={svc.icon}
            label={svc.label}
            value={svc.status}
            hint="状态正常"
            accent={svc.accent}
          />
        ))}
      </div>

      <AdminPanel
        id="admin-section-performance"
        title="性能指标"
        description="本地开发环境模拟数据"
      >
        <div className="space-y-5">
          {METRICS.map((metric) => (
            <div key={metric.label} className="flex items-center gap-4">
              <span className="w-24 text-sm text-[var(--admin-text-secondary)]">
                {metric.label}
              </span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-[var(--admin-accent-orange)] transition-[width] duration-300"
                    style={{ width: metric.width }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-mono tabular-nums text-[var(--admin-text)]">
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel
        id="admin-section-logs"
        title="操作日志"
        description="最近系统事件"
      >
        <div className="rounded-lg bg-zinc-950 px-4 py-4">
          <div className="space-y-2 font-mono text-xs leading-relaxed text-zinc-400">
            {LOGS.map((line) => (
              <p key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-green-500/70" />
                <span>{line}</span>
              </p>
            ))}
          </div>
        </div>
      </AdminPanel>
    </div>
  )
}
