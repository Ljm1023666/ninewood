import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  CartesianGrid,
  YAxis,
} from 'recharts'
import { TrendingUp, Users, FileText, ShoppingCart } from 'lucide-react'
import { STATUS_LABELS } from './use-admin-data'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricCard,
  AdminPanel,
  AdminEmpty,
  AdminMetricSkeleton,
  AdminPanelSkeleton,
  formatMonthLabel,
} from './admin-ui'

interface Props {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

export default function AdminAnalyticsTab({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <AdminMetricSkeleton count={4} />
        <AdminPanelSkeleton height="min-h-[340px]" />
        <div className="grid grid-cols-2 gap-4">
          <AdminPanelSkeleton />
          <AdminPanelSkeleton />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview } = data
  const demandEntries = Object.entries(data.demandDistribution || {}).map(
    ([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
    }),
  )
  const totalDemands = demandEntries.reduce((s, e) => s + e.value, 0)
  const growthData = (data.userGrowthTrend || []).map((r) => ({
    ...r,
    label: formatMonthLabel(r.name),
  }))
  const tags = data.topTags || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard
          icon={ShoppingCart}
          label="订单总数"
          value={overview.orderCount}
          accent="orange"
        />
        <AdminMetricCard
          icon={Users}
          label="注册用户"
          value={overview.userCount}
          accent="blue"
        />
        <AdminMetricCard
          icon={FileText}
          label="需求总数"
          value={totalDemands}
          accent="teal"
        />
        <AdminMetricCard
          icon={TrendingUp}
          label="活跃圈子"
          value={overview.circleCount}
          accent="green"
        />
      </div>

      <AdminPanel
        id="admin-section-users"
        title="用户增长趋势"
        description="总用户与新增用户对比"
      >
        <div className="h-[320px]">
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={growthData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E5E7EB"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                />
                <Bar
                  dataKey="users"
                  fill="var(--admin-accent-blue)"
                  radius={[4, 4, 0, 0]}
                  name="总用户"
                />
                <Bar
                  dataKey="newUsers"
                  fill="var(--admin-accent-orange)"
                  radius={[4, 4, 0, 0]}
                  name="新增"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmpty title="暂无增长数据" />
          )}
        </div>
      </AdminPanel>

      <div className="grid grid-cols-2 gap-4">
        <AdminPanel id="admin-section-demands" title="需求状态分布">
          {demandEntries.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {demandEntries.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-zinc-50/80 px-4 py-3"
                >
                  <span className="text-sm text-[var(--admin-text-secondary)]">
                    {entry.name}
                  </span>
                  <span className="text-sm font-mono font-semibold tabular-nums text-[var(--admin-text)]">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmpty title="暂无需求数据" />
          )}
        </AdminPanel>

        <AdminPanel id="admin-section-tags" title="标签热度 Top 8">
          {tags.length > 0 ? (
            <div className="space-y-2">
              {tags.slice(0, 8).map((tag, i) => (
                <div
                  key={tag.tagName}
                  className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium tabular-nums text-[var(--admin-text-muted)] w-4">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm text-[var(--admin-text)]">
                      {tag.tagName}
                    </span>
                  </div>
                  <span className="text-sm font-mono tabular-nums text-[var(--admin-text-secondary)]">
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmpty title="暂无标签数据" />
          )}
        </AdminPanel>
      </div>
    </div>
  )
}
