import { useEffect, useState } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { toast } from '@/components/ui/confirm-dialog'
import { useCircleHub } from './circle-hub-context'
import { circleApi, type CircleMemberItem, type CircleInviteItem } from '@/api/circle'

const ROLE_LABEL: Record<string, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  MEMBER: '成员',
}

function memberInitial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

export default function CircleHubTeams() {
  const { circleId, circle, memberCount } = useCircleHub()
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<CircleMemberItem[]>([])
  const [invites, setInvites] = useState<CircleInviteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)

  const load = async (q: string) => {
    if (!circleId) return
    setLoading(true)
    setError('')
    try {
      const [mRes, iRes] = await Promise.all([
        circleApi.getMembers(circleId, { q, limit: 100 }),
        circleApi.listInvites(circleId).catch(() => ({ data: { data: { items: [] } } })),
      ])
      setMembers((mRes.data.data?.items as CircleMemberItem[]) || [])
      setInvites((iRes.data.data?.items as CircleInviteItem[]) || [])
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!circleId) return
    const t = setTimeout(() => {
      void load(query.trim())
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, query])

  if (!circle) return null

  const onlineCount = members.filter((m) => m.lastSeenAt && Date.now() - new Date(m.lastSeenAt).getTime() < 3_600_000).length

  async function copyInviteLink() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/circles/${circleId}/community` : ''
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      }
      toast('邀请链接已复制', 'success')
    } catch {
      toast('复制失败，请手动分享链接', 'error')
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    if (!circleId) return
    setInviteBusy(true)
    try {
      const res = await circleApi.createInvite(circleId, inviteEmail.trim())
      const created = res.data.data as CircleInviteItem
      setInvites([created, ...invites])
      setInviteEmail('')
      toast('邀请已发送', 'success')
    } catch (e: unknown) {
      toast((e as { response?: { data?: { message?: string } } }).response?.data?.message || '发送失败', 'error')
    } finally {
      setInviteBusy(false)
    }
  }

  async function resend(inviteId: string) {
    if (!circleId) return
    try {
      await circleApi.resendInvite(circleId, inviteId)
      toast('已重发邀请', 'success')
      await load(query.trim())
    } catch (e: unknown) {
      toast((e as { response?: { data?: { message?: string } } }).response?.data?.message || '重发失败', 'error')
    }
  }

  async function revoke(inviteId: string) {
    if (!circleId) return
    try {
      await circleApi.revokeInvite(circleId, inviteId)
      setInvites(invites.filter((it) => it.id !== inviteId))
      toast('邀请已撤销', 'success')
    } catch (e: unknown) {
      toast((e as { response?: { data?: { message?: string } } }).response?.data?.message || '撤销失败', 'error')
    }
  }

  return (
    <div className="cdb-main-inner cdb-hub-page">
      <div className="cdb-hub-teams-head">
        <h2 className="cdb-hub-display-title">我的团队</h2>
        <p className="cdb-text-muted">管理团队成员、邀请及权限设置</p>
      </div>

      {error ? <p style={{ color: '#e85a4f' }}>{error}</p> : null}

      <div className="cdb-hub-teams-grid">
        <section className="cdb-glass-card cdb-hub-roster">
          <div className="cdb-hub-roster-head">
            <h3 className="cdb-hub-section-title cdb-hub-roster-title">
              <MsIcon name="group" size={24} className="cdb-text-primary" aria-hidden />
              团队成员
            </h3>
            <div className="cdb-hub-roster-search">
              <MsIcon name="search" size={20} className="cdb-hub-search-icon" aria-hidden />
              <input
                className="cdb-hub-search-input cdb-hub-search-input--sm"
                placeholder="搜索成员..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="cdb-hub-member-list">
            {loading ? (
              <p className="cdb-text-muted cdb-hub-empty">加载中...</p>
            ) : members.length === 0 ? (
              <p className="cdb-text-muted cdb-hub-empty">暂无成员</p>
            ) : (
              members.map((m) => {
                const isOnline = m.lastSeenAt && Date.now() - new Date(m.lastSeenAt).getTime() < 3_600_000
                return (
                  <div key={m.userId} className="cdb-hub-member-row group">
                    <div className="cdb-hub-member-main">
                      <div className="cdb-hub-member-avatar-wrap">
                        {m.user.avatarUrl ? (
                          <img src={m.user.avatarUrl} alt="" className="cdb-hub-member-avatar" />
                        ) : (
                          <div className="cdb-hub-member-avatar-fallback">
                            {memberInitial(m.user.nickname)}
                          </div>
                        )}
                        <span className={`cdb-hub-status-dot ${isOnline ? 'cdb-hub-status-dot--online' : ''}`} />
                      </div>
                      <div>
                        <div className="cdb-hub-member-name-row">
                          <span className="cdb-hub-member-name">{m.user.nickname || '未命名成员'}</span>
                          <span
                            className={
                              m.role === 'OWNER'
                                ? 'cdb-hub-role cdb-hub-role--owner'
                                : m.role === 'ADMIN'
                                  ? 'cdb-hub-role'
                                  : 'cdb-hub-role cdb-hub-role--muted'
                            }
                          >
                            {ROLE_LABEL[m.role] || '成员'}
                          </span>
                        </div>
                        <span className="cdb-text-muted cdb-text-body-sm">
                          {m.lastActiveLabel}
                        </span>
                      </div>
                    </div>
                    <div className="cdb-hub-member-meta">
                      <div className="cdb-hub-member-activity">
                        <span className="cdb-stat-label">上次活动</span>
                        <span>{m.lastActiveLabel}</span>
                      </div>
                      <button type="button" className="cdb-hub-icon-btn cdb-hub-member-menu" aria-label="更多操作">
                        <MsIcon name="more_vert" size={20} aria-hidden />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="cdb-glass-card cdb-hub-invite-card">
          <div className="cdb-hub-invite-head">
            <div className="cdb-hub-invite-icon">
              <MsIcon name="person_add" size={24} aria-hidden />
            </div>
            <h3 className="cdb-hub-card-title">邀请成员</h3>
          </div>
          <p className="cdb-text-muted cdb-text-body-sm">
            通过邮箱或分享专属链接邀请新成员加入您的团队空间。
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              className="cdb-hub-search-input"
              placeholder="dev@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
            />
            <button
              type="button"
              className="cdb-btn-primary"
              onClick={() => void sendInvite()}
              disabled={inviteBusy || !inviteEmail.trim()}
            >
              {inviteBusy ? '发送中...' : '发送'}
            </button>
          </div>
          <button
            type="button"
            className="cdb-btn-primary cdb-hub-invite-btn"
            onClick={() => void copyInviteLink()}
            style={{ marginTop: 12 }}
          >
            <MsIcon name="link" size={20} aria-hidden />
            复制邀请链接
          </button>
        </section>

        <section className="cdb-glass-card cdb-hub-team-stats">
          <h3 className="cdb-label-caps cdb-hub-panel-label">团队概览</h3>
          <div className="cdb-hub-team-stats-grid">
            <div className="cdb-hub-team-stat">
              <span className="cdb-hub-stat-num">{memberCount}</span>
              <span className="cdb-stat-label">总成员数</span>
            </div>
            <div className="cdb-hub-team-stat cdb-hub-team-stat--online">
              <span className="cdb-hub-stat-num">{onlineCount}</span>
              <span className="cdb-stat-label">当前在线</span>
            </div>
          </div>
        </section>

        <section className="cdb-glass-card cdb-hub-pending">
          <div className="cdb-hub-pending-head">
            <h3 className="cdb-hub-card-title">待处理邀请</h3>
            <span className="cdb-hub-pending-count">{invites.length}</span>
          </div>
          {invites.length === 0 ? (
            <p className="cdb-text-muted" style={{ padding: 16, textAlign: 'center' }}>暂无待处理邀请</p>
          ) : (
            invites.map((invite) => (
              <div key={invite.id} className="cdb-hub-pending-item">
                <div className="cdb-hub-pending-user">
                  <div className="cdb-hub-pending-mail">
                    <MsIcon name="mail" size={16} aria-hidden />
                  </div>
                  <div>
                    <span className="cdb-hub-pending-email">{invite.email}</span>
                    <span className="cdb-text-muted cdb-hub-pending-time">
                      发送于 {new Date(invite.createdAt).toLocaleString('zh-CN', { hour12: false })}
                    </span>
                  </div>
                </div>
                <div className="cdb-hub-pending-actions">
                  <button type="button" className="cdb-hub-pending-btn" onClick={() => void resend(invite.id)}>
                    重新发送
                  </button>
                  <button
                    type="button"
                    className="cdb-hub-pending-btn cdb-hub-pending-btn--danger"
                    onClick={() => void revoke(invite.id)}
                  >
                    撤销
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
