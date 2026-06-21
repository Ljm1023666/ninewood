import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'
import { certLabel } from '@/constants/cert'
import { ProfileEditDialog } from '@/components/ui/profile-edit-dialog'
import { toast } from '@/components/ui/confirm-dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  SettingsActionButton,
} from '@/components/layout/internal-ui'
import { MaterialSwitch } from '@/components/ui/material-switch'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  MoonIcon,
  SunIcon,
} from '@/components/ui/theme-toggle'
import { STITCH_PROFILE_ICONS } from '@/constants/stitch-icons'
import { useProfileCoverBg } from '@/hooks/use-profile-cover-bg'
import { useThemeStore } from '@/stores/theme'

/** 开屏：原图停留 → 渐隐开屏层 + 主页浮现 */
const INTRO_HOLD_MS = 2400
const INTRO_REVEAL_S = 1.65
const INTRO_REVEAL_EASE = [0.32, 0.72, 0, 1] as const
const COVER_CURTAIN_S = 0.72
const COVER_BG_FADE_MS = 500
/** 封面背景切换：先加速、后减速 */
const COVER_BG_EASE_CSS = 'ease-in-out'
const COVER_BG_EASE = [0.45, 0, 0.55, 1] as const

type ProfileIntroPhase = 'hold' | 'reveal' | 'done'

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
  const pageCoverUrl = useMemo(() => {
    const trimmed =
      typeof displayUser?.coverUrl === 'string'
        ? displayUser.coverUrl.trim()
        : ''
    return trimmed || null
  }, [displayUser?.coverUrl])
  const { coverBgEnabled, setCoverBgEnabled } = useProfileCoverBg()
  const showCoverBackground = coverBgEnabled && Boolean(pageCoverUrl)
  const solidBg = useThemeStore((s) => s.current.bgPrimary)
  const [coverCurtainPulse, setCoverCurtainPulse] = useState(0)

  function handleCoverBgToggle(next: boolean) {
    if (next === coverBgEnabled) return
    setCoverBgEnabled(next)
    setCoverCurtainPulse((p) => p + 1)
  }

  // ===== 封面开场：停留原图 → 渐显主页 =====
  const [introPhase, setIntroPhase] = useState<ProfileIntroPhase>('hold')
  useEffect(() => {
    // 切换他人主页时先清空旧用户，避免旧内容闪出
    if (!isMe) setUser(null)
  }, [id, isMe])

  useEffect(() => {
    // 仅切换用户 / 封面 URL 就绪时播放；封面开关走帷幕，不 replay 开屏
    if (!pageCoverUrl || !coverBgEnabled) {
      setIntroPhase('done')
      return
    }
    setIntroPhase('hold')
    const revealTimer = window.setTimeout(() => {
      setIntroPhase('reveal')
    }, INTRO_HOLD_MS)
    return () => window.clearTimeout(revealTimer)
  }, [profileIntroKey, pageCoverUrl])

  useEffect(() => {
    if (!showCoverBackground) {
      setIntroPhase('done')
    }
  }, [showCoverBackground])

  function finishIntroReveal() {
    setIntroPhase('done')
  }

  function handleIntroClick() {
    if (introPhase === 'hold') setIntroPhase('reveal')
    else if (introPhase === 'reveal') finishIntroReveal()
  }

  const introContentVisible = introPhase === 'reveal' || introPhase === 'done'
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
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <span className="loader" />
      </div>
    )

  return (
    <>
      {/* ===== 开屏原图层（无模糊；reveal 阶段渐隐，露出下方主页背景） ===== */}
      {showCoverBackground &&
        introPhase !== 'done' &&
        createPortal(
          <AnimatePresence>
            {(introPhase === 'hold' || introPhase === 'reveal') && (
              <motion.div
                key="profile-intro-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: introPhase === 'hold' ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: introPhase === 'hold' ? 0.5 : INTRO_REVEAL_S,
                  ease: INTRO_REVEAL_EASE,
                }}
                onClick={introPhase === 'hold' ? handleIntroClick : undefined}
                onAnimationComplete={() => {
                  setIntroPhase((p) => (p === 'reveal' ? 'done' : p))
                }}
                className={cn(
                  'fixed inset-0 z-[var(--z-max)] overflow-hidden bg-bg-primary',
                  introPhase === 'hold'
                    ? 'cursor-pointer'
                    : 'pointer-events-none',
                )}
              >
                <img
                  src={pageCoverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: introPhase === 'hold' ? 1 : 0,
                    y: introPhase === 'hold' ? 0 : 14,
                  }}
                  transition={{ duration: 0.55, ease: INTRO_REVEAL_EASE }}
                  className="pointer-events-none absolute inset-x-4 bottom-[60%] z-10 text-center"
                >
                  <p className="text-[30px] font-bold tracking-[4px] text-white/95 drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
                    {displayUser?.nickname}
                  </p>
                  <p className="mt-3 text-[15px] font-semibold tracking-[3px] text-white/55">
                    轻触继续
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={false}
        animate={{ opacity: showCoverBackground && introPhase === 'hold' ? 0 : 1 }}
        transition={{
          duration: INTRO_REVEAL_S,
          ease: INTRO_REVEAL_EASE,
          delay: introContentVisible ? 0.12 : 0,
        }}
        style={{ pointerEvents: introPhase === 'hold' ? 'none' : undefined }}
      >
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

        <div className="internal-shell relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-stretch overflow-y-auto thin-scroll bg-background">
              {pageCoverUrl ? (
            <>
              <img
                src={pageCoverUrl}
                alt=""
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover transition-opacity"
                style={{
                  opacity: showCoverBackground ? 1 : 0,
                  transitionDuration: `${COVER_BG_FADE_MS}ms`,
                  transitionTimingFunction: COVER_BG_EASE_CSS,
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity"
                style={{
                  opacity: showCoverBackground ? 0 : 1,
                  background: 'var(--internal-bg)',
                  transitionDuration: `${COVER_BG_FADE_MS}ms`,
                  transitionTimingFunction: COVER_BG_EASE_CSS,
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-background/15 via-background/50 to-background transition-opacity"
                style={{
                  opacity: showCoverBackground ? 1 : 0,
                  transitionDuration: `${COVER_BG_FADE_MS}ms`,
                  transitionTimingFunction: COVER_BG_EASE_CSS,
                }}
                aria-hidden
              />
              {coverCurtainPulse > 0 ? (
                <motion.div
                  key={coverCurtainPulse}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: [0, 1, 0] }}
                  transition={{
                    duration: COVER_CURTAIN_S,
                    times: [0, 0.42, 1],
                    ease: [COVER_BG_EASE, COVER_BG_EASE],
                  }}
                  className="pointer-events-none absolute inset-0 z-[2] origin-top"
                  style={{ background: solidBg }}
                  aria-hidden
                />
              ) : null}
            </>
          ) : (
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-[var(--internal-bg)]"
              aria-hidden
            />
          )}
          <div className="internal-profile-shell relative z-10 box-border flex min-h-full w-full max-w-[1000px] shrink-0 flex-col self-center px-4 pb-16 pt-2 sm:px-6">
            <PageHeader
              title="主页"
              onBack="back"
              divider={false}
            />

            <div className="internal-profile-page">
            <section className="internal-profile-hero">
              <div className="internal-profile-hero__head">
                {isMe ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingKind !== null}
                    className={cn(
                      'internal-profile-hero__avatar',
                      uploadingKind !== null && 'cursor-not-allowed opacity-70',
                    )}
                    aria-label="更换头像"
                    title="更换头像"
                  >
                    {displayUser?.avatarUrl ? (
                      <img src={displayUser.avatarUrl} alt="" />
                    ) : (
                      (displayUser?.nickname || '?')[0]
                    )}
                  </button>
                ) : (
                  <div className="internal-profile-hero__avatar">
                    {displayUser?.avatarUrl ? (
                      <img src={displayUser.avatarUrl} alt="" />
                    ) : (
                      (displayUser?.nickname || '?')[0]
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="internal-profile-hero__name">
                    {displayUser?.nickname}
                  </h2>
                  <p className="internal-profile-hero__badge">
                    {certLabel[level]}
                  </p>
                </div>
              </div>

              <p className="internal-profile-hero__bio">
                {displayUser?.bio || '这个人很懒，什么都没写...'}
              </p>
              {(displayUser?.ipRegion || displayUser?.cityCode) && (
                <p className="internal-profile-hero__meta">
                  <MsIcon name={STITCH_PROFILE_ICONS.location} size={16} className="shrink-0" />
                  IP 属地：{displayUser.ipRegion || displayUser.cityCode}
                </p>
              )}
              {displayUser?.birthday && (
                <p className="internal-profile-hero__meta">
                  <MsIcon name="cake" size={16} className="shrink-0" />
                  {new Date(displayUser.birthday).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}

              <div className="internal-profile-hero__actions">
                {isMe ? (
                  <>
                    <SettingsActionButton onClick={() => setEditDialogOpen(true)}>
                      <MsIcon name={STITCH_PROFILE_ICONS.edit} size={16} className="mr-1.5 inline" />
                      编辑资料
                    </SettingsActionButton>
                    <div
                      className={
                        pageCoverUrl
                          ? 'internal-profile-hero__cover-action internal-profile-hero__cover-action--with-switch'
                          : 'internal-profile-hero__cover-action'
                      }
                    >
                      <SettingsActionButton
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingKind !== null}
                      >
                        {uploadingKind === 'cover' ? '上传中…' : '更换背景'}
                      </SettingsActionButton>
                      {pageCoverUrl ? (
                        <div
                          className={`internal-profile-hero__cover-switch transition-opacity${
                            coverBgEnabled
                              ? ' opacity-100'
                              : ' opacity-40'
                          }`}
                          style={{
                            transitionDuration: `${COVER_BG_FADE_MS}ms`,
                            transitionTimingFunction: COVER_BG_EASE_CSS,
                          }}
                        >
                          <MaterialSwitch
                            checked={coverBgEnabled}
                            onCheckedChange={handleCoverBgToggle}
                            size="sm"
                            showIcons
                            checkedIcon={<SunIcon />}
                            uncheckedIcon={<MoonIcon />}
                            haptic="light"
                            aria-label={coverBgEnabled ? '关闭封面背景' : '开启封面背景'}
                          />
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <SettingsActionButton
                      variant={isFollowing ? 'default' : 'primary'}
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                    >
                      {isFollowing ? (
                        <>
                          <MsIcon name="how_to_reg" size={16} className="mr-1.5 inline" />
                          已关注
                        </>
                      ) : (
                        <>
                          <MsIcon name="person_add" size={16} className="mr-1.5 inline" />
                          关注
                        </>
                      )}
                    </SettingsActionButton>
                    <SettingsActionButton
                      onClick={() => navigate(`/messages/${displayUser?.id}`)}
                      aria-label="发消息"
                    >
                      <MsIcon name={STITCH_PROFILE_ICONS.message} size={16} />
                    </SettingsActionButton>
                  </>
                )}
              </div>
            </section>

            <section className="internal-profile-metrics-row">
              <button
                type="button"
                onClick={() => gotoFollowList('following')}
                className="internal-profile-metrics-row__cell"
              >
                <span className="internal-profile-metrics-row__value">
                  {followCounts.following}
                </span>
                <span className="internal-profile-metrics-row__label">关注</span>
              </button>
              <button
                type="button"
                onClick={() => gotoFollowList('followers')}
                className="internal-profile-metrics-row__cell"
              >
                <span className="internal-profile-metrics-row__value">
                  {followCounts.followers}
                </span>
                <span className="internal-profile-metrics-row__label">粉丝</span>
              </button>
              <div className="internal-profile-metrics-row__cell">
                <MsIcon name={STITCH_PROFILE_ICONS.verified} size={22} className="text-text-primary" />
                <span className="internal-profile-metrics-row__label">
                  {certLabel[level]}
                </span>
                {promo ? (
                  <div className="mt-1 h-1 w-full max-w-[120px] overflow-hidden bg-white/10">
                    <div
                      className="h-full bg-[var(--internal-accent)] transition-[width_0.8s]"
                      style={{ width: `${promoProgress}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="internal-profile-grid">
              {[
                {
                  icon: STITCH_PROFILE_ICONS.star,
                  label: '信誉积分',
                  value: user?.creditScore || certStatus?.creditScore || 60,
                },
                {
                  icon: STITCH_PROFILE_ICONS.bolt,
                  label: '本月抢单',
                  value: `${user?.snatchCredits || certStatus?.snatchCredits || 0}/3`,
                },
                {
                  icon: STITCH_PROFILE_ICONS.trending,
                  label: '完成订单',
                  value:
                    user?.completedOrders || certStatus?.completedOrders || 0,
                },
                {
                  icon: STITCH_PROFILE_ICONS.group,
                  label: '关注/粉丝比',
                  value:
                    followCounts.followers > 0
                      ? `${Math.round((followCounts.following / Math.max(followCounts.followers, 1)) * 100)}%`
                      : '0%',
                },
              ].map((item, i) => (
                <div key={i} className="internal-profile-grid__cell">
                  <div className="internal-profile-grid__icon">
                    <MsIcon name={item.icon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="internal-profile-grid__label">{item.label}</p>
                    <p className="internal-profile-grid__value">{item.value}</p>
                  </div>
                </div>
              ))}
            </section>

            {isMe ? (
              <nav className="internal-profile-dock" aria-label="个人中心导航">
                {[
                  { icon: STITCH_PROFILE_ICONS.cert, label: '认证', path: '/cert-center' },
                  { icon: STITCH_PROFILE_ICONS.demands, label: '需求', path: '/my-demands' },
                  { icon: STITCH_PROFILE_ICONS.favorites, label: '收藏', tab: 'favorites' as const },
                  { icon: STITCH_PROFILE_ICONS.orders, label: '订单', path: '/orders' },
                  { icon: STITCH_PROFILE_ICONS.chat, label: '消息', path: '/messages' },
                  { icon: STITCH_PROFILE_ICONS.settings, label: '设置', path: '/settings' },
                ].map((item) => (
                  <button
                    key={item.tab || item.path}
                    type="button"
                    onClick={() =>
                      item.tab ? setContentTab(item.tab) : navigate(item.path!)
                    }
                    className="internal-profile-dock__btn"
                  >
                    <MsIcon name={item.icon} size={22} aria-hidden />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            ) : null}

            {contentTab === 'favorites' && isMe ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <SettingsActionButton onClick={() => setContentTab('profile')}>
                    ← 返回
                  </SettingsActionButton>
                  <span className="text-base font-bold text-text-primary">
                    我的收藏
                  </span>
                </div>
                {favoriteLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="loader" />
                  </div>
                ) : favoriteDemands.length === 0 ? (
                  <div className="py-8 text-center text-base font-semibold text-text-muted">
                    暂无收藏
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {favoriteDemands.map((demand) => (
                        <div key={demand.id} className="settings-panel p-4">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/demands/${demand.id}`)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-base font-bold text-[#e2e2e2]">
                                {demand.title}
                              </p>
                              <p className="mt-0.5 font-mono text-sm font-semibold text-text-muted">
                                ¥{demand.minPrice} · {demand.category}
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(demand.id)}
                              className="settings-action-btn !px-2"
                              aria-label="取消收藏"
                            >
                              <MsIcon
                                name={STITCH_PROFILE_ICONS.favorites}
                                size={16}
                                filled
                                className="text-[var(--internal-accent)]"
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {favoriteTotalPages > 1 ? (
                      <div className="mt-2 flex justify-center gap-2">
                        {Array.from(
                          { length: Math.min(5, favoriteTotalPages) },
                          (_, i) => i + 1,
                        ).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => loadFavPage(page)}
                            className={cn(
                              'h-9 w-9 border font-mono text-sm font-bold',
                              page === favPage
                                ? 'border-[var(--internal-accent)] bg-[var(--internal-accent)]/10 text-text-primary'
                                : 'border-[var(--internal-hairline)] text-text-muted hover:text-text-primary',
                            )}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </motion.div>

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
