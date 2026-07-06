import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { toast } from '@/components/ui/confirm-dialog'
import { useUserStore } from '@/stores/user'
import { useCircleHub } from './circle-hub-context'
import { circleApi, type CircleActivityItem } from '@/api/circle'
import { HUB_SUBPAGE_NAV } from '@/constants/bento-nav'

// hot tags from /hub/home API

/** 首页 — Stitch home-variant-b 不对称布局 */
export default function CircleHubHome() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const { circleId, circle, memberCount } = useCircleHub()
  const [stats, setStats] = useState<{
    todayActive: number
    todayActiveDelta: number
    newDemands: number
    weekDemands: number
    resourceUpdates: number
    resourceUpdatesDelta: number
    memberCount: number
    pendingInvites: number
  } | null>(null)
  const [announcement, setAnnouncement] = useState<{
    id: string
    title: string
    body: string
    pinned: boolean
    author: { id: string; nickname: string }
    createdAt: string
  } | null>(null)
  const [hotTags, setHotTags] = useState<string[]>([])
  const [activities, setActivities] = useState<CircleActivityItem[]>([])
  const [homeError, setHomeError] = useState('')
  const [showAnnounceForm, setShowAnnounceForm] = useState(false)
  const [announceTitle, setAnnounceTitle] = useState('')
  const [announceBody, setAnnounceBody] = useState('')
  const [publishBusy, setPublishBusy] = useState(false)

  useEffect(() => {
    if (!circleId) return
    let cancelled = false
    circleApi
      .getHubHome(circleId)
      .then((res) => {
        if (cancelled) return
        const data = res.data.data as {
          stats: typeof stats
          announcement: typeof announcement
          hotTags: string[]
          activities: CircleActivityItem[]
        }
        setStats(data.stats)
        setAnnouncement(data.announcement)
        setHotTags(data.hotTags)
        setActivities(data.activities)
      })
      .catch((err) => {
        if (cancelled) return
        setHomeError((err as { response?: { data?: { message?: string } } }).response?.data?.message || '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [circleId])

  if (!circle) return null

  const displayName = user?.nickname || '圈友'
  const weekDemands = stats?.weekDemands ?? 0
  const todayActive = stats?.todayActive ?? 0
  const todayActiveDelta = stats?.todayActiveDelta ?? 0
  const newDemands = stats?.newDemands ?? 0
  const resourceUpdates = stats?.resourceUpdates ?? 0
  const resourceUpdatesDelta = stats?.resourceUpdatesDelta ?? 0
  const pendingInvites = stats?.pendingInvites ?? 0

  function go(path: string) {
    navigate(`/circles/${circleId}/${path}`, HUB_SUBPAGE_NAV)
  }

  const canManage = Boolean(
    user?.id &&
      circle.members?.some(
        (m) => m.userId === user.id && (m.role === 'OWNER' || m.role === 'ADMIN'),
      ),
  )

  async function handlePublishAnnouncement() {
    if (!circleId) return
    const title = announceTitle.trim()
    const body = announceBody.trim()
    if (title.length < 2) {
      toast('标题至少 2 个字', 'error')
      return
    }
    if (!body) {
      toast('请填写公告正文', 'error')
      return
    }
    setPublishBusy(true)
    try {
      const res = await circleApi.postAnnouncement(circleId, { title, body, pinned: true })
      const ann = res.data.data as NonNullable<typeof announcement>
      setAnnouncement(ann)
      setShowAnnounceForm(false)
      setAnnounceTitle('')
      setAnnounceBody('')
      toast('公告已发布', 'success')
      const homeRes = await circleApi.getHubHome(circleId)
      const data = homeRes.data.data as {
        stats: typeof stats
        activities: CircleActivityItem[]
      }
      setStats(data.stats)
      setActivities(data.activities)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '发布失败', 'error')
    } finally {
      setPublishBusy(false)
    }
  }

  const tagList = hotTags.length > 0 ? hotTags : ['#圈子正在筹备中']
  const activityToneMap: Record<string, string> = {
    DISCUSSION: 'default',
    DEMAND: 'primary',
    MEMBER_JOIN: 'success',
    RESOURCE: 'default',
    ANNOUNCEMENT: 'default',
  }
  const activityIconMap: Record<string, string> = {
    DISCUSSION: 'chat',
    DEMAND: 'assignment',
    MEMBER_JOIN: 'person_add',
    RESOURCE: 'folder',
    ANNOUNCEMENT: 'campaign',
  }
  const visibleActivities = activities.slice(0, 8)

  return (
    <div className="cdb-main-inner cdb-hub-page">
      <header className="cdb-hub-page-head">
        <div>
          <h2 className="cdb-hub-page-title">欢迎回来，{displayName}</h2>
          <p className="cdb-text-muted cdb-text-body-sm">
            这是{circle.name}的今日速览。
            {homeError ? <span style={{ color: '#e85a4f' }}> · {homeError}</span> : null}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="cdb-hub-btn-outline"
            onClick={() => setShowAnnounceForm((v) => !v)}
            aria-expanded={showAnnounceForm}
          >
            <MsIcon name="edit_square" size={18} aria-hidden />
            <span>{showAnnounceForm ? '取消' : '发布更新'}</span>
          </button>
        ) : null}
      </header>

      {showAnnounceForm && canManage ? (
        <section className="cdb-glass-card cdb-hub-panel" style={{ marginBottom: 8 }}>
          <h3 className="cdb-hub-card-title" style={{ marginBottom: 12 }}>
            发布圈子公告
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="cdb-hub-search-input"
              placeholder="公告标题（2–100 字）"
              value={announceTitle}
              maxLength={100}
              onChange={(e) => setAnnounceTitle(e.target.value)}
            />
            <textarea
              className="cdb-hub-help-search-input"
              style={{ minHeight: 96, resize: 'vertical' }}
              placeholder="公告正文"
              value={announceBody}
              maxLength={1000}
              onChange={(e) => setAnnounceBody(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="cdb-hub-btn-outline"
                disabled={publishBusy}
                onClick={() => {
                  setShowAnnounceForm(false)
                  setAnnounceTitle('')
                  setAnnounceBody('')
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="cdb-btn-primary"
                disabled={publishBusy}
                onClick={() => void handlePublishAnnouncement()}
              >
                {publishBusy ? '发布中…' : '发布公告'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="cdb-hub-stat-row">
        <div className="cdb-glass-card cdb-hub-stat-card">
          <div className="cdb-hub-stat-head">
            <span className="cdb-stat-label">今日活跃</span>
            <MsIcon name="local_fire_department" size={20} className="cdb-icon-primary-soft" aria-hidden />
          </div>
          <div className="cdb-hub-stat-value-row">
            <span className="cdb-hub-stat-num">{todayActive}</span>
            <span className="cdb-hub-stat-delta cdb-hub-stat-delta--up">
              <MsIcon name="arrow_upward" size={14} aria-hidden />
              {todayActiveDelta >= 0 ? todayActiveDelta : Math.abs(todayActiveDelta)}
            </span>
          </div>
        </div>
        <div className="cdb-glass-card cdb-hub-stat-card">
          <div className="cdb-hub-stat-head">
            <span className="cdb-stat-label">新增需求</span>
            <MsIcon name="assignment" size={20} className="cdb-hub-icon-tertiary" aria-hidden />
          </div>
          <div className="cdb-hub-stat-value-row">
            <span className="cdb-hub-stat-num">{newDemands}</span>
            <span className="cdb-text-muted cdb-hub-stat-sub">本周合计 {weekDemands}</span>
          </div>
        </div>
        <div className="cdb-glass-card cdb-hub-stat-card">
          <div className="cdb-hub-stat-head">
            <span className="cdb-stat-label">资源更新</span>
            <MsIcon name="folder_open" size={20} className="cdb-hub-icon-success" aria-hidden />
          </div>
          <div className="cdb-hub-stat-value-row">
            <span className="cdb-hub-stat-num">{resourceUpdates}</span>
            <span className="cdb-hub-stat-delta cdb-hub-stat-delta--up">
              <MsIcon name="arrow_upward" size={14} aria-hidden />
              {resourceUpdatesDelta >= 0 ? resourceUpdatesDelta : Math.abs(resourceUpdatesDelta)}
            </span>
          </div>
        </div>
        <div className="cdb-glass-card cdb-hub-stat-card">
          <div className="cdb-hub-stat-head">
            <span className="cdb-stat-label">团队成员</span>
            <MsIcon name="groups" size={20} className="cdb-icon-primary-soft" aria-hidden />
          </div>
          <div className="cdb-hub-stat-value-row">
            <span className="cdb-hub-stat-num">{memberCount}</span>
            <span className="cdb-text-muted cdb-hub-stat-sub">邀请中 {pendingInvites}</span>
          </div>
        </div>
      </div>

      <div className="cdb-hub-asymmetric">
        <section className="cdb-glass-card cdb-hub-announce">
          <div className="cdb-hub-announce-glow" aria-hidden />
          <div className="cdb-hub-announce-inner">
            <div className="cdb-hub-announce-icon">
              <MsIcon name="campaign" size={24} aria-hidden />
            </div>
            <div>
              <div className="cdb-hub-announce-title-row">
                <h3 className="cdb-hub-card-title">{announcement?.title || '圈子公告'}</h3>
                {announcement?.pinned ? <span className="cdb-badge">置顶</span> : null}
              </div>
              <p className="cdb-text-muted cdb-text-body-sm cdb-hub-announce-body">
                {announcement?.body
                  ? announcement.body
                  : circle.description?.trim() ||
                    '欢迎加入本圈。这里将发布活动预告、合作机会与重要通知，请留意动态更新。'}
              </p>
              <div className="cdb-hub-announce-meta">
                <button type="button" className="cdb-demands-link" onClick={() => go('community')}>
                  查看详情
                </button>
                {announcement ? (
                  <>
                    <span className="cdb-dot" />
                    <span className="cdb-text-muted" style={{ fontSize: 12 }}>
                      {announcement.author.nickname} · {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="cdb-dot" />
                    <span className="cdb-text-muted" style={{ fontSize: 12 }}>
                      持续更新
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="cdb-hub-asymmetric-left">
          <section className="cdb-glass-card cdb-hub-panel">
            <h3 className="cdb-label-caps cdb-hub-panel-label">快捷操作</h3>
            <div className="cdb-hub-shortcuts">
              <button type="button" className="cdb-hub-shortcut" onClick={() => navigate(`/demands/create?circleId=${circleId}`)}>
                <MsIcon name="add_box" size={28} className="cdb-text-primary" aria-hidden />
                <span>新建需求</span>
              </button>
              <button type="button" className="cdb-hub-shortcut" onClick={() => go('resources')}>
                <MsIcon name="upload_file" size={28} className="cdb-hub-icon-tertiary" aria-hidden />
                <span>上传资源</span>
              </button>
              <button type="button" className="cdb-hub-shortcut" onClick={() => go('teams')}>
                <MsIcon name="person_add" size={28} className="cdb-hub-icon-success" aria-hidden />
                <span>邀请成员</span>
              </button>
              <button type="button" className="cdb-hub-shortcut" onClick={() => go('community')}>
                <MsIcon name="chat_bubble" size={28} className="cdb-hub-icon-purple" aria-hidden />
                <span>发起讨论</span>
              </button>
            </div>
          </section>

          <section className="cdb-glass-card cdb-hub-panel">
            <h3 className="cdb-label-caps cdb-hub-panel-label">热门标签</h3>
            <div className="cdb-hub-tags">
              {tagList.map((tag) => (
                <button key={tag} type="button" className="cdb-hub-tag">
                  {tag}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="cdb-glass-card cdb-hub-timeline">
          <div className="cdb-hub-timeline-head">
            <h3 className="cdb-hub-card-title">最新动态</h3>
            <button type="button" className="cdb-demands-link" onClick={() => go('community')}>
              查看全部
            </button>
          </div>
          <div className="cdb-hub-timeline-list">
            {visibleActivities.length === 0 ? (
              <p className="cdb-text-muted" style={{ padding: 24, textAlign: 'center' }}>
                暂无动态
              </p>
            ) : (
              visibleActivities.map((item) => {
                const tone = activityToneMap[item.type] || 'default'
                const icon = activityIconMap[item.type] || 'chat'
                const user = item.actor?.nickname || '系统'
                const time = new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })
                return (
                  <div key={item.id} className="cdb-hub-timeline-item">
                    <div className={`cdb-hub-timeline-dot cdb-hub-timeline-dot--${tone}`}>
                      <MsIcon name={icon} size={16} aria-hidden />
                    </div>
                    <div className="cdb-hub-timeline-card">
                      <div className="cdb-hub-timeline-card-head">
                        <span className="cdb-hub-timeline-user">{user}</span>
                        <time className="cdb-text-muted">{time}</time>
                      </div>
                      <p className="cdb-text-muted cdb-hub-timeline-text">
                        {item.title}
                        {item.summary ? <span className="cdb-text-primary"> · {item.summary}</span> : null}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="cdb-hub-timeline-more">
            <button
              type="button"
              className="cdb-hub-btn-ghost-pill"
              onClick={async () => {
                if (!circleId) return
                try {
                  const res = await circleApi.getHubActivities(circleId, 1)
                  const items = (res.data.data?.items as CircleActivityItem[]) || []
                  setActivities(items)
                  toast(`已加载 ${items.length} 条动态`, 'success')
                } catch {
                  toast('加载更多失败', 'error')
                }
              }}
            >
              加载更多
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
