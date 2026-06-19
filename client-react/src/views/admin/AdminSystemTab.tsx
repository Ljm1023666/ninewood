import {
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricGrid,
  AdminMetricTile,
  AdminPanel,
  AdminChartGrid,
  AdminChartCell,
  adminChartGrid,
  adminChartAxis,
  adminChartTooltipStyle,
} from './admin-ui'

interface AdminSystemTabProps {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

const SERVICES = [
  { label: 'API 服务', status: '运行中' },
  { label: '数据库', status: '运行中' },
  { label: '缓存服务', status: '运行中' },
]

const METRICS = [
  { label: 'CPU 使用率', value: 23, fill: '#111111' },
  { label: '内存使用率', value: 45, fill: '#71717A' },
  { label: '磁盘使用率', value: 62, fill: '#3388FF' },
]

const LATENCY_MOCK = [
  { t: '00:00', ms: 42 },
  { t: '04:00', ms: 38 },
  { t: '08:00', ms: 55 },
  { t: '12:00', ms: 48 },
  { t: '16:00', ms: 61 },
  { t: '20:00', ms: 44 },
  { t: '24:00', ms: 40 },
]

const LOGS = [
  '[2026-06-15 10:23:15] INFO  Admin dashboard loaded',
  '[2026-06-15 10:20:02] INFO  System health check: OK',
  '[2026-06-15 09:45:30] INFO  Scheduled cleanup completed',
  '[2026-06-15 08:00:00] INFO  Daily backup started',
  '[2026-06-15 07:59:55] INFO  Server uptime: 7d 12h 34m',
]

export default function AdminSystemTab({ data, loading }: AdminSystemTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-24 border border-[var(--admin-hairline)] bg-white" />
        <div className="animate-pulse h-64 border border-[var(--admin-hairline)] bg-white" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        系统状态
      </p>

      <div id="admin-section-service-status">
        <AdminMetricGrid cols={3}>
          {SERVICES.map((svc) => (
            <AdminMetricTile
              key={svc.label}
              label={svc.label}
              value={svc.status}
              hint="状态正常"
            />
          ))}
        </AdminMetricGrid>
      </div>

      <AdminChartGrid>
        <AdminChartCell span={2} id="admin-section-performance">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            API 响应延迟（24h）
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={LATENCY_MOCK}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3388FF" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3388FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...adminChartGrid} vertical={false} />
                <XAxis dataKey="t" {...adminChartAxis} />
                <YAxis
                  {...adminChartAxis}
                  unit="ms"
                  domain={[0, 80]}
                />
                <Tooltip
                  contentStyle={adminChartTooltipStyle}
                  formatter={(val: number) => [`${val} ms`, '延迟']}
                />
                <Area
                  type="monotone"
                  dataKey="ms"
                  stroke="#3388FF"
                  strokeWidth={2}
                  fill="url(#latencyGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminChartCell>

        <AdminChartCell>
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            资源占用
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                data={METRICS}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: 'var(--admin-hairline)' }}
                  dataKey="value"
                  cornerRadius={2}
                />
                <Tooltip
                  contentStyle={adminChartTooltipStyle}
                  formatter={(val: number) => [`${val}%`, '占用']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {METRICS.map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex justify-between text-xs text-[var(--admin-text-secondary)]">
                  <span>{m.label}</span>
                  <span className="font-[family-name:var(--admin-mono)] tabular-nums">
                    {m.value}%
                  </span>
                </div>
                <div className="h-1 bg-[var(--admin-hairline)]">
                  <div
                    className="h-full transition-[width] duration-300"
                    style={{ width: `${m.value}%`, background: m.fill }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminChartCell>
      </AdminChartGrid>

      <AdminPanel
        id="admin-section-logs"
        title="操作日志"
        description="最近系统事件"
      >
        <div className="space-y-0 font-[family-name:var(--admin-mono)] text-[11px] leading-relaxed text-[var(--admin-text-secondary)]">
          {LOGS.map((line) => (
            <div
              key={line}
              className="border-b border-[var(--admin-hairline)] py-2 last:border-b-0"
            >
              {line}
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  )
}
