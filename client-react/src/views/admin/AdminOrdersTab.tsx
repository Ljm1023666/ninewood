import { cn } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'
import { STATUS_LABELS } from './use-admin-data'
import type { DashboardData } from './use-admin-data'
import {
  AdminPanel,
  AdminEmpty,
  AdminStatusBadge,
  formatCurrency,
} from './admin-ui'

interface Props {
  data: DashboardData | null
  loading: boolean
  activeItem?: string
}

export default function AdminOrdersTab({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-4 rounded-xl border border-[var(--admin-border)] bg-white p-4"
          >
            <div className="size-10 rounded-full bg-zinc-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-zinc-200" />
              <div className="h-3 w-32 rounded bg-zinc-200" />
            </div>
            <div className="h-5 w-16 rounded-full bg-zinc-200" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) return null

  const orders = data.recentOrders || []

  return (
    <AdminPanel
      title="全部订单"
      description={`共 ${orders.length} 条最近记录`}
      action={
        <span className="text-xs text-[var(--admin-text-muted)]">
          按创建时间倒序
        </span>
      }
    >
      {orders.length > 0 ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className={cn(
                'flex items-center gap-4 rounded-lg border border-transparent px-3 py-3',
                'transition-[background-color,border-color] duration-200 hover:border-[var(--admin-border)] hover:bg-zinc-50/80',
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                <ShoppingCart className="size-4 text-zinc-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                  {order.demandTitle}
                </p>
                <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                  {order.provider} · {order.requester} ·{' '}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('zh-CN')
                    : '—'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-mono tabular-nums font-medium text-[var(--admin-text)]">
                {formatCurrency(order.amount)}
              </span>
              <AdminStatusBadge
                label={STATUS_LABELS[order.status] || order.status}
                status={order.status}
              />
            </div>
          ))}
        </div>
      ) : (
        <AdminEmpty title="暂无订单数据" />
      )}
    </AdminPanel>
  )
}
