import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'
import { Users, Plus } from 'lucide-react'

const roleLabel: Record<string, string> = { OWNER: '圈主', ADMIN: '管理', MEMBER: '成员' }

export default function Circles() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.current.dark)
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

  const gridBg = isDark
    ? { backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px' }
    : { backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }

  return (
    <div
      className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary"
      style={gridBg}
    >
      {error && (
        <div className="flex flex-1 items-center justify-center py-16">
          <div className="text-center">
            <p className="text-text-muted text-sm">{error}</p>
            <button type="button" onClick={fetchCircles} className="mt-3 text-accent text-sm">
              重试
            </button>
          </div>
        </div>
      )}
      {loading && !error && (
        <div className="flex flex-1 items-center justify-center py-16 text-text-muted text-sm">加载中...</div>
      )}

      {!loading && !error && (
        <div className="relative z-10 box-border flex w-full max-w-5xl shrink-0 self-center flex-col px-5 pb-10 pt-11 md:px-10 md:pt-14">
          <section className="mb-2">
            <span className="text-[11px] font-bold tracking-[6px] text-text-muted mb-3 block">CIRCLES</span>
            <h1 className="mb-2 text-[38px] font-black tracking-[-0.5px] md:text-[44px]">需求圈</h1>
            <p className="mb-5 text-base text-text-secondary">加入圈子，与同行交流，高效协作</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-[10px] border-none bg-white px-[22px] py-2.5 text-sm font-semibold text-black hover:opacity-85"
            >
              <Plus size={18} /> 创建圈子
            </button>
          </section>

          {myCircles.length > 0 && (
            <section className="pb-7">
              <h2 className="mb-4 text-xl font-extrabold tracking-[1px]">我的圈子</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {myCircles.map((m: any) => (
              <div key={m.circleId} onClick={() => navigate(`/circles/${m.circle?.id}`)} className="rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:border-accent hover:shadow-lg transition-all duration-[0.35s]">
                <div className={`h-[68px] flex items-center justify-center relative ${isDark ? 'bg-gradient-to-br from-white/4 to-white/[0.01]' : 'bg-gradient-to-br from-black/[0.03] to-black/[0.01]'}`} style={m.circle?.coverUrl ? { backgroundImage: `url(${m.circle.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!m.circle?.coverUrl && <span className={cn('text-[22px] font-extrabold tracking-[2px]', isDark ? 'text-white/15' : 'text-text-muted/30')}>{m.circle?.name?.charAt(0)}</span>}
                  <span className="absolute top-2 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-[#a5b4fc] tracking-[1px]">{roleLabel[m.role]}</span>
                </div>
                <div className="px-3.5 py-3"><h3 className="text-sm font-bold truncate mb-1">{m.circle?.name}</h3><span className="text-xs text-text-muted flex items-center gap-1"><Users size={13} /> {m.circle?._count?.members || 1} 人</span></div>
              </div>
            ))}
              </div>
            </section>
          )}

          <section className="pb-10">
            <div className="mb-4 flex min-w-0 items-baseline justify-between gap-3">
              <h2 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-[1px]">发现圈子</h2>
              {circles.length > 0 && (
                <span className="shrink-0 text-[13px] text-text-muted whitespace-nowrap">{circles.length} 个公开圈</span>
              )}
            </div>
            {circles.length > 0 ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {circles.map((c: any) => (
              <div key={c.id} onClick={() => navigate(`/circles/${c.id}`)} className="rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:border-accent hover:shadow-lg transition-all duration-[0.35s]">
                <div className={`h-[68px] flex items-center justify-center relative ${isDark ? 'bg-gradient-to-br from-white/4 to-white/[0.01]' : 'bg-gradient-to-br from-black/[0.03] to-black/[0.01]'}`} style={c.coverUrl ? { backgroundImage: `url(${c.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!c.coverUrl && <span className={cn('text-[22px] font-extrabold tracking-[2px]', isDark ? 'text-white/15' : 'text-text-muted/30')}>{c.name?.charAt(0)}</span>}
                  <span className="absolute top-2 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/12 text-[#34d399]">公开</span>
                </div>
                <div className="px-3.5 py-3"><h3 className="text-sm font-bold truncate mb-1">{c.name}</h3><span className="text-xs text-text-muted flex items-center gap-1"><Users size={13} /> {c._count?.members || 0} 人</span></div>
              </div>
            ))}
              </div>
            ) : (
              <p className="py-5 text-center text-sm text-text-muted">暂无公开圈子</p>
            )}
          </section>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="w-[90%] max-w-sm rounded-2xl border border-border bg-bg-secondary p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">创建圈子</h3>
            <div className="flex flex-col gap-3">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="圈子名称"
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary outline-none"
              />
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="简介（可选）"
                rows={3}
                className="resize-none rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary outline-none"
              />
              <button
                type="button"
                onClick={createCircle}
                className="w-full rounded-lg bg-[var(--primary-gradient)] py-2.5 text-sm font-semibold text-white"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
