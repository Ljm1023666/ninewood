import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import { cn } from '@/lib/utils'
import { certLabel, certColor } from '@/constants/cert'
import { FollowList } from '@/components/ui/follow-list'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import { Settings, Edit3, MessageCircle, UserPlus, UserCheck, Award, FileText, ShoppingBag, Star, TrendingUp, Zap, Users, ShieldCheck } from 'lucide-react'

const PROFILE_HERO_FALLBACK =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80'

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const myUser = useUserStore((s) => s.user)
  const isMe = !id || id === myUser?.id

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const displayUser = isMe ? myUser : user
  const level = displayUser?.certificationLevel || 'NONE'
  const color = certColor[level as keyof typeof certColor] || '#6b7280'

  const heroBackgroundUrl = useMemo(() => {
    if (!displayUser) return PROFILE_HERO_FALLBACK
    return (
      displayUser.coverUrl ||
      publisherUserCoverPreset(displayUser.id) ||
      PROFILE_HERO_FALLBACK
    )
  }, [displayUser])

  // ===== 封面开场动画 =====
  const [intro, setIntro] = useState({ show: false, shrink: false, entering: false })
  useEffect(() => {
    if (!displayUser) return
    // 他人主页只播一次（session 级别）
    if (!isMe) {
      const key = `profile_intro_${displayUser.id}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    }
    setIntro({ show: true, shrink: false, entering: true })
    const t1 = setTimeout(() => setIntro(p => ({ ...p, entering: false })), 700)
    const t2 = setTimeout(() => {
      setIntro(p => (p.show ? { ...p, shrink: true } : p))
    }, 1700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [displayUser?.id])

  function handleIntroClick() {
    if (!intro.show) return
    if (!intro.shrink) {
      setIntro(p => ({ ...p, shrink: true }))
    } else {
      hideIntro()
    }
  }

  function hideIntro() {
    setIntro({ show: false, shrink: false, entering: false })
  }

  // shrink 后 0.9s 自动隐藏
  useEffect(() => {
    if (!intro.shrink) return
    const t = setTimeout(hideIntro, 900)
    return () => clearTimeout(t)
  }, [intro.shrink])
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [certStatus, setCertStatus] = useState<any>(null)
  const [showFollow, setShowFollow] = useState<'followers' | 'following' | null>(null)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')

  // 认证进度
  const promo = certStatus?.promotion
  const promoProgress = promo ? Math.round(promo.progress * 100) : 0
  const promoColor = promo ? certColor[promo.next as keyof typeof certColor] || '#f59e0b' : '#f59e0b'
  const ringR = 38; const ringC = 2 * Math.PI * ringR; const ringOff = ringC - (ringC * promoProgress) / 100

  useEffect(() => { loadUser() }, [id])

  async function loadUser() {
    setLoading(true)
    try {
      if (isMe) {
        try { const r = await userApi.certStatus(); setCertStatus(r.data.data) } catch {}
      } else if (id) {
        const r = await userApi.get(id); setUser(r.data.data)
      }
      const tid = id || myUser?.id
      if (tid) {
        const [fr, fer] = await Promise.all([userApi.following(tid), userApi.followers(tid)])
        setFollowCounts({ following: fr.data.data?.total || 0, followers: fer.data.data?.total || 0 })
        if (!isMe) setIsFollowing(fer.data.data?.items?.some((u: any) => u.id === myUser?.id) || false)
      }
    } catch {} finally { setLoading(false) }
  }

  async function handleFollow() {
    if (!displayUser?.id) return
    try {
      if (isFollowing) { await userApi.unfollow(displayUser.id); setFollowCounts(p => ({ ...p, followers: Math.max(0, p.followers - 1) })) }
      else { await userApi.follow(displayUser.id); setFollowCounts(p => ({ ...p, followers: p.followers + 1 })) }
      setIsFollowing(!isFollowing)
    } catch {}
  }

  async function saveProfile() {
    try { await userApi.updateProfile({ nickname, bio }); setEditing(false) } catch {}
  }

  if (loading && !displayUser) return <div className="flex items-center justify-center h-full"><span className="loader" /></div>

  return (
    <>
      {/* ===== 封面开场动画 Portal ===== */}
      {createPortal(
        <AnimatePresence>
          {intro.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.22 } }}
              onClick={handleIntroClick}
              className="fixed inset-0 z-[2000] cursor-pointer overflow-hidden"
              style={{ background: 'var(--bg-primary)' }}
            >
              {/* 封面大图 */}
              <motion.div
                initial={intro.entering ? { x: '8%', opacity: 0.7 } : false}
                animate={
                  intro.shrink
                    ? { left: 'var(--sidebar-w)', width: 'calc(100vw - var(--sidebar-w))', height: 'calc((100vw - var(--sidebar-w)) * 9 / 16)' }
                    : { x: 0, opacity: 1 }
                }
                transition={
                  intro.shrink
                    ? { duration: 0.82, ease: [0.32, 0.72, 0, 1] }
                    : { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }
                }
                className="absolute top-0 left-0 w-screen h-screen bg-cover bg-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                style={{
                  backgroundImage: displayUser?.coverUrl ? `url(${displayUser.coverUrl})` : `linear-gradient(180deg, ${color}44, var(--bg-primary))`,
                }}
              />

              {/* 昵称 + 提示 */}
              <motion.div
                animate={intro.shrink ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.38 }}
                className="absolute inset-x-4 z-10 text-center pointer-events-none"
                style={{ bottom: '60%' }}
              >
                <p className="text-[26px] font-bold text-white/95 tracking-[4px] drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
                  {displayUser?.nickname}
                </p>
                <p className="mt-3 text-[13px] font-medium tracking-[3px] text-white/55">
                  轻触收起
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <div className="relative z-[1] flex min-h-full w-full flex-col items-center overflow-y-auto thin-scroll">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-bg-primary/85 to-bg-primary" />

        {/* items-center + 显式宽度：避免 mx-auto+w-full+flex 在部分布局下不居中（与 Settings 一致） */}
        <div className="relative z-10 box-border flex w-[min(100%,36rem)] shrink-0 flex-col gap-4 px-4 pb-28 pt-4">
          {isMe && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/25 text-white/90 backdrop-blur-md transition hover:bg-black/35"
                aria-label="设置"
              >
                <Settings size={18} />
              </button>
            </div>
          )}

          <LiquidGlassCard
            draggable={true}
            shadowIntensity="xs"
            glowIntensity="none"
            borderRadius="16px"
            className="p-5 text-white bg-white/[0.08]"
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/25 text-2xl font-bold shadow-lg"
                style={{ boxShadow: `0 0 24px ${color}55, 0 8px 24px rgba(0,0,0,0.35)` }}
              >
                {displayUser?.avatarUrl ? (
                  <img src={displayUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (displayUser?.nickname || '?')[0]
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                {editing ? (
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    aria-label="昵称"
                    placeholder="昵称"
                    className="w-full rounded-lg border border-white/25 bg-black/20 px-2 py-1.5 text-sm text-white outline-none placeholder:text-white/40"
                  />
                ) : (
                  <h2 className="truncate text-lg font-extrabold tracking-tight drop-shadow-sm">{displayUser?.nickname}</h2>
                )}
                <span
                  className="mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: '#fff', border: `1px solid ${color}66`, background: `${color}22` }}
                >
                  {certLabel[level]}
                </span>
              </div>
            </div>

            {editing ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="个人简介..."
                  className="min-w-[200px] flex-1 rounded-lg border border-white/25 bg-black/20 px-2 py-2 text-sm text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="button"
                  onClick={saveProfile}
                  className="rounded-lg bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/30"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
                >
                  取消
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-white/75">{displayUser?.bio || '这个人很懒，什么都没写...'}</p>
            )}

            <div className="mt-4 flex gap-2">
              {isMe ? (
                <button
                  type="button"
                  onClick={() => {
                    setNickname(displayUser?.nickname || '')
                    setBio(displayUser?.bio || '')
                    setEditing(true)
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/18"
                >
                  <Edit3 size={14} />
                  编辑资料
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all',
                      isFollowing
                        ? 'border border-white/25 bg-white/10 text-white'
                        : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25',
                    )}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={15} />
                        已关注
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} />
                        关注
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${displayUser?.id}`)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                    aria-label="发消息"
                  >
                    <MessageCircle size={18} />
                  </button>
                </>
              )}
            </div>
          </LiquidGlassCard>

          <div className="flex gap-3">
            {/* 关注 */}
            <LiquidGlassCard
              draggable={true}
              shadowIntensity="xs"
              glowIntensity="none"
              borderRadius="16px"
              className="flex-1 p-4 text-white bg-white/[0.08]"
            >
              <button
                type="button"
                onClick={() => setShowFollow('following')}
                className="w-full flex flex-col items-center gap-1 rounded-xl transition hover:opacity-80"
              >
                <span className="text-2xl font-extrabold tabular-nums">{followCounts.following}</span>
                <span className="text-xs text-white/60">关注</span>
              </button>
            </LiquidGlassCard>

            {/* 粉丝 */}
            <LiquidGlassCard
              draggable={true}
              shadowIntensity="xs"
              glowIntensity="none"
              borderRadius="16px"
              className="flex-1 p-4 text-white bg-white/[0.08]"
            >
              <button
                type="button"
                onClick={() => setShowFollow('followers')}
                className="w-full flex flex-col items-center gap-1 rounded-xl transition hover:opacity-80"
              >
                <span className="text-2xl font-extrabold tabular-nums">{followCounts.followers}</span>
                <span className="text-xs text-white/60">粉丝</span>
              </button>
            </LiquidGlassCard>

            {/* 认证等级 */}
            <LiquidGlassCard
              draggable={true}
              shadowIntensity="xs"
              glowIntensity="none"
              borderRadius="16px"
              className="flex-1 p-4 text-white bg-white/[0.08]"
            >
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck size={22} style={{ color }} />
                <span className="text-xs font-bold" style={{ color }}>{certLabel[level]}</span>
                {promo && (
                  <div className="mt-1 w-full">
                    <div className="h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-[width_0.8s]"
                        style={{ width: `${promoProgress}%`, background: promoColor }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </LiquidGlassCard>
          </div>


          <LiquidGlassCard
            draggable={true}
            shadowIntensity="xs"
            glowIntensity="none"
            borderRadius="16px"
            className="p-4 text-white bg-white/[0.08]"
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Star, label: '信誉积分', value: user?.creditScore || certStatus?.creditScore || 60, c: '#34d399' },
                { icon: Zap, label: '本月抢单', value: `${user?.snatchCredits || certStatus?.snatchCredits || 0}/3`, c: '#f87171' },
                { icon: TrendingUp, label: '完成订单', value: user?.completedOrders || certStatus?.completedOrders || 0, c: color },
                {
                  icon: Users,
                  label: '关注/粉丝比',
                  value: followCounts.followers > 0 ? `${Math.round((followCounts.following / Math.max(followCounts.followers, 1)) * 100)}%` : '0%',
                  c: '#c4b5fd',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${item.c}22`, color: item.c }}
                  >
                    <item.icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/55">{item.label}</p>
                    <p className="truncate text-sm font-extrabold tabular-nums">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {isMe && (
            <div className="flex gap-3">
              {[
                { icon: Award, label: '认证', path: '/cert-center' },
                { icon: FileText, label: '需求', path: '/my-demands' },
                { icon: ShoppingBag, label: '订单', path: '/orders' },
                { icon: MessageCircle, label: '消息', path: '/messages' },
                { icon: Settings, label: '设置', path: '/settings' },
              ].map((item) => (
                <LiquidGlassCard
                  key={item.path}
                  draggable={true}
                  shadowIntensity="xs"
                  glowIntensity="none"
                  borderRadius="16px"
                  className="flex-1 p-3 text-white bg-white/[0.08]"
                >
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="w-full flex flex-col items-center gap-1 rounded-xl transition hover:opacity-80"
                  >
                    <item.icon size={18} className="text-white/90" />
                    <span className="text-[10px] text-white/60">{item.label}</span>
                  </button>
                </LiquidGlassCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {displayUser?.id && (
        <FollowList visible={showFollow !== null} userId={displayUser.id} mode={showFollow || 'followers'} onClose={() => setShowFollow(null)} />
      )}
    </>
  )
}
