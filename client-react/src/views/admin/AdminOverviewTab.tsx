import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  ShoppingCart,
  Users,
  Activity,
  AlertTriangle,
  Circle as CircleIcon,
  FileText,
  Layers,
} from 'lucide-react'
import { STATUS_LABELS, COLORS } from './use-admin-data'
import type { DashboardData } from './use-admin-data'
import {
  AdminMetricCard,
  AdminPanel,
  AdminStatusBadge,
  AdminEmpty,
  AdminMetricSkeleton,
  AdminPanelSkeleton,
  formatCurrency,
  formatMonthLabel,
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
        <div className="grid grid-cols-3 gap-4">
          <AdminPanelSkeleton height="col-span-2 min-h-[340px]" />
          <AdminPanelSkeleton />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <AdminPanelSkeleton />
          <AdminPanelSkeleton />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview, revenueTrend, demandDistribution, recentOrders, topTags } =
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
    }),
  )

  const maxTagCount = Math.max(...(topTags || []).map((t) => t.count), 1)
  const orders = recentOrders || []
  const tags = topTags || []

  return (
    <div className="space-y-6">
      {/* 核心指标 */}
      <div id="admin-section-stats" className="grid grid-cols-6 gap-4">
        <AdminMetricCard
          icon={ShoppingCart}
          label="总订单"
          value={overview.orderCount}
          accent="orange"
        />
        <AdminMetricCard
          icon={Users}
          label="总用户"
          value={overview.userCount}
          accent="blue"
        />
        <AdminMetricCard
          icon={Activity}
          label="活跃服务者"
          value={overview.providerCount}
          accent="teal"
        />
        <AdminMetricCard
          icon={FileText}
          label="需求总数"
          value={overview.demandCount}
          accent="zinc"
        />
        <AdminMetricCard
          icon={Layers}
          label="活跃圈子"
          value={overview.circleCount}
          accent="green"
        />
        <AdminMetricCard
          icon={AlertTriangle}
          label="争议订单"
          value={overview.disputeCount}
          hint={overview.disputeCount > 0 ? '需关注' : '暂无争议'}
          accent="red"
        />
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-3 gap-4">
        <AdminPanel
          id="admin-section-revenue"
          title="收入趋势"
          description={`近 7 个月累计 ${formatCurrency(totalRevenue)}`}
          className="col-span-2"
          bodyClassName="pt-2"
        >
          <div className="h-[300px]">
            {chartRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartRevenue}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="adminRevenueGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--admin-accent-orange)"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--admin-accent-orange)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
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
                    tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      fontSize: 13,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                    formatter={(val: number) => [formatCurrency(val), '收入']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--admin-accent-orange)"
                    strokeWidth={2}
                    fill="url(#adminRevenueGrad)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: 'var(--admin-accent-orange)',
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无收入数据" />
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          id="admin-section-demands"
          title="需求状态分布"
          description="按状态统计"
        >
          <div className="flex h-[250px] items-center justify-center">
            {demandData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demandData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                  >
                    {demandData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无需求数据" />
            )}
          </div>
          {demandData.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {demandData.map((entry, index) => (
                <div
                  key={entry.name}
                  className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)]"
                >
                  <CircleIcon
                    className="size-2"
                    fill={COLORS[index % COLORS.length]}
                    stroke={COLORS[index % COLORS.length]}
                  />
                  <span>{entry.name}</span>
                  <span className="font-mono tabular-nums text-[var(--admin-text)]">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>

      {/* 底部双栏 */}
      <div id="admin-section-orders" className="grid grid-cols-2 gap-4">
        <AdminPanel title="最新订单" description="最近成交与进行中订单">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] text-left text-xs text-[var(--admin-text-muted)]">
                  <th className="pb-3 pr-3 font-medium">需求</th>
                  <th className="pb-3 pr-3 font-medium">服务者</th>
                  <th className="pb-3 pr-3 text-right font-medium">金额</th>
                  <th className="pb-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.slice(0, 8).map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--admin-border)] last:border-0"
                    >
                      <td className="max-w-[180px] truncate py-3 pr-3 text-sm text-[var(--admin-text)]">
                        {order.demandTitle}
                      </td>
                      <td className="py-3 pr-3 text-sm text-[var(--admin-text-secondary)]">
                        {order.provider}
                      </td>
                      <td className="py-3 pr-3 text-right text-sm font-mono tabular-nums text-[var(--admin-text)]">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="py-3">
                        <AdminStatusBadge
                          label={STATUS_LABELS[order.status] || order.status}
                          status={order.status}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <AdminEmpty title="暂无订单" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel title="热门标签" description="按使用频次排序">
          {tags.length > 0 ? (
            <div className="space-y-3">
              {tags.slice(0, 10).map((tag, index) => (
                <div key={tag.tagName} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-medium tabular-nums text-[var(--admin-text-muted)]">
                    {index + 1}
                  </span>
                  <span className="w-28 truncate text-sm text-[var(--admin-text)]">
                    {tag.tagName}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-[var(--admin-accent-orange)] transition-[width] duration-300"
                        style={{ width: `${(tag.count / maxTagCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-mono tabular-nums text-[var(--admin-text-secondary)]">
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
