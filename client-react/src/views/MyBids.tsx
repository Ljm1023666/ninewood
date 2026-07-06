import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { poolApi } from '@/api/pool'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import {
  DesktopPageShell,
  DlpGlass,
  DlpBtnGhost,
  DlpBadge,
  DlpEmpty,
} from '@/components/layout/desktop-page'
import { cn } from '@/lib/utils'

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

function bidTone(status: BidItem['status']) {
  if (status === 'ACCEPTED') return 'success' as const
  if (status === 'PENDING') return 'warn' as const
  return 'default' as const
}

function bidLabel(status: BidItem['status']) {
  if (status === 'ACCEPTED') return '已中标'
  if (status === 'PENDING') return '竞标中'
  return '未中标'
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
  const filteredBids = filter === 'all' ? bids : bids.filter((b) => b.status === filter)

  return (
    <DesktopPageShell title="我的应标" subtitle="管理竞标状态与出价记录" density="compact">
      <div className="dlp-tabs">
        {BID_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn('dlp-tab', filter === tab.value && 'dlp-tab--active')}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState variant="internal" lines={3} />}
      {!loading && error && <ErrorState message={error} onRetry={fetchBids} />}

      {!loading && !error && filteredBids.length === 0 && (
        <DlpGlass>
          <DlpEmpty
            title="还没有应标记录"
            description="去发现页寻找合适的需求吧"
            action={
              <button type="button" className="dlp-btn-primary" onClick={() => navigate('/')}>
                去发现
              </button>
            }
          />
        </DlpGlass>
      )}

      {!loading && !error && filteredBids.length > 0 && (
        <DlpGlass>
          <div className="dlp-table-wrap">
            <table className="dlp-table">
              <thead>
                <tr>
                  <th>需求标题</th>
                  <th>出价</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBids.map((bid) => (
                  <tr key={bid.id}>
                    <td>
                      <p className="dlp-table__primary">{bid.demand?.title || '未知需求'}</p>
                      {bid.demand?.serviceType ? (
                        <p className="dlp-table__muted mt-1">{bid.demand.serviceType}</p>
                      ) : null}
                    </td>
                    <td className="dlp-table__gold">
                      ¥{bid.offerPrice ?? bid.demand?.minPrice ?? 0}
                    </td>
                    <td>
                      <DlpBadge tone={bidTone(bid.status)}>{bidLabel(bid.status)}</DlpBadge>
                    </td>
                    <td className="dlp-table__muted whitespace-nowrap">
                      {bid.createdAt
                        ? new Date(bid.createdAt).toLocaleDateString('zh-CN')
                        : '—'}
                    </td>
                    <td>
                      {bid.demand?.id ? (
                        <DlpBtnGhost onClick={() => navigate(`/demands/${bid.demand!.id}`)}>
                          查看
                        </DlpBtnGhost>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DlpGlass>
      )}
    </DesktopPageShell>
  )
}
