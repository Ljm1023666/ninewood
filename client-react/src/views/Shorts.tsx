import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { shortsApi } from '@/api/shorts'
import { userApi } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { certLabel, certColor } from '@/constants/cert'

interface Short { id: string; mediaUrl: string; coverUrl?: string; description?: string; tags: string[]; likeCount: number; viewCount: number; userId: string; user: { id: string; nickname: string; avatarUrl?: string }; createdAt: string }

function isVideo(url: string) { return /\.(mp4|mov|webm|mkv)$/i.test(url) }
function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) }

export default function Shorts() {
  const navigate = useNavigate()
  const userStore = useUserStore()
  const [shorts, setShorts] = useState<Short[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const [progressMap, setProgressMap] = useState<Record<number, number>>({})
  const [hearts, setHearts] = useState<{ id: number; idx: number }[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [selectedShort, setSelectedShort] = useState<Short | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
  const lastTap = useRef<Record<number, number>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)

  const tabs = [{ key: 'all', label: '推荐' }, { key: 'follow', label: '关注' }, { key: 'nearby', label: '附近' }]

  async function fetchShorts() {
    setLoading(true); setError('')
    try {
      const params: any = { limit: 20 }
      if (activeTab === 'follow') params.tab = 'follow'
      if (activeTab === 'nearby') params.tab = 'nearby'
      const res = await shortsApi.list(params)
      setShorts(res.data.data.videos || [])
    } catch (e: any) { setError(e.response?.data?.message || '加载失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchShorts() }, [activeTab])

  // IntersectionObserver for video autoplay
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const idx = Number((entry.target as HTMLElement).dataset.index)
        const video = videoRefs.current.get(idx)
        if (!video) continue
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setCurrentIdx(idx)
          video.currentTime = 0
          if (playing) video.play().catch(() => {})
        } else {
          video.pause()
        }
      }
    }, { threshold: [0.3, 0.5, 0.7, 0.9] })

    setTimeout(() => {
      document.querySelectorAll('.case-card').forEach(el => observerRef.current?.observe(el))
    }, 300)

    return () => observerRef.current?.disconnect()
  }, [shorts])

  function togglePlay() {
    setPlaying(!playing)
    const v = videoRefs.current.get(currentIdx)
    if (!v) return
    if (!playing) { v.play().catch(() => {}) } else { v.pause() }
  }

  function toggleMute() {
    setMuted(!muted)
    videoRefs.current.forEach(v => { v.muted = !muted })
  }

  function handleTap(idx: number, s: Short) {
    const now = Date.now()
    const prev = lastTap.current[idx] || 0
    lastTap.current[idx] = now
    if (now - prev < 250) {
      toggleLike(s.id)
      const hid = Date.now()
      setHearts(prev => [...prev, { id: hid, idx }])
      setTimeout(() => setHearts(prev => prev.filter(h => h.id !== hid)), 900)
    } else {
      togglePlay()
    }
  }

  function toggleLike(id: string) {
    setLikedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function toggleFollow(id: string) {
    const isFollowed = followedIds.has(id)
    try {
      if (isFollowed) { await userApi.unfollow(id); setFollowedIds(prev => { const n = new Set(prev); n.delete(id); return n }) }
      else { await userApi.follow(id); setFollowedIds(prev => new Set(prev).add(id)) }
    } catch {}
  }

  if (loading) return <div className="h-full bg-black flex items-center justify-center text-white/50 text-sm">加载中...</div>
  if (error) return <div className="h-full bg-black flex items-center justify-center text-red-400 text-sm">{error}</div>

  return (
    <div className="h-full bg-black relative">
      {/* Tabs */}
      <div className="fixed top-0 z-50 flex gap-0 px-3 py-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 border-none bg-transparent text-sm font-semibold transition-colors ${activeTab === t.key ? 'text-white font-bold' : 'text-white/50'}`}>{t.label}</button>
        ))}
      </div>

      {shorts.length === 0 && <div className="h-full flex items-center justify-center text-white/30 text-sm">暂无内容</div>}

      <div className="flex flex-col items-stretch w-full min-h-full">
        {shorts.map((s, idx) => (
          <div key={s.id} className="case-card relative w-full h-screen flex-shrink-0 snap-start bg-[#0a0a0a] overflow-hidden cursor-pointer" data-index={idx} onClick={() => handleTap(idx, s)}>
            {isVideo(s.mediaUrl) ? (
              <video ref={el => { if (el) videoRefs.current.set(idx, el); else videoRefs.current.delete(idx) }} src={s.mediaUrl} poster={s.coverUrl} preload="metadata" muted={muted} loop playsInline className="absolute inset-0 w-full h-full object-cover"
                onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setProgressMap(p => ({ ...p, [idx]: (v.currentTime / v.duration) * 100 })) }} />
            ) : isImage(s.mediaUrl) ? (
              <img src={s.mediaUrl} className="absolute inset-0 w-full h-full object-cover" />
            ) : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#141414] to-[#0a0a0a]"><span className="text-[40px] opacity-30">🎬</span></div>}

            {/* Double-tap hearts */}
            {hearts.filter(h => h.idx === idx).map(h => <div key={h.id} className="absolute inset-0 z-10 flex items-center justify-center text-[80px] pointer-events-none animate-[heart-pop_0.9s_ease-out_forwards]">❤️</div>)}

            {/* Pause overlay */}
            {!playing && isVideo(s.mediaUrl) && <div className="absolute inset-0 z-10 flex items-center justify-center text-[60px] text-white/60 pointer-events-none">▶</div>}

            {/* Mute button */}
            {isVideo(s.mediaUrl) && <button onClick={e => { e.stopPropagation(); toggleMute() }} className="absolute top-20 right-3.5 z-10 bg-transparent border-none text-xl cursor-pointer p-1.5 opacity-60 hover:opacity-100">{muted ? '🔇' : '🔊'}</button>}

            {/* Overlay */}
            <div className="absolute inset-0 z-[1] pointer-events-none flex flex-col justify-between" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 40%, transparent 58%, rgba(0,0,0,0.08) 82%, rgba(0,0,0,0.22) 100%)' }}>
              {s.tags?.length > 0 && <div className="flex gap-2 px-3.5 pt-[50px] flex-wrap">{s.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/15 text-white/85 tracking-[1px]">{t}</span>)}</div>}

              {/* Right action bar */}
              <div className="absolute right-3 bottom-[22%] flex flex-col gap-[18px] items-center">
                <button onClick={e => { e.stopPropagation(); navigate(`/profile/${s.userId}`) }} className="pointer-events-auto border-none bg-transparent text-white flex flex-col items-center gap-1 p-0 active:scale-[0.88] transition-transform">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center border-2 border-white text-lg font-bold" style={{ background: (certColor as any)[(s.user as any)?.certificationLevel || 'NONE'] }}>
                    {s.user?.avatarUrl ? <img src={s.user.avatarUrl} className="w-full h-full object-cover" /> : s.user?.nickname?.charAt(0)}
                  </div>
                </button>
                <button onClick={e => { e.stopPropagation(); toggleFollow(s.userId) }} className={`pointer-events-auto border-none bg-transparent flex flex-col items-center gap-1 p-0 active:scale-[0.88] transition-transform ${followedIds.has(s.userId) ? 'text-[var(--warning-color)]' : 'text-white'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-bold ${followedIds.has(s.userId) ? 'bg-white/15' : 'bg-[var(--brand-red)] text-white'}`}>{followedIds.has(s.userId) ? '✓' : '+'}</div>
                  <span className="text-[11px] font-semibold">{followedIds.has(s.userId) ? '已关注' : '关注'}</span>
                </button>
                <button onClick={e => { e.stopPropagation(); toggleLike(s.id) }} className={`pointer-events-auto border-none bg-transparent flex flex-col items-center gap-1 p-0 active:scale-[0.88] transition-transform ${likedIds.has(s.id) ? 'text-[var(--brand-red)]' : 'text-white'}`}>
                  <span className="text-[30px]">{likedIds.has(s.id) ? '❤️' : '🤍'}</span>
                  <span className="text-[11px] font-semibold">{s.likeCount || ''}</span>
                </button>
                <button onClick={e => { e.stopPropagation(); setSelectedShort(s); setShowDetail(true) }} className="pointer-events-auto border-none bg-transparent text-white flex flex-col items-center gap-1 p-0 active:scale-[0.88] transition-transform">
                  <span className="text-[30px]">📋</span>
                  <span className="text-[11px] font-semibold">详情</span>
                </button>
              </div>

              {/* Bottom info */}
              <div onClick={e => { e.stopPropagation(); setSelectedShort(s); setShowDetail(true) }} className="px-3.5 pb-20 pointer-events-auto">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[15px] font-bold text-white">@{s.user?.nickname}</span>
                  {(s.user as any)?.certificationLevel && (s.user as any).certificationLevel !== 'NONE' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-white/10" style={{ color: (certColor as any)[(s.user as any).certificationLevel] }}>{(certLabel as any)[(s.user as any).certificationLevel]}</span>}
                </div>
                {s.description && <p className="text-[13px] text-white/70 line-clamp-3 leading-relaxed mb-1.5">{s.description}</p>}
              </div>

              <button onClick={e => { e.stopPropagation(); navigate(`/messages/${s.userId}`) }} className="pointer-events-auto absolute bottom-5 left-3.5 px-5 py-2 rounded-3xl border-none text-white text-sm font-bold tracking-[1px] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--brand-red), var(--brand-red-light))', boxShadow: '0 4px 16px rgba(254,44,85,0.3)' }}>联系TA</button>
            </div>

            {/* Progress bar */}
            {isVideo(s.mediaUrl) && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/25 z-10 pointer-events-none"><div className="h-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.4)] transition-[width_0.2s_linear]" style={{ width: `${progressMap[idx] || 0}%` }} /></div>}
          </div>
        ))}
        {shorts.length > 1 && <div className="w-full py-7 text-center text-[13px] text-white/15">{currentIdx + 1} / {shorts.length}</div>}
      </div>

      {/* Detail panel */}
      {showDetail && selectedShort && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end" onClick={() => setShowDetail(false)}>
          <div className="w-full max-h-[75vh] overflow-y-auto bg-[var(--bg-secondary)] rounded-t-[20px] px-5 pt-3 pb-7 animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-sm bg-white/20 mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => { setShowDetail(false); navigate(`/profile/${selectedShort.userId}`) }}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold text-white flex-shrink-0" style={{ background: (certColor as any)[(selectedShort.user as any)?.certificationLevel || 'NONE'] }}>
                {selectedShort.user?.avatarUrl ? <img src={selectedShort.user.avatarUrl} className="w-full h-full object-cover" /> : selectedShort.user?.nickname?.charAt(0)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-white">{selectedShort.user?.nickname}</span>
                {(selectedShort.user as any)?.certificationLevel && (selectedShort.user as any).certificationLevel !== 'NONE' && <span className="text-xs" style={{ color: (certColor as any)[(selectedShort.user as any).certificationLevel] }}>{(certLabel as any)[(selectedShort.user as any).certificationLevel]}</span>}
              </div>

            </div>
            {selectedShort.description && <p className="text-sm text-white/75 leading-relaxed mb-3.5">{selectedShort.description}</p>}
            {selectedShort.tags?.length > 0 && <div className="flex gap-2 flex-wrap mb-4">{selectedShort.tags.map(t => <span key={t} className="px-3 py-1 rounded-md text-xs font-semibold bg-accent/20 text-white/85">{t}</span>)}</div>}
            <div className="flex flex-col gap-2.5 mb-5">
              <div className="flex justify-between text-sm"><span className="text-white/45">发布时间</span><span className="font-semibold text-white/85">{new Date(selectedShort.createdAt).toLocaleDateString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/45">播放</span><span className="font-semibold text-white/85">{selectedShort.viewCount} 次</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/45">喜欢</span><span className="font-semibold text-white/85">{selectedShort.likeCount}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleFollow(selectedShort.userId)} className="flex-1 py-3 rounded-[10px] border-none text-white text-sm font-bold" style={{ background: followedIds.has(selectedShort.userId) ? 'rgba(255,255,255,0.1)' : 'var(--brand-red)' }}>{followedIds.has(selectedShort.userId) ? '✓ 已关注' : '+ 关注'}</button>
              <button onClick={() => { setShowDetail(false); navigate(`/messages/${selectedShort.userId}`) }} className="flex-1 py-3 rounded-[10px] border-none text-white text-sm font-bold" style={{ background: 'var(--primary-gradient)' }}>发消息</button>
              <button onClick={() => setShowDetail(false)} className="px-4 py-3 rounded-[10px] border border-white/15 bg-transparent text-white/50 text-sm">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
