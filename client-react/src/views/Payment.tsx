import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { orderApi } from '@/api/order'
import { AcetPrimaryButton } from '@/components/ui/tailwindcss-buttons-variants'
import { PageHeader } from '@/components/layout/PageHeader'
import { InternalPageShell } from '@/components/layout/internal-ui'

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
    <InternalPageShell width="narrow" contentClassName="flex min-h-full flex-col">
      <PageHeader title="模拟支付" onBack="back" />

      <div className="flex flex-1 flex-col items-center justify-center py-12">
        <div className="w-full max-w-sm shrink-0 text-center">
          {paid ? (
            <div className="animate-fadeIn">
              <MsIcon name="check_circle" size={56} className="mx-auto mb-4 text-success" />
              <h2 className="mb-2 text-2xl font-bold text-text-primary">
                支付成功
              </h2>
              <p className="text-sm text-text-muted">即将跳转...</p>
            </div>
          ) : (
            <div>
              <MsIcon name="credit_card" size={56} className="mx-auto mb-4 text-accent" />
              <p className="mb-6 text-sm text-text-muted">模拟支付页面</p>
              {error && (
                <div className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  <MsIcon name="error" size={16} />
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
    </InternalPageShell>
  )
}
