import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { DashboardData } from './use-admin-data'
import { STATUS_LABELS } from './use-admin-data'
import {
  AdminMetricGrid,
  AdminMetricTile,
  AdminPanel,
  AdminChartGrid,
  AdminChartCell,
  AdminEmpty,
  AdminMetricSkeleton,
  AdminPanelSkeleton,
  formatMonthLabel,
  formatCurrency,
  ADMIN_CHART_COLORS,
  adminChartGrid,
  adminChartAxis,
  adminChartTooltipStyle,
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
        <div className="grid grid-cols-2 gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]">
          <AdminPanelSkeleton />
          <AdminPanelSkeleton />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview, revenueTrend, circlesByType } = data
  const demandEntries = Object.entries(data.demandDistribution || {}).map(
    ([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
      key: k,
    }),
  )
  const totalDemands = demandEntries.reduce((s, e) => s + e.value, 0)
  const growthData = (data.userGrowthTrend || []).map((r) => ({
    ...r,
    label: formatMonthLabel(r.name),
  }))
  const revenueData = (revenueTrend || []).map((r) => ({
    ...r,
    label: formatMonthLabel(r.name),
  }))
  const tags = (data.topTags || []).slice(0, 8).map((t) => ({
    name: t.tagName,
    count: t.count,
  }))
  const circleData = (circlesByType || []).map((c) => ({
    name: c.type || '未分类',
    value: c._count.id,
  }))

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        分析维度
      </p>

      <AdminMetricGrid cols={4}>
        <AdminMetricTile label="订单总数" value={overview.orderCount} />
        <AdminMetricTile label="注册用户" value={overview.userCount} />
        <AdminMetricTile label="需求总数" value={totalDemands} />
        <AdminMetricTile label="活跃圈子" value={overview.circleCount} />
      </AdminMetricGrid>

      <AdminChartGrid>
        <AdminChartCell span={2} id="admin-section-users">
          <h3 className="mb-1 text-[13px] font-semibold text-[var(--admin-text)]">
            用户增长趋势
          </h3>
          <p className="mb-4 text-xs text-[var(--admin-text-muted)]">
            总用户与新增用户对比
          </p>
          <div className="h-[260px]">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={growthData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid {...adminChartGrid} vertical={false} />
                  <XAxis dataKey="label" {...adminChartAxis} />
                  <YAxis {...adminChartAxis} />
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontFamily: 'var(--admin-mono)' }}
                  />
                  <Bar
                    dataKey="users"
                    fill="#111111"
                    radius={[2, 2, 0, 0]}
                    name="总用户"
                    barSize={20}
                  />
                  <Bar
                    dataKey="newUsers"
                    fill="#3388FF"
                    radius={[2, 2, 0, 0]}
                    name="新增"
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无增长数据" />
            )}
          </div>
        </AdminChartCell>

        <AdminChartCell id="admin-section-revenue">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            营收走势
          </h3>
          <div className="h-[260px]">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueData}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid {...adminChartGrid} vertical={false} />
                  <XAxis dataKey="label" {...adminChartAxis} />
                  <YAxis
                    {...adminChartAxis}
                    tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
                  />
                  <Tooltip
                    contentStyle={adminChartTooltipStyle}
                    formatter={(val: number) => [formatCurrency(val), '营收']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3388FF"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3388FF' }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无营收数据" />
            )}
          </div>
        </AdminChartCell>
      </AdminChartGrid>

      <AdminChartGrid>
        <AdminChartCell id="admin-section-demands">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            需求状态分布
          </h3>
          <div className="h-[220px]">
            {demandEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demandEntries}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={72}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {demandEntries.map((entry, i) => (
                      <Cell
                        key={entry.key}
                        fill={ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无需求数据" />
            )}
          </div>
        </AdminChartCell>

        <AdminChartCell span={2} id="admin-section-tags">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            标签热度 Top 8
          </h3>
          <div className="h-[220px]">
            {tags.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tags}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid {...adminChartGrid} horizontal={false} />
                  <XAxis type="number" {...adminChartAxis} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    {...adminChartAxis}
                  />
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                  <Bar dataKey="count" fill="#111111" radius={[0, 2, 2, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无标签数据" />
            )}
          </div>
        </AdminChartCell>
      </AdminChartGrid>

      {circleData.length > 0 && (
        <AdminPanel title="圈子类型分布" description="按圈子类型统计">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={circleData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid {...adminChartGrid} vertical={false} />
                <XAxis dataKey="name" {...adminChartAxis} />
                <YAxis {...adminChartAxis} />
                <Tooltip contentStyle={adminChartTooltipStyle} />
                <Bar dataKey="value" fill="#3388FF" radius={[2, 2, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>
      )}
    </div>
  )
}
