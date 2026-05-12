import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

const roleLabel: Record<string, string> = { OWNER: '圈主', ADMIN: '管理', MEMBER: '成员' }
const statusMap: Record<string, { label: string; cls: string }> = { ACTIVE: { label: '活跃', cls: 'text-emerald-400 bg-emerald-500/15' }, WARNING: { label: '警告', cls: 'text-amber-400 bg-amber-500/15' }, DEFUNCT: { label: '失效', cls: 'text-red-400 bg-red-500/15' } }

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useUserStore((s) => s.user?.id)
  const isDark = useThemeStore((s) => s.current.dark)
  const [circle, setCircle] = useState<any>(null)
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [joining, setJoining] = useState(false)

  const isMember = circle?.members?.some((m: any) => m.userId === userId)

  async function fetchAll() {
    if (!id) return; setLoading(true); setError('')
    try {
      const [cRes, dRes] = await Promise.all([circleApi.get(id), circleApi.getDemands(id)])
      setCircle(cRes.data.data); setDemands(dRes.data.data?.demands || [])
    } catch (e: any) { setError(e.response?.data?.message || '加载失败') }
    finally { setLoading(false) }
  }

  async function joinCircle() { if (!circle) return; setJoining(true); try { await circleApi.join(circle.id); fetchAll() } catch {} finally { setJoining(false) } }

  useEffect(() => { fetchAll() }, [id])

  if (loading) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-text-muted">加载中...</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
        <div className="flex flex-1 flex-col items-center justify-center py-16">
          <p className="text-sm text-text-muted">{error}</p>
          <button type="button" onClick={fetchAll} className="mt-3 text-sm text-accent">
            重试
          </button>
        </div>
      </div>
    )
  }
  if (!circle) return null

  const st = statusMap[circle.status] || statusMap.ACTIVE

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
      <div className="relative z-10 box-border flex w-full max-w-[560px] shrink-0 self-center flex-col p-4">
        <div className="w-full h-[180px] rounded-2xl bg-cover bg-center relative mb-4" style={circle.coverUrl ? { backgroundImage: `url(${circle.coverUrl})` } : isDark ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))' } : { background: 'linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.01))' }}>
          <span className={`absolute top-3 right-3 px-3 py-1 rounded-md text-[10px] font-bold tracking-[1px] backdrop-blur ${st.cls}`}>{st.label}</span>
        </div>
        <div className="text-center pb-5">
          <h1 className="text-2xl font-black mb-2.5">{circle.name}</h1>
          <div className="flex justify-center gap-4 text-[13px] text-text-muted">
            <span>{circle.type === 'PUBLIC' ? '公开圈' : '私密圈'}</span><span>圈主 {circle.owner?.nickname}</span><span>{circle._count?.members || 0} 人</span>
          </div>
          {circle.status === 'WARNING' && <p className="mt-3 text-[13px] text-amber-400">⚠️ 活跃度较低</p>}
          {circle.status === 'DEFUNCT' && <p className="mt-3 text-[13px] text-red-400">❌ 圈子已失效</p>}
        </div>

        <div className="flex rounded-xl overflow-hidden border border-border mb-5">
          {!isMember && <div className="flex-1 py-[11px] flex items-center justify-center gap-1.5 text-[13px] text-text-muted font-medium"><span>🔒</span><span>仅限邀请加入</span></div>}
          <button onClick={() => setShowMembers(!showMembers)} className="flex-1 py-[11px] border-none bg-transparent text-text-secondary text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-bg-tertiary hover:text-text-primary"><User size={17} /> {showMembers ? '收起' : `成员(${circle._count?.members || 0})`}</button>
        </div>

        {showMembers && circle.members && <div className="rounded-xl overflow-hidden border border-border mb-6 bg-card">
          {circle.members.map((m: any) => (
            <div key={m.userId} onClick={() => navigate(`/profile/${m.userId}`)} className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-bg-secondary border-t border-border first:border-t-0">
              <div className={cn('w-[34px] h-[34px] rounded-[10px] overflow-hidden flex items-center justify-center text-sm font-bold flex-shrink-0', isDark ? 'text-white bg-gradient-to-br from-white/8 to-white/[0.03]' : 'text-text-primary bg-gradient-to-br from-black/[0.06] to-black/[0.02]')}>
                {m.user?.avatarUrl ? <img src={m.user.avatarUrl} className="w-full h-full object-cover" /> : m.user?.nickname?.charAt(0)}
              </div>
              <div className="flex-1"><span className="text-sm">{m.user?.nickname}</span></div>
              <span className="text-xs text-text-muted font-medium">{roleLabel[m.role] || m.role}</span>
            </div>
          ))}
        </div>}

        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-3.5"><h2 className="text-lg font-extrabold">圈内需求</h2>{isMember && <button onClick={() => navigate(`/demands/create?circleId=${circle.id}`)} className="text-accent text-sm font-semibold">+ 发布</button>}</div>
          {demands.length > 0 ? <div className="flex flex-col gap-2">
            {demands.map((d: any) => (
              <div key={d.id} onClick={() => navigate(`/demands/${d.id}`)} className="p-3.5 px-4 rounded-xl bg-card border border-border cursor-pointer hover:border-accent/30">
                <div className="flex justify-between items-center mb-1.5"><h3 className="text-[15px] font-semibold">{d.title}</h3><span className="text-[15px] font-bold text-accent">¥{d.minPrice}</span></div>
                <div className="flex gap-3 text-xs text-text-muted"><span>{d.category}</span><span>{d.serviceType === 'ONLINE' ? '线上' : '线下'}</span><span>{d.applicantCount || 0} 人申请</span></div>
              </div>
            ))}
          </div> : <p className="text-center py-8 text-text-muted text-sm">暂无需求</p>}
        </section>
      </div>
    </div>
  )
}
