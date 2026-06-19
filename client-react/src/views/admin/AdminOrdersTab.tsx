import { ShoppingCart } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { STATUS_LABELS } from './use-admin-data'
import type { DashboardData } from './use-admin-data'
import {
  AdminPanel,
  AdminEmpty,
  AdminStatusBadge,
  AdminList,
  AdminListRow,
  AdminChartGrid,
  AdminChartCell,
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

export default function AdminOrdersTab({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-[200px] border border-[var(--admin-hairline)] bg-white" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex h-12 items-center gap-4 border border-[var(--admin-hairline)] bg-white px-4"
          />
        ))}
      </div>
    )
  }

  if (!data) return null

  const orders = data.recentOrders || []
  const orderDist = Object.entries(data.orderDistribution || {}).map(
    ([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
      key: k,
    }),
  )

  const amountByStatus = orderDist.map((d) => {
    const subset = orders.filter((o) => o.status === d.key)
    const total = subset.reduce((s, o) => s + o.amount, 0)
    return { ...d, amount: total }
  })

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        订单筛选
      </p>

      <AdminChartGrid>
        <AdminChartCell id="admin-section-all-orders">
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            订单状态占比
          </h3>
          <div className="h-[180px]">
            {orderDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {orderDist.map((entry, i) => (
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
              <AdminEmpty title="暂无分布数据" />
            )}
          </div>
        </AdminChartCell>

        <AdminChartCell span={2}>
          <h3 className="mb-4 text-[13px] font-semibold text-[var(--admin-text)]">
            各状态订单金额（样本）
          </h3>
          <div className="h-[180px]">
            {amountByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={amountByStatus}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid {...adminChartGrid} vertical={false} />
                  <XAxis dataKey="name" {...adminChartAxis} />
                  <YAxis
                    {...adminChartAxis}
                    tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : String(v))}
                  />
                  <Tooltip
                    contentStyle={adminChartTooltipStyle}
                    formatter={(val: number) => [formatCurrency(val), '金额']}
                  />
                  <Bar dataKey="amount" fill="#3388FF" radius={[2, 2, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty title="暂无金额数据" />
            )}
          </div>
        </AdminChartCell>
      </AdminChartGrid>

      <AdminPanel
        title="全部订单"
        description={`共 ${orders.length} 条最近记录`}
        action={
          <span className="font-[family-name:var(--admin-mono)] text-[10px] text-[var(--admin-text-muted)]">
            按创建时间倒序
          </span>
        }
        noPadding
        bodyClassName="p-0"
      >
        {orders.length > 0 ? (
          <AdminList>
            {orders.map((order) => (
              <AdminListRow
                key={order.id}
                icon={ShoppingCart}
                title={order.demandTitle}
                meta={`${order.provider} · ${order.requester} · ${
                  order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('zh-CN')
                    : '—'
                }`}
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
            <AdminEmpty title="暂无订单数据" />
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
