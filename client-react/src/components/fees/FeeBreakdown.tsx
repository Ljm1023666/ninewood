import type { FeeQuote } from '@/api/order'
import { AcetPrimaryButton, AcetSecondaryButton } from '@/components/ui/tailwindcss-buttons-variants'

export function FeeBreakdownDialog({
  quote,
  busy,
  onConfirm,
  onClose,
}: {
  quote: FeeQuote
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const amount = (value: number) => `${value.toFixed(2)} 点`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="fee-quote-title"
        className="w-[460px] rounded-2xl border border-border bg-bg-secondary p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="fee-quote-title" className="text-lg font-bold">操作前费用确认</h2>
        <p className="mt-1 text-sm text-text-muted">没有隐藏费用。订单变化后，系统会要求你重新确认。</p>

        <dl className="mt-5 space-y-3 text-sm">
          {quote.explanations.map((item) => (
            <div key={item.code} className="border-b border-border/60 pb-3">
              <div className="flex justify-between gap-4">
                <dt className="font-medium">{item.label}</dt>
                <dd className="font-semibold">{amount(item.amount)}</dd>
              </div>
              <p className="mt-1 text-xs leading-5 text-text-muted">{item.reason}</p>
            </div>
          ))}
        </dl>

        <div className="mt-4 rounded-xl bg-card px-4 py-3">
          <div className="flex justify-between text-sm"><span>本次实际扣除</span><strong>{amount(quote.totalDue)}</strong></div>
          <div className="mt-2 flex justify-between text-sm"><span>本次退还</span><strong>{amount(quote.refundableAmount)}</strong></div>
          <p className="mt-2 text-xs text-text-muted">计价版本：{quote.pricingVersion}</p>
        </div>

        <div className="mt-5 flex gap-3">
          <AcetSecondaryButton className="flex-1" disabled={busy} onClick={onClose}>返回</AcetSecondaryButton>
          <AcetPrimaryButton className="flex-1" disabled={busy} onClick={onConfirm}>
            {busy ? '正在处理…' : '确认并继续'}
          </AcetPrimaryButton>
        </div>
      </section>
    </div>
  )
}
