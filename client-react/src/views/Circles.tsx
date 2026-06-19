import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { Users, Plus } from 'lucide-react'

const roleLabel: Record<string, string> = { OWNER: '圈主', ADMIN: '管理', MEMBER: '成员' }

export default function Circles() {
  const navigate = useNavigate()
  const [circles, setCircles] = useState<any[]>([])
  const [myCircles, setMyCircles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })

  async function fetchCircles() {
    setLoading(true); setError('')
    try {
      const [pub, my] = await Promise.all([circleApi.list(), circleApi.my()])
      setCircles(pub.data.data)
      setMyCircles(my.data.data)
    } catch (e: any) { setError(e.response?.data?.message || '加载失败') }
    finally { setLoading(false) }
  }

  async function createCircle() {
    if (!createForm.name.trim()) return
    try { await circleApi.create(createForm); setShowCreate(false); setCreateForm({ name: '', description: '' }); fetchCircles() } catch {}
  }

  useEffect(() => { fetchCircles() }, [])

  const gridBg = { backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px' }

  return (
    <div className="h-full w-full overflow-y-auto thin-scroll bg-bg-primary max-w-5xl mx-auto" style={gridBg}>
      {error && <div className="text-center py-16"><p className="text-text-muted text-sm">{error}</p><button onClick={fetchCircles} className="mt-3 text-accent text-sm">重试</button></div>}
      {loading && <div className="text-center py-16 text-text-muted text-sm">加载中...</div>}

      {!loading && !error && <>
        <section className="px-7 py-11 md:px-10 md:py-14">
          <span className="text-[11px] font-bold tracking-[6px] text-text-muted block mb-3">CIRCLES</span>
          <h1 className="text-[38px] font-black tracking-[-0.5px] mb-2 md:text-[44px]">需求圈</h1>
          <p className="text-base text-text-secondary mb-5">加入圈子，与同行交流，高效协作</p>
          <button onClick={() => setShowCreate(true)} className="px-[22px] py-2.5 rounded-[10px] border-none bg-white text-black text-sm font-semibold flex items-center gap-1.5 hover:opacity-85"><Plus size={18} /> 创建圈子</button>
        </section>

        {myCircles.length > 0 && <section className="px-5 pb-7">
          <h2 className="text-xl font-extrabold tracking-[1px] mb-4">我的圈子</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {myCircles.map((m: any) => (
              <div key={m.circleId} onClick={() => navigate(`/circles/${m.circle?.id}`)} className="rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:border-accent hover:shadow-lg transition-all duration-[0.35s]">
                <div className="h-[68px] flex items-center justify-center relative bg-gradient-to-br from-white/4 to-white/[0.01]" style={m.circle?.coverUrl ? { backgroundImage: `url(${m.circle.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!m.circle?.coverUrl && <span className="text-[22px] font-extrabold text-white/15 tracking-[2px]">{m.circle?.name?.charAt(0)}</span>}
                  <span className="absolute top-2 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-[#a5b4fc] tracking-[1px]">{roleLabel[m.role]}</span>
                </div>
                <div className="px-3.5 py-3"><h3 className="text-sm font-bold truncate mb-1">{m.circle?.name}</h3><span className="text-xs text-text-muted flex items-center gap-1"><Users size={13} /> {m.circle?._count?.members || 1} 人</span></div>
              </div>
            ))}
          </div>
        </section>}

        <section className="px-5 pb-7">
          <div className="flex items-baseline justify-between mb-4"><h2 className="text-xl font-extrabold tracking-[1px]">发现圈子</h2>{circles.length > 0 && <span className="text-[13px] text-text-muted">{circles.length} 个公开圈</span>}</div>
          {circles.length > 0 ? <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {circles.map((c: any) => (
              <div key={c.id} onClick={() => navigate(`/circles/${c.id}`)} className="rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:border-accent hover:shadow-lg transition-all duration-[0.35s]">
                <div className="h-[68px] flex items-center justify-center relative bg-gradient-to-br from-white/4 to-white/[0.01]" style={c.coverUrl ? { backgroundImage: `url(${c.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!c.coverUrl && <span className="text-[22px] font-extrabold text-white/15 tracking-[2px]">{c.name?.charAt(0)}</span>}
                  <span className="absolute top-2 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/12 text-[#34d399]">公开</span>
                </div>
                <div className="px-3.5 py-3"><h3 className="text-sm font-bold truncate mb-1">{c.name}</h3><span className="text-xs text-text-muted flex items-center gap-1"><Users size={13} /> {c._count?.members || 0} 人</span></div>
              </div>
            ))}
          </div> : <p className="py-5 text-center text-text-muted text-sm">暂无公开圈子</p>}
        </section>
      </>}

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
        <div className="bg-bg-secondary rounded-2xl p-6 w-[90%] max-w-sm border border-border" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-4">创建圈子</h3>
          <div className="flex flex-col gap-3">
            <input value={createForm.name} onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="圈子名称" className="bg-card border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm outline-none" />
            <textarea value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="简介（可选）" rows={3} className="bg-card border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm outline-none resize-none" />
            <button onClick={createCircle} className="w-full py-2.5 rounded-lg bg-[var(--primary-gradient)] text-white font-semibold text-sm">创建</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
