import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { cn } from '@/lib/utils'
import {
  Compass,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/confirm-dialog'

const roleLabel: Record<string, string> = {
  OWNER: '圈主',
  ADMIN: '管理',
  MEMBER: '成员',
}

type CircleCounts = { members?: number }

type CircleBrief = {
  id: string
  name: string
  description?: string | null
  coverUrl?: string | null
  type?: string
  _count?: CircleCounts
}

type MyCircleRow = {
  circleId: string
  role: string
  circle?: CircleBrief
}

function CircleTile({
  name,
  description,
  coverUrl,
  memberCount,
  badge,
  badgeVariant,
  onNavigate,
}: {
  name: string
  description?: string | null
  coverUrl?: string | null
  memberCount: number
  badge: string
  badgeVariant: 'role' | 'public'
  onNavigate: () => void
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-sm',
        'transition-all duration-300 hover:border-accent/35 hover:shadow-lg hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/12 via-muted to-muted">
            <span className="text-4xl font-black tracking-tighter text-foreground/10">
              {name?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <Badge
          variant="secondary"
          className={cn(
            'absolute right-2.5 top-2.5 border backdrop-blur-md',
            badgeVariant === 'public' &&
              'border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            badgeVariant === 'role' &&
              'border-primary/25 bg-primary/15 text-primary dark:text-primary-foreground/90',
          )}
        >
          {badge}
        </Badge>
        <div className="absolute inset-x-0 bottom-0 p-3.5 pt-10">
          <p className="line-clamp-1 text-base font-bold tracking-tight text-foreground drop-shadow-sm">
            {name}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-border/60 bg-card/90 px-3.5 py-3 backdrop-blur-sm">
        {description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/80">暂无简介</p>
        )}
        <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="size-3.5 opacity-80" aria-hidden />
          <span>{memberCount} 位成员</span>
        </div>
      </div>
    </button>
  )
}

function CirclesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card/50"
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-2 p-3.5">
            <Skeleton className="h-3 w-[85%]" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Circles() {
  const navigate = useNavigate()
  const [circles, setCircles] = useState<CircleBrief[]>([])
  const [myCircles, setMyCircles] = useState<MyCircleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })

  async function fetchCircles() {
    setLoading(true)
    setError('')
    try {
      const [pub, my] = await Promise.all([circleApi.list(), circleApi.my()])
      setCircles(pub.data.data as CircleBrief[])
      setMyCircles(my.data.data as MyCircleRow[])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function createCircle() {
    if (!createForm.name.trim()) {
      toast('请填写圈子名称', 'info')
      return
    }
    setCreateBusy(true)
    try {
      await circleApi.create({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      })
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
      toast('圈子已创建', 'success')
      void fetchCircles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '创建失败', 'error')
    } finally {
      setCreateBusy(false)
    }
  }

  useEffect(() => {
    void fetchCircles()
  }, [])

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto thin-scroll bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(420px,55vh)] opacity-70"
        aria-hidden
      >
        <div className="absolute -left-24 top-0 size-[380px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-24 size-[320px] rounded-full bg-accent/12 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
              <Compass className="size-3.5 text-primary" aria-hidden />
              需求圈
            </div>
            <h1 className="text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-[1.08]">
              与同行组局，
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                把需求跑起来
              </span>
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              加入或创建圈子，沉淀垂直领域的人脉与订单；圈内发布的需求更容易被信任与响应。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={loading}
              onClick={() => void fetchCircles()}
            >
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin')}
                aria-hidden
              />
              刷新
            </Button>
            <Button
              type="button"
              size="lg"
              className="gap-2 rounded-xl shadow-md"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="size-4" aria-hidden />
              创建圈子
            </Button>
          </div>
        </div>

        {!loading && !error && (myCircles.length > 0 || circles.length > 0) ? (
          <div className="mb-8 flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-4 py-2.5 text-sm backdrop-blur-sm">
              <Users className="size-4 text-primary" aria-hidden />
              <span className="text-muted-foreground">我已加入</span>
              <span className="font-bold tabular-nums text-foreground">
                {myCircles.length}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-4 py-2.5 text-sm backdrop-blur-sm">
              <Sparkles className="size-4 text-amber-500/90" aria-hidden />
              <span className="text-muted-foreground">公开圈子</span>
              <span className="font-bold tabular-nums text-foreground">
                {circles.length}
              </span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-20">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => void fetchCircles()}
            >
              重试
            </Button>
          </div>
        ) : null}

        {loading && !error ? <CirclesSkeleton /> : null}

        {!loading && !error ? (
          <div className="flex flex-col gap-14">
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    我的圈子
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    你正在协作的圈子，点击进入详情
                  </p>
                </div>
              </div>
              {myCircles.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myCircles.map((m) => {
                    const c = m.circle
                    const id = c?.id ?? m.circleId
                    const name = c?.name?.trim() || '未命名圈子'
                    return (
                      <CircleTile
                        key={m.circleId}
                        name={name}
                        description={c?.description}
                        coverUrl={c?.coverUrl}
                        memberCount={c?._count?.members ?? 1}
                        badge={roleLabel[m.role] ?? m.role}
                        badgeVariant="role"
                        onNavigate={() => navigate(`/circles/${id}`)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-12 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                    <Users
                      className="size-6 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    还没有加入任何圈子
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    在下方发现公开圈，或创建自己的圈子并邀请成员。
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-5"
                    onClick={() => setShowCreate(true)}
                  >
                    创建圈子
                  </Button>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    发现圈子
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    公开圈子，加入后即可在圈内发布与浏览需求
                  </p>
                </div>
                {circles.length > 0 ? (
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    共 {circles.length} 个
                  </span>
                ) : null}
              </div>
              {circles.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {circles.map((c) => (
                    <CircleTile
                      key={c.id}
                      name={c.name}
                      description={c.description}
                      coverUrl={c.coverUrl}
                      memberCount={c._count?.members ?? 0}
                      badge="公开"
                      badgeVariant="public"
                      onNavigate={() => navigate(`/circles/${c.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/80 bg-card/40 px-6 py-14 text-center backdrop-blur-sm">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-border bg-background">
                    <Lock
                      className="size-5 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    暂无公开圈子
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                    成为第一个创建者，把团队或社群搬到 Ninewood。
                  </p>
                  <Button
                    type="button"
                    className="mt-5"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="size-4" aria-hidden />
                    创建圈子
                  </Button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>

      {showCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onClick={() => !createBusy && setShowCreate(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="circles-create-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border/80 px-5 py-4 sm:px-6">
              <h2
                id="circles-create-title"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                创建圈子
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                取个好记的名字，简介可帮助他人判断是否加入。
              </p>
            </div>
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="circle-name">圈子名称</Label>
                <Input
                  id="circle-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="例如：同城上门安装互助会"
                  maxLength={48}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circle-desc">简介（可选）</Label>
                <Textarea
                  id="circle-desc"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="这个圈子主要讨论什么？适合谁加入？"
                  rows={4}
                  className="resize-none"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/80 px-5 py-4 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                disabled={createBusy}
                onClick={() => setShowCreate(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={createBusy}
                onClick={() => void createCircle()}
              >
                {createBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    创建中
                  </>
                ) : (
                  '创建'
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
