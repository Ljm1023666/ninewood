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
import { DisplayCoverPicture } from '@/components/ui/display-cover-picture'
import { UserCoverAmbientBg } from '@/components/ui/user-cover-ambient'
import {
  toPreferOriginalProfileCoverUrl,
  toDisplayCoverSources,
} from '@/utils/user-cover-presets'

/** 开屏：主页单张封面 → covers 原图（高清，不压缩） */
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
    if (!trimmed) return null
    // 主页单张：covers 原图（带宽已够，全屏高清）
    return toPreferOriginalProfileCoverUrl(trimmed)
  }, [displayUser])
  const pageCoverSources = useMemo(
    () => (pageCoverUrl ? toDisplayCoverSources(pageCoverUrl) : null),
    [pageCoverUrl],
  )
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
  }, [coverBgEnabled, profileIntroKey, pageCoverUrl])

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
  const creditScore =
    user?.creditScore ?? certStatus?.creditScore ?? displayUser?.creditScore ?? 60
  const completedOrders =
    user?.completedOrders ??
    certStatus?.completedOrders ??
    displayUser?.completedOrders ??
    0
  const snatchCredits =
    user?.snatchCredits ?? certStatus?.snatchCredits ?? displayUser?.snatchCredits ?? 0
  const usedCredits = Math.max(0, 3 - snatchCredits)
  const profileRegion =
    displayUser?.ipRegion || displayUser?.cityCode || '暂未填写'

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
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isMe, myUser])

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
                {pageCoverSources ? (
                  <DisplayCoverPicture
                    sources={pageCoverSources}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    aria-hidden
                  />
                ) : null}
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

        <div className="internal-shell relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-stretch overflow-y-auto thin-scroll">
              {pageCoverUrl ? (
            <>
              {/* 与全站氛围同构：模糊底图 + 色罩 + 渐变，仅换个人封面 */}
              <div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity"
                style={{
                  opacity: showCoverBackground ? 1 : 0,
                  transitionDuration: `${COVER_BG_FADE_MS}ms`,
                  transitionTimingFunction: COVER_BG_EASE_CSS,
                }}
                aria-hidden
              >
                <UserCoverAmbientBg coverUrl={pageCoverUrl} />
              </div>
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
          ) : null}
          <div className="internal-profile-shell relative z-10 box-border flex min-h-full w-full shrink-0 self-center px-5 pb-14">
            <div className="internal-profile-main min-w-0 flex-1">
              <PageHeader
                title="个人中心"
                onBack="back"
                divider={false}
                className="internal-profile-header"
              />

              <div className="internal-profile-page">
                <section className="internal-profile-hero">
                  {pageCoverSources ? (
                    <DisplayCoverPicture
                      sources={pageCoverSources}
                      alt=""
                      className="internal-profile-hero__cover"
                      aria-hidden
                    />
                  ) : null}
                  <div className="internal-profile-hero__scrim" aria-hidden />
                  <div className="internal-profile-hero__content">
                    <div className="internal-profile-hero__head">
                      {isMe ? (
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploadingKind !== null}
                          className={cn(
                            'internal-profile-hero__avatar',
                            uploadingKind !== null &&
                              'cursor-not-allowed opacity-70',
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
                      <div className="internal-profile-hero__copy min-w-0 flex-1">
                        <div className="internal-profile-hero__title-row">
                          <h2 className="internal-profile-hero__name">
                            {displayUser?.nickname}
                          </h2>
                          {level !== 'NONE' ? (
                            <>
                              <span
                                className="internal-profile-hero__verified"
                                title={certLabel[level]}
                                aria-label={certLabel[level]}
                              >
                                <MsIcon
                                  name={STITCH_PROFILE_ICONS.verified}
                                  size={15}
                                  filled
                                />
                              </span>
                              <span className="internal-profile-hero__cert">
                                <MsIcon name="workspace_premium" size={15} />
                                {certLabel[level]}
                              </span>
                            </>
                          ) : null}
                        </div>
                        <p className="internal-profile-hero__role">
                          {level === 'NONE' ? '服务者' : '认证服务者'}
                        </p>
                        <p className="internal-profile-hero__bio">
                          {displayUser?.bio || '完善个人简介，让合作方更快了解你。'}
                        </p>
                        <p className="internal-profile-hero__meta">
                          <MsIcon
                            name={STITCH_PROFILE_ICONS.location}
                            size={17}
                            className="shrink-0"
                          />
                          IP 属地：{profileRegion}
                        </p>
                      </div>
                    </div>

                    <div className="internal-profile-hero__actions">
                      {isMe ? (
                        <>
                          <SettingsActionButton
                            onClick={() => setEditDialogOpen(true)}
                          >
                            <MsIcon
                              name={STITCH_PROFILE_ICONS.edit}
                              size={18}
                            />
                            编辑资料
                          </SettingsActionButton>
                          <SettingsActionButton
                            variant="primary"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingKind !== null}
                          >
                            <MsIcon name="image" size={18} />
                            {uploadingKind === 'cover' ? '上传中…' : '更换背景'}
                          </SettingsActionButton>
                          {pageCoverUrl ? (
                            <div
                              className={cn(
                                'internal-profile-hero__cover-switch',
                                !coverBgEnabled &&
                                  'internal-profile-hero__cover-switch--off',
                              )}
                            >
                              <MaterialSwitch
                                checked={coverBgEnabled}
                                onCheckedChange={handleCoverBgToggle}
                                size="sm"
                                showIcons
                                checkedIcon={<SunIcon />}
                                uncheckedIcon={<MoonIcon />}
                                haptic="light"
                                aria-label={
                                  coverBgEnabled
                                    ? '关闭页面封面氛围'
                                    : '开启页面封面氛围'
                                }
                              />
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <SettingsActionButton
                            variant={isFollowing ? 'default' : 'primary'}
                            onClick={handleFollow}
                            disabled={isFollowLoading}
                          >
                            <MsIcon
                              name={isFollowing ? 'how_to_reg' : 'person_add'}
                              size={18}
                            />
                            {isFollowing ? '已保存' : '保存联系人'}
                          </SettingsActionButton>
                          <SettingsActionButton
                            onClick={() =>
                              navigate(`/messages/${displayUser?.id}`)
                            }
                          >
                            <MsIcon
                              name={STITCH_PROFILE_ICONS.message}
                              size={18}
                            />
                            发消息
                          </SettingsActionButton>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                {contentTab === 'profile' ? (
                  <>
                    <section
                      className="internal-profile-overview liquid-glass-surface"
                      aria-label="个人概览"
                    >
                      <button
                        type="button"
                        onClick={() => gotoFollowList('following')}
                        className="internal-profile-overview__item"
                      >
                        <span className="internal-profile-overview__icon internal-profile-overview__icon--indigo">
                          <MsIcon name="person" size={24} />
                        </span>
                        <span>
                          <small>我保存的人</small>
                          <strong>{followCounts.following}</strong>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => gotoFollowList('followers')}
                        className="internal-profile-overview__item"
                      >
                        <span className="internal-profile-overview__icon internal-profile-overview__icon--blue">
                          <MsIcon name={STITCH_PROFILE_ICONS.group} size={24} />
                        </span>
                        <span>
                          <small>愿意协作的人</small>
                          <strong>{followCounts.followers > 0 ? '有' : '无'}</strong>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/cert-center')}
                        className="internal-profile-overview__item"
                      >
                        <span className="internal-profile-overview__icon internal-profile-overview__icon--violet">
                          <MsIcon name={STITCH_PROFILE_ICONS.verified} size={23} />
                        </span>
                        <span>
                          <small>信誉</small>
                          <strong>{creditScore}</strong>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/orders')}
                        className="internal-profile-overview__item"
                      >
                        <span className="internal-profile-overview__icon internal-profile-overview__icon--green">
                          <MsIcon name="task_alt" size={24} />
                        </span>
                        <span>
                          <small>已完成</small>
                          <strong>{completedOrders}</strong>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/my-bids')}
                        className="internal-profile-overview__item internal-profile-overview__item--capacity"
                      >
                        <span className="internal-profile-overview__icon internal-profile-overview__icon--orange">
                          <MsIcon name="calendar_month" size={23} />
                        </span>
                        <span>
                          <small>本月承接容量</small>
                          <strong>{snatchCredits}/3</strong>
                          <span className="internal-profile-overview__progress">
                            <div
                              style={{
                                width: `${Math.min(100, (snatchCredits / 3) * 100)}%`,
                              }}
                            />
                          </span>
                        </span>
                      </button>
                    </section>

                    <section className="internal-profile-dashboard">
                      <div className="internal-profile-dashboard__column">
                        <article className="internal-profile-panel internal-profile-panel--archive liquid-glass-surface">
                          <header className="internal-profile-panel__header">
                            <span className="internal-profile-panel__heading-icon">
                              <MsIcon name="description" size={20} />
                            </span>
                            <h3>服务档案</h3>
                          </header>
                          <div className="internal-profile-records">
                            <button type="button" onClick={() => isMe && setEditDialogOpen(true)}>
                              <MsIcon name="link" size={17} />
                              <span>个人简介</span>
                              <strong>{displayUser?.bio || '暂未填写'}</strong>
                              {isMe ? <MsIcon name="chevron_right" size={18} /> : null}
                            </button>
                            <button type="button" onClick={() => isMe && setEditDialogOpen(true)}>
                              <MsIcon name="location_on" size={17} />
                              <span>服务区域</span>
                              <strong>{profileRegion}</strong>
                              {isMe ? <MsIcon name="chevron_right" size={18} /> : null}
                            </button>
                            <button type="button" onClick={() => navigate('/orders')}>
                              <MsIcon name="history" size={17} />
                              <span>服务经验</span>
                              <strong>已完成 {completedOrders} 次协作</strong>
                              <MsIcon name="chevron_right" size={18} />
                            </button>
                            <button type="button" onClick={() => navigate('/cert-center')}>
                              <MsIcon name="verified_user" size={17} />
                              <span>服务特色</span>
                              <strong>{certLabel[level]} · 信誉 {creditScore}</strong>
                              <MsIcon name="chevron_right" size={18} />
                            </button>
                          </div>
                        </article>

                        <article className="internal-profile-panel internal-profile-panel--certification liquid-glass-surface">
                          <header className="internal-profile-panel__header">
                            <span className="internal-profile-panel__heading-icon">
                              <MsIcon name="workspace_premium" size={20} />
                            </span>
                            <h3>能力与认证</h3>
                          </header>
                          <button
                            type="button"
                            className="internal-profile-certificate"
                            onClick={() => navigate('/cert-center')}
                          >
                            <span className="internal-profile-certificate__icon">
                              <MsIcon name="electric_bolt" size={28} />
                            </span>
                            <span>
                              <strong>{certLabel[level]}</strong>
                              <small>
                                {promo
                                  ? `升级进度 ${promoProgress}%`
                                  : level === 'NONE'
                                    ? '完成认证后展示能力凭证'
                                    : '认证长期有效'}
                              </small>
                            </span>
                            <b>{level === 'NONE' ? '去认证' : '已认证'}</b>
                            <MsIcon name="chevron_right" size={19} />
                          </button>
                        </article>
                      </div>

                      <div className="internal-profile-dashboard__column">
                        <article className="internal-profile-panel internal-profile-panel--monthly liquid-glass-surface">
                          <header className="internal-profile-panel__header">
                            <span className="internal-profile-panel__heading-icon">
                              <MsIcon name="bar_chart" size={20} />
                            </span>
                            <h3>本月状态</h3>
                          </header>
                          <div className="internal-profile-monthly">
                            <div>
                              <span>可承接额度</span>
                              <strong>{snatchCredits}/3 单</strong>
                            </div>
                            <span className="internal-profile-monthly__track">
                              <i
                                style={{
                                  width: `${Math.min(100, (snatchCredits / 3) * 100)}%`,
                                }}
                              />
                            </span>
                            <div>
                              <span>本月配额</span>
                              <strong>3 单</strong>
                            </div>
                            <div>
                              <span>已使用额度</span>
                              <strong>{usedCredits} 单</strong>
                            </div>
                          </div>
                        </article>

                        <div className="internal-profile-dashboard__split">
                          <article className="internal-profile-panel liquid-glass-surface">
                            <header className="internal-profile-panel__header">
                              <span className="internal-profile-panel__heading-icon">
                                <MsIcon name="settings_suggest" size={20} />
                              </span>
                              <h3>服务管理</h3>
                            </header>
                            <div className="internal-profile-links">
                              <button type="button" onClick={() => navigate('/my-service-cards')}>
                                <span><MsIcon name="assignment" size={19} /></span>
                                <b>服务项目管理</b>
                                <small>管理服务项目、价格与说明</small>
                                <MsIcon name="chevron_right" size={18} />
                              </button>
                              <button type="button" onClick={() => navigate('/orders')}>
                                <span><MsIcon name="receipt_long" size={19} /></span>
                                <b>订单管理</b>
                                <small>查看与管理我的服务订单</small>
                                <MsIcon name="chevron_right" size={18} />
                              </button>
                              <button type="button" onClick={() => navigate('/settings')}>
                                <span><MsIcon name="schedule" size={19} /></span>
                                <b>可服务时间设置</b>
                                <small>设置服务时间与休息安排</small>
                                <MsIcon name="chevron_right" size={18} />
                              </button>
                            </div>
                          </article>

                          <article className="internal-profile-panel liquid-glass-surface">
                            <header className="internal-profile-panel__header internal-profile-panel__header--orange">
                              <span className="internal-profile-panel__heading-icon">
                                <MsIcon name="star" size={20} filled />
                              </span>
                              <h3>评价与信誉</h3>
                            </header>
                            <div className="internal-profile-links internal-profile-links--orange">
                              <button type="button" onClick={() => navigate('/orders')}>
                                <span><MsIcon name="star_outline" size={19} /></span>
                                <b>客户评价</b>
                                <small>从已完成订单查看评价</small>
                                <MsIcon name="chevron_right" size={18} />
                              </button>
                              <button type="button" onClick={() => navigate('/cert-center')}>
                                <span><MsIcon name="verified_user" size={19} /></span>
                                <b>信誉记录</b>
                                <small>信誉 {creditScore}，查看规则说明</small>
                                <MsIcon name="chevron_right" size={18} />
                              </button>
                              <button type="button" onClick={() => navigate('/help')}>
                                <span><MsIcon name="history" size={19} /></span>
                                <b>平台规则</b>
                                <small>查看服务与申诉规则</small>
                                <MsIcon name="chevron_right" size={18} />
                              </button>
                            </div>
                          </article>
                        </div>
                      </div>
                    </section>
                  </>
                ) : null}

                {contentTab === 'favorites' && isMe ? (
                  <section className="internal-profile-favorites liquid-glass-surface">
                    <div className="internal-profile-favorites__bar">
                      <SettingsActionButton
                        onClick={() => setContentTab('profile')}
                      >
                        ← 返回
                      </SettingsActionButton>
                      <h3 className="internal-profile-favorites__title">
                        我的收藏
                      </h3>
                    </div>
                    {favoriteLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <span className="loader" />
                      </div>
                    ) : favoriteDemands.length === 0 ? (
                      <div className="internal-profile-favorites__empty">
                        暂无收藏
                      </div>
                    ) : (
                      <>
                        <div className="internal-profile-favorites__list">
                          {favoriteDemands.map((demand) => (
                            <div
                              key={demand.id}
                              className="internal-profile-favorites__row"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/demands/${demand.id}`)
                                }
                                className="internal-profile-favorites__link"
                              >
                                <p className="internal-profile-favorites__name">
                                  {demand.title}
                                </p>
                                <p className="internal-profile-favorites__meta">
                                  ¥{demand.minPrice} · {demand.category}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleFavorite(demand.id)}
                                className="internal-profile-favorites__unfav"
                                aria-label="取消收藏"
                              >
                                <MsIcon
                                  name={STITCH_PROFILE_ICONS.favorites}
                                  size={16}
                                  filled
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                        {favoriteTotalPages > 1 ? (
                          <div className="internal-profile-favorites__pages">
                            {Array.from(
                              { length: Math.min(5, favoriteTotalPages) },
                              (_, i) => i + 1,
                            ).map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => loadFavPage(page)}
                                className={cn(
                                  'internal-profile-favorites__page',
                                  page === favPage &&
                                    'internal-profile-favorites__page--active',
                                )}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                ) : null}
              </div>
            </div>

            {isMe ? (
              <ProfileSideRail
                contentTab={contentTab}
                setContentTab={setContentTab}
                navigate={navigate}
                myUserId={myUser?.id}
              />
            ) : null}
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

type ProfileRailItem = {
  icon: string
  label: string
  path?: string
  tab?: 'favorites'
}

const PROFILE_RAIL_ITEMS: ProfileRailItem[] = [
  { icon: STITCH_PROFILE_ICONS.orders, label: '订单', path: '/orders' },
  { icon: 'forum', label: '讨论', path: '/discussions' },
  { icon: STITCH_PROFILE_ICONS.demands, label: '需求', path: '/my-demands' },
  { icon: 'gavel', label: '应标', path: '/my-bids' },
  { icon: 'receipt_long', label: '钱包', path: '/transactions' },
  { icon: 'layers', label: '服务卡', path: '/my-service-cards' },
  { icon: STITCH_PROFILE_ICONS.verified, label: '认证', path: '/cert-center' },
  { icon: 'notifications', label: '通知', path: '/push-settings' },
  { icon: 'card_giftcard', label: '福利', path: '/welfare' },
  { icon: STITCH_PROFILE_ICONS.favorites, label: '收藏', tab: 'favorites' },
  { icon: STITCH_PROFILE_ICONS.group, label: '联系人' },
  { icon: STITCH_PROFILE_ICONS.settings, label: '设置', path: '/settings' },
]

/** 个人中心右侧轨：默认向上收纳；展开用 CSS grid，避免 height+backdrop 卡顿/灰条 */
function ProfileSideRail({
  contentTab,
  setContentTab,
  navigate,
  myUserId,
}: {
  contentTab: 'profile' | 'favorites'
  setContentTab: (tab: 'profile' | 'favorites') => void
  navigate: ReturnType<typeof useNavigate>
  myUserId?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <nav
      className={cn(
        'internal-profile-rail',
        open ? 'internal-profile-rail--open' : 'internal-profile-rail--collapsed',
      )}
      aria-label="个人中心导航"
    >
      <div className="internal-profile-rail__body">
        <div className="internal-profile-rail__body-inner liquid-glass-surface">
          {PROFILE_RAIL_ITEMS.map((item) => {
            const path =
              item.label === '联系人'
                ? myUserId
                  ? `/follows/${myUserId}`
                  : '/profile'
                : item.path
            const active = item.tab ? contentTab === item.tab : false
            return (
              <button
                key={item.tab || path}
                type="button"
                onClick={() => {
                  if (item.tab) setContentTab(item.tab)
                  else if (path) navigate(path)
                  setOpen(false)
                }}
                className={cn(
                  'internal-profile-rail__btn',
                  active && 'internal-profile-rail__btn--active',
                )}
              >
                <MsIcon name={item.icon} size={22} aria-hidden />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        className="internal-profile-rail__toggle liquid-glass-surface"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? '向上收纳导航' : '展开导航'}
      >
        <MsIcon
          name={open ? 'keyboard_arrow_up' : 'expand_less'}
          size={20}
          aria-hidden
        />
        <span>{open ? '收纳' : '菜单'}</span>
      </button>
    </nav>
  )
}
