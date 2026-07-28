import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import { SegmentedFilter } from '@/components/layout/internal-ui'
import {
  DesktopPageShell,
  DlpGlass,
  DlpEmpty,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'
import { LoadingState } from '@/components/ui/loading-state'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { toast } from '@/components/ui/confirm-dialog'
import '@/styles/circles-plaza.css'

const roleLabel: Record<string, string> = {
  OWNER: '圈主',
  ADMIN: '管理员',
  MEMBER: '成员',
}

type PreviewMember = {
  userId: string
  role?: string
  nickname: string
  avatarUrl?: string | null
}

type CircleCounts = { members?: number; demands?: number }

type CircleBrief = {
  id: string
  name: string
  description?: string | null
  coverUrl?: string | null
  type?: string
  cityCode?: string | null
  activeScore?: number
  memberCount?: number
  createdAt?: string
  owner?: { id?: string; nickname?: string | null; avatarUrl?: string | null }
  previewMembers?: PreviewMember[]
  _count?: CircleCounts
}

type MyCircleRow = {
  circleId: string
  role: string
  circle?: CircleBrief
}

type TypeFilter = '' | 'PUBLIC' | 'PRIVATE'
type SortBy = 'hot' | 'new'

function circleIcon(c: Pick<CircleBrief, 'name' | 'description' | 'type'>): string {
  const text = `${c.name || ''} ${c.description || ''}`.toLowerCase()
  if (text.includes('设计') || text.includes('ui')) return 'palette'
  if (text.includes('开发') || text.includes('技术') || text.includes('代码')) return 'code'
  if (text.includes('产品') || text.includes('需求')) return 'lightbulb'
  if (text.includes('数据') || text.includes('分析')) return 'analytics'
  if (text.includes('测试')) return 'bug_report'
  if (c.type === 'PRIVATE') return 'lock'
  return 'groups'
}

/** 无后端分类字段时，用名称/简介启发式打标签，便于筛选对齐广场体验 */
function inferTheme(c: Pick<CircleBrief, 'name' | 'description'>): string {
  const text = `${c.name || ''} ${c.description || ''}`
  if (/设计|UI|视觉/i.test(text)) return 'UI设计'
  if (/开发|技术|代码|工程/i.test(text)) return '技术开发'
  if (/产品|需求/i.test(text)) return '产品需求'
  if (/数据|分析/i.test(text)) return '数据分析'
  if (/测试/i.test(text)) return '测试服务'
  return '综合'
}

const THEME_OPTIONS = ['技术开发', 'UI设计', '产品需求', '数据分析', '测试服务', '综合'] as const

function memberTotal(c: CircleBrief): number {
  return c._count?.members ?? c.memberCount ?? c.previewMembers?.length ?? 0
}

function MemberStack({
  members,
  total,
}: {
  members?: PreviewMember[]
  total: number
}) {
  const shown = (members || []).slice(0, 3)
  const extra = Math.max(0, total - shown.length)
  if (shown.length === 0) {
    return (
      <span className="circles-plaza__meta">
        <MsIcon name="group" size={16} aria-hidden />
        {total} 人
      </span>
    )
  }
  return (
    <div className="circles-plaza__avatars" aria-label={`${total} 位成员`}>
      {shown.map((m) => (
        <span key={m.userId} className="circles-plaza__avatar" title={m.nickname}>
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt="" loading="lazy" />
          ) : (
            (m.nickname || '?').slice(0, 1)
          )}
        </span>
      ))}
      {extra > 0 ? (
        <span className="circles-plaza__avatar circles-plaza__avatar--more">
          +{extra > 99 ? '99' : extra}
        </span>
      ) : null}
    </div>
  )
}

function DiscoverCard({
  circle,
  featured,
  busy,
  onOpen,
  onJoin,
}: {
  circle: CircleBrief
  featured?: boolean
  busy: boolean
  onOpen: () => void
  onJoin: () => void
}) {
  const theme = inferTheme(circle)
  const total = memberTotal(circle)

  return (
    <article
      className={cn(
        'circles-plaza__card',
        featured && 'circles-plaza__card--featured',
      )}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      {featured ? (
        <span className="circles-plaza__featured-badge">
          <span className="circles-plaza__featured-badge-dot" aria-hidden />
          推荐
        </span>
      ) : null}

      <div className="circles-plaza__cover">
        {circle.coverUrl ? (
          <img src={circle.coverUrl} alt="" loading="lazy" />
        ) : null}
        <div className="circles-plaza__cover-veil" aria-hidden />
        {!featured ? (
          <span className="circles-plaza__cover-badge">{theme}</span>
        ) : null}
        <div className="circles-plaza__icon-chip" aria-hidden>
          <MsIcon name={circleIcon(circle)} size={featured ? 22 : 24} filled />
        </div>
      </div>

      <div className="circles-plaza__body">
        <h3 className="circles-plaza__title">{circle.name}</h3>
        <p className={cn('circles-plaza__desc', !featured && 'line-clamp-3')}>
          {circle.description?.trim() || '暂无简介'}
        </p>
        {featured ? (
          <div className="circles-plaza__tags">
            <span className="circles-plaza__tag"># {theme}</span>
            <span className="circles-plaza__tag">
              圈主 {circle.owner?.nickname || '未知'}
            </span>
            {circle.cityCode ? (
              <span className="circles-plaza__tag">{circle.cityCode}</span>
            ) : null}
          </div>
        ) : null}
        <div className="circles-plaza__footer">
          <MemberStack members={circle.previewMembers} total={total} />
          {/* 卡片主操作：与分段选中同款 LiquidMetal，禁止实心 teal */}
          <span
            className="circles-plaza__join"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <LiquidMetalButton
              label={busy ? '…' : '加入'}
              disabled={busy}
              height={36}
              onClick={onJoin}
            />
          </span>
        </div>
      </div>
    </article>
  )
}

function MineCard({
  row,
  onOpen,
}: {
  row: MyCircleRow
  onOpen: () => void
}) {
  const c = row.circle
  const name = c?.name?.trim() || '未命名圈子'
  const total = c ? memberTotal(c) : 1
  const typeLabel = c?.type === 'PUBLIC' ? '公开' : '私密'
  const theme = c ? inferTheme(c) : '综合'

  return (
    <article className="circles-plaza__mine-card">
      <div className="circles-plaza__mine-top">
        <div className="circles-plaza__mine-icon" aria-hidden>
          <MsIcon name={c ? circleIcon(c) : 'groups'} size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="circles-plaza__mine-title-row">
            <h3 className="circles-plaza__mine-title" onClick={onOpen}>
              {name}
            </h3>
            <span
              className={cn(
                'circles-plaza__role',
                row.role === 'OWNER' && 'circles-plaza__role--owner',
              )}
            >
              {roleLabel[row.role] ?? row.role}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-text-secondary">
            {c?.description?.trim() || '暂无简介'}
          </p>
        </div>
      </div>
      <div className="circles-plaza__mine-foot">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <MsIcon name="group" size={14} aria-hidden />
            {total} 人
          </span>
          <span aria-hidden>·</span>
          <span>{theme}</span>
          <span aria-hidden>·</span>
          <span>{typeLabel}</span>
        </div>
        <button type="button" className="circles-plaza__enter" onClick={onOpen}>
          进入
          <MsIcon name="chevron_right" size={16} aria-hidden />
        </button>
      </div>
    </article>
  )
}

export default function Circles() {
  const navigate = useNavigate()
  const [circles, setCircles] = useState<CircleBrief[]>([])
  const [myCircles, setMyCircles] = useState<MyCircleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [tab, setTab] = useState<'mine' | 'discover'>('mine')
  const [sortBy, setSortBy] = useState<SortBy>('hot')
  const [themeFilter, setThemeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('')
  const [themeOpen, setThemeOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

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
      setTab('mine')
      void fetchCircles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '创建失败', 'error')
    } finally {
      setCreateBusy(false)
    }
  }

  async function joinCircle(id: string) {
    setBusyId(id)
    try {
      await circleApi.join(id)
      toast('已加入圈子', 'success')
      void fetchCircles()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '加入失败', 'error')
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => {
    void fetchCircles()
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!filterRef.current?.contains(e.target as Node)) {
        setThemeOpen(false)
        setTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const discoverList = useMemo(() => {
    let list = [...circles]
    if (themeFilter) {
      list = list.filter((c) => inferTheme(c) === themeFilter)
    }
    list.sort((a, b) => {
      if (sortBy === 'new') {
        return (
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
      }
      const scoreA = (a.activeScore || 0) * 10 + memberTotal(a)
      const scoreB = (b.activeScore || 0) * 10 + memberTotal(b)
      return scoreB - scoreA
    })
    return list
  }, [circles, themeFilter, sortBy])

  const mineList = useMemo(() => {
    let list = [...myCircles]
    if (typeFilter) {
      list = list.filter((m) => (m.circle?.type || 'PRIVATE') === typeFilter)
    }
    if (themeFilter) {
      list = list.filter((m) => m.circle && inferTheme(m.circle) === themeFilter)
    }
    list.sort((a, b) => {
      const ca = a.circle
      const cb = b.circle
      if (sortBy === 'new') {
        return (
          new Date(cb?.createdAt || 0).getTime() -
          new Date(ca?.createdAt || 0).getTime()
        )
      }
      const scoreA = (ca?.activeScore || 0) * 10 + (ca ? memberTotal(ca) : 0)
      const scoreB = (cb?.activeScore || 0) * 10 + (cb ? memberTotal(cb) : 0)
      return scoreB - scoreA
    })
    return list
  }, [myCircles, typeFilter, themeFilter, sortBy])

  const featured =
    tab === 'discover' && sortBy === 'hot' && !themeFilter
      ? discoverList[0]
      : null
  const gridCircles =
    featured != null ? discoverList.slice(1) : discoverList

  return (
    <DesktopPageShell
      title="圈子"
      subtitle="找到同频的人，一起对接需求与协作"
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
      <div className="circles-plaza">
        <SegmentedFilter
          size="large"
          options={[
            { value: 'mine', label: `我的圈子 (${myCircles.length})` },
            { value: 'discover', label: `发现圈子 (${circles.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div className="circles-plaza__toolbar" ref={filterRef}>
          <button
            type="button"
            className="circles-plaza__tool-btn"
            onClick={() => navigate('/discussions')}
          >
            <MsIcon name="forum" size={16} aria-hidden />
            <span>热门讨论</span>
          </button>
          <div className="circles-plaza__filter-wrap">
            <button
              type="button"
              className="circles-plaza__tool-btn"
              aria-expanded={themeOpen}
              onClick={() => {
                setThemeOpen((v) => !v)
                setTypeOpen(false)
              }}
            >
              <MsIcon name="filter_list" size={16} aria-hidden />
              <span>{themeFilter || '全部分类'}</span>
              <MsIcon name="expand_more" size={16} aria-hidden />
            </button>
            {themeOpen ? (
              <div className="circles-plaza__filter-menu" role="listbox">
                <button
                  type="button"
                  className={cn(
                    'circles-plaza__filter-item',
                    !themeFilter && 'circles-plaza__filter-item--active',
                  )}
                  onClick={() => {
                    setThemeFilter('')
                    setThemeOpen(false)
                  }}
                >
                  全部分类
                </button>
                {THEME_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={cn(
                      'circles-plaza__filter-item',
                      themeFilter === cat && 'circles-plaza__filter-item--active',
                    )}
                    onClick={() => {
                      setThemeFilter(cat)
                      setThemeOpen(false)
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {tab === 'mine' ? (
            <div className="circles-plaza__filter-wrap">
              <button
                type="button"
                className="circles-plaza__tool-btn"
                aria-expanded={typeOpen}
                onClick={() => {
                  setTypeOpen((v) => !v)
                  setThemeOpen(false)
                }}
              >
                <MsIcon name="tune" size={16} aria-hidden />
                <span>
                  {typeFilter === 'PUBLIC'
                    ? '公开'
                    : typeFilter === 'PRIVATE'
                      ? '私密'
                      : '全部类型'}
                </span>
                <MsIcon name="expand_more" size={16} aria-hidden />
              </button>
              {typeOpen ? (
                <div className="circles-plaza__filter-menu" role="listbox">
                  {(
                    [
                      ['', '全部类型'],
                      ['PUBLIC', '公开'],
                      ['PRIVATE', '私密'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      className={cn(
                        'circles-plaza__filter-item',
                        typeFilter === value && 'circles-plaza__filter-item--active',
                      )}
                      onClick={() => {
                        setTypeFilter(value)
                        setTypeOpen(false)
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            className="circles-plaza__tool-btn"
            onClick={() => setSortBy((s) => (s === 'hot' ? 'new' : 'hot'))}
          >
            <MsIcon name="sort" size={16} aria-hidden />
            <span>{sortBy === 'hot' ? '最热门' : '最新'}</span>
          </button>
        </div>

        {error ? (
          <DlpGlass>
            <DlpEmpty
              icon={<MsIcon name="error_outline" size={48} />}
              title="加载失败"
              description={error}
              action={
                <DlpBtnPrimary onClick={() => void fetchCircles()}>重试</DlpBtnPrimary>
              }
            />
          </DlpGlass>
        ) : null}

        {loading && !error ? <LoadingState variant="internal" lines={4} /> : null}

        {!loading && !error && tab === 'discover' ? (
          discoverList.length > 0 ? (
            <div className="circles-plaza__grid">
              {featured ? (
                <DiscoverCard
                  circle={featured}
                  featured
                  busy={busyId === featured.id}
                  onOpen={() => navigate(`/circles/${featured.id}`)}
                  onJoin={() => void joinCircle(featured.id)}
                />
              ) : null}
              {gridCircles.map((c) => (
                <DiscoverCard
                  key={c.id}
                  circle={c}
                  busy={busyId === c.id}
                  onOpen={() => navigate(`/circles/${c.id}`)}
                  onJoin={() => void joinCircle(c.id)}
                />
              ))}
            </div>
          ) : (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="groups" size={48} />}
                title="暂无公开圈子"
                description={
                  themeFilter
                    ? '当前分类下没有圈子，换个筛选试试。'
                    : '还没有可发现的公开圈子，或你已全部加入。'
                }
                action={
                  themeFilter ? (
                    <LiquidMetalButton
                      label="清除筛选"
                      onClick={() => setThemeFilter('')}
                    />
                  ) : (
                    <LiquidMetalButton
                      label="创建圈子"
                      onClick={() => setShowCreate(true)}
                    />
                  )
                }
              />
            </DlpGlass>
          )
        ) : null}

        {!loading && !error && tab === 'mine' ? (
          mineList.length > 0 ? (
            <div className="circles-plaza__mine-grid">
              {mineList.map((row) => (
                <MineCard
                  key={row.circleId}
                  row={row}
                  onOpen={() =>
                    navigate(`/circles/${row.circle?.id ?? row.circleId}`)
                  }
                />
              ))}
            </div>
          ) : (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="groups" size={48} />}
                title="未加入圈子"
                description={
                  themeFilter || typeFilter
                    ? '当前筛选下没有圈子。'
                    : '还没有加入圈子。去发现页面浏览公开圈子吧。'
                }
                action={
                  themeFilter || typeFilter ? (
                    <LiquidMetalButton
                      label="清除筛选"
                      onClick={() => {
                        setThemeFilter('')
                        setTypeFilter('')
                      }}
                    />
                  ) : (
                    <LiquidMetalButton
                      label="发现圈子"
                      onClick={() => setTab('discover')}
                    />
                  )
                }
              />
            </DlpGlass>
          )
        ) : null}
      </div>

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
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
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
