import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SegmentedFilter,
  StatusChip,
} from '@/components/layout/internal-ui'
import { ListItemCard } from '@/components/ui/list-item-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import api from '@/api'

interface TransactionItem {
  id: string
  demandId: string
  demandTitle: string
  role: 'DEMANDER' | 'PROVIDER'
  minPrice: number
  finalPrice: number
  serviceFee: number
  demanderPaid: number
  providerReceived: number
  platformRevenue: number
  depositReturned: number
  isWelfare: boolean
  createdAt: string
}

type FilterTab = 'all' | 'income' | 'expense'

function netAmount(item: TransactionItem) {
  if (item.role === 'DEMANDER') {
    return item.demanderPaid - item.depositReturned
  }
  return item.providerReceived
}

export default function TransactionHistory() {
  const [items, setItems] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<FilterTab>('all')

  async function load(pageNum = 1) {
    setLoading(true)
    try {
      const r = await api.get('/transactions/history', {
        params: { page: pageNum, limit: 20 },
      })
      setItems(r.data?.data?.items || [])
      setTotalPages(r.data?.data?.totalPages || 1)
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function goPage(p: number) {
    setPage(p)
    void load(p)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'income') {
      return items.filter((item) => item.role === 'PROVIDER')
    }
    return items.filter((item) => item.role === 'DEMANDER')
  }, [filter, items])

  return (
    <InternalPageShell width="medium">
      <PageHeader
        title="交易历史"
        subtitle="查看所有已完成交易的明细"
        onBack="back"
      />

      <InternalContentBlock>
        <SegmentedFilter
          options={[
            { value: 'all', label: '全部' },
            { value: 'income', label: '收入' },
            { value: 'expense', label: '支出' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {loading ? <LoadingState variant="internal" lines={3} /> : null}

        {!loading && filtered.length === 0 ? (
          <EmptyState variant="internal" type="order" message="暂无交易记录" />
        ) : null}

        {!loading && filtered.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {filtered.map((item) => {
              const amount = netAmount(item)
              const isExpense = item.role === 'DEMANDER'
              return (
                <ListItemCard
                  key={item.id}
                  variant="internal"
                  clickable={false}
                  className="p-4 opacity-90"
                >
                  <div className="relative z-[1] flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-wide text-text-primary">
                        {item.demandTitle}
                      </h2>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {item.isWelfare ? (
                          <StatusChip
                            label="公益"
                            className="border-red-500/30 bg-red-500/20 text-red-400"
                          />
                        ) : null}
                        <StatusChip
                          label="已结算"
                          className="border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                        />
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <span className="flex items-center gap-1 text-sm text-text-secondary">
                        <MsIcon name="calendar_today" size={16} className="opacity-70" aria-hidden />
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      <span
                        className={cn(
                          'font-mono text-lg font-semibold',
                          isExpense ? 'text-red-400' : 'text-emerald-400',
                        )}
                      >
                        {isExpense ? '-' : '+'}¥{amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--internal-hairline)] pt-2 font-mono text-xs text-text-muted">
                      <span>成交金额</span>
                      <span className="text-right text-text-secondary">
                        ¥{item.finalPrice.toFixed(2)}
                      </span>
                      <span>平台服务费</span>
                      <span className="text-right">¥{item.serviceFee.toFixed(2)}</span>
                      {item.depositReturned > 0 ? (
                        <>
                          <span>押金退回</span>
                          <span className="text-right text-emerald-400">
                            +¥{item.depositReturned.toFixed(2)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </ListItemCard>
              )
            })}
          </div>
        ) : null}

        {!loading && totalPages > 1 ? (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goPage(i + 1)}
                className={cn(
                  'rounded px-3 py-1 font-mono text-xs transition-colors',
                  page === i + 1
                    ? 'bg-[var(--internal-accent)]/20 text-[var(--internal-accent)]'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
