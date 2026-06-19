import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Crown,
  Loader2,
  Lock,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ListItemCard } from '@/components/ui/list-item-card'
import {
  DemandCardInner,
  type DemandRow,
} from '@/components/demand/DemandDiscoveryList'
import { toast } from '@/components/ui/confirm-dialog'

const roleLabel: Record<string, string> = {
  OWNER: '圈主',
  ADMIN: '管理',
  MEMBER: '成员',
}

const statusMap: Record<string, { label: string; cls: string }> = {
  ACTIVE: {
    label: '活跃',
    cls: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  },
  WARNING: {
    label: '低活跃',
    cls: 'border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-300',
  },
  DEFUNCT: {
    label: '已失效',
    cls: 'border-red-500/35 bg-red-500/12 text-red-700 dark:text-red-300',
  },
}

type CircleMember = {
  userId: string
  role: string
  user?: {
    nickname?: string
    avatarUrl?: string | null
  }
}

type CircleDetailData = {
  id: string
  name: string
  description?: string | null
  coverUrl?: string | null
  type?: string
  status?: string
  owner?: { id?: string; nickname?: string }
  members?: CircleMember[]
  _count?: { members?: number }
}

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useUserStore((s) => s.user?.id)
  const [circle, setCircle] = useState<CircleDetailData | null>(null)
  const [demands, setDemands] = useState<DemandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [joinBusy, setJoinBusy] = useState(false)

  const isMember = Boolean(circle?.members?.some((m) => m.userId === userId))
  const isPublic = circle?.type === 'PUBLIC'
  const canJoin = Boolean(
    id && isPublic && !isMember && circle?.status !== 'DEFUNCT',
  )

  const fetchAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [cRes, dRes] = await Promise.all([
        circleApi.get(id),
        circleApi.getDemands(id),
      ])
      setCircle(cRes.data.data as CircleDetailData)
      setDemands((dRes.data.data?.demands as DemandRow[]) || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  async function handleJoin() {
    if (!id || !canJoin) return
    setJoinBusy(true)
    try {
      await circleApi.join(id)
      toast('已加入圈子', 'success')
      await fetchAll()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '加入失败', 'error')
    } finally {
      setJoinBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-background">
        <div className="relative z-10 box-border flex min-h-full w-full max-w-3xl shrink-0 self-center flex-col gap-4 px-4 pb-12 pt-16 sm:px-6 sm:pt-20">
          <Skeleton className="h-52 w-full rounded-3xl sm:h-60" />
          <div className="-mt-10 relative z-10 rounded-2xl border border-border bg-card p-6 shadow-lg">
            <Skeleton className="mx-auto h-8 w-2/3 max-w-md" />
            <div className="mt-4 flex justify-center gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-6 h-16 w-full rounded-xl" />
          </div>
          <div className="mt-8 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-background">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
          <p className="text-center text-sm text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => void fetchAll()}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (!circle) return null

  const st = statusMap[circle.status || 'ACTIVE'] || statusMap.ACTIVE
  const memberCount = circle._count?.members ?? circle.members?.length ?? 0
  const previewMembers = (circle.members || []).slice(0, 8)

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-background">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0 bg-cover bg-center',
          !circle.coverUrl &&
            'bg-gradient-to-br from-primary/15 via-muted to-muted',
        )}
        style={
          circle.coverUrl
            ? {
                backgroundImage: `url(${circle.coverUrl})`,
              }
            : undefined
        }
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-background/30 via-background/72 to-background" />
      <div className="relative z-10 box-border flex min-h-full w-full max-w-3xl shrink-0 self-center flex-col px-4 pb-16 sm:px-6">
        <div className="h-24 shrink-0 sm:h-28" aria-hidden />
        <div className="relative z-[2] mx-0 rounded-2xl border border-border bg-card/95 px-5 pb-5 pt-7 shadow-lg backdrop-blur-md sm:px-6 sm:pb-6 sm:pt-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('font-semibold', st.cls)}>
                {st.label}
              </Badge>
              <Badge variant="secondary" className="font-medium">
                {circle.type === 'PUBLIC' ? '公开圈' : '私密圈'}
              </Badge>
            </div>
            <h1 className="text-balance text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {circle.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {memberCount} 位成员
              </span>
              {circle.owner?.nickname ? (
                <span className="inline-flex items-center gap-1.5">
                  <Crown
                    className="size-3.5 shrink-0 text-amber-600/90 dark:text-amber-400/90"
                    aria-hidden
                  />
                  圈主 {circle.owner.nickname}
                </span>
              ) : null}
            </div>
          </div>
          {(circle.status === 'WARNING' || circle.status === 'DEFUNCT') && (
            <div
              className={cn(
                'mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs sm:text-sm',
                circle.status === 'DEFUNCT'
                  ? 'border-red-500/25 bg-red-500/8 text-red-700 dark:text-red-300'
                  : 'border-amber-500/25 bg-amber-500/8 text-amber-900 dark:text-amber-200',
              )}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {circle.status === 'DEFUNCT'
                  ? '该圈子已失效，仅可浏览历史信息。'
                  : '圈子活跃度较低，欢迎发布新需求或邀请成员。'}
              </span>
            </div>
          )}

          {circle.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {circle.description}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/80">
              暂无圈子简介
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {canJoin ? (
              <Button
                type="button"
                className="w-full gap-2 sm:w-auto"
                disabled={joinBusy}
                onClick={() => void handleJoin()}
              >
                {joinBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="size-4" aria-hidden />
                )}
                加入圈子
              </Button>
            ) : null}
            {!isMember && !isPublic ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground sm:w-auto sm:justify-start sm:px-5">
                <Lock className="size-4 shrink-0" aria-hidden />
                私密圈，仅限邀请加入
              </div>
            ) : null}
            {isMember ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:ml-auto sm:w-auto"
                onClick={() =>
                  navigate(`/demands/create?circleId=${circle.id}`)
                }
              >
                在圈内发布需求
              </Button>
            ) : null}
          </div>

          {previewMembers.length > 0 ? (
            <div className="mt-6 border-t border-border/80 pt-5">
              <button
                type="button"
                onClick={() => setShowMembers((v) => !v)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-sm font-semibold text-foreground">
                  成员
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {showMembers ? '收起' : `查看全部 · ${memberCount}`}
                </span>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {previewMembers.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    title={m.user?.nickname}
                    onClick={() => navigate(`/profile/${m.userId}`)}
                    className={cn(
                      'relative flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted text-xs font-bold text-muted-foreground',
                      'ring-1 ring-border/80 transition hover:z-10 hover:ring-primary/40',
                    )}
                  >
                    {m.user?.avatarUrl ? (
                      <img
                        src={m.user.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      m.user?.nickname?.charAt(0) || '?'
                    )}
                  </button>
                ))}
                {memberCount > previewMembers.length ? (
                  <span className="text-xs text-muted-foreground">
                    +{memberCount - previewMembers.length}
                  </span>
                ) : null}
              </div>

              {showMembers && circle.members ? (
                <ul className="mt-4 space-y-1 rounded-xl border border-border/80 bg-muted/10 p-1">
                  {circle.members.map((m) => (
                    <li key={m.userId}>
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${m.userId}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-muted/60"
                      >
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-bold',
                          )}
                        >
                          {m.user?.avatarUrl ? (
                            <img
                              src={m.user.avatarUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            m.user?.nickname?.charAt(0) || '?'
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {m.user?.nickname || '用户'}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {roleLabel[m.role] || m.role}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                圈内需求
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                点击卡片查看详情与 3D 展示
              </p>
            </div>
          </div>
          {demands.length > 0 ? (
            <div className="flex flex-col gap-3">
              {demands.map((d) => (
                <ListItemCard
                  key={d.id}
                  onClick={() => navigate(`/demands/${d.id}`)}
                  className="p-0"
                >
                  <div className="p-4">
                    <DemandCardInner d={d} />
                  </div>
                </ListItemCard>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
              <p className="text-sm font-medium text-foreground">
                暂无圈内需求
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                {isMember
                  ? '发布一条需求，让圈子里的伙伴看见你。'
                  : '加入圈子后即可发布与浏览圈内需求。'}
              </p>
              {isMember ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-5"
                  onClick={() =>
                    navigate(`/demands/create?circleId=${circle.id}`)
                  }
                >
                  发布需求
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
