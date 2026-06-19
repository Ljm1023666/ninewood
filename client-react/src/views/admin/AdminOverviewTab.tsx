import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ShoppingCart } from 'lucide-react'
import { STATUS_LABELS } from './use-admin-data'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricGrid,
  AdminMetricTile,
  AdminPanel,
  AdminChartGrid,
  AdminChartCell,
  AdminStatusBadge,
  AdminEmpty,
  AdminList,
  AdminListRow,
  AdminMetricSkeleton,
  AdminPanelSkeleton,
  formatCurrency,
  formatMonthLabel,
  ADMIN_CHART_COLORS,
  adminChartGrid,
  adminChartAxis,
  adminChartTooltipStyle,
} from './admin-ui'

interface AdminOverviewTabProps {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

export default function AdminOverviewTab({
  data,
  loading,
}: AdminOverviewTabProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <AdminMetricSkeleton count={6} />
        <AdminPanelSkeleton height="min-h-[340px]" />
        <div className="grid grid-cols-2 gap-px border border-[var(--admin-hairline)] bg-[var(--admin-hairline)]">
          <AdminPanelSkeleton />
          <AdminPanelSkeleton />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview, revenueTrend, demandDistribution, orderDistribution, recentOrders, topTags } =
    data

  const totalRevenue = (revenueTrend || []).reduce((s, r) => s + r.revenue, 0)
  const chartRevenue = (revenueTrend || []).map((r) => ({
    ...r,
    label: formatMonthLabel(r.name),
  }))

  const demandData = Object.entries(demandDistribution || {}).map(
    ([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
      key: name,
    }),
  )

  const orderData = Object.entries(orderDistribution || {}).map(
    ([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
      key: name,
    }),
  )

  const maxTagCount = Math.max(...(topTags || []).map((t) => t.count), 1)
  const orders = recentOrders || []
  const tags = topTags || []

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        数据看板
      </p>
      <div id="admin-section-stats">
        <AdminMetricGrid cols={6}>
            <AdminMetricTile label="总订单" value={overview.orderCount} />
            <AdminMetricTile label="总用户" value={overview.userCount} />
            <AdminMetricTile label="活跃服务者" value={overview.providerCount} />
            <AdminMetricTile label="需求总数" value={overview.demandCount} />
            <AdminMetricTile label="活跃圈子" value={overview.circleCount} />
            <AdminMetricTile
              label="争议订单"
              value={overview.disputeCount}
              hint={overview.disputeCount > 0 ? '需关注' : '暂无争议'}
            />
          </AdminMetricGrid>
      </div>

      <AdminChartGrid>
        <AdminChartCell span={2} id="admin-section-revenue">
          <h3 className="mb-1 text-[13px] font-semibold text-[var(--admin-text)]">
            收入趋势
          </h3>
          <p className="mb-4 font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-muted)]">
            近 7 个月累计 {formatCurrency(totalRevenue)}
          </p>
          <div className="h-[240px]">
            {chartRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartRevenue}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3388FF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3388FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...adminChartGrid} vertical={false} />
                  <XAxis dataKey="label" {...adminChartAxis} />
                  <YAxis
                    {...adminChartAxis}
                    tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
                  />
                  <Tooltip
                    contentStyle={adminChartTooltipStyle}
                    formatter={(val: number) => [formatCurrency(val), '收入']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3388FF"
                    strokeWidth={2}
                    fill="url(#adminRevenueGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#3388FF', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无收入数据" />
            )}
          </div>
        </AdminChartCell>

        <AdminChartCell id="admin-section-demands">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            需求状态分布
          </h3>
          <div className="h-[200px]">
            {demandData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demandData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {demandData.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]}
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
          {demandData.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {demandData.map((entry, index) => (
                <div
                  key={entry.key}
                  className="flex items-center gap-1.5 font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-secondary)]"
                >
                  <span
                    className="size-2 shrink-0"
                    style={{
                      background: ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length],
                    }}
                  />
                  {entry.name}
                  <span className="tabular-nums text-[var(--admin-text)]">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminChartCell>
      </AdminChartGrid>

      {/* 订单状态 + 标签热度 */}
      <AdminChartGrid>
        <AdminChartCell span={2}>
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            订单状态分布
          </h3>
          <div className="h-[200px]">
            {orderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={orderData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid {...adminChartGrid} horizontal={false} />
                  <XAxis type="number" {...adminChartAxis} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    {...adminChartAxis}
                  />
                  <Tooltip contentStyle={adminChartTooltipStyle} />
                  <Bar dataKey="value" fill="#3388FF" radius={[0, 2, 2, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无订单分布数据" />
            )}
          </div>
        </AdminChartCell>

        <AdminChartCell>
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            标签热度 Top 6
          </h3>
          {tags.length > 0 ? (
            <div className="space-y-3">
              {tags.slice(0, 6).map((tag, index) => (
                <div key={tag.tagName} className="flex items-center gap-3">
                  <span className="w-4 font-[family-name:var(--admin-mono)] text-[10px] tabular-nums text-[var(--admin-text-muted)]">
                    {index + 1}
                  </span>
                  <span className="w-20 truncate text-xs text-[var(--admin-text)]">
                    {tag.tagName}
                  </span>
                  <div className="h-1 flex-1 bg-[var(--admin-hairline)]">
                    <div
                      className="h-full bg-[var(--admin-text)] transition-[width] duration-300"
                      style={{ width: `${(tag.count / maxTagCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-[family-name:var(--admin-mono)] text-[10px] tabular-nums text-[var(--admin-text-secondary)]">
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmpty title="暂无标签数据" />
          )}
        </AdminChartCell>
      </AdminChartGrid>

      <AdminPanel
        id="admin-section-orders"
        title="最新订单"
        description="最近成交与进行中订单"
        noPadding
        bodyClassName="p-0"
      >
        {orders.length > 0 ? (
          <AdminList>
            {orders.slice(0, 8).map((order) => (
              <AdminListRow
                key={order.id}
                icon={ShoppingCart}
                title={order.demandTitle}
                meta={`${order.provider} · ${order.requester}`}
                trailing={formatCurrency(order.amount)}
                badge={
                  <AdminStatusBadge
                    label={STATUS_LABELS[order.status] || order.status}
                    status={order.status}
                  />
                }
              />
            ))}
          </AdminList>
        ) : (
          <div className="p-5">
            <AdminEmpty title="暂无订单" />
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
