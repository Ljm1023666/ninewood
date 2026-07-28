import api from './index'
import { beginIdempotencyKey, endIdempotencyKey } from './idempotency'

export type FeeQuoteAction = 'prepay' | 'confirm' | 'partial_accept' | 'cancel'
export type FeeQuote = {
  orderId: string
  action: FeeQuoteAction
  currency: 'POINT'
  serviceAmount: number
  platformFee: number
  verificationFee: number
  thirdPartyCost: number
  heldAmount: number
  refundableAmount: number
  totalDue: number
  feeRate: number
  pricingVersion: string
  quoteToken: string
  explanations: Array<{ code: string; label: string; amount: number; refundable: boolean; reason: string }>
}

async function withIdempotency<T>(
  scope: string,
  resourceId: string,
  run: (headers: Record<string, string>) => Promise<T>,
): Promise<T> {
  const key = beginIdempotencyKey(scope, resourceId)
  try {
    return await run({ 'Idempotency-Key': key })
  } finally {
    // 终态后换新：成功/失败都释放槽位；同一次调用内的 axios 重试仍复用 key
    endIdempotencyKey(scope, resourceId)
  }
}

export const orderApi = {
  create(demandId: string, applicationId: string) {
    return api.post('/orders', { demandId, applicationId })
  },
  list(params?: { role?: string; page?: number }) {
    return api.get('/orders', { params })
  },
  get(id: string) {
    return api.get(`/orders/${id}`)
  },
  feeQuote(id: string, action: FeeQuoteAction) {
    return api.get(`/orders/${id}/fee-quote`, { params: { action } })
  },
  prepay(id: string, quoteToken?: string) {
    return withIdempotency('ORDER_PREPAY', id, (headers) =>
      api.post(`/orders/${id}/prepay`, undefined, { headers: { ...headers, ...(quoteToken ? { 'Fee-Quote-Token': quoteToken } : {}) } }),
    )
  },
  complete(id: string) {
    return api.post(`/orders/${id}/complete`)
  },
  confirm(id: string, quoteToken?: string) {
    return withIdempotency('ORDER_CONFIRM', id, (headers) =>
      api.post(`/orders/${id}/confirm`, undefined, { headers: { ...headers, ...(quoteToken ? { 'Fee-Quote-Token': quoteToken } : {}) } }),
    )
  },
  dispute(id: string) {
    return api.post(`/orders/${id}/dispute`)
  },
  cancel(id: string, quoteToken?: string) {
    return withIdempotency('ORDER_CANCEL', id, (headers) =>
      api.post(`/orders/${id}/cancel`, undefined, { headers: { ...headers, ...(quoteToken ? { 'Fee-Quote-Token': quoteToken } : {}) } }),
    )
  },
  partial(id: string, newPrice: number, description: string) {
    return api.post(`/orders/${id}/partial`, { newPrice, description })
  },
  acceptPartial(id: string, quoteToken?: string) {
    return withIdempotency('ORDER_PARTIAL_ACCEPT', id, (headers) =>
      api.post(`/orders/${id}/partial/accept`, undefined, { headers: { ...headers, ...(quoteToken ? { 'Fee-Quote-Token': quoteToken } : {}) } }),
    )
  },
  rejectPartial(id: string) {
    return api.post(`/orders/${id}/partial/reject`)
  },
  withdrawPartial(id: string) {
    return api.post(`/orders/${id}/partial/withdraw`)
  },
}
