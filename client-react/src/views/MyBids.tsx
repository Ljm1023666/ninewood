import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, CheckCircle2, XCircle, ArrowRight, Coins } from 'lucide-react'
import { poolApi } from '@/api/pool'
import { ListItemCard } from '@/components/ui/list-item-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

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

const statusMap: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  PENDING: {
    label: '待审核',
    icon: Clock,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  ACCEPTED: {
    label: '已通过',
    icon: CheckCircle2,
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  REJECTED: {
    label: '已拒绝',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] || {
    label: status,
    icon: Clock,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium',
        config.className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
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

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-text-primary">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-2xl shrink-0 flex-col self-center">
        <div className="shrink-0 px-4 pt-6 pb-4 sm:px-6">
          <PageHeader
            title="我的应标"
            subtitle="你向需求发出的应标记录"
          />
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          {loading && <LoadingState lines={4} />}

          {!loading && error && <ErrorState message={error} onRetry={fetchBids} />}

          {!loading && !error && bids.length === 0 && (
            <EmptyState
              type="search"
              message="还没有发出过应标，去发现页寻找合适的需吧"
              actionLabel="去发现"
              onAction={() => navigate('/discover')}
            />
          )}

          {!loading && !error && bids.length > 0 && (
            <div className="flex flex-col gap-3">
              {bids.map((bid) => (
                <BidCard key={bid.id} bid={bid} onClick={() => {
                  if (bid.demand?.id) navigate(`/demands/${bid.demand.id}`)
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BidCard({ bid, onClick }: { bid: BidItem; onClick: () => void }) {
  return (
    <ListItemCard onClick={onClick} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="truncate font-semibold text-text-primary">
              {bid.demand?.title || '未知需求'}
            </h3>
            <StatusBadge status={bid.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5 font-medium text-[var(--primary-start)]">
              <Coins className="size-4 opacity-60" />
              ¥{bid.offerPrice ?? bid.demand?.minPrice ?? '--'}
            </span>
            <span className="text-text-muted">
              {bid.demand?.serviceType === 'ONLINE' ? '线上' : '线下'}
            </span>
            {bid.createdAt && (
              <span className="text-text-muted">
                {new Date(bid.createdAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 text-text-muted" />
      </div>
    </ListItemCard>
  )
}
