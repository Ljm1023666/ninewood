import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { useUserStore } from '@/stores/user'
import { toast } from '@/components/ui/confirm-dialog'

const statusLabel: Record<string, string> = { PENDING: '待确认', IN_PROGRESS: '服务中', WAITING_REVIEW: '待验收', COMPLETED: '已完成', DISPUTED: '争议中' }

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPartial, setShowPartial] = useState(false)
  const [partial, setPartial] = useState({ newPrice: 0, description: '' })

  const isProvider = order?.providerId === user?.id
  const isRequester = order?.requesterId === user?.id

  async function fetchOrder() {
    if (!id) return; setLoading(true); setError('')
    try { const r = await orderApi.get(id); setOrder(r.data.data) }
    catch { setError('加载失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrder() }, [id])

  async function act(fn: () => Promise<any>, msg: string) {
    try { await fn(); toast(msg); fetchOrder() } catch (e: any) { toast(e.response?.data?.message || '操作失败', 'error') }
  }

  if (loading) return <div className="text-center py-16 text-text-muted text-sm">加载中...</div>
  if (error) return <div className="text-center py-16"><p className="text-text-muted text-sm">{error}</p><button onClick={fetchOrder} className="mt-3 text-accent text-sm">重试</button></div>
  if (!order) return null

  const s = order.status
  const statusTheme = (st: string) => {
    const m: Record<string, string> = { COMPLETED: 'bg-emerald-500/15 text-emerald-400', DISPUTED: 'bg-red-500/15 text-red-400', IN_PROGRESS: 'bg-blue-500/15 text-blue-400', WAITING_REVIEW: 'bg-amber-500/15 text-amber-400' }
    return m[st] || 'bg-card text-text-muted'
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
      <div className="relative z-10 box-border flex w-full max-w-3xl shrink-0 flex-col self-center p-5">
      <div className="glass mx-auto w-full max-w-[500px] shrink-0 self-center rounded-xl p-6">
        <button onClick={() => navigate(-1)} className="text-text-muted text-sm mb-3 hover:text-text-secondary">← 返回</button>
        <h2 className="mb-4 text-lg font-bold">{order.demand?.title}</h2>
        <div className="mb-4"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusTheme(s)}`}>{statusLabel[s] || s}</span></div>

        <div className="flex flex-col gap-2 mb-5">
          <div className="flex justify-between"><span className="text-[13px] text-text-muted">金额</span><span className="font-semibold">¥{order.agreedPrice}</span></div>
          <div className="flex justify-between"><span className="text-[13px] text-text-muted">服务方</span><span className="font-semibold">{order.provider?.nickname}</span></div>
          <div className="flex justify-between"><span className="text-[13px] text-text-muted">需求方</span><span className="font-semibold">{order.requester?.nickname}</span></div>
          {order.paidAt && <div className="flex justify-between"><span className="text-[13px] text-text-muted">支付时间</span><span className="font-semibold">{new Date(order.paidAt).toLocaleString()}</span></div>}
          {order.completedAt && <div className="flex justify-between"><span className="text-[13px] text-text-muted">完成时间</span><span className="font-semibold">{new Date(order.completedAt).toLocaleString()}</span></div>}
        </div>

        <div className="flex flex-col gap-2">
          {isRequester && s === 'IN_PROGRESS' && !order.paidAt && <button onClick={() => act(() => orderApi.prepay(order.id), '支付成功（模拟）')} className="w-full py-2.5 rounded-lg bg-[var(--primary-gradient)] text-white font-semibold text-sm">模拟支付 (预付50%)</button>}
          {isProvider && s === 'IN_PROGRESS' && order.paidAt && <button onClick={() => act(() => orderApi.complete(order.id), '已标记完成')} className="w-full py-2.5 rounded-lg bg-[var(--primary-gradient)] text-white font-semibold text-sm">标记完成</button>}
          {isRequester && s === 'WAITING_REVIEW' && <button onClick={() => act(() => orderApi.confirm(order.id), '订单已完成')} className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm">确认验收</button>}
          {(isProvider || isRequester) && ['IN_PROGRESS', 'WAITING_REVIEW'].includes(s) && <button onClick={() => act(() => orderApi.dispute(order.id), '争议已提交')} className="w-full py-2.5 rounded-lg border border-red-500/50 bg-transparent text-red-400 font-semibold text-sm">发起争议</button>}
          {isProvider && s === 'IN_PROGRESS' && <button onClick={() => setShowPartial(true)} className="w-full py-2.5 rounded-lg border border-border bg-transparent text-text-secondary font-semibold text-sm">部分完成</button>}
        </div>
      </div>

      {showPartial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPartial(false)}>
          <div className="bg-bg-secondary rounded-2xl p-6 w-[90%] max-w-sm border border-border" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">部分完成</h3>
            <div className="flex flex-col gap-3">
              <input type="number" value={partial.newPrice} onChange={e => setPartial({ ...partial, newPrice: Number(e.target.value) })} placeholder="新价格（低于原价）" className="bg-card border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm outline-none" />
              <textarea value={partial.description} onChange={e => setPartial({ ...partial, description: e.target.value })} placeholder="说明剩余部分" rows={2} className="bg-card border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm outline-none resize-none" />
              <button onClick={() => act(() => orderApi.partial(order.id, partial.newPrice, partial.description), '部分完成已提交')} className="w-full py-2.5 rounded-lg bg-[var(--primary-gradient)] text-white font-semibold text-sm">提交</button>
            </div>
        </div>
      </div>
      )}

      </div>
    </div>
  )
}
