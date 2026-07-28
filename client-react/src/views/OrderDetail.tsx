import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { reviewApi } from '@/api/review'
import { complaintApi } from '@/api/complaint'
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
  const [showReview, setShowReview] = useState(false)
  const [showComplaint, setShowComplaint] = useState(false)
  const [partial, setPartial] = useState({ newPrice: 0, description: '' })
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' })
  const [complaintReason, setComplaintReason] = useState('')
  const [existingReview, setExistingReview] = useState<any>(null)

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

  useEffect(() => {
    if (!id || !order || order.status !== 'COMPLETED') return
    reviewApi
      .getByOrder(id)
      .then((r) => setExistingReview(r.data?.data ?? null))
      .catch(() => setExistingReview(null))
  }, [id, order?.status])

  async function act(fn: () => Promise<any>, msg: string) {
    try {
      await fn()
      toast(msg)
      fetchOrder()
    } catch (e: any) {
      toast(e.response?.data?.message || '操作失败', 'error')
    }
  }

  async function submitReview() {
    if (!order) return
    try {
      await reviewApi.create(order.id, reviewForm.rating, reviewForm.content.trim() || undefined)
      toast('评价已提交')
      setShowReview(false)
      setExistingReview({ rating: reviewForm.rating, content: reviewForm.content })
    } catch (e: any) {
      toast(e.response?.data?.message || '评价失败', 'error')
    }
  }

  async function submitComplaint() {
    if (!order || !complaintReason.trim()) return
    const toUserId = isRequester ? order.providerId : order.requesterId
    try {
      await complaintApi.create({
        toUserId,
        demandId: order.demandId,
        reason: complaintReason.trim(),
      })
      toast('投诉已提交')
      setShowComplaint(false)
      setComplaintReason('')
    } catch (e: any) {
      toast(e.response?.data?.message || '投诉失败', 'error')
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
  const complaintTargetId = isRequester ? order.providerId : order.requesterId

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

        {s === 'COMPLETED' && existingReview && (
          <p className="mb-4 text-sm text-text-muted">
            已评价：{existingReview.rating} 星
            {existingReview.content ? ` — ${existingReview.content}` : ''}
          </p>
        )}

        {s === 'DISPUTED' && (
          <p className="mb-4 text-sm text-amber-400/90">
            订单处于争议中，管理员将介入处理。
          </p>
        )}

        <div className="flex flex-col gap-2">
          {isRequester && s === 'IN_PROGRESS' && !order.paidAt && (
            <AcetPrimaryButton
              onClick={() =>
                act(() => orderApi.prepay(order.id), '服务费已扣除')
              }
              className="w-full"
            >
              点数支付（5% 服务费）
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
          {s === 'COMPLETED' && !existingReview && (isProvider || isRequester) && (
            <AcetSecondaryButton
              onClick={() => setShowReview(true)}
              className="w-full"
            >
              评价对方
            </AcetSecondaryButton>
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
          {s === 'DISPUTED' && (isProvider || isRequester) && (
            <AcetSecondaryButton
              onClick={() => setShowComplaint(true)}
              className="w-full !border-amber-500/30 !text-amber-300"
            >
              提交投诉
            </AcetSecondaryButton>
          )}
          {isRequester && s === 'IN_PROGRESS' && (
            <AcetSecondaryButton
              onClick={() =>
                act(() => orderApi.cancel(order.id), '订单已取消')
              }
              className="w-full"
            >
              取消订单
            </AcetSecondaryButton>
          )}
          {isRequester && s === 'PARTIAL_PENDING' && (
            <>
              <AcetPrimaryButton
                onClick={() =>
                  act(() => orderApi.acceptPartial(order.id), '已同意部分完成结算')
                }
                className="w-full"
              >
                同意部分完成结算
              </AcetPrimaryButton>
              <AcetSecondaryButton
                onClick={() =>
                  act(() => orderApi.rejectPartial(order.id), '已拒绝提议')
                }
                className="w-full"
              >
                拒绝部分完成
              </AcetSecondaryButton>
            </>
          )}
          {isProvider && s === 'PARTIAL_PENDING' && (
            <AcetSecondaryButton
              onClick={() =>
                act(() => orderApi.withdrawPartial(order.id), '已撤回提议')
              }
              className="w-full"
            >
              撤回部分完成提议
            </AcetSecondaryButton>
          )}
          {isProvider && s === 'IN_PROGRESS' && (
            <AcetSecondaryButton
              onClick={() => setShowPartial(true)}
              className="w-full"
            >
              提出部分完成
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
            <h3 className="mb-4 text-lg font-bold">提出部分完成</h3>
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
                    '部分完成提议已提交',
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

      {showReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70"
          onClick={() => setShowReview(false)}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-border bg-bg-secondary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">评价</h3>
            <div className="flex flex-col gap-3">
              <label className="text-sm text-text-muted">
                评分（1-5）
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={reviewForm.rating}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      rating: Math.min(5, Math.max(1, Number(e.target.value))),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm"
                />
              </label>
              <textarea
                value={reviewForm.content}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, content: e.target.value })
                }
                placeholder="选填评价内容"
                rows={3}
                className="resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text-primary outline-none"
              />
              <AcetPrimaryButton onClick={submitReview} className="w-full">
                提交评价
              </AcetPrimaryButton>
            </div>
          </div>
        </div>
      )}

      {showComplaint && complaintTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70"
          onClick={() => setShowComplaint(false)}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-border bg-bg-secondary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold">提交投诉</h3>
            <textarea
              value={complaintReason}
              onChange={(e) => setComplaintReason(e.target.value)}
              placeholder="描述问题（将记录并供管理员参考）"
              rows={4}
              className="mb-3 w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-text-primary outline-none"
            />
            <AcetPrimaryButton
              onClick={submitComplaint}
              disabled={!complaintReason.trim()}
              className="w-full disabled:opacity-40"
            >
              提交
            </AcetPrimaryButton>
          </div>
        </div>
      )}
    </InternalPageShell>
  )
}
