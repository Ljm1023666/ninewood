import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { poolApi } from '@/api/pool'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SegmentedFilter,
  TransactionListItem,
} from '@/components/layout/internal-ui'

const BID_TABS = [
  { value: 'all' as const, label: '全部' },
  { value: 'PENDING' as const, label: '竞标中' },
  { value: 'ACCEPTED' as const, label: '已中标' },
]

interface BidItem {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  offerPrice?: number
  createdAt: string
  demand?: {
    id: string
    title: string
    minPrice: number
    serviceType: string
  }
}

export default function MyBids() {
  const navigate = useNavigate()
  const [bids, setBids] = useState<BidItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBids = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await poolApi.getMyBids(1, 50)
      setBids(res.data.data.applications)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBids()
  }, [fetchBids])

  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACCEPTED'>('all')

  const filteredBids =
    filter === 'all' ? bids : bids.filter((b) => b.status === filter)

  return (
    <InternalPageShell width="medium">
      <PageHeader title="我的应标" onBack="back" />

      <InternalContentBlock>
        <SegmentedFilter options={[...BID_TABS]} value={filter} onChange={setFilter} />

      {loading && <LoadingState variant="internal" lines={3} />}

      {!loading && error && <ErrorState message={error} onRetry={fetchBids} />}

      {!loading && !error && filteredBids.length === 0 && (
        <EmptyState
          type="search"
          variant="internal"
          message="还没有发出过应标，去发现页寻找合适的需吧"
          actionLabel="去发现"
          onAction={() => navigate('/')}
        />
      )}

      {!loading && !error && filteredBids.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredBids.map((bid) => (
            <TransactionListItem
              key={bid.id}
              title={bid.demand?.title || '未知需求'}
              status={bid.status}
              date={
                bid.createdAt
                  ? new Date(bid.createdAt).toLocaleDateString('zh-CN')
                  : undefined
              }
              price={bid.offerPrice ?? bid.demand?.minPrice ?? 0}
              completed={bid.status === 'ACCEPTED'}
              onClick={() => {
                if (bid.demand?.id) navigate(`/demands/${bid.demand.id}`)
              }}
            />
          ))}
        </div>
      )}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
