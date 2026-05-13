import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { AcetNextBlueButton } from '@/components/ui/tailwindcss-buttons-variants'

export default function Payment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(false)

  async function pay() {
    if (!id || loading) return
    setLoading(true)
    try {
      await orderApi.prepay(id)
      setPaid(true)
      setTimeout(() => navigate(`/orders/${id}`), 1500)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch bg-bg-primary">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm shrink-0 text-center">
          {paid ? (
            <div className="animate-fadeIn">
              <div className="mb-4 text-5xl">✅</div>
              <h1 className="mb-2 text-2xl font-black">支付成功</h1>
              <p className="text-sm text-text-muted">即将跳转...</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 text-5xl">💳</div>
              <h1 className="mb-2 text-2xl font-black">模拟支付</h1>
              <p className="mb-8 text-sm text-text-muted">模拟支付页面</p>
              <AcetNextBlueButton
                type="button"
                onClick={pay}
                disabled={loading}
                className="w-full !rounded-xl !py-3.5 !text-sm font-bold disabled:!opacity-40"
              >
                {loading ? '处理中...' : '确认支付'}
              </AcetNextBlueButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
