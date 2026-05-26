import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { userApi } from '@/api/user'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'
import { certLabel, certColor } from '@/constants/cert'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import { AcetFavouriteButton } from '@/components/ui/tailwindcss-buttons-variants'
import { ProfileEditDialog } from '@/components/ui/profile-edit-dialog'
import { toast } from '@/components/ui/confirm-dialog'
import { BackButton } from '@/components/ui/back-button'
import {
  Settings,
  Edit3,
  MessageCircle,
  UserPlus,
  UserCheck,
  Award,
  FileText,
  ShoppingBag,
  Star,
  TrendingUp,
  Zap,
  Users,
  ShieldCheck,
  Heart,
  Cake,
  MapPin,
} from 'lucide-react'

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
  const profileIntroKey = isMe ? `me:${myUser?.id || ''}` : `user:${id || ''}`
  const level = displayUser?.certificationLevel || 'NONE'
  const color = certColor[level as keyof typeof certColor] || '#6b7280'
  const isDark = useThemeStore((s) => s.current.dark)

  // 浅色/深色模式适配
  const cardSurface = isDark
    ? 'text-white bg-white/[0.08]'
    : 'text-text-primary bg-bg-card'
  const textMuted = isDark ? 'text-white/60' : 'text-text-muted'
  const textSecondary = isDark ? 'text-white/75' : 'text-text-secondary'
  const textSubtle = isDark ? 'text-white/55' : 'text-text-muted'

  const heroBackgroundUrl = useMemo(() => {
    if (!displayUser) return PROFILE_HERO_FALLBACK
    return (
      displayUser.coverUrl ||
      publisherUserCoverPreset(displayUser.id) ||
      PROFILE_HERO_FALLBACK
    )
  }, [displayUser])

  // ===== 封面开场动画（首帧即展示，避免闪出主页内容） =====
  const [intro, setIntro] = useState({
    show: true,
    shrink: false,
    entering: true,
  })
  useEffect(() => {
    // 切换他人主页时先清空旧用户，避免旧内容闪出
    if (!isMe) setUser(null)
  }, [id, isMe])

  useEffect(() => {
    // 每次切换用户时重置动画状态
    setIntro({ show: true, shrink: false, entering: true })
    const t1 = setTimeout(
      () => setIntro((p) => ({ ...p, entering: false })),
      700,
    )
    const t2 = setTimeout(() => {
      setIntro((p) => (p.show ? { ...p, shrink: true } : p))
    }, 1700)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [profileIntroKey])

  function handleIntroClick() {
    if (!intro.show) return
    if (!intro.shrink) {
      setIntro((p) => ({ ...p, shrink: true }))
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
  const [followCounts, setFollowCounts] = useState({
    following: 0,
    followers: 0,
  })
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [certStatus, setCertStatus] = useState<any>(null)
  // 关注/粉丝改为页面跳转，不再使用 modal
  function gotoFollowList(mode: 'followers' | 'following') {
    if (!displayUser?.id) return
    navigate(`/follows/${displayUser.id}?mode=${mode}`)
  }
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<'avatar' | 'cover' | null>(
    null,
  )
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const [contentTab, setContentTab] = useState<'profile' | 'favorites'>(
    'profile',
  )
  const {
    favoriteDemands,
    favoriteTotalPages,
    favoriteLoading,
    loadFavorites,
    toggleFavorite,
  } = useUserStore()
  const [favPage, setFavPage] = useState(1)

  // 认证进度
  const promo = certStatus?.promotion
  const promoProgress = promo ? Math.round(promo.progress * 100) : 0
  const promoColor = promo
    ? certColor[promo.next as keyof typeof certColor] || '#f59e0b'
    : '#f59e0b'

  const loadUser = useCallback(async () => {
    setLoading(true)
    try {
      if (isMe) {
        try {
          const r = await userApi.certStatus()
          setCertStatus(r.data.data)
        } catch {
          /* noop */
        }
        // 刷新自己的用户信息（如 IP 属地）
        try {
          const r = await authApi.getMe()
          setUser(r.data.data)
        } catch {
          /* noop */
        }
      } else if (id) {
        const r = await userApi.get(id)
        setUser(r.data.data)
      }
      const tid = id || myUser?.id
      if (tid) {
        const [fr, fer] = await Promise.all([
          userApi.following(tid),
          userApi.followers(tid),
        ])
        setFollowCounts({
          following: fr.data.data?.total || 0,
          followers: fer.data.data?.total || 0,
        })
        if (!isMe)
          setIsFollowing(
            fer.data.data?.items?.some((u: any) => u.id === myUser?.id) ||
              false,
          )
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }, [id, isMe, myUser?.id])

  const loadFavPage = useCallback(
    (page: number) => {
      setFavPage(page)
      loadFavorites(page)
    },
    [loadFavorites],
  )

  useEffect(() => {
    if (contentTab === 'favorites') {
      loadFavPage(1)
    }
  }, [contentTab, loadFavPage])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  async function handleFollow() {
    if (!displayUser?.id || isFollowLoading) return
    setIsFollowLoading(true)
    try {
      if (isFollowing) {
        await userApi.unfollow(displayUser.id)
        setFollowCounts((p) => ({
          ...p,
          followers: Math.max(0, p.followers - 1),
        }))
      } else {
        await userApi.follow(displayUser.id)
        setFollowCounts((p) => ({ ...p, followers: p.followers + 1 }))
      }
      setIsFollowing(!isFollowing)
    } catch (e: any) {
      toast(e?.response?.data?.message || '操作失败', 'error')
    } finally {
      setIsFollowLoading(false)
    }
  }

  async function handleProfileSave(data: {
    nickname: string
    bio: string
    birthday?: string
  }) {
    try {
      await userApi.updateProfile(data)
      await useUserStore.getState().refreshUser()
      toast('已保存', 'success')
    } catch (e: any) {
      toast(e.response?.data?.message || '保存失败', 'error')
      throw e // 让 dialog 知道保存失败，不关闭
    }
  }

  async function uploadImage(kind: 'avatar' | 'cover', file: File | null) {
    if (!file || !isMe) return
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error')
      return
    }
    const maxBytes = 8 * 1024 * 1024
    if (file.size > maxBytes) {
      toast('图片不能超过 8MB', 'error')
      return
    }
    try {
      setUploadingKind(kind)
      const fd = new FormData()
      fd.append(kind, file)
      await userApi.updateProfile(fd)
      await useUserStore.getState().refreshUser()
      if (!isMe) await loadUser()
      toast(kind === 'avatar' ? '头像已更新' : '背景已更新', 'success')
    } catch (e: any) {
      toast(e.response?.data?.message || '上传失败', 'error')
    } finally {
      setUploadingKind(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  if (loading && !displayUser)
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loader" />
      </div>
    )

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
              className="fixed inset-0 z-[var(--z-max)] cursor-pointer overflow-hidden bg-bg-primary"
            >
              {/* 封面大图 */}
              <motion.div
                initial={intro.entering ? { x: '8%', opacity: 0.7 } : false}
                animate={
                  intro.shrink
                    ? {
                        left: 0,
                        width: '100vw',
                        height: 'calc(100vw * 9 / 16)',
                      }
                    : { x: 0, opacity: 1 }
                }
                transition={
                  intro.shrink
                    ? { duration: 0.82, ease: [0.32, 0.72, 0, 1] }
                    : { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }
                }
                className="absolute top-0 left-0 w-screen h-screen bg-cover bg-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                style={{
                  backgroundImage: displayUser?.coverUrl
                    ? `url(${displayUser.coverUrl})`
                    : `linear-gradient(180deg, ${color}44, var(--bg-primary))`,
                }}
              />

              {/* 昵称 + 提示 */}
              <motion.div
                animate={
                  intro.shrink ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }
                }
                transition={{ duration: 0.38 }}
                className="absolute inset-x-4 z-10 text-center pointer-events-none bottom-[60%]"
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

      {isMe ? (
        <>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            title="上传头像"
            aria-label="上传头像"
            className="hidden"
            onChange={(e) =>
              void uploadImage('avatar', e.currentTarget.files?.[0] || null)
            }
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            title="上传背景"
            aria-label="上传背景"
            className="hidden"
            onChange={(e) =>
              void uploadImage('cover', e.currentTarget.files?.[0] || null)
            }
          />
        </>
      ) : null}

      <div className="absolute left-4 top-4 z-50">
        <BackButton />
      </div>
      <div
        className={cn(
          'relative z-[1] flex h-full min-h-0 w-full flex-col items-stretch overflow-y-auto overflow-x-hidden thin-scroll transition-opacity duration-200',
          intro.show && !intro.shrink ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b',
            isDark
              ? 'from-black/50 via-bg-primary/85 to-bg-primary'
              : 'from-white/25 via-bg-primary/38 to-bg-primary/82',
          )}
        />

        {/* items-center + 显式宽度；min-h-full + justify-center：大屏下内容不贴顶，与底部留白更均衡 */}
        <div className="relative z-10 box-border flex min-h-full w-full max-w-2xl shrink-0 self-center flex-col justify-center gap-4 px-4 pb-28 pt-16">
          {isMe ? (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingKind !== null}
              className={cn(
                'h-10 w-full rounded-xl',
                uploadingKind !== null && 'cursor-not-allowed opacity-60',
              )}
              aria-label="更换背景"
              title="更换背景"
            >
              <span className="sr-only">
                {uploadingKind === 'cover' ? '背景上传中' : '更换背景'}
              </span>
            </button>
          ) : null}

          <LiquidGlassCard
            draggable={true}
            shadowIntensity="xs"
            glowIntensity="none"
            borderRadius="16px"
            className={`p-5 ${cardSurface}`}
          >
            <div className="flex items-start gap-3">
              {isMe ? (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingKind !== null}
                  className={cn(
                    'group relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 text-2xl font-bold shadow-lg transition',
                    isDark ? 'border-white/25' : 'border-black/[0.08]',
                    uploadingKind !== null && 'cursor-not-allowed opacity-70',
                  )}
                  style={{
                    boxShadow: `0 0 24px ${color}55, 0 8px 24px rgba(0,0,0,0.35)`,
                  }}
                  aria-label="更换头像"
                  title="更换头像"
                >
                  {displayUser?.avatarUrl ? (
                    <img
                      src={displayUser.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (displayUser?.nickname || '?')[0]
                  )}
                </button>
              ) : (
                <div
                  className={cn(
                    'flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 text-2xl font-bold shadow-lg',
                    isDark ? 'border-white/25' : 'border-black/[0.08]',
                  )}
                  style={{
                    boxShadow: `0 0 24px ${color}55, 0 8px 24px rgba(0,0,0,0.35)`,
                  }}
                >
                  {displayUser?.avatarUrl ? (
                    <img
                      src={displayUser.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (displayUser?.nickname || '?')[0]
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="truncate text-lg font-extrabold tracking-tight drop-shadow-sm">
                  {displayUser?.nickname}
                </h2>
                <span
                  className="mt-1 inline-block rounded px-2 py-0.5 text-sm font-semibold"
                  style={{
                    color: isDark ? '#fff' : color,
                    border: `1px solid ${color}66`,
                    background: `${color}22`,
                  }}
                >
                  {certLabel[level]}
                </span>
              </div>
            </div>

            <p className={`mt-3 text-sm leading-relaxed ${textSecondary}`}>
              {displayUser?.bio || '这个人很懒，什么都没写...'}
            </p>
            {(displayUser?.ipRegion || displayUser?.cityCode) && (
              <p
                className={`mt-2 flex items-center gap-1.5 text-sm ${textSubtle}`}
              >
                <MapPin className="size-3.5" />
                IP 属地：{displayUser.ipRegion || displayUser.cityCode}
              </p>
            )}
            {displayUser?.birthday && (
              <p
                className={`mt-2 flex items-center gap-1.5 text-sm ${textSubtle}`}
              >
                <Cake className="size-3.5" />
                {new Date(displayUser.birthday).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {isMe ? (
                <button
                  type="button"
                  onClick={() => setEditDialogOpen(true)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold backdrop-blur-sm',
                    isDark
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/18'
                      : 'border-black/[0.08] bg-black/[0.04] text-text-primary hover:bg-black/[0.08]',
                  )}
                >
                  <Edit3 className="size-3.5" />
                  编辑资料
                </button>
              ) : (
                <>
                  {isFollowing ? (
                    <button
                      type="button"
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-[color,background-color,border-color] disabled:opacity-50',
                        isDark
                          ? 'border-white/25 bg-white/10 text-white'
                          : 'border-black/[0.08] bg-black/[0.04] text-text-primary',
                      )}
                    >
                      <UserCheck className="size-4" />
                      已关注
                    </button>
                  ) : (
                    <AcetFavouriteButton
                      type="button"
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      className="flex flex-1 items-center justify-center gap-2 !rounded-xl !py-3 !text-sm font-bold"
                    >
                      <UserPlus className="size-4" />
                      关注
                    </AcetFavouriteButton>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${displayUser?.id}`)}
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                      isDark
                        ? 'border-white/20 bg-white/10 text-white hover:bg-white/18'
                        : 'border-black/[0.08] bg-black/[0.04] text-text-primary hover:bg-black/[0.08]',
                    )}
                    aria-label="发消息"
                  >
                    <MessageCircle className="size-4.5" />
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
              className={`flex-1 p-4 ${cardSurface}`}
            >
              <button
                type="button"
                onClick={() => gotoFollowList('following')}
                className="w-full flex flex-col items-center gap-1 rounded-xl transition hover:bg-accent/5 active:scale-[0.98]"
              >
                <span className="text-2xl font-extrabold tabular-nums">
                  {followCounts.following}
                </span>
                <span className={`text-sm ${textMuted}`}>关注</span>
              </button>
            </LiquidGlassCard>

            {/* 粉丝 */}
            <LiquidGlassCard
              draggable={true}
              shadowIntensity="xs"
              glowIntensity="none"
              borderRadius="16px"
              className={`flex-1 p-4 ${cardSurface}`}
            >
              <button
                type="button"
                onClick={() => gotoFollowList('followers')}
                className="w-full flex flex-col items-center gap-1 rounded-xl transition hover:bg-accent/5 active:scale-[0.98]"
              >
                <span className="text-2xl font-extrabold tabular-nums">
                  {followCounts.followers}
                </span>
                <span className={`text-sm ${textMuted}`}>粉丝</span>
              </button>
            </LiquidGlassCard>

            {/* 认证等级 */}
            <LiquidGlassCard
              draggable={true}
              shadowIntensity="xs"
              glowIntensity="none"
              borderRadius="16px"
              className={`flex-1 p-4 ${cardSurface}`}
            >
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="size-5" style={{ color }} />
                <span className="text-sm font-bold" style={{ color }}>
                  {certLabel[level]}
                </span>
                {promo && (
                  <div className="mt-1 w-full">
                    <div
                      className={cn(
                        'h-1 overflow-hidden rounded-full',
                        isDark ? 'bg-white/10' : 'bg-black/[0.06]',
                      )}
                    >
                      <div
                        className="h-full rounded-full transition-[width_0.8s]"
                        style={{
                          width: `${promoProgress}%`,
                          background: promoColor,
                        }}
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
            className={`p-4 ${cardSurface}`}
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  icon: Star,
                  label: '信誉积分',
                  value: user?.creditScore || certStatus?.creditScore || 60,
                  c: '#34d399',
                },
                {
                  icon: Zap,
                  label: '本月抢单',
                  value: `${user?.snatchCredits || certStatus?.snatchCredits || 0}/3`,
                  c: '#f87171',
                },
                {
                  icon: TrendingUp,
                  label: '完成订单',
                  value:
                    user?.completedOrders || certStatus?.completedOrders || 0,
                  c: color,
                },
                {
                  icon: Users,
                  label: '关注/粉丝比',
                  value:
                    followCounts.followers > 0
                      ? `${Math.round((followCounts.following / Math.max(followCounts.followers, 1)) * 100)}%`
                      : '0%',
                  c: '#c4b5fd',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    isDark
                      ? 'border-white/10 bg-white/5'
                      : 'border-black/[0.06] bg-black/[0.02]',
                  )}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${item.c}22`, color: item.c }}
                  >
                    <item.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm ${textSubtle}`}>{item.label}</p>
                    <p className="truncate text-sm font-extrabold tabular-nums">
                      {item.value}
                    </p>
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
                { icon: Heart, label: '收藏', tab: 'favorites' as const },
                { icon: ShoppingBag, label: '订单', path: '/orders' },
                { icon: MessageCircle, label: '消息', path: '/messages' },
                { icon: Settings, label: '设置', path: '/settings' },
              ].map((item) => (
                <LiquidGlassCard
                  key={item.tab || item.path}
                  draggable={true}
                  shadowIntensity="xs"
                  glowIntensity="none"
                  borderRadius="16px"
                  className={`flex-1 p-3 ${cardSurface}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      item.tab ? setContentTab(item.tab) : navigate(item.path!)
                    }
                    className="w-full flex flex-col items-center gap-1 rounded-xl transition hover:bg-accent/5 active:scale-[0.98]"
                  >
                    <item.icon
                      className={
                        isDark
                          ? 'text-white/90 size-4.5'
                          : 'text-text-primary size-4.5'
                      }
                    />
                    <span className={`text-sm ${textMuted}`}>{item.label}</span>
                  </button>
                </LiquidGlassCard>
              ))}
            </div>
          )}

          {contentTab === 'favorites' && isMe && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContentTab('profile')}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium',
                    isDark
                      ? 'bg-white/10 text-white'
                      : 'bg-black/5 text-text-primary',
                  )}
                >
                  ← 返回
                </button>
                <span className="text-sm font-semibold text-text-primary">
                  我的收藏
                </span>
              </div>
              {favoriteLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="loader" />
                </div>
              ) : favoriteDemands.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  暂无收藏
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {favoriteDemands.map((demand) => (
                      <LiquidGlassCard
                        key={demand.id}
                        draggable={true}
                        shadowIntensity="xs"
                        glowIntensity="none"
                        borderRadius="16px"
                        className={`p-4 ${cardSurface}`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => navigate(`/demands/${demand.id}`)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {demand.title}
                            </p>
                            <p className="text-sm text-text-muted mt-0.5">
                              ¥{demand.minPrice} · {demand.category}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(demand.id)}
                            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                          >
                            <Heart className="fill-red-500 size-4" />
                          </button>
                        </div>
                      </LiquidGlassCard>
                    ))}
                  </div>
                  {favoriteTotalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-2">
                      {Array.from(
                        { length: Math.min(5, favoriteTotalPages) },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => loadFavPage(page)}
                          className={cn(
                            'h-8 w-8 rounded-lg text-sm font-medium',
                            page === favPage
                              ? 'bg-accent text-white'
                              : isDark
                                ? 'bg-white/10 text-white'
                                : 'bg-black/5 text-text-primary',
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ProfileEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={displayUser}
        onSave={handleProfileSave}
        onAvatarChange={async (file) => {
          await uploadImage('avatar', file)
        }}
        uploadingKind={uploadingKind}
      />
    </>
  )
}
