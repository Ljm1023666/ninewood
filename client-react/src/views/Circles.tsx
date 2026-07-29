import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { discussionsApi, type DiscussionTopic } from '@/api/discussions'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
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
  joined?: boolean
}

type MyCircleRow = {
  circleId: string
  role: string
  circle?: CircleBrief
}

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

function memberBadge(total: number): string {
  if (total <= 3) return String(total)
  if (total >= 1000) return `${Math.floor(total / 1000)}k+`
  return `+${total - 3}`
}

function coverFallback(theme: string): string {
  const hues: Record<string, string> = {
    UI设计: '280',
    技术开发: '200',
    产品需求: '160',
    数据分析: '220',
    测试服务: '30',
    综合: '340',
  }
  const h = hues[theme] || '200'
  return `linear-gradient(135deg, hsl(${h} 55% 42% / 0.55), rgba(28,28,30,0.9) 60%)`
}

export default function Circles() {
  const navigate = useNavigate()
  const [circles, setCircles] = useState<CircleBrief[]>([])
  const [myCircles, setMyCircles] = useState<MyCircleRow[]>([])
  const [topics, setTopics] = useState<DiscussionTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [sortBy, setSortBy] = useState<SortBy>('hot')
  const [themeFilter, setThemeFilter] = useState('')
  const [themeOpen, setThemeOpen] = useState(false)
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

  async function fetchTopics() {
    setTopicsLoading(true)
    try {
      const res = await discussionsApi.list({ page: 1, pageSize: 5 })
      const data = res.data.data as { items?: DiscussionTopic[]; list?: DiscussionTopic[] }
      setTopics(data?.items || data?.list || [])
    } catch {
      setTopics([])
    } finally {
      setTopicsLoading(false)
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
    void fetchTopics()
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!filterRef.current?.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const plazaList = useMemo(() => {
    const map = new Map<string, CircleBrief>()
    for (const row of myCircles) {
      const c = row.circle
      if (!c?.id) continue
      map.set(c.id, { ...c, joined: true })
    }
    for (const c of circles) {
      if (!map.has(c.id)) map.set(c.id, { ...c, joined: false })
    }
    let list = [...map.values()]
    if (themeFilter) {
      list = list.filter((c) => inferTheme(c) === themeFilter)
    }
    list.sort((a, b) => {
      if (sortBy === 'new') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }
      const scoreA = (a.activeScore || 0) * 10 + memberTotal(a)
      const scoreB = (b.activeScore || 0) * 10 + memberTotal(b)
      return scoreB - scoreA
    })
    return list
  }, [circles, myCircles, themeFilter, sortBy])

  const featured = plazaList[0] ?? null
  const gridCircles = featured ? plazaList.slice(1) : plazaList

  return (
    <DesktopPageShell
      title="兴趣圈子"
      subtitle="找到同频的人，一起对接需求"
      actions={
        <div className="circles-plaza__toolbar" ref={filterRef}>
          <div className="circles-plaza__filter-wrap">
            <LiquidMetalButton
              type="button"
              className="circles-plaza__tool-btn"
              aria-expanded={themeOpen}
              onClick={() => setThemeOpen((v) => !v)}
            >
              <MsIcon name="filter_list" size={16} aria-hidden />
              <span>{themeFilter || '全部分类'}</span>
              <MsIcon name="expand_more" size={16} aria-hidden />
            </LiquidMetalButton>
            {themeOpen ? (
              <div className="circles-plaza__filter-menu" role="listbox">
                <LiquidMetalButton
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
                </LiquidMetalButton>
                {THEME_OPTIONS.map((cat) => (
                  <LiquidMetalButton
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
                  </LiquidMetalButton>
                ))}
              </div>
            ) : null}
          </div>

          <LiquidMetalButton
            type="button"
            className="circles-plaza__tool-btn"
            onClick={() => setSortBy((s) => (s === 'hot' ? 'new' : 'hot'))}
          >
            <MsIcon name="sort" size={16} aria-hidden />
            <span>{sortBy === 'hot' ? '最热门' : '最新'}</span>
          </LiquidMetalButton>

          <LiquidMetalButton
            type="button"
            className="circles-plaza__tool-btn"
            onClick={() => navigate('/circles/mine')}
          >
            我的圈子
          </LiquidMetalButton>

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
        </div>
      }
    >
      <div className="circles-plaza">
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

        {!loading && !error ? (
          <>
            <div className="circles-plaza__grid">
              {featured ? (
                <article
                  className="circles-plaza__card circles-plaza__card--featured"
                  onClick={() => navigate(`/circles/${featured.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/circles/${featured.id}`)
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <div className="circles-plaza__featured-badge">
                    <span className="circles-plaza__featured-badge-dot" />
                    推荐
                  </div>
                  <div
                    className="circles-plaza__cover"
                    style={
                      featured.coverUrl
                        ? undefined
                        : { background: coverFallback(inferTheme(featured)) }
                    }
                  >
                    {featured.coverUrl ? (
                      <img src={featured.coverUrl} alt="" loading="lazy" />
                    ) : null}
                    <div className="circles-plaza__cover-veil" />
                    <div className="circles-plaza__icon-chip">
                      <MsIcon name={circleIcon(featured)} size={22} aria-hidden />
                    </div>
                  </div>
                  <div className="circles-plaza__body">
                    <h3 className="circles-plaza__title">{featured.name}</h3>
                    <p className="circles-plaza__desc line-clamp-4">
                      {featured.description?.trim() || '暂无简介'}
                    </p>
                    <div className="circles-plaza__tags">
                      <span className="circles-plaza__tag"># {inferTheme(featured)}</span>
                      <span className="circles-plaza__tag">
                        圈主 {featured.owner?.nickname || '未知'}
                      </span>
                    </div>
                    <div className="circles-plaza__footer">
                      <div className="circles-plaza__avatars">
                        {(featured.previewMembers || []).slice(0, 3).map((m) => (
                          <span key={m.userId} className="circles-plaza__avatar">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt="" />
                            ) : (
                              (m.nickname || '?').slice(0, 1)
                            )}
                          </span>
                        ))}
                        <span className="circles-plaza__avatar circles-plaza__avatar--more">
                          {memberBadge(memberTotal(featured))}
                        </span>
                      </div>
                      {featured.joined ? (
                        <span className="circles-plaza__join circles-plaza__join--ghost">
                          <LiquidMetalButton type="button" label="已加入" disabled />
                        </span>
                      ) : (
                        <span
                          className="circles-plaza__join"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <LiquidMetalButton
                            type="button"
                            label={busyId === featured.id ? '…' : '立即加入'}
                            disabled={busyId === featured.id}
                            onClick={() => void joinCircle(featured.id)}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ) : null}

              {gridCircles.map((c) => {
                const theme = inferTheme(c)
                const total = memberTotal(c)
                return (
                  <article
                    key={c.id}
                    className="circles-plaza__card"
                    onClick={() => navigate(`/circles/${c.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/circles/${c.id}`)
                      }
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    <div className="relative mb-2">
                      <div
                        className="circles-plaza__cover"
                        style={
                          c.coverUrl ? undefined : { background: coverFallback(theme) }
                        }
                      >
                        {c.coverUrl ? (
                          <img src={c.coverUrl} alt="" loading="lazy" />
                        ) : null}
                        <div className="circles-plaza__cover-veil" />
                        <span className="circles-plaza__cover-badge">{theme}</span>
                      </div>
                      <div className="circles-plaza__icon-chip">
                        <MsIcon name={circleIcon(c)} size={24} aria-hidden />
                      </div>
                    </div>
                    <div className="circles-plaza__body">
                      <h3 className="circles-plaza__title">{c.name}</h3>
                      <p className="circles-plaza__desc line-clamp-3">
                        {c.description?.trim() || '暂无简介'}
                      </p>
                      <div className="circles-plaza__footer">
                        <span className="circles-plaza__meta">
                          <MsIcon name="group" size={16} aria-hidden />
                          {total} 人
                        </span>
                        {c.joined ? (
                          <span className="circles-plaza__join circles-plaza__join--ghost">
                            <LiquidMetalButton type="button" label="已加入" disabled />
                          </span>
                        ) : (
                          <span
                            className="circles-plaza__join"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LiquidMetalButton
                              type="button"
                              label={busyId === c.id ? '…' : '加入'}
                              disabled={busyId === c.id}
                              onClick={() => void joinCircle(c.id)}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}

              {plazaList.length === 0 ? (
                <div className="circles-plaza__empty col-span-full">
                  <DlpGlass>
                    <DlpEmpty
                      icon={<MsIcon name="groups" size={48} />}
                      title="暂无圈子数据"
                      description={
                        themeFilter
                          ? '当前分类下没有圈子，换个筛选试试。'
                          : '还没有匹配的圈子，创建一个吧。'
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
                </div>
              ) : null}
            </div>

            <div className="circles-plaza__bottom">
              <section className="circles-plaza__hot" aria-label="热门讨论">
                <div className="circles-plaza__hot-head">
                  <h4>热门讨论</h4>
                  <button
                    type="button"
                    className="circles-plaza__hot-link"
                    onClick={() => navigate('/discussions')}
                  >
                    查看全部
                  </button>
                </div>
                {topicsLoading ? (
                  <p className="text-sm text-text-secondary">加载中…</p>
                ) : topics.length === 0 ? (
                  <p className="text-sm text-text-secondary">暂无讨论</p>
                ) : (
                  <ul className="circles-plaza__hot-list">
                    {topics.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="circles-plaza__hot-item"
                          onClick={() => navigate(`/circles/${t.circleId}`)}
                        >
                          <span className="circles-plaza__hot-title">{t.title}</span>
                          <span className="circles-plaza__hot-meta">{t.circleName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="circles-plaza__cta" aria-label="创建圈子">
                <div className="circles-plaza__cta-icon">
                  <MsIcon name="add_circle" size={28} aria-hidden />
                </div>
                <h4>申请 / 创建圈子</h4>
                <p>拉起同频伙伴，一起对接需求与协作</p>
                <LiquidMetalButton
                  label="创建圈子"
                  onClick={() => setShowCreate(true)}
                />
              </section>
            </div>
          </>
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
