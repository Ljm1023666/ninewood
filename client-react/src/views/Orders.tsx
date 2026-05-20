import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { ListItemCard } from '@/components/ui/list-item-card'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'

const statusLabel: Record<string, string> = {
  PENDING: '待确认',
  IN_PROGRESS: '服务中',
  WAITING_REVIEW: '待验收',
  COMPLETED: '已完成',
  DISPUTED: '争议中',
}
const statusTheme = (s: string) =>
  (
    ({
      COMPLETED: 'bg-success/15 text-success border border-success/25',
      DISPUTED: 'bg-error/15 text-error border border-error/25',
      IN_PROGRESS: 'bg-warning/15 text-warning border border-warning/25',
      WAITING_REVIEW: 'bg-warning/10 text-warning border border-warning/20',
      PENDING: 'bg-accent/10 text-accent border border-accent/20',
    }) as Record<string, string>
  )[s] || 'bg-card text-text-muted border border-border'

export default function Orders() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await orderApi.list({ role: role || undefined })
      setOrders(res.data.data?.orders || [])
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
      <div className="relative z-10 box-border flex w-full max-w-3xl shrink-0 flex-col self-center p-5">
        <div className="mb-4 flex gap-2">
          {[
            { value: '', label: '全部' },
            { value: 'provider', label: '我接的单' },
            { value: 'requester', label: '我发的单' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setRole(t.value)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${
                role === t.value
                  ? 'bg-[var(--primary-gradient)] text-white shadow-lg'
                  : 'glass-input text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <ErrorState message={error} onRetry={fetchOrders} />}

        {loading && <LoadingState />}

        {!error && !loading && orders.length === 0 && (
          <EmptyState type="order" />
        )}

        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((o: any) => (
              <ListItemCard
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                className="p-4 list-item-base"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">
                    {o.demand?.title || '订单'}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusTheme(o.status)}`}
                  >
                    {statusLabel[o.status] || ''}
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-[13px] text-text-secondary">
                  <span className="font-semibold text-accent">¥{o.agreedPrice}</span>
                  <span>
                    {o.provider?.nickname} → {o.requester?.nickname}
                  </span>
                </div>
              </ListItemCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
