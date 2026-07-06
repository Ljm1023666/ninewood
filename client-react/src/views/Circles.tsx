import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { SegmentedFilter } from '@/components/layout/internal-ui'
import {
  DesktopPageShell,
  DlpGlass,
  DlpBadge,
  DlpEmpty,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'
import { LoadingState } from '@/components/ui/loading-state'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
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
  badgeTone = 'default',
  onNavigate,
}: {
  name: string
  description?: string | null
  memberCount: number
  badge: string
  badgeTone?: 'default' | 'gold' | 'success'
  onNavigate: () => void
}) {
  return (
    <button type="button" className="dlp-record-row" onClick={onNavigate}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="dlp-record-row__title truncate">{name}</h2>
            <DlpBadge tone={badgeTone} rect>
              {badge}
            </DlpBadge>
          </div>
          <p className="dlp-record-row__meta line-clamp-2">
            {description?.trim() || '暂无简介'}
          </p>
        </div>
        <span className="dlp-record-row__aside flex items-center gap-1.5">
          <MsIcon name={STITCH_PAGE_ICONS.circles} size={18} aria-hidden />
          {memberCount} 人
        </span>
      </div>
    </button>
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
            badgeTone: 'gold' as const,
          }
        })
      : circles.map((c) => ({
          key: c.id,
          id: c.id,
          name: c.name,
          description: c.description,
          memberCount: c._count?.members ?? 0,
          badge: '公开',
          badgeTone: 'success' as const,
        }))

  return (
    <DesktopPageShell
      title="圈子"
      subtitle="加入志同道合的圈子，交流经验、分享资源、找到合作机会"
      actions={
        <div className="flex items-center gap-3">
          <LiquidMetalButton
            viewMode="icon"
            icon={
              <MsIcon
                name="refresh"
                size={16}
                className={cn(loading && 'animate-spin')}
                aria-hidden
              />
            }
            aria-label="刷新"
            disabled={loading}
            onClick={() => void fetchCircles()}
          />
          <LiquidMetalButton label="创建圈子" onClick={() => setShowCreate(true)} />
        </div>
      }
    >
      <SegmentedFilter
        className="mb-6"
        size="large"
        options={[
          { value: 'mine', label: `我的圈子 (${myCircles.length})` },
          { value: 'discover', label: `发现圈子 (${circles.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {error ? (
        <DlpGlass>
          <DlpEmpty
            icon={<MsIcon name="error_outline" size={48} />}
            title="加载失败"
            description={error}
            action={<DlpBtnPrimary onClick={() => void fetchCircles()}>重试</DlpBtnPrimary>}
          />
        </DlpGlass>
      ) : null}

      {loading && !error ? <LoadingState variant="internal" lines={4} /> : null}

      {!loading && !error && activeList.length > 0 ? (
        <div className="dlp-record-table">
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
        <DlpGlass>
          {tab === 'mine' ? (
            <DlpEmpty
              icon={<MsIcon name="groups" size={48} />}
              title="未加入圈子"
              description="还没有加入圈子。去发现页面浏览公开圈子吧。"
              action={
                <LiquidMetalButton
                  label="发现圈子"
                  onClick={() => setTab('discover')}
                />
              }
            />
          ) : (
            <DlpEmpty
              icon={<MsIcon name="groups" size={48} />}
              title="暂无公开圈子"
              description="还没有人创建圈子，成为第一个吧。"
              action={
                <LiquidMetalButton
                  label="创建圈子"
                  onClick={() => setShowCreate(true)}
                />
              }
            />
          )}
        </DlpGlass>
      ) : null}

      {showCreate ? (
        <div
          className="dlp-modal-backdrop"
          role="presentation"
          onClick={() => !createBusy && setShowCreate(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="circles-create-title"
            className="dlp-glass dlp-modal max-h-[90vh] overflow-y-auto thin-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="circles-create-title">创建圈子</h3>
            <p className="mb-5 text-sm text-text-muted">
              创建一个圈子，邀请志同道合的朋友加入
            </p>
            <div className="dlp-field">
              <label className="dlp-label" htmlFor="circle-name">
                圈子名称
              </label>
              <input
                id="circle-name"
                className="dlp-input"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="给圈子取个名字"
              />
            </div>
            <div className="dlp-field">
              <label className="dlp-label" htmlFor="circle-desc">
                圈子简介
              </label>
              <textarea
                id="circle-desc"
                className="dlp-textarea"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="介绍一下这个圈子"
                rows={4}
                maxLength={500}
              />
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <LiquidMetalButton
                label="取消"
                disabled={createBusy}
                onClick={() => setShowCreate(false)}
              />
              <LiquidMetalButton
                label={createBusy ? '创建中…' : '创建'}
                disabled={createBusy}
                onClick={() => void createCircle()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </DesktopPageShell>
  )
}
