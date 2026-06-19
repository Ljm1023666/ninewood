import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SegmentedFilter,
  TransactionListItem,
} from '@/components/layout/internal-ui'

const ROLE_TABS = [
  { value: '', label: '全部' },
  { value: 'provider', label: '我接的单' },
  { value: 'requester', label: '我发的单' },
] as const

export default function Orders() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await orderApi.list({ role: role || undefined })
      setOrders(res.data.data?.orders || [])
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <InternalPageShell width="medium">
      <PageHeader title="我的订单" onBack="back" />

      <InternalContentBlock>
        <SegmentedFilter
          options={[...ROLE_TABS]}
          value={role as (typeof ROLE_TABS)[number]['value']}
          onChange={setRole}
        />

        {error ? <ErrorState message={error} onRetry={fetchOrders} /> : null}

        {loading ? <LoadingState variant="internal" lines={3} /> : null}

        {!error && !loading && orders.length === 0 ? (
          <EmptyState type="order" variant="internal" />
        ) : null}

        {!error && !loading && orders.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {orders.map((o: any) => (
              <TransactionListItem
                key={o.id}
                title={o.demand?.title || '订单'}
                status={o.status}
                date={
                  o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString('zh-CN')
                    : undefined
                }
                price={o.agreedPrice ?? 0}
                completed={o.status === 'COMPLETED'}
                onClick={() => navigate(`/orders/${o.id}`)}
              />
            ))}
          </div>
        ) : null}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
