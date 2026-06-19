import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { Button } from '@/components/ui/button'

const statusLabel: Record<string, string> = { PENDING: '待确认', IN_PROGRESS: '服务中', WAITING_REVIEW: '待验收', COMPLETED: '已完成', DISPUTED: '争议中' }
const statusTheme = (s: string) => ({ COMPLETED: 'bg-emerald-500/15 text-emerald-400', DISPUTED: 'bg-red-500/15 text-red-400', IN_PROGRESS: 'bg-blue-500/15 text-blue-400', WAITING_REVIEW: 'bg-amber-500/15 text-amber-400' } as Record<string, string>)[s] || 'bg-card text-text-muted'

export default function Orders() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchOrders() {
    setLoading(true); setError('')
    try { const res = await orderApi.list({ role: role || undefined }); setOrders(res.data.data?.orders || []) }
    catch (e: any) { setError(e.response?.data?.message || '加载失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [role])

  return (
    <div className="h-full overflow-y-auto thin-scroll p-5 max-w-3xl mx-auto">
      <div className="flex gap-2 mb-4">
        {[{ value: '', label: '全部' }, { value: 'provider', label: '我接的单' }, { value: 'requester', label: '我发的单' }].map(t => (
          <button key={t.value} onClick={() => setRole(t.value)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === t.value ? 'bg-[var(--primary-gradient)] text-white' : 'bg-card border border-border text-text-secondary'}`}>{t.label}</button>
        ))}
      </div>
      {error && <div className="text-center py-16"><p className="text-text-muted text-sm">{error}</p><button onClick={fetchOrders} className="mt-3 text-accent text-sm">重试</button></div>}
      {loading && <div className="text-center py-16 text-text-muted text-sm">加载中...</div>}
      <div className="flex flex-col gap-2">
        {orders.map((o: any) => (
          <div key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="relative overflow-hidden rounded-xl border border-border bg-card backdrop-blur-sm cursor-pointer hover:bg-bg-tertiary hover:border-accent/50 hover:shadow-[4px_0_0_var(--primary-start)] hover:translate-x-1 active:scale-[0.98] transition-all duration-300 p-4">
            <div className="flex justify-between items-center"><span className="font-semibold">{o.demand?.title || '订单'}</span><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusTheme(o.status)}`}>{statusLabel[o.status] || ''}</span></div>
            <div className="flex justify-between mt-2 text-[13px] text-text-secondary"><span>¥{o.agreedPrice}</span><span>{o.provider?.nickname} → {o.requester?.nickname}</span></div>
          </div>
        ))}
        {!loading && orders.length === 0 && <div className="text-center py-16 text-text-muted text-sm">暂无订单</div>}
      </div>
    </div>
  )
}
