import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react'
import { demandApi } from '@/api/demand'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ListItemCard } from '@/components/ui/list-item-card'
import { cn } from '@/lib/utils'

const sMap: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  PENDING: {
    label: '待接单',
    icon: Clock,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  FROZEN: {
    label: '已冻结',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  COMPLETED: {
    label: '已完成',
    icon: CheckCircle2,
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  CLOSED: {
    label: '已关闭',
    icon: X,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
}
const aMap: Record<
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

function StatusBadge({ status, map }: { status: string; map: typeof sMap }) {
  const config = map[status] || {
    label: status,
    icon: Clock,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

function DemandCard({
  d,
  onDelete,
}: {
  d: any
  onDelete?: (id: string) => void
}) {
  const navigate = useNavigate()

  return (
    <ListItemCard onClick={() => navigate(`/demands/${d.id}`)} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-text-primary truncate">
              {d.title}
            </h3>
            <StatusBadge status={d.status} map={sMap} />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <FileText className="size-4 opacity-60" />
              {d.applicantCount || 0} 人申请
            </span>
            <span className="font-medium text-[var(--primary-start)]">
              ¥{d.minPrice}
            </span>
          </div>
        </div>
        <ArrowRight className="size-5 shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {d.status === 'FROZEN' && onDelete && (
        <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(d.id)
            }}
          >
            <Trash2 className="size-3.5" />
            删除
          </Button>
        </div>
      )}
    </ListItemCard>
  )
}

function ApplicationCard({ a }: { a: any }) {
  const navigate = useNavigate()

  return (
    <ListItemCard
      onClick={() => navigate(`/demands/${a.demand?.id}`)}
      className="p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-text-primary truncate">
              {a.demand?.title}
            </h3>
            <StatusBadge status={a.status} map={aMap} />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="font-medium text-[var(--primary-start)]">
              ¥{a.offerPrice || a.demand?.minPrice}
            </span>
            <span className="flex items-center gap-1.5 text-text-muted">
              {a.demand?.serviceType === 'ONLINE' ? '线上' : '线下'}
            </span>
          </div>
        </div>
        <ArrowRight className="size-5 shrink-0 text-text-muted" />
      </div>
    </ListItemCard>
  )
}

function EmptyState({ type }: { type: 'demands' | 'applications' }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="size-16 rounded-2xl bg-gradient-to-br from-[var(--primary-start)]/20 to-[var(--primary-end)]/20 flex items-center justify-center mb-4">
        <FileText className="size-8 text-[var(--primary-start)] opacity-60" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">
        {type === 'demands' ? '暂无发布需求' : '暂无申请记录'}
      </h3>
      <p className="text-sm text-text-muted text-center max-w-xs">
        {type === 'demands'
          ? '还没有发布任何需求，点击下方按钮开始发布第一条需求'
          : '还没有申请过任何需求，去发现页看看吧'}
      </p>
      {type === 'demands' && (
        <Button
          type="button"
          className="mt-4 gap-2"
          onClick={() => navigate('/demands/create')}
        >
          发布需求
          <ArrowRight className="size-4" />
        </Button>
      )}
    </motion.div>
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

  const tabs = [
    { k: 'demands' as const, l: '我的需求', count: demands.length },
    { k: 'applications' as const, l: '我的申请', count: applications.length },
  ]

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-2xl shrink-0 flex-col px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">我的需求</h1>
            <p className="text-sm text-text-muted mt-0.5">
              管理您发布和申请的需求
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate('/demands/create')}
          >
            发布需求
          </Button>
        </div>

        <div className="relative mb-6 flex gap-1 rounded-xl bg-bg-secondary/80 p-1">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn(
                'relative flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                tab === t.k
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {tab === t.k && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm"
                  transition={{ type: 'spring', duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t.l}
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full transition-colors',
                    tab === t.k
                      ? 'bg-[var(--primary-start)]/20 text-[var(--primary-start)]'
                      : 'bg-bg-tertiary text-text-muted',
                  )}
                >
                  {t.count}
                </span>
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
              <XCircle className="size-6 text-red-400" />
            </div>
            <p className="text-sm text-text-muted mb-3">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchData}
            >
              重试
            </Button>
          </div>
        )}

        {!error && loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-8 text-[var(--primary-start)] animate-spin mb-3" />
            <p className="text-sm text-text-muted">加载中...</p>
          </div>
        )}

        {!error && !loading && tab === 'demands' && demands.length === 0 && (
          <EmptyState type="demands" />
        )}

        {!error &&
          !loading &&
          tab === 'applications' &&
          applications.length === 0 && <EmptyState type="applications" />}

        <AnimatePresence mode="wait">
          {!error && !loading && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {tab === 'demands'
                ? demands.map((d) => (
                    <DemandCard
                      key={d.id}
                      d={d}
                      onDelete={d.status === 'FROZEN' ? setDeleteId : undefined}
                    />
                  ))
                : applications.map((a) => <ApplicationCard key={a.id} a={a} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="删除需求"
        message="确定删除这个冻结中的需求吗？此操作不可撤销。"
        confirmLabel="删除"
        onConfirm={doDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
