import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useParams, useNavigate, useSearchParams, NavLink } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { demandApi } from '@/api/demand'
import { orderApi } from '@/api/order'

import { CometCard } from '@/components/ui/comet-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { InteractiveProductCard } from '@/components/ui/interactive-product-card'
import { UserCoverAmbientBg } from '@/components/ui/user-cover-ambient'
import {
  resolveDemandCardCoverDetailUrl,
  resolveDemandCardCoverThumbUrl,
} from '@/utils/user-cover-presets'
import { AcetUnapologeticButton } from '@/components/ui/tailwindcss-buttons-variants'
import { useUserStore } from '@/stores/user'
import { MsIcon } from '@/components/ui/ms-icon'
import { usePersistedGlobalHand } from '@/components/card-pool/usePersistedGlobalHand'
import { toast } from '@/components/ui/confirm-dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { PathFlowEntryLink } from '@/components/path/PathFlowEntryLink'
import { cn } from '@/lib/utils'

function stripDebugFromTitle(title: string): string {
  return title
    .replace(/（调#[^）]*）/g, '')
    .replace(/\s*\[seed[^\]]*]/gi, '')
    .replace(/\s*\(seed[^)]*\)/gi, '')
    .trim()
}

function stripSeedFromDescription(desc: string): string {
  return desc
    .replace(/\n*\[seed[^\]]*]\n*/gi, '\n')
    .replace(/\s*\[seed[^\]]*]/gi, '')
    .trim()
}

/** 浏览器解码缓存，减轻滑到下一张时首帧白屏 */
function preloadImageSrc(url: string | undefined | null) {
  const s = typeof url === 'string' ? url.trim() : ''
  if (!s || s.startsWith('data:')) return
  const img = new Image()
  img.decoding = 'async'
  img.src = s
}

function collectDemandImageUrls(d: {
  coverImage?: string | null
  userId?: string
  user?: {
    avatarUrl?: string
    coverUrl?: string | null
    demandCardCoverUrl?: string | null
  }
  mediaUrls?: string[]
}) {
  const urls: string[] = []
  urls.push(
    resolveDemandCardCoverDetailUrl({
      coverImage: d.coverImage,
      userId: d.userId,
      demandCardCoverUrl: d.user?.demandCardCoverUrl,
      mediaUrls: d.mediaUrls,
    }),
  )
  const cv = d.user?.coverUrl
  if (cv?.trim()) urls.push(cv.trim())
  const av = d.user?.avatarUrl
  if (av?.trim()) urls.push(av.trim())
  else urls.push('/favicon.svg')
  const media = (d.mediaUrls || [])
    .filter((u) => /\.(jpg|jpeg|png|gif|webp)/i.test(u))
    .slice(0, 2)
  urls.push(...media)
  return urls
}

/** 省流 / 弱网：少拉邻居；好网：多预取一层 */
function neighborRadius(): number {
  if (typeof navigator === 'undefined') return 1
  const c = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (c?.saveData) return 0
  const et = c?.effectiveType
  if (et === 'slow-2g' || et === '2g') return 0
  if (et === '3g') return 1
  return 2
}

function scheduleIdle(cb: () => void, timeoutMs: number) {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(cb, { timeout: timeoutMs })
    return () => cancelIdleCallback(id)
  }
  const t = window.setTimeout(cb, Math.min(320, timeoutMs))
  return () => clearTimeout(t)
}

function pageShell(inner: ReactNode, title = '需求详情') {
  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
      <div className="relative z-20 shrink-0 px-4 pt-3">
        <PageHeader
          title={title}
          onBack="back"
          divider={false}
          className="mb-0"
          actions={
            <NavLink
              to="/services"
              className="flex items-center gap-1 text-[13px] font-medium text-[var(--accent-color)] hover:underline"
            >
              <MsIcon name="auto_awesome" size={14} />
              找服务
            </NavLink>
          }
        />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl shrink-0 flex-col items-center self-center px-6 py-12">
        {inner}
      </div>
    </div>
  )
}

function DemandActionPanel({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('demand-detail-action-panel', className)}>
      {title ? <p className="demand-detail-action-panel__title">{title}</p> : null}
      {children}
    </div>
  )
}

function DemandActionPanelWrap({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const reduceMotion = useReducedMotion()
  const smooth = {
    duration: reduceMotion ? 0.16 : 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  }

  return (
    <div
      className={cn(
        'demand-detail-action-dock',
        collapsed && 'demand-detail-action-dock--collapsed',
      )}
    >
      <div className="demand-detail-action-dock__inner">
        <button
          type="button"
          className="demand-detail-action-dock__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `展开${label}` : `收纳${label}`}
        >
          <span className="demand-detail-action-dock__toggle-label">{label}</span>
          <MsIcon
            name="keyboard_arrow_down"
            size={20}
            className={cn(
              'demand-detail-action-dock__toggle-icon',
              collapsed && 'demand-detail-action-dock__toggle-icon--collapsed',
            )}
          />
        </button>

        <motion.div
          className="demand-detail-action-dock__body"
          initial={false}
          animate={{
            height: collapsed ? 0 : 'auto',
            opacity: collapsed ? 0 : 1,
          }}
          transition={smooth}
        >
          <div className="demand-detail-action-dock__body-inner">{children}</div>
        </motion.div>
      </div>
    </div>
  )
}

function attachmentCount(d: { mediaUrls?: string[] }) {
  const urls = d.mediaUrls
  if (!urls?.length) return 1
  return Math.max(
    1,
    urls.filter((url) => /\.(jpg|jpeg|png|gif|webp)/i.test(url)).length,
  )
}

export default function DemandDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isLoggedIn, isFavorited, checkFavoriteStatus, toggleFavorite } =
    useUserStore()
  const currentUserId = user?.id

  const { addDemandToSingles, hand } = usePersistedGlobalHand()
  const singlesIdsRef = useRef<string[]>([])
  // 每次 hand 变化时更新 ref
  const singlesEntry = hand.find(
    (h) =>
      h.scope.path.length >= 2 &&
      h.scope.path[h.scope.path.length - 1] === '__singles__',
  )
  singlesIdsRef.current = singlesEntry?.scope.leafFilter ?? []
  const [allDemands, setAllDemands] = useState<any[]>([])
  const [favorited, setFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState(0)

  const allDemandsRef = useRef(allDemands)
  allDemandsRef.current = allDemands
  /** 本页已发起过详情预拉的 id（避免重复请求） */
  const prefetchedDetailIdsRef = useRef<Set<string>>(new Set())

  const demand = allDemands[currentIdx] || null

  const publisherCoverUrl = useMemo(() => {
    if (!demand) return resolveDemandCardCoverDetailUrl({})
    return resolveDemandCardCoverDetailUrl({
      coverImage: demand.coverImage,
      demandCardCoverUrl: demand.user?.demandCardCoverUrl,
      mediaUrls: demand.mediaUrls,
      userId: demand.userId,
    })
  }, [demand])

  const publisherAmbientCoverUrl = useMemo(() => {
    if (!demand) return resolveDemandCardCoverThumbUrl({})
    return resolveDemandCardCoverThumbUrl({
      coverImage: demand.coverImage,
      demandCardCoverUrl: demand.user?.demandCardCoverUrl,
      mediaUrls: demand.mediaUrls,
      userId: demand.userId,
    })
  }, [demand])

  const imageAttachmentCount = useMemo(
    () => attachmentCount(demand || {}),
    [demand],
  )

  const cardDescription = useMemo(() => {
    if (!demand) return ''
    return stripSeedFromDescription((demand.description as string) || '')
  }, [demand])

  const cardTitle = useMemo(() => {
    if (!demand) return ''
    return stripDebugFromTitle((demand.title as string) || '')
  }, [demand])

  const fetchAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      // 先获取当前需求详情
      const detailRes = await demandApi.get(id)
      const detail = detailRes.data.data
      if (!detail) throw new Error('需求不存在')

      // 从 ? 卡包获取手牌需求 ID 列表
      const singlesIds = singlesIdsRef.current

      let rawList: any[] = [detail]

      if (singlesIds.length > 0) {
        // 按 IDs 批量加载手牌需求
        const listRes = await demandApi.list({
          ids: singlesIds.join(','),
          limit: 200,
        })
        const fetched = (listRes.data.data?.demands || []) as any[]
        // 替换为最新数据
        const merged = fetched.map((d: any) =>
          d.id === id ? { ...d, ...detail } : d,
        )
        // 确保当前需求在列表中
        if (!merged.some((d: any) => d.id === id)) {
          merged.unshift(detail)
        }
        rawList = merged
      }

      let idx = rawList.findIndex((d: any) => d.id === id)
      if (idx === -1) idx = 0

      setAllDemands(rawList)
      setCurrentIdx(idx)
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  /** 路由或整页重载完成后重置预取记录，避免串单 */
  useEffect(() => {
    if (loading || !id) return
    prefetchedDetailIdsRef.current.clear()
    prefetchedDetailIdsRef.current.add(id)
  }, [id, loading])

  useEffect(() => {
    if (!demand?.id || !isLoggedIn) return
    setFavorited(isFavorited(demand.id))
    checkFavoriteStatus(demand.id).then(setFavorited)
  }, [demand?.id, isLoggedIn, isFavorited, checkFavoriteStatus])

  const handleToggleFavorite = useCallback(async () => {
    if (!demand?.id || !isLoggedIn) return
    setFavoriteLoading(true)
    try {
      const result = await toggleFavorite(demand.id)
      setFavorited(result)
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '收藏失败', 'error')
    } finally {
      setFavoriteLoading(false)
    }
  }, [demand, isLoggedIn, toggleFavorite])

  /** 空闲时预拉相邻详情 + 解码关键图（手机弱网自动缩小半径） */
  useEffect(() => {
    if (loading || !demand?.id) return
    const list = allDemandsRef.current
    if (!list.length) return
    const idx = currentIdx
    const r = neighborRadius()
    const ids: string[] = []
    const saveData =
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true

    if (saveData) {
      if (idx < list.length - 1) ids.push(list[idx + 1]!.id)
    } else {
      for (let d = 1; d <= r + 1; d++) {
        if (idx - d >= 0) ids.push(list[idx - d]!.id)
        if (idx + d < list.length) ids.push(list[idx + d]!.id)
      }
    }

    const cancel = scheduleIdle(() => {
      for (const nid of ids) {
        if (prefetchedDetailIdsRef.current.has(nid)) continue
        prefetchedDetailIdsRef.current.add(nid)
        demandApi
          .get(nid)
          .then((res) => {
            const detail = res.data.data as Record<string, unknown> | undefined
            if (!detail) {
              prefetchedDetailIdsRef.current.delete(nid)
              return
            }
            collectDemandImageUrls(detail as any).forEach(preloadImageSrc)
            setAllDemands((prev) => {
              const i = prev.findIndex((x: { id: string }) => x.id === nid)
              if (i === -1) return prev
              const copy = [...prev]
              copy[i] = { ...copy[i], ...detail }
              return copy
            })
          })
          .catch(() => {
            prefetchedDetailIdsRef.current.delete(nid)
          })
      }

      if (saveData) {
        collectDemandImageUrls(list[idx] as any).forEach(preloadImageSrc)
        if (idx + 1 < list.length)
          collectDemandImageUrls(list[idx + 1] as any).forEach(preloadImageSrc)
      } else {
        for (let d = -r - 1; d <= r + 1; d++) {
          const j = idx + d
          if (j < 0 || j >= list.length) continue
          collectDemandImageUrls(list[j] as any).forEach(preloadImageSrc)
        }
      }
    }, 2000)

    return cancel
  }, [loading, demand?.id, currentIdx])

  const demandSearchQS = useMemo(() => {
    const q = (searchParams.get('q') ?? '').trim()
    const t = searchParams.get('type') ?? ''
    const c = (searchParams.get('category') ?? '').trim()
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (t === 'ONLINE' || t === 'OFFLINE') p.set('type', t)
    if (c) p.set('category', c)
    const s = p.toString()
    return s ? '?' + s : ''
  }, [searchParams])

  const goNext = useCallback(() => {
    if (allDemands.length < 2) return
    setDirection(1)
    if (currentIdx >= allDemands.length - 1) {
      const next = allDemands[0]!
      setCurrentIdx(0)
      navigate(`/demands/${next.id}${demandSearchQS}`, { replace: true })
      return
    }
    const next = allDemands[currentIdx + 1]!
    setCurrentIdx(currentIdx + 1)
    navigate(`/demands/${next.id}${demandSearchQS}`, { replace: true })
  }, [currentIdx, allDemands, navigate, demandSearchQS])

  const goPrev = useCallback(() => {
    if (allDemands.length < 2) return
    setDirection(-1)
    if (currentIdx <= 0) {
      const last = allDemands.length - 1
      const prev = allDemands[last]!
      setCurrentIdx(last)
      navigate(`/demands/${prev.id}${demandSearchQS}`, { replace: true })
      return
    }
    const prev = allDemands[currentIdx - 1]!
    setCurrentIdx(currentIdx - 1)
    navigate(`/demands/${prev.id}${demandSearchQS}`, { replace: true })
  }, [currentIdx, allDemands, navigate, demandSearchQS])

  if (loading)
    return pageShell(
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-3/5 rounded-lg" />
        <Skeleton className="h-5 w-2/5 rounded" />
        <Skeleton className="mt-4 h-48 w-full rounded-xl" />
        <Skeleton className="h-6 w-1/3 rounded" />
      </div>,
    )
  if (error) {
    return pageShell(
      <div className="flex flex-col items-center gap-3 text-center py-16">
        <p className="text-sm text-text-muted">{error}</p>
        <AcetUnapologeticButton
          type="button"
          onClick={fetchAll}
          className="!border-accent/40 !text-accent"
        >
          重试
        </AcetUnapologeticButton>
      </div>,
    )
  }
  if (!demand) return pageShell(<ErrorState message="需求不存在或已被删除" />)

  const canSwipeCycle = allDemands.length > 1
  const hasPrev = canSwipeCycle
  const hasNext = canSwipeCycle

  return (
    <div className="demand-detail-page relative isolate flex h-full min-h-0 w-full min-w-0 flex-col items-stretch bg-bg-primary">
      <div className="relative z-20 shrink-0 px-4 pt-3">
        <PageHeader
          title={stripDebugFromTitle(demand.title)}
          onBack="back"
          divider={false}
          className="mb-0"
        />
      </div>
      <UserCoverAmbientBg userId={demand.userId} coverUrl={publisherAmbientCoverUrl} />

      {/* 不用 overflow-y-auto 包住卡片：会与 x 轴合成 auto，横向裁掉 3D 翻面/倾斜溢出；整页滚动交给外层 layout */}
      <div className="relative z-10 flex min-h-0 flex-1 w-full flex-col overflow-y-auto thin-scroll">
        <div className="flex flex-1 flex-col items-center justify-center overflow-visible px-3 py-6">
        <AnimatePresence mode="sync" custom={direction}>
          <motion.div
            custom={direction}
            initial={{ opacity: 0, y: direction * 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -direction * 48 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex w-full min-w-0 flex-col items-center px-3"
          >
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={!isLoggedIn || favoriteLoading}
                className="absolute -right-2 -top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary/80 backdrop-blur-sm text-white shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
                aria-label={favorited ? '取消收藏' : '收藏'}
              >
                <MsIcon
                  name="favorite"
                  size={20}
                  filled={favorited}
                  className={favorited ? 'text-red-500' : undefined}
                />
              </button>
              <CometCard
                className="w-fit max-w-full shrink-0"
                rotateDepth={12}
                translateDepth={14}
                hoverScale={1}
              >
                <InteractiveProductCard
                  disableSurfaceTilt
                  innerSheen
                  flipDescription
                  imageUrl={publisherCoverUrl}
                  logoUrl={demand.user?.avatarUrl || '/favicon.svg'}
                  publisherUserId={demand.userId}
                  title={cardTitle}
                  description={cardDescription}
                  price={`¥${demand.minPrice}`}
                  avatarTo={
                    demand.userId ? `/profile/${demand.userId}` : undefined
                  }
                  avatarLabel={
                    demand.user?.nickname
                      ? `查看 ${demand.user.nickname} 的主页`
                      : '查看发布者主页'
                  }
                  dotCount={Math.min(imageAttachmentCount, 6)}
                  activeDotIndex={0}
                  onSwipeNext={hasNext ? goNext : undefined}
                  onSwipePrev={hasPrev ? goPrev : undefined}
                  onAddToHand={() => {
                    if (demand?.id) {
                      addDemandToSingles(demand.id)
                      toast('已加入手牌', 'success')
                    }
                  }}
                  className="shadow-none"
                />
              </CometCard>
            </div>
          </motion.div>
        </AnimatePresence>
        </div>

        {demand.userId === currentUserId ? (
          <div className="relative z-10 mx-auto flex w-full max-w-md justify-center px-3 pb-2">
            <PathFlowEntryLink
              to={`/demands/${demand.id}/paths`}
              label="编辑匹配路径"
            />
          </div>
        ) : null}

        {/* ═══ AI 2.5: 两段式接单面板 ═══ */}
        {demand.status === 'ACTIVE' || demand.status === 'PENDING' ? (
          demand.userId !== currentUserId ? (
            <DemandActionPanelWrap label="请求接单">
              <RequestPanel demandId={demand.id} />
            </DemandActionPanelWrap>
          ) : demand.applicantCount > 0 ? (
            <DemandActionPanelWrap label={`申请接单 (${demand.applicantCount})`}>
              <ApplicantListPanel demandId={demand.id} />
            </DemandActionPanelWrap>
          ) : null
        ) : demand.status === 'IN_PROGRESS' ? (
          <DemandActionPanelWrap label="服务进行中">
            <InProgressPanel demand={demand} userId={currentUserId} />
          </DemandActionPanelWrap>
        ) : demand.status === 'COMPLETED' || demand.stage === 'completed' ? (
          <SettlementPanel demandId={demand.id} />
        ) : null}
      </div>
    </div>
  )
}

// ═══ AI 2.5: 请求接单面板（服务者视角）═══
function RequestPanel({ demandId }: { demandId: string }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!message.trim()) return
    setLoading(true)
    setError('')
    try {
      await demandApi.requestDemand(demandId, message.trim())
      setDone(true)
      toast('已申请，等待发布者回应')
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  if (done)
    return (
      <DemandActionPanel>
        <p className="demand-detail-action-panel__done">已提交申请</p>
      </DemandActionPanel>
    )

  return (
    <DemandActionPanel>
      <textarea
        className="demand-detail-action-panel__input"
        rows={3}
        placeholder="描述你能解决该需求的原因..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error ? <p className="demand-detail-action-panel__error">{error}</p> : null}
      <div className="demand-detail-action-panel__actions">
        <button
          type="button"
          disabled={loading || !message.trim()}
          onClick={submit}
          className="demand-detail-action-panel__submit"
        >
          {loading ? '提交中...' : '提交申请'}
        </button>
      </div>
    </DemandActionPanel>
  )
}

// ═══ AI 2.5: 申请人列表面板（发布者视角）═══
function ApplicantListPanel({ demandId }: { demandId: string }) {
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    demandApi
      .getApplicantsV2(demandId)
      .then((r: any) => setApplicants(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [demandId])

  async function accept(applicantId: string) {
    try {
      const res = await demandApi.acceptApplicant(demandId, applicantId)
      const orderId = (res.data as any)?.data?.orderId
      toast('已确认接单，正在跳转支付页...')
      setApplicants((prev) => prev.filter((a) => a.id !== applicantId))
      if (orderId) {
        navigate(/payment/)
      }
    } catch (e: any) {
      toast(e.response?.data?.message || '操作失败')
    }
  }

  async function reject(applicantId: string) {
    await demandApi.rejectApplicant(demandId, applicantId)
    setApplicants((prev) => prev.filter((a) => a.id !== applicantId))
  }

  if (loading)
    return <p className="demand-detail-action-panel__hint">加载中...</p>
  if (applicants.length === 0) return null

  return (
    <DemandActionPanel>
      <div className="demand-detail-action-panel__list">
        {applicants.map((a) => (
          <div key={a.id} className="demand-detail-action-panel__list-item">
            <div className="min-w-0 flex-1">
              <p className="demand-detail-action-panel__list-name">
                {a.user?.nickname || '匿名'}
              </p>
              <p className="demand-detail-action-panel__list-msg">{a.message}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => accept(a.id)}
                className="demand-detail-action-panel__accept"
              >
                接受
              </button>
              <button
                type="button"
                onClick={() => reject(a.id)}
                className="demand-detail-action-panel__reject"
              >
                拒绝
              </button>
            </div>
          </div>
        ))}
      </div>
    </DemandActionPanel>
  )
}

// ═══ P0-04: 进行中需求细节面板(订单/支付入口) ═══
function InProgressPanel({ demand, userId }: { demand: any; userId?: string }) {
  const navigate = useNavigate()
  const isOwner = demand.userId === userId
  const isAccepted = demand.acceptedProviderId === userId
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 尝试从 demand 关联订单；若无则从订单列表按 demandId 匹配
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // 实际在接受时 P0-01 已经在 orderId 中；如果 demand 是 IN_PROGRESS，它定有其应的 Order
        const res = await orderApi.list({ role: isOwner ? 'requester' : 'provider', page: 1 })
        const list = (res.data as any)?.data?.orders || []
        const found = list.find((o: any) => o.demandId === demand.id)
        if (!cancelled) setOrder(found || null)
      } catch {
        if (!cancelled) setOrder(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [demand.id, isOwner])

  if (loading) {
    return <p className="demand-detail-action-panel__hint">加载中...</p>
  }

  const status = order?.status
  const isReady = !!order

  return (
    <DemandActionPanel>
      {isReady ? (
        <div className="demand-detail-action-panel__stack">
          {isOwner && status === 'IN_PROGRESS' && !order.paidAt && (
            <button
              type="button"
              onClick={() => navigate(`/payment/${order.id}`)}
              className="demand-detail-action-panel__submit demand-detail-action-panel__submit--block"
            >
              去支付
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/orders/${order.id}`)}
            className="demand-detail-action-panel__secondary"
          >
            查看订单
          </button>
          <button
            type="button"
            onClick={() => navigate(`/messages/${isOwner ? order.providerId : order.requesterId}`)}
            className="demand-detail-action-panel__secondary"
          >
            联系对方
          </button>
        </div>
      ) : (
        <p className="demand-detail-action-panel__hint">订单未生成，请稍后刷新</p>
      )}
    </DemandActionPanel>
  )
}

// ═══ AI 2.8: 结算明细面板 ═══
function SettlementPanel({ demandId }: { demandId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    demandApi
      .getSettlement(demandId)
      .then((res) => setData(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [demandId])

  if (loading)
    return <p className="text-center text-sm text-white/40">加载结算明细...</p>
  if (!data) return null

  const s = data.summary || data.breakdown?.summary
  const items = data.breakdown?.items || data.items || []

  return (
    <div className="relative z-10 mx-auto mt-6 w-full max-w-md px-3">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 backdrop-blur-md">
        <p className="mb-3 text-sm font-medium text-emerald-400">结算明细</p>
        <div className="space-y-2 text-sm">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span className="text-white/50">{item.label}</span>
              <span className="text-white/70">
                {item.direction === 'PAY' ? '-' : '+'}¥{item.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {s && (
            <>
              <div className="my-1 border-t border-white/10" />
              <div className="flex justify-between font-medium">
                <span className="text-white/60">需求者支付</span>
                <span className="text-red-400">
                  -¥{s.demanderPaid.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-white/60">服务者收入</span>
                <span className="text-emerald-400">
                  +¥{s.providerReceived.toFixed(2)}
                </span>
              </div>
              {s.depositReturned > 0 && (
                <div className="flex justify-between font-medium">
                  <span className="text-white/60">押金退回</span>
                  <span className="text-amber-400">
                    +¥{s.depositReturned.toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        {data.timestamp && (
          <p className="mt-3 text-xs text-white/20">
            结算时间：{new Date(data.timestamp).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  )
}
