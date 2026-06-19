import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SegmentedFilter,
  SettingsInput,
  SettingsActionButton,
  StatusChip,
} from '@/components/layout/internal-ui'
import { ListItemCard } from '@/components/ui/list-item-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { toast } from '@/components/ui/confirm-dialog'

const roleLabel: Record<string, string> = {
  OWNER: '圈主',
  ADMIN: '管理员',
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

function CircleListItem({
  name,
  description,
  memberCount,
  badge,
  badgeTone = 'blue',
  onNavigate,
}: {
  name: string
  description?: string | null
  memberCount: number
  badge: string
  badgeTone?: 'blue' | 'green' | 'amber'
  onNavigate: () => void
}) {
  const chipClass =
    badgeTone === 'green'
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
      : badgeTone === 'amber'
        ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
        : 'border-[var(--internal-accent)]/35 bg-[var(--internal-accent)]/10 text-blue-300'

  return (
    <ListItemCard variant="internal" onClick={onNavigate} className="p-4">
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-wide text-text-primary">
            {name}
          </h2>
          <StatusChip label={badge} className={chipClass} />
        </div>
        <div className="flex items-end justify-between gap-4">
          <span className="line-clamp-1 text-sm text-text-secondary">
            {description?.trim() || '暂无简介'}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-mono text-xs uppercase tracking-wider text-text-muted">
            <MsIcon name={STITCH_PAGE_ICONS.circles} size={14} aria-hidden />
            {memberCount}人
          </span>
        </div>
      </div>
    </ListItemCard>
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
  const [tab, setTab] = useState<'mine' | 'discover'>('mine')

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
      toast('请输入圈子名称', 'info')
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
      toast('创建成功', 'success')
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

  const activeList =
    tab === 'mine'
      ? myCircles.map((m) => {
          const c = m.circle
          const id = c?.id ?? m.circleId
          return {
            key: m.circleId,
            id,
            name: c?.name?.trim() || '未命名圈子',
            description: c?.description,
            memberCount: c?._count?.members ?? 1,
            badge: roleLabel[m.role] ?? m.role,
            badgeTone: 'blue' as const,
          }
        })
      : circles.map((c) => ({
          key: c.id,
          id: c.id,
          name: c.name,
          description: c.description,
          memberCount: c._count?.members ?? 0,
          badge: '公开',
          badgeTone: 'green' as const,
        }))

  return (
    <InternalPageShell width="medium">
      <PageHeader
        title="圈子"
        subtitle="加入志同道合的圈子，交流经验、分享资源、找到合作机会"
        onBack="back"
        actions={
          <>
            <SettingsActionButton
              disabled={loading}
              onClick={() => void fetchCircles()}
            >
              <MsIcon
                name="refresh"
                size={14}
                className={cn('mr-1.5', loading && 'animate-spin')}
                aria-hidden
              />
              刷新
            </SettingsActionButton>
            <SettingsActionButton
              variant="primary"
              onClick={() => setShowCreate(true)}
            >
              <MsIcon name="add" size={14} className="mr-1.5" aria-hidden />
              创建圈子
            </SettingsActionButton>
          </>
        }
      />

      <InternalContentBlock>
        <SegmentedFilter
          options={[
            { value: 'mine', label: `我的圈子 (${myCircles.length})` },
            { value: 'discover', label: `发现圈子 (${circles.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {error ? (
          <EmptyState
            variant="internal"
            type="circle"
            message={error}
            actionLabel="重试"
            onAction={() => void fetchCircles()}
          />
        ) : null}

        {loading && !error ? <LoadingState variant="internal" lines={4} /> : null}

        {!loading && !error && activeList.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {activeList.map((item) => (
              <CircleListItem
                key={item.key}
                name={item.name}
                description={item.description}
                memberCount={item.memberCount}
                badge={item.badge}
                badgeTone={item.badgeTone}
                onNavigate={() => navigate(`/circles/${item.id}`)}
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && activeList.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState
              variant="internal"
              type="circle"
              message="还没有加入圈子。去发现页面浏览公开圈子吧。"
              actionLabel="发现圈子"
              onAction={() => setTab('discover')}
            />
          ) : (
            <EmptyState
              variant="internal"
              type="circle"
              message="还没有人创建圈子，成为第一个吧。"
              actionLabel="创建圈子"
              onAction={() => setShowCreate(true)}
            />
          )
        ) : null}
      </InternalContentBlock>

      {showCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onClick={() => !createBusy && setShowCreate(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="circles-create-title"
            className="settings-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--internal-radius)] sm:rounded-[var(--internal-radius)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--internal-hairline)] px-6 py-5">
              <h2
                id="circles-create-title"
                className="text-lg font-semibold tracking-wide text-text-primary"
              >
                创建圈子
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                创建一个圈子，邀请志同道合的朋友加入
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="circle-name">圈子名称</Label>
                <SettingsInput
                  value={createForm.name}
                  onChange={(v) => setCreateForm((p) => ({ ...p, name: v }))}
                  placeholder="给圈子取个名字"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circle-desc">圈子简介</Label>
                <Textarea
                  id="circle-desc"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="介绍一下这个圈子"
                  rows={4}
                  className="resize-none border-[var(--internal-hairline)] bg-transparent text-text-primary"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--internal-hairline)] px-6 py-4">
              <SettingsActionButton
                disabled={createBusy}
                onClick={() => setShowCreate(false)}
              >
                取消
              </SettingsActionButton>
              <SettingsActionButton
                variant="primary"
                disabled={createBusy}
                onClick={() => void createCircle()}
              >
                {createBusy ? (
                  <>
                    <MsIcon name="progress_activity" size={14} className="mr-1.5 animate-spin" aria-hidden />
                    创建中...
                  </>
                ) : (
                  '创建'
                )}
              </SettingsActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </InternalPageShell>
  )
}
