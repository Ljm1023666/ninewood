import { useState, useEffect, useCallback, useRef } from 'react'
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
  InternalPageShell,
  SettingsActionButton,
} from '@/components/layout/internal-ui'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PROFILE_ICONS } from '@/constants/stitch-icons'


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
                    : `linear-gradient(180deg, #3388FF44, #000000)`,
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

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          'transition-opacity duration-200',
          intro.show && !intro.shrink ? 'opacity-0' : 'opacity-100',
        )}
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

        <InternalPageShell
          width="profile"
          className="min-h-0 flex-1"
          contentClassName="min-h-0"
        >
          <PageHeader
            title={displayUser?.nickname || '个人主页'}
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
                  <MsIcon name={STITCH_PROFILE_ICONS.location} size={14} className="shrink-0" />
                  IP 属地：{displayUser.ipRegion || displayUser.cityCode}
                </p>
              )}
              {displayUser?.birthday && (
                <p className="internal-profile-hero__meta">
                  <MsIcon name="cake" size={14} className="shrink-0" />
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
                      <MsIcon name={STITCH_PROFILE_ICONS.edit} size={14} className="mr-1.5 inline" />
                      编辑资料
                    </SettingsActionButton>
                    <SettingsActionButton
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingKind !== null}
                    >
                      {uploadingKind === 'cover' ? '上传中…' : '更换背景'}
                    </SettingsActionButton>
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
                          <MsIcon name="how_to_reg" size={14} className="mr-1.5 inline" />
                          已关注
                        </>
                      ) : (
                        <>
                          <MsIcon name="person_add" size={14} className="mr-1.5 inline" />
                          关注
                        </>
                      )}
                    </SettingsActionButton>
                    <SettingsActionButton
                      onClick={() => navigate(`/messages/${displayUser?.id}`)}
                      aria-label="发消息"
                    >
                      <MsIcon name={STITCH_PROFILE_ICONS.message} size={14} />
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
                <MsIcon name={STITCH_PROFILE_ICONS.verified} size={20} className="text-text-secondary" />
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
                    <MsIcon name={item.icon} size={16} />
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
                    <MsIcon name={item.icon} size={20} aria-hidden />
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
                  <span className="text-sm font-medium text-text-primary">
                    我的收藏
                  </span>
                </div>
                {favoriteLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="loader" />
                  </div>
                ) : favoriteDemands.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
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
                              <p className="truncate text-sm font-medium text-[#e2e2e2]">
                                {demand.title}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-text-muted">
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
                              'h-8 w-8 border font-mono text-xs',
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
        </InternalPageShell>
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
