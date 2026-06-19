import { Search } from 'lucide-react'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricGrid,
  AdminMetricTile,
  AdminPanel,
  AdminEmpty,
  AdminMetricSkeleton,
  AdminPanelSkeleton,
  AdminSearchInput,
  ADMIN_CHART_COLORS,
  adminChartTooltipStyle,
} from './admin-ui'

export interface AdminUsersTabProps {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

export default function AdminUsersTab({ data, loading }: AdminUsersTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-10 w-72 bg-zinc-200" />
        <AdminMetricSkeleton count={3} />
        <AdminPanelSkeleton />
      </div>
    )
  }

  if (!data) return null

  const { overview, userGrowthTrend } = data
  const demanders = Math.max(overview.userCount - overview.providerCount, 0)
  const roleData = [
    { name: '服务者', value: overview.providerCount },
    { name: '需求者', value: demanders },
  ].filter((d) => d.value > 0)

  const growthSpark = (userGrowthTrend || []).slice(-6).map((r, i) => ({
    idx: i + 1,
    users: r.users,
    newUsers: r.newUsers,
  }))

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        用户管理
      </p>

      <div className="relative max-w-[360px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--admin-text-muted)]" />
        <AdminSearchInput
          placeholder="搜索用户…"
          className="pl-9"
        />
      </div>

      <AdminMetricGrid cols={3}>
        <AdminMetricTile label="总用户数" value={overview.userCount} />
        <AdminMetricTile label="活跃服务者" value={overview.providerCount} />
        <AdminMetricTile label="需求者估算" value={demanders} />
      </AdminMetricGrid>

      <div className="grid grid-cols-2 gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]">
        <div id="admin-section-all-users" className="min-h-[260px] bg-[var(--admin-card-bg)] p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            用户角色分布
          </h3>
          <div className="h-[180px]">
            {roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {roleData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无用户数据" />
            )}
          </div>
          <div className="mt-3 flex justify-center gap-6 font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-secondary)]">
            {roleData.map((r, i) => (
              <span key={r.name} className="flex items-center gap-1.5">
                <span
                  className="size-2"
                  style={{ background: ADMIN_CHART_COLORS[i] }}
                />
                {r.name} {r.value}
              </span>
            ))}
          </div>
        </div>

        <div id="admin-section-providers" className="min-h-[260px] bg-[var(--admin-card-bg)] p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            用户增长曲线
          </h3>
          <div className="h-[200px]">
            {growthSpark.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthSpark} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3388FF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3388FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3388FF"
                    strokeWidth={2}
                    fill="url(#userGrowthGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无增长数据" />
            )}
          </div>
        </div>
      </div>

      <AdminPanel title="用户列表" description="完整用户管理功能即将上线">
        <AdminEmpty
          title="用户管理功能开发中"
          description="当前可查看上方汇总指标与分布图，详细列表敬请期待"
        />
      </AdminPanel>
    </div>
  )
}
