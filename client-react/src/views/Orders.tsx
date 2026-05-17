import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { AcetNextWhiteButton } from '@/components/ui/tailwindcss-buttons-variants'

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
      COMPLETED: 'bg-emerald-500/15 text-emerald-400',
      DISPUTED: 'bg-red-500/15 text-red-400',
      IN_PROGRESS: 'bg-blue-500/15 text-blue-400',
      WAITING_REVIEW: 'bg-amber-500/15 text-amber-400',
    }) as Record<string, string>
  )[s] || 'bg-card text-text-muted'

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
        <div className="flex gap-2 mb-4">
          {[
            { value: '', label: '全部' },
            { value: 'provider', label: '我接的单' },
            { value: 'requester', label: '我发的单' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setRole(t.value)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-[color,background-color,border-color] ${role === t.value ? 'bg-[var(--primary-gradient)] text-white' : 'bg-card border border-border text-text-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm">{error}</p>
            <AcetNextWhiteButton
              type="button"
              onClick={fetchOrders}
              className="!mx-auto !mt-3 !block !px-4 !py-2 !text-sm"
            >
              重试
            </AcetNextWhiteButton>
          </div>
        )}
        {loading && (
          <div className="text-center py-16 text-text-muted text-sm">
            加载中...
          </div>
        )}
        <div className="flex flex-col gap-2">
          {orders.map((o: any) => (
            <div
              key={o.id}
              onClick={() => navigate(`/orders/${o.id}`)}
              className="relative overflow-hidden rounded-xl border border-border bg-card backdrop-blur-sm cursor-pointer hover:bg-bg-tertiary hover:border-accent/50 hover:shadow-[4px_0_0_var(--primary-start)] hover:translate-x-1 active:scale-[0.98] transition-[transform,border-color,background-color,box-shadow] duration-300 p-4"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {o.demand?.title || '订单'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusTheme(o.status)}`}
                >
                  {statusLabel[o.status] || ''}
                </span>
              </div>
              <div className="flex justify-between mt-2 text-[13px] text-text-secondary">
                <span>¥{o.agreedPrice}</span>
                <span>
                  {o.provider?.nickname} → {o.requester?.nickname}
                </span>
              </div>
            </div>
          ))}
          {!loading && orders.length === 0 && (
            <div className="py-16 text-center text-sm text-text-muted">
              暂无订单
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
