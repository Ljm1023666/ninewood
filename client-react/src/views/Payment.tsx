import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { orderApi } from '@/api/order'
import {
  DesktopPageShell,
  DlpGlass,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'

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
    <DesktopPageShell title="点数支付" subtitle="使用点数钱包完成订单支付">
      <div className="dlp-split dlp-split--pay">
        <DlpGlass className="p-8">
          <MsIcon name="receipt_long" size={36} className="text-[var(--price-foreground)]" />
          <h2 className="mt-4 text-xl font-semibold text-text-primary">订单摘要</h2>
          <p className="mt-2 text-sm text-text-muted">订单号：{id ?? '—'}</p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">支付方式</dt>
              <dd className="font-medium text-text-primary">点数钱包</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">平台服务费</dt>
              <dd className="font-medium text-text-primary">5%</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--wallet-divider)] pt-3">
              <dt className="text-text-muted">说明</dt>
              <dd className="max-w-[240px] text-right text-text-secondary">
                开发期点数支付（1 点 = 1 元），确认后扣除服务费
              </dd>
            </div>
          </dl>
        </DlpGlass>

        <DlpGlass gold className="flex flex-col justify-center p-8">
          {paid ? (
            <div className="animate-fadeIn text-center">
              <MsIcon name="check_circle" size={56} className="mx-auto mb-4 text-success" />
              <h2 className="mb-2 text-2xl font-bold text-text-primary">支付成功</h2>
              <p className="text-sm text-text-muted">即将跳转至订单详情…</p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-md">
              <MsIcon name="credit_card" size={48} className="mb-4 text-[var(--price-foreground)]" />
              <h2 className="text-xl font-semibold text-text-primary">确认支付</h2>
              <p className="mt-2 text-sm text-text-muted">
                请核对订单信息后点击下方按钮完成点数扣款
              </p>
              {error && (
                <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  <MsIcon name="error" size={16} />
                  {error}
                </div>
              )}
              <DlpBtnPrimary onClick={pay} disabled={loading} className="mt-6 w-full">
                {loading ? '处理中…' : '确认支付'}
              </DlpBtnPrimary>
            </div>
          )}
        </DlpGlass>
      </div>
    </DesktopPageShell>
  )
}
