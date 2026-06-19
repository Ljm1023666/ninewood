import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, CreditCard, AlertCircle } from 'lucide-react'
import { orderApi } from '@/api/order'
import { AcetPrimaryButton } from '@/components/ui/tailwindcss-buttons-variants'
import { BackButton } from '@/components/ui/back-button'

export default function Payment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    if (!id || loading) return
    setLoading(true)
    setError('')
    try {
      await orderApi.prepay(id)
      setPaid(true)
      setTimeout(() => navigate(`/orders/${id}`), 1500)
    } catch {
      setLoading(false)
      setError('支付失败，请重试')
    }
  }

  return (
    <div className="relative z-base flex h-full min-h-0 w-full min-w-0 flex-col items-stretch bg-bg-primary">
      <BackButton />
      <div className="relative z-content flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm shrink-0 text-center">
          {paid ? (
            <div className="animate-fadeIn">
              <CheckCircle2 className="mx-auto mb-4 size-14 text-success" />
              <h1 className="mb-2 text-2xl font-bold text-text-primary">支付成功</h1>
              <p className="text-sm text-text-muted">即将跳转...</p>
            </div>
          ) : (
            <div>
              <CreditCard className="mx-auto mb-4 size-14 text-accent" />
              <h1 className="mb-2 text-2xl font-bold text-text-primary">模拟支付</h1>
              <p className="mb-2 text-sm text-text-muted">模拟支付页面</p>
              {error && (
                <div className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  <AlertCircle className="size-4" />
                  {error}
                </div>
              )}
              <AcetPrimaryButton
                type="button"
                onClick={pay}
                disabled={loading}
                className="w-full !rounded-xl !py-4 !text-sm font-bold disabled:!opacity-40"
              >
                {loading ? '处理中...' : '确认支付'}
              </AcetPrimaryButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
