import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandApi } from '@/api/demand'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const sMap: Record<string, string> = { PENDING: '待接单', FROZEN: '已冻结', COMPLETED: '已完成', CLOSED: '已关闭' }
const aMap: Record<string, string> = { PENDING: '待审核', ACCEPTED: '已通过', REJECTED: '已拒绝' }

export default function MyDemands() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'demands' | 'applications'>('demands')
  const [demands, setDemands] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true); setError('')
    try {
      if (tab === 'demands') { const r = await demandApi.myDemands(); setDemands(r.data.data) }
      else { const r = await demandApi.myApplications(); setApplications(r.data.data) }
    } catch (e: any) { setError(e.response?.data?.message || '加载失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [tab])

  async function doDelete() { if (!deleteId) return; try { await demandApi.deleteDemand(deleteId); setDeleteId(null); fetchData() } catch {} }

  return (
    <div className="h-full overflow-y-auto thin-scroll bg-bg-primary p-5 max-w-3xl mx-auto">
      <div className="flex gap-2 mb-4">
        {[{ k: 'demands' as const, l: '我的需求' }, { k: 'applications' as const, l: '我的申请' }].map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t.k ? 'bg-[var(--primary-gradient)] text-white' : 'bg-card border border-border text-text-secondary'}`}>{t.l}</button>)}
      </div>
      {error && <div className="text-center py-16"><p className="text-text-muted text-sm">{error}</p><button onClick={fetchData} className="mt-3 text-accent text-sm">重试</button></div>}
      {loading && <div className="text-center py-16 text-text-muted text-sm">加载中...</div>}
      <div className="flex flex-col gap-2">
        {tab === 'demands' ? demands.map((d: any) => (
          <div key={d.id} onClick={() => navigate(`/demands/${d.id}`)} className="relative overflow-hidden rounded-xl border border-border bg-card backdrop-blur-sm cursor-pointer hover:bg-bg-tertiary hover:border-accent/50 hover:shadow-[4px_0_0_var(--primary-start)] hover:translate-x-1 active:scale-[0.98] transition-all duration-300 p-4">
            <div className="flex justify-between items-center"><span className="font-semibold">{d.title}</span><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg-secondary text-text-muted">{sMap[d.status] || d.status}</span></div>
            <div className="flex justify-between mt-2 text-[13px] text-text-secondary"><span>{d.applicantCount || 0} 人申请</span><span>¥{d.minPrice}</span></div>
            {d.status === 'FROZEN' && <button onClick={e => { e.stopPropagation(); setDeleteId(d.id) }} className="mt-2 text-xs text-red-400 hover:text-red-300">删除</button>}
          </div>
        )) : applications.map((a: any) => (
          <div key={a.id} onClick={() => navigate(`/demands/${a.demand?.id}`)} className="relative overflow-hidden rounded-xl border border-border bg-card backdrop-blur-sm cursor-pointer hover:bg-bg-tertiary hover:border-accent/50 hover:shadow-[4px_0_0_var(--primary-start)] hover:translate-x-1 active:scale-[0.98] transition-all duration-300 p-4">
            <div className="flex justify-between items-center"><span className="font-semibold">{a.demand?.title}</span><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg-secondary text-text-muted">{aMap[a.status] || a.status}</span></div>
            <div className="flex justify-between mt-2 text-[13px] text-text-secondary"><span>¥{a.offerPrice || a.demand?.minPrice}</span><span>{a.demand?.serviceType === 'ONLINE' ? '线上' : '线下'}</span></div>
          </div>
        ))}
        {!loading && ((tab === 'demands' && demands.length === 0) || (tab === 'applications' && applications.length === 0)) && <div className="text-center py-16 text-text-muted text-sm">暂无数据</div>}
      </div>

      <ConfirmDialog open={!!deleteId} title="删除需求" message="确定删除这个需求吗？" confirmLabel="删除" onConfirm={doDelete} onCancel={() => setDeleteId(null)} />
    </div>
  )
}
