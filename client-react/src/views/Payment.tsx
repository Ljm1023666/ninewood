import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'

export default function Payment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(false)

  async function pay() {
    if (!id || loading) return; setLoading(true)
    try { await orderApi.prepay(id); setPaid(true); setTimeout(() => navigate(`/orders/${id}`), 1500) }
    catch { setLoading(false) }
  }

  return (
    <div className="h-full flex items-center justify-center bg-bg-primary p-6">
      <div className="text-center max-w-sm w-full">
        {paid ? <div className="animate-fadeIn"><div className="text-5xl mb-4">✅</div><h1 className="text-2xl font-black mb-2">支付成功</h1><p className="text-text-muted text-sm">即将跳转...</p></div> : <div>
          <div className="text-5xl mb-4">💳</div><h1 className="text-2xl font-black mb-2">模拟支付</h1><p className="text-text-muted text-sm mb-8">模拟支付页面</p>
          <button onClick={pay} disabled={loading} className="w-full py-3.5 rounded-xl bg-[var(--primary-gradient)] text-white font-bold text-sm disabled:opacity-40">{loading ? '处理中...' : '确认支付'}</button>
        </div>}
      </div>
    </div>
  )
}
