import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import {
  AdminPanel,
  AdminEmpty,
  AdminList,
  AdminListRow,
  AdminStatusBadge,
} from './admin-ui'
import { toast } from '@/components/ui/confirm-dialog'
import api from '@/api'
import { STATUS_LABELS } from './use-admin-data'

interface Dispute {
  id: string
  status: string
  agreedPrice: number
  provider?: { id: string; nickname: string }
  requester?: { id: string; nickname: string }
  demand?: { id: string; title: string }
  createdAt: string
  completedAt: string | null
}

export default function AdminDisputesTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/disputes')
      setDisputes((r.data as any)?.data || [])
    } catch (e: any) {
      toast(e?.response?.data?.message || '加载争议失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function resolve(id: string, action: 'refund' | 'complete') {
    if (busyId) return
    setBusyId(id)
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { action })
      toast(action === 'complete' ? '已裁决：订单完成' : '已裁决：订单退款', 'success')
      load()
    } catch (e: any) {
      toast(e?.response?.data?.message || '裁决失败', 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-12 border border-[var(--admin-hairline)] bg-white" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse h-16 border border-[var(--admin-hairline)] bg-white" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="font-[family-name:var(--admin-mono)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
        争议中订单
      </p>

      <AdminPanel
        id="admin-section-disputes"
        title="等待裁决"
        description={`共 ${disputes.length} 条需处理的争议订单`}
        noPadding
        bodyClassName="p-0"
      >
        {disputes.length === 0 ? (
          <div className="p-5">
            <AdminEmpty title="暂无争议订单" description="当前所有订单状态正常" />
          </div>
        ) : (
          <AdminList>
            {disputes.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-2 border-b border-[var(--admin-hairline)] px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                      {d.demand?.title || '—'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--admin-text-muted)]">
                      {d.provider?.nickname} · {d.requester?.nickname} · ¥{d.agreedPrice?.toFixed(2)} · {d.createdAt ? new Date(d.createdAt).toLocaleString('zh-CN') : '—'}
                    </p>
                  </div>
                  <AdminStatusBadge
                    label={STATUS_LABELS[d.status] || d.status}
                    status={d.status}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => resolve(d.id, 'refund')}
                    className="inline-flex items-center gap-1 border border-[var(--admin-hairline)] bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="size-3" />
                    退款关闭
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => resolve(d.id, 'complete')}
                    className="inline-flex items-center gap-1 border border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--admin-accent)] transition-colors hover:bg-[var(--admin-accent)]/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3" />
                    完成放款
                  </button>
                </div>
              </div>
            ))}
          </AdminList>
        )}
      </AdminPanel>
    </div>
  )
}
