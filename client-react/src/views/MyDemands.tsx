import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { demandApi } from '@/api/demand'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ListItemCard } from '@/components/ui/list-item-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SegmentedFilter,
  StatusChip,
  TransactionListItem,
  SettingsActionButton,
} from '@/components/layout/internal-ui'

function DemandCard({
  d,
  onDelete,
}: {
  d: any
  onDelete?: (id: string) => void
}) {
  const navigate = useNavigate()

  return (
    <ListItemCard
      variant="internal"
      onClick={() => navigate(`/demands/${d.id}`)}
      className="p-4"
    >
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-wide text-text-primary">
            {d.title}
          </h2>
          <StatusChip status={d.status} />
        </div>
        <div className="flex items-end justify-between">
          <span className="flex items-center gap-1 font-mono text-sm text-text-secondary">
            <MsIcon name={STITCH_PAGE_ICONS['my-demands']} size={16} className="opacity-60" />
            {d.applicantCount || 0} 人申请
          </span>
          <span className="font-mono text-lg font-semibold text-[var(--internal-accent)]">
            ¥{d.minPrice}
          </span>
        </div>
      </div>
      {(d.status === 'FROZEN' || d.status === 'WITHDRAWN') && onDelete && (
        <div
          className="relative z-[1] mt-3 flex justify-end border-t border-[var(--internal-hairline)] pt-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SettingsActionButton variant="danger" onClick={() => onDelete(d.id)}>
            <MsIcon name="delete" size={14} className="mr-1 inline" />
            删除
          </SettingsActionButton>
        </div>
      )}
    </ListItemCard>
  )
}

function ApplicationCard({ a }: { a: any }) {
  const navigate = useNavigate()

  return (
    <TransactionListItem
      title={a.demand?.title || '未知需求'}
      status={a.status}
      date={
        a.createdAt
          ? new Date(a.createdAt).toLocaleDateString('zh-CN')
          : undefined
      }
      price={a.offerPrice || a.demand?.minPrice || 0}
      completed={a.status === 'ACCEPTED'}
      onClick={() => navigate(`/demands/${a.demand?.id}`)}
    />
  )
}

export default function MyDemands() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'demands' | 'applications'>('demands')
  const [demands, setDemands] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'demands') {
        const r = await demandApi.myDemands()
        setDemands(r.data.data.demands)
      } else {
        const r = await demandApi.myApplications()
        setApplications(r.data.data.applications)
      }
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function doDelete() {
    if (!deleteId) return
    try {
      await demandApi.deleteDemand(deleteId)
      setDeleteId(null)
      fetchData()
    } catch {
      /* noop */
    }
  }

  const tabOptions = [
    { value: 'demands' as const, label: `我的需求 (${demands.length})` },
    { value: 'applications' as const, label: `我的申请 (${applications.length})` },
  ]

  return (
    <InternalPageShell width="medium">
      <PageHeader title="我的需求" onBack="back" />

      <SegmentedFilter options={tabOptions} value={tab} onChange={setTab} />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {!error && loading && <LoadingState variant="internal" lines={4} />}

      {!error && !loading && tab === 'demands' && demands.length === 0 && (
        <EmptyState
          type="demand"
          variant="internal"
          message="还没有发布任何需求，点击下方按钮开始发布第一条需求"
          actionLabel="发布需求"
          onAction={() => navigate('/demands/create')}
        />
      )}

      {!error &&
        !loading &&
        tab === 'applications' &&
        applications.length === 0 && (
          <EmptyState
            type="search"
            variant="internal"
            message="还没有申请过任何需求，去发现页看看吧"
            actionLabel="去发现"
            onAction={() => navigate('/')}
          />
        )}

      {!error && !loading && (
        <div className="flex flex-col gap-3">
          {tab === 'demands'
            ? demands.map((d) => (
                <DemandCard
                  key={d.id}
                  d={d}
                  onDelete={d.status === 'FROZEN' ? setDeleteId : undefined}
                />
              ))
            : applications.map((a) => <ApplicationCard key={a.id} a={a} />)}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="删除需求"
        message="确定删除这个冻结中的需求吗？此操作不可撤销。"
        confirmLabel="删除"
        onConfirm={doDelete}
        onCancel={() => setDeleteId(null)}
      />
    </InternalPageShell>
  )
}
