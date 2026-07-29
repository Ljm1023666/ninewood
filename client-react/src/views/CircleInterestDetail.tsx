import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  circleApi,
  type CircleMemberItem,
  type CirclePostItem,
  type CirclePostReplyItem,
} from '@/api/circle'
import { useUserStore } from '@/stores/user'
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
import '@/styles/circle-interest-detail.css'

type CircleDetail = {
  id: string
  name: string
  description?: string | null
  type?: string
  status?: string
  coverUrl?: string | null
  memberCount?: number
  ownerId?: string
  owner?: { id?: string; nickname?: string | null; avatarUrl?: string | null }
  members?: Array<{
    userId: string
    role: string
    user?: { id: string; nickname: string; avatarUrl?: string | null }
  }>
  _count?: { members?: number }
}

type Tab = 'discussion' | 'info'

function inferTheme(c: Pick<CircleDetail, 'name' | 'description'>): string {
  const text = `${c.name || ''} ${c.description || ''}`
  if (/设计|UI|视觉/i.test(text)) return 'UI设计'
  if (/开发|技术|代码|工程/i.test(text)) return '技术开发'
  if (/产品|需求/i.test(text)) return '产品需求'
  if (/数据|分析/i.test(text)) return '数据分析'
  if (/测试/i.test(text)) return '测试服务'
  return '综合'
}

function circleIcon(c: Pick<CircleDetail, 'name' | 'description' | 'type'>): string {
  const text = `${c.name || ''} ${c.description || ''}`.toLowerCase()
  if (text.includes('设计') || text.includes('ui')) return 'palette'
  if (text.includes('开发') || text.includes('技术') || text.includes('代码')) return 'code'
  if (text.includes('产品') || text.includes('需求')) return 'lightbulb'
  if (text.includes('数据') || text.includes('分析')) return 'analytics'
  if (text.includes('测试')) return 'bug_report'
  if (c.type === 'PRIVATE') return 'lock'
  return 'groups'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day} 天前`
  return d.toLocaleDateString('zh-CN')
}

export default function CircleInterestDetail() {
  const { id: circleId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useUserStore((s) => s.user?.id)

  const [circle, setCircle] = useState<CircleDetail | null>(null)
  const [members, setMembers] = useState<CircleMemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('discussion')
  const [joinBusy, setJoinBusy] = useState(false)

  const [posts, setPosts] = useState<CirclePostItem[]>([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [postsPage, setPostsPage] = useState(1)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyPostId, setReplyPostId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)

  const isOwner = Boolean(circle && userId && circle.ownerId === userId)
  const isMember = useMemo(() => {
    if (!circle || !userId) return false
    if (circle.ownerId === userId) return true
    return Boolean(circle.members?.some((m) => m.userId === userId))
  }, [circle, userId])
  const isAdmin = useMemo(() => {
    if (!circle || !userId) return false
    if (circle.ownerId === userId) return true
    const role = circle.members?.find((m) => m.userId === userId)?.role
    return role === 'OWNER' || role === 'ADMIN'
  }, [circle, userId])

  const memberTotal =
    circle?._count?.members ?? circle?.memberCount ?? members.length ?? 0

  const loadCircle = useCallback(async () => {
    if (!circleId) return
    setLoading(true)
    setError('')
    try {
      const [cRes, mRes] = await Promise.all([
        circleApi.get(circleId),
        circleApi.getMembers(circleId, { limit: 50 }).catch(() => null),
      ])
      setCircle(cRes.data.data as CircleDetail)
      if (mRes) {
        const data = mRes.data.data as { items?: CircleMemberItem[] }
        setMembers(data?.items || [])
      } else {
        setMembers([])
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [circleId])

  const loadPosts = useCallback(
    async (page = 1, append = false) => {
      if (!circleId) return
      setLoadingPosts(true)
      try {
        const res = await circleApi.listPosts(circleId, { page, pageSize: 20 })
        const data = res.data.data as { list: CirclePostItem[]; total: number }
        setTotalPosts(data.total || 0)
        setPostsPage(page)
        setPosts((prev) => (append ? [...prev, ...(data.list || [])] : data.list || []))
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } }
        if (!append) {
          toast(err.response?.data?.message || '讨论加载失败', 'error')
          setPosts([])
        }
      } finally {
        setLoadingPosts(false)
      }
    },
    [circleId],
  )

  useEffect(() => {
    void loadCircle()
  }, [loadCircle])

  useEffect(() => {
    if (activeTab === 'discussion' && circleId) {
      void loadPosts(1, false)
    }
  }, [activeTab, circleId, loadPosts])

  async function toggleJoin() {
    if (!circleId || !circle || isOwner) return
    setJoinBusy(true)
    try {
      if (isMember) {
        await circleApi.leave(circleId)
        toast('已退出圈子', 'success')
      } else {
        await circleApi.join(circleId)
        toast('已加入圈子', 'success')
      }
      await loadCircle()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '操作失败', 'error')
    } finally {
      setJoinBusy(false)
    }
  }

  async function submitPost() {
    if (!circleId || !postContent.trim()) return
    if (!isMember) {
      toast('加入圈子后才能发帖', 'info')
      return
    }
    setPosting(true)
    try {
      await circleApi.createPost(circleId, postContent.trim())
      setPostContent('')
      toast('已发布', 'success')
      void loadPosts(1, false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '发布失败', 'error')
    } finally {
      setPosting(false)
    }
  }

  async function deletePost(p: CirclePostItem) {
    if (!circleId) return
    try {
      await circleApi.deletePost(circleId, p.id)
      setPosts((prev) => prev.filter((x) => x.id !== p.id))
      setTotalPosts((t) => Math.max(0, t - 1))
      toast('已删除', 'success')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '删除失败', 'error')
    }
  }

  async function toggleLike(p: CirclePostItem) {
    if (!circleId) return
    if (!isMember) {
      toast('加入圈子后才能点赞', 'info')
      return
    }
    try {
      if (p.liked) {
        await circleApi.unlikePost(circleId, p.id)
        setPosts((prev) =>
          prev.map((x) =>
            x.id === p.id
              ? { ...x, liked: false, likeCount: Math.max(0, x.likeCount - 1) }
              : x,
          ),
        )
      } else {
        await circleApi.likePost(circleId, p.id)
        setPosts((prev) =>
          prev.map((x) =>
            x.id === p.id ? { ...x, liked: true, likeCount: x.likeCount + 1 } : x,
          ),
        )
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '操作失败', 'error')
    }
  }

  async function showReplies(p: CirclePostItem) {
    if (!circleId) return
    if (replyPostId === p.id) {
      setReplyPostId(null)
      return
    }
    try {
      const res = await circleApi.listPostReplies(circleId, p.id)
      const replies = res.data.data as CirclePostReplyItem[]
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, replies } : x)),
      )
      setReplyPostId(p.id)
      setReplyContent('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '加载回复失败', 'error')
    }
  }

  async function submitReply(p: CirclePostItem) {
    if (!circleId || !replyContent.trim()) return
    if (!isMember) {
      toast('加入圈子后才能回复', 'info')
      return
    }
    setReplyBusy(true)
    try {
      await circleApi.createPostReply(circleId, p.id, replyContent.trim())
      setReplyContent('')
      const res = await circleApi.listPostReplies(circleId, p.id)
      const replies = res.data.data as CirclePostReplyItem[]
      setPosts((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? { ...x, replies, replyCount: replies.length }
            : x,
        ),
      )
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '回复失败', 'error')
    } finally {
      setReplyBusy(false)
    }
  }

  const displayMembers: Array<{
    userId: string
    role: string
    nickname: string
    avatarUrl?: string | null
  }> = useMemo(() => {
    if (members.length > 0) {
      return members.map((m) => ({
        userId: m.userId,
        role: m.role,
        nickname: m.user?.nickname || '用户',
        avatarUrl: m.user?.avatarUrl,
      }))
    }
    return (circle?.members || []).map((m) => ({
      userId: m.userId,
      role: m.role,
      nickname: m.user?.nickname || '用户',
      avatarUrl: m.user?.avatarUrl,
    }))
  }, [members, circle?.members])

  return (
    <DesktopPageShell
      title={circle?.name || '圈子详情'}
      onBack={() => navigate('/circles')}
    >
      <div className="circle-interest">
        {loading ? <LoadingState variant="internal" lines={4} /> : null}

        {error ? (
          <DlpGlass>
            <DlpEmpty
              icon={<MsIcon name="error_outline" size={48} />}
              title="加载失败"
              description={error}
              action={
                <DlpBtnPrimary onClick={() => void loadCircle()}>重试</DlpBtnPrimary>
              }
            />
          </DlpGlass>
        ) : null}

        {!loading && !error && circle ? (
          <>
            <section className="circle-interest__hero">
              <div className="circle-interest__hero-band" />
              <div className="circle-interest__hero-body">
                <div className="circle-interest__hero-main">
                  <div className="circle-interest__icon">
                    <MsIcon name={circleIcon(circle)} size={32} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="circle-interest__name">{circle.name}</h1>
                    <p className="circle-interest__meta">
                      <span>{circle.owner?.nickname || '未知'} · 圈主</span>
                      <span aria-hidden>·</span>
                      <span className="circle-interest__pill">{inferTheme(circle)}</span>
                      <span aria-hidden>·</span>
                      <span>{memberTotal} 人</span>
                    </p>
                  </div>
                </div>
                {isOwner ? (
                  <span className="circle-interest__owner-badge">
                    <MsIcon name="verified" size={16} aria-hidden />
                    你是圈主
                  </span>
                ) : (
                  <LiquidMetalButton
                    type="button"
                    label={
                      joinBusy
                        ? '…'
                        : isMember
                          ? '退出圈子'
                          : '加入圈子'
                    }
                    disabled={joinBusy || (!isMember && circle.type !== 'PUBLIC')}
                    onClick={() => void toggleJoin()}
                  />
                )}
              </div>
              {circle.description ? (
                <p className="circle-interest__hero-desc line-clamp-2">
                  {circle.description}
                </p>
              ) : null}
            </section>

            <div className="circle-interest__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'discussion'}
                className={cn(
                  'circle-interest__tab',
                  activeTab === 'discussion' && 'circle-interest__tab--active',
                )}
                onClick={() => setActiveTab('discussion')}
              >
                <MsIcon name="forum" size={16} aria-hidden />
                讨论区
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'info'}
                className={cn(
                  'circle-interest__tab',
                  activeTab === 'info' && 'circle-interest__tab--active',
                )}
                onClick={() => setActiveTab('info')}
              >
                <MsIcon name="info" size={16} aria-hidden />
                圈子信息
              </button>
            </div>

            {activeTab === 'info' ? (
              <div className="circle-interest__info-grid">
                <section className="circle-interest__panel">
                  <h3>圈子简介</h3>
                  <p>{circle.description?.trim() || '暂无简介'}</p>
                  <dl className="circle-interest__dl">
                    <div>
                      <dt>分类</dt>
                      <dd>{inferTheme(circle)}</dd>
                    </div>
                    <div>
                      <dt>类型</dt>
                      <dd>{circle.type === 'PRIVATE' ? '私密' : '公开'}</dd>
                    </div>
                    <div>
                      <dt>圈主</dt>
                      <dd>{circle.owner?.nickname || '未知'}</dd>
                    </div>
                    <div>
                      <dt>成员</dt>
                      <dd>{memberTotal} 人</dd>
                    </div>
                  </dl>
                  {isAdmin ? (
                    <div className="circle-interest__hub-links">
                      <p className="circle-interest__hub-label">管理</p>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="circle-interest__hub-link"
                          to={`/circles/${circle.id}/resources`}
                        >
                          资源
                        </Link>
                        <Link
                          className="circle-interest__hub-link"
                          to={`/circles/${circle.id}/analytics`}
                        >
                          数据
                        </Link>
                        <Link
                          className="circle-interest__hub-link"
                          to={`/circles/${circle.id}/teams`}
                        >
                          成员管理
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="circle-interest__panel circle-interest__panel--wide">
                  <h3>圈子成员 ({displayMembers.length})</h3>
                  {displayMembers.length === 0 ? (
                    <p className="text-sm text-text-secondary py-8 text-center">暂无成员</p>
                  ) : (
                    <div className="circle-interest__member-grid">
                      {displayMembers.map((m) => (
                        <div key={m.userId} className="circle-interest__member">
                          <span className="circle-interest__avatar">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt="" />
                            ) : (
                              (m.nickname || '?').slice(0, 1)
                            )}
                          </span>
                          <span className="truncate">{m.nickname}</span>
                          {m.role === 'OWNER' ? (
                            <span className="circle-interest__role">圈主</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            {activeTab === 'discussion' ? (
              <div className="circle-interest__discuss">
                <div className="circle-interest__composer">
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder={
                      isMember
                        ? '分享你的想法、经验或需求对接线索…'
                        : '加入圈子后即可发帖讨论…'
                    }
                    value={postContent}
                    disabled={!isMember}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                  <div className="circle-interest__composer-foot">
                    <span>{postContent.length}/2000</span>
                    <LiquidMetalButton
                      type="button"
                      label={posting ? '发布中…' : '发布'}
                      disabled={posting || !postContent.trim() || !isMember}
                      onClick={() => void submitPost()}
                    />
                  </div>
                </div>

                {loadingPosts && posts.length === 0 ? (
                  <p className="py-10 text-center text-text-secondary">加载中…</p>
                ) : null}

                {!loadingPosts && posts.length === 0 ? (
                  <div className="circle-interest__empty-posts">
                    <MsIcon name="chat_bubble" size={36} aria-hidden />
                    <p>暂无讨论，来发第一条吧</p>
                  </div>
                ) : null}

                {posts.length > 0 ? (
                  <div className="circle-interest__posts">
                    {posts.map((p) => (
                      <article key={p.id} className="circle-interest__post">
                        <div className="circle-interest__post-head">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="circle-interest__avatar">
                              {p.userAvatar ? (
                                <img src={p.userAvatar} alt="" />
                              ) : (
                                (p.userNickname || '?').slice(0, 1)
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-[14px] text-text-primary truncate">
                                {p.userNickname}
                              </div>
                              <div className="text-[11px] text-text-secondary">
                                {formatTime(p.createdAt)}
                              </div>
                            </div>
                          </div>
                          {p.userId === userId || isAdmin ? (
                            <button
                              type="button"
                              className="circle-interest__delete"
                              onClick={() => void deletePost(p)}
                            >
                              删除
                            </button>
                          ) : null}
                        </div>
                        <p className="circle-interest__post-body">{p.content}</p>
                        <div className="circle-interest__post-actions">
                          <button
                            type="button"
                            className={cn(p.liked && 'is-liked')}
                            onClick={() => void toggleLike(p)}
                          >
                            <MsIcon
                              name={p.liked ? 'favorite' : 'favorite_border'}
                              size={18}
                              aria-hidden
                            />
                            {p.likeCount || 0}
                          </button>
                          <button type="button" onClick={() => void showReplies(p)}>
                            <MsIcon name="chat_bubble_outline" size={18} aria-hidden />
                            {p.replyCount || 0}
                          </button>
                        </div>
                        {replyPostId === p.id ? (
                          <div className="circle-interest__replies">
                            {(p.replies || []).map((r) => (
                              <div key={r.id} className="circle-interest__reply">
                                <span className="font-medium">{r.userNickname}</span>
                                <span>：{r.content}</span>
                              </div>
                            ))}
                            <div className="circle-interest__reply-form">
                              <input
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void submitReply(p)
                                }}
                                placeholder="输入回复…"
                                disabled={!isMember}
                              />
                              <LiquidMetalButton
                                type="button"
                                label={replyBusy ? '…' : '回复'}
                                disabled={
                                  replyBusy || !replyContent.trim() || !isMember
                                }
                                onClick={() => void submitReply(p)}
                              />
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : null}

                {!loadingPosts && totalPosts > posts.length ? (
                  <div className="mt-5 text-center">
                    <LiquidMetalButton
                      type="button"
                      label="加载更多"
                      onClick={() => void loadPosts(postsPage + 1, true)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </DesktopPageShell>
  )
}
