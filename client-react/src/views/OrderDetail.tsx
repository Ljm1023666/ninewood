import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { useUserStore } from '@/stores/user'
import { toast } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  StatusChip,
} from '@/components/layout/internal-ui'
import {
  AcetPrimaryButton,
  AcetSecondaryButton,
} from '@/components/ui/tailwindcss-buttons-variants'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const user = useUserStore((s) => s.user)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPartial, setShowPartial] = useState(false)
  const [partial, setPartial] = useState({ newPrice: 0, description: '' })

  const isProvider = order?.providerId === user?.id
  const isRequester = order?.requesterId === user?.id

  const fetchOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const r = await orderApi.get(id)
      setOrder(r.data.data)
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  async function act(fn: () => Promise<any>, msg: string) {
    try {
      await fn()
      toast(msg)
      fetchOrder()
    } catch (e: any) {
      toast(e.response?.data?.message || '操作失败', 'error')
    }
  }

  if (loading) {
    return (
      <InternalPageShell width="medium">
        <PageHeader title="订单详情" onBack="back" />
        <div className="py-16 text-center text-sm text-text-muted">加载中...</div>
      </InternalPageShell>
    )
  }

  if (error) {
    return (
      <InternalPageShell width="medium">
        <PageHeader title="订单详情" onBack="back" />
        <div className="py-16 text-center">
          <p className="text-sm text-text-muted">{error}</p>
          <Button
            variant="ghost"
            onClick={fetchOrder}
            className="mx-auto mt-3 block"
          >
            重试
          </Button>
        </div>
      </InternalPageShell>
    )
  }

  if (!order) return null

  const s = order.status

  return (
    <InternalPageShell width="medium">
      <PageHeader
        title={order.demand?.title || '订单详情'}
        onBack="back"
      />

      <div className="glass mx-auto w-full max-w-[500px] shrink-0 rounded-xl p-6">
        <div className="mb-4">
          <StatusChip status={s} />
        </div>

        <div className="mb-5 flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-[13px] text-text-muted">金额</span>
            <span className="font-semibold">¥{order.agreedPrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-text-muted">服务方</span>
            <span className="font-semibold">{order.provider?.nickname}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-text-muted">需求方</span>
            <span className="font-semibold">{order.requester?.nickname}</span>
          </div>
          {order.paidAt && (
            <div className="flex justify-between">
              <span className="text-[13px] text-text-muted">支付时间</span>
              <span className="font-semibold">
                {new Date(order.paidAt).toLocaleString()}
              </span>
            </div>
          )}
          {order.completedAt && (
            <div className="flex justify-between">
              <span className="text-[13px] text-text-muted">完成时间</span>
              <span className="font-semibold">
                {new Date(order.completedAt).toLocaleString()}
              </span>
            </div>
          )}
          {order.demand?.timeLimit && (
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-text-muted">服务时限</span>
              <span
                className="font-semibold"
                style={{
                  color:
                    s === 'IN_PROGRESS' &&
                    new Date(order.demand.timeLimit).getTime() < Date.now()
                      ? 'rgb(248 113 113)'
                      : undefined,
                }}
              >
                {new Date(order.demand.timeLimit).toLocaleString()}
                {s === 'IN_PROGRESS' &&
                  new Date(order.demand.timeLimit).getTime() < Date.now() && (
                    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
                      （已超时，等待确认）
                    </span>
                  )}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isRequester && s === 'IN_PROGRESS' && !order.paidAt && (
            <AcetPrimaryButton
              onClick={() =>
                act(() => orderApi.prepay(order.id), '支付成功（模拟）')
              }
              className="w-full"
            >
              模拟支付 (预付50%)
            </AcetPrimaryButton>
          )}
          {isProvider && s === 'IN_PROGRESS' && order.paidAt && (
            <AcetPrimaryButton
              onClick={() =>
                act(() => orderApi.complete(order.id), '已标记完成')
              }
              className="w-full"
            >
              标记完成
            </AcetPrimaryButton>
          )}
          {isRequester && s === 'WAITING_REVIEW' && (
            <AcetPrimaryButton
              onClick={() =>
                act(() => orderApi.confirm(order.id), '订单已完成')
              }
              className="w-full"
            >
              确认验收
            </AcetPrimaryButton>
          )}
          {(isProvider || isRequester) &&
            ['IN_PROGRESS', 'WAITING_REVIEW'].includes(s) && (
              <AcetSecondaryButton
                onClick={() =>
                  act(() => orderApi.dispute(order.id), '争议已提交')
                }
                className="w-full !border-red-500/30 !text-red-400 hover:!border-red-500/50 hover:!bg-red-500/10"
              >
                发起争议
              </AcetSecondaryButton>
            )}
          {isProvider && s === 'IN_PROGRESS' && (
            <AcetSecondaryButton
              onClick={() => setShowPartial(true)}
              className="w-full"
            >
              部分完成
            </AcetSecondaryButton>
          )}
        </div>
      </div>

      {showPartial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70"
          onClick={() => setShowPartial(false)}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-border bg-bg-secondary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">部分完成</h3>
            <div className="flex flex-col gap-3">
              <input
                type="number"
                value={partial.newPrice}
                onChange={(e) =>
                  setPartial({ ...partial, newPrice: Number(e.target.value) })
                }
                placeholder="新价格（低于原价）"
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-text-primary outline-none"
              />
              <textarea
                value={partial.description}
                onChange={(e) =>
                  setPartial({ ...partial, description: e.target.value })
                }
                placeholder="说明剩余部分"
                rows={2}
                className="resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text-primary outline-none"
              />
              <AcetPrimaryButton
                onClick={() =>
                  act(
                    () =>
                      orderApi.partial(
                        order.id,
                        partial.newPrice,
                        partial.description,
                      ),
                    '部分完成已提交',
                  )
                }
                className="w-full"
              >
                提交
              </AcetPrimaryButton>
            </div>
          </div>
        </div>
      )}
    </InternalPageShell>
  )
}
