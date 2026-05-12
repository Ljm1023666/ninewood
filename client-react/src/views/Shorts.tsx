import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { shortsApi } from '@/api/shorts'
import { userApi } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { certLabel, certColor } from '@/constants/cert'
import { cn } from '@/lib/utils'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Volume2, VolumeX, Heart, MessageCircle, Share2, X } from 'lucide-react'

interface Short {
  id: string; mediaUrl: string; coverUrl?: string; description?: string; tags: string[]
  likeCount: number; viewCount: number; userId: string
  user: { id: string; nickname: string; avatarUrl?: string; certificationLevel?: string }
  createdAt: string
}

function isVideo(url: string) { return /\.(mp4|mov|webm|mkv|m4v)$/i.test(url) }
function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) }
function fmt(n: number) { return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }

export default function Shorts() {
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const [shorts, setShorts] = useState<Short[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [muted, setMuted] = useState(true)
  const [progressMap, setProgressMap] = useState<Record<number, number>>({})
  const [hearts, setHearts] = useState<{ id: number; idx: number }[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [selectedShort, setSelectedShort] = useState<Short | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())

  const tabs = [
    { key: 'all', label: '推荐' },
    { key: 'follow', label: '关注' },
    { key: 'nearby', label: '附近' },
  ]

  const fetchShorts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, any> = { limit: 20 }
      if (activeTab === 'follow') params.tab = 'follow'
      if (activeTab === 'nearby') params.tab = 'nearby'
      const res = await shortsApi.list(params)
      const data = res.data?.data
      setShorts(data?.videos || data?.items || [])
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [activeTab])

  useEffect(() => { fetchShorts() }, [fetchShorts])

  // 滚动时同步当前视频索引
  useEffect(() => {
    const el = containerRef.current
    if (!el || shorts.length === 0) return
    const onScroll = () => {
      const h = el.clientHeight
      if (h <= 0) return
      const idx = Math.round(el.scrollTop / h)
      if (idx !== currentIdx && idx >= 0 && idx < shorts.length) {
        setCurrentIdx(idx)
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [shorts.length, currentIdx])

  // 控制当前视频播放，暂停其他
  useEffect(() => {
    shorts.forEach((s, i) => {
      const v = videoRefs.current.get(i)
      if (!v || !isVideo(s.mediaUrl)) return
      if (i === currentIdx) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [currentIdx, shorts])

  // 同步静音
  useEffect(() => {
    videoRefs.current.forEach((v) => { v.muted = muted })
  }, [muted])

  function toggleMute() {
    setMuted((m) => !m)
  }

  function handleTap(idx: number, s: Short, e: React.MouseEvent) {
    // 双击检测
    const now = Date.now()
    const last = (handleTap as any)._last as Record<number, number> | undefined
    if (!(handleTap as any)._last) (handleTap as any)._last = {}
    const prev = (handleTap as any)._last[idx] || 0
    ;(handleTap as any)._last[idx] = now

    // 排除右侧按钮区域的点击
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    if (now - prev < 300) {
      // 双击 -> 点赞
      setLikedIds((prev) => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })
      const hid = Date.now()
      setHearts((prev) => [...prev, { id: hid, idx }])
      setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== hid)), 900)
    } else {
      // 单击 -> 暂停/播放
      const v = videoRefs.current.get(idx)
      if (!v || !isVideo(s.mediaUrl)) return
      if (v.paused) { v.play().catch(() => {}) } else { v.pause() }
    }
  }

  async function toggleFollow(id: string) {
    const isFollowed = followedIds.has(id)
    try {
      if (isFollowed) {
        await userApi.unfollow(id)
        setFollowedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      } else {
        await userApi.follow(id)
        setFollowedIds((prev) => new Set(prev).add(id))
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="relative h-full min-h-0 w-full bg-black">
      {/* 顶栏 */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex justify-center pb-3 pt-[max(12px,env(safe-area-inset-top))]"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
        <div className="pointer-events-auto flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setActiveTab(t.key); setCurrentIdx(0) }}
              className={cn(
                'border-none bg-transparent px-4 py-2 text-sm font-semibold transition-all duration-300',
                activeTab === t.key ? 'font-bold text-white scale-105' : 'text-white/50 hover:text-white/70',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      {initialLoading && <LoadingState text="加载中..." className="text-white/50" />}

      {!initialLoading && error && shorts.length === 0 && (
        <ErrorState message={error} onRetry={fetchShorts} className="text-white" />
      )}

      {!initialLoading && !error && shorts.length === 0 && (
        <EmptyState type="demand" className="text-white/50" />
      )}

      {shorts.length > 0 && (
        <div
          ref={containerRef}
          className="h-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden overscroll-y-contain"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {shorts.map((s, idx) => (
            <div
              key={s.id}
              className="relative h-full w-full snap-start snap-always flex-shrink-0 bg-black overflow-hidden"
              onClick={(e) => handleTap(idx, s, e)}
            >
              {/* 媒体 */}
              {isVideo(s.mediaUrl) ? (
                <video
                  ref={(el) => { if (el) { el.muted = muted; videoRefs.current.set(idx, el) } else videoRefs.current.delete(idx) }}
                  src={s.mediaUrl}
                  poster={s.coverUrl}
                  preload={idx <= 1 ? 'auto' : 'metadata'}
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget
                    if (v.duration) setProgressMap((p) => ({ ...p, [idx]: (v.currentTime / v.duration) * 100 }))
                  }}
                />
              ) : isImage(s.mediaUrl) ? (
                <img src={s.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950">
                  <span className="text-[40px] opacity-30">🎬</span>
                </div>
              )}

              {/* 双击爱心 */}
              <AnimatePresence>
                {hearts.filter((h) => h.idx === idx).map((h) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 1, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 1.5, y: -60 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[80px]"
                  >
                    ❤️
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 遮罩渐变 */}
              <div className="pointer-events-none absolute inset-0 z-[1]"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 35%, transparent 60%, rgba(0,0,0,0.05) 85%, rgba(0,0,0,0.2) 100%)' }}
              />

              {/* 标签 */}
              {s.tags?.length > 0 && (
                <div className="absolute left-3 top-[max(52px,calc(env(safe-area-inset-top)+36px))] z-10 flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <span key={t} className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-sm">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* 静音按钮 */}
              {isVideo(s.mediaUrl) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMute() }}
                  className="absolute right-3 top-[max(52px,calc(env(safe-area-inset-top)+36px))] z-20 flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 text-white/80 backdrop-blur-md transition-all hover:bg-black/50 hover:text-white"
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              )}

              {/* 右侧操作栏 */}
              <div className="absolute bottom-[26%] right-3 z-10 flex flex-col items-center gap-5">
                {/* 头像 */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${s.userId}`) }}
                  className="flex flex-col items-center gap-1 border-none bg-transparent p-0"
                >
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 text-lg font-bold shadow-lg"
                    style={{ background: (certColor as any)[s.user?.certificationLevel || 'NONE'] || '#6b7280' }}>
                    {s.user?.avatarUrl ? <img src={s.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : s.user?.nickname?.charAt(0)}
                  </div>
                </motion.button>

                {/* 关注 */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFollow(s.userId) }}
                  className={cn(
                    'flex flex-col items-center gap-1 border-none bg-transparent p-0 transition-colors',
                    followedIds.has(s.userId) ? 'text-amber-400' : 'text-white',
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-base font-bold',
                    followedIds.has(s.userId) ? 'bg-white/15' : 'bg-[var(--brand-red)]',
                  )}>
                    {followedIds.has(s.userId) ? '✓' : '+'}
                  </div>
                  <span className="text-[11px] font-semibold">{followedIds.has(s.userId) ? '已关注' : '关注'}</span>
                </motion.button>

                {/* 点赞 */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLikedIds((prev) => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n }) }}
                  className={cn('flex flex-col items-center gap-1 border-none bg-transparent p-0', likedIds.has(s.id) ? 'text-[var(--brand-red)]' : 'text-white')}
                >
                  <Heart size={30} fill={likedIds.has(s.id) ? 'currentColor' : 'none'} />
                  <span className="text-[11px] font-semibold">{fmt(s.likeCount)}</span>
                </motion.button>

                {/* 评论/详情 */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedShort(s); setShowDetail(true) }}
                  className="flex flex-col items-center gap-1 border-none bg-transparent p-0 text-white"
                >
                  <MessageCircle size={28} />
                  <span className="text-[11px] font-semibold">详情</span>
                </motion.button>

                {/* 分享 */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  className="flex flex-col items-center gap-1 border-none bg-transparent p-0 text-white"
                >
                  <Share2 size={26} />
                  <span className="text-[11px] font-semibold">分享</span>
                </motion.button>
              </div>

              {/* 底部信息 */}
              <div className="absolute bottom-20 left-3 right-16 z-10">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-white">@{s.user?.nickname}</span>
                  {s.user?.certificationLevel && s.user.certificationLevel !== 'NONE' && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
                      style={{ color: (certColor as any)[s.user.certificationLevel] }}>
                      {(certLabel as any)[s.user.certificationLevel]}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-white/75">{s.description}</p>
                )}
              </div>

              {/* 联系TA 按钮 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/messages/${s.userId}`) }}
                className="absolute bottom-4 left-3 z-10 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, var(--brand-red), var(--brand-red-light))',
                  boxShadow: '0 4px 20px rgba(254,44,85,0.35)',
                }}
              >
                联系TA
              </button>

              {/* 进度条 */}
              {isVideo(s.mediaUrl) && (
                <div className="absolute bottom-0 left-0 right-0 z-10 h-[2px] bg-white/20">
                  <div className="h-full bg-white transition-all duration-300 ease-linear"
                    style={{ width: `${progressMap[idx] || 0}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 详情面板 */}
      <AnimatePresence>
        {showDetail && selectedShort && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end bg-black/60"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-h-[70vh] overflow-y-auto rounded-t-3xl bg-[#1a1a2e]/95 backdrop-blur-xl px-5 pt-3 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/20" />

              {/* 用户信息 */}
              <div
                className="mb-4 flex cursor-pointer items-center gap-3"
                onClick={() => { setShowDetail(false); navigate(`/profile/${selectedShort.userId}`) }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white"
                  style={{ background: (certColor as any)[selectedShort.user?.certificationLevel || 'NONE'] || '#6b7280' }}>
                  {selectedShort.user?.avatarUrl ? <img src={selectedShort.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : selectedShort.user?.nickname?.charAt(0)}
                </div>
                <div>
                  <span className="text-base font-bold text-white">{selectedShort.user?.nickname}</span>
                  {selectedShort.user?.certificationLevel && selectedShort.user.certificationLevel !== 'NONE' && (
                    <span className="ml-2 text-xs" style={{ color: (certColor as any)[selectedShort.user.certificationLevel] }}>
                      {(certLabel as any)[selectedShort.user.certificationLevel]}
                    </span>
                  )}
                </div>
              </div>

              {selectedShort.description && (
                <p className="mb-4 text-sm leading-relaxed text-white/75">{selectedShort.description}</p>
              )}

              {selectedShort.tags?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedShort.tags.map((t) => (
                    <span key={t} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{t}</span>
                  ))}
                </div>
              )}

              <div className="mb-5 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-white/40">发布时间</span><span className="text-white/80">{new Date(selectedShort.createdAt).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-white/40">播放</span><span className="text-white/80">{fmt(selectedShort.viewCount)} 次</span></div>
                <div className="flex justify-between"><span className="text-white/40">点赞</span><span className="text-white/80">{fmt(selectedShort.likeCount)}</span></div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleFollow(selectedShort.userId)}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-white"
                  style={{ background: followedIds.has(selectedShort.userId) ? 'rgba(255,255,255,0.1)' : 'var(--brand-red)' }}
                >
                  {followedIds.has(selectedShort.userId) ? '✓ 已关注' : '+ 关注'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDetail(false); navigate(`/messages/${selectedShort.userId}`) }}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-white"
                  style={{ background: 'var(--primary-gradient)' }}
                >
                  发消息
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetail(false)}
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-3 text-white/40 transition-colors hover:text-white/70"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
