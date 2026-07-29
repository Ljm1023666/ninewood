import { useRef } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { toast } from '@/components/ui/confirm-dialog'
import type { CircleDetailBentoProps } from './circle-detail-types'

const EMPTY_DESC =
  '暂无圈子简介。这是一个汇合南北两地独立开发者的圈子，共同探讨产品、技术与出海机会。'

const DEMAND_LIST_PREVIEW_LIMIT = 3

export function CircleDetailBentoView({
  circle,
  demands,
  memberCount,
  previewMembers,
  statusLabel,
  isMember,
  canJoin,
  joinBusy,
  onPostDemand,
  onJoin,
  onDemandClick,
}: CircleDetailBentoProps) {
  const description = circle.description?.trim() || EMPTY_DESC
  const firstMember = previewMembers[0]
  const extraMembers = firstMember
    ? Math.max(0, memberCount - 1)
    : memberCount
  const typeLabel = circle.type === 'PUBLIC' ? '公开圈' : '私密圈'
  const demandsCardRef = useRef<HTMLElement | null>(null)

  function handlePublish() {
    if (isMember) {
      onPostDemand()
      return
    }
    if (canJoin) {
      onJoin()
      return
    }
    onPostDemand()
  }

  // SIDEBAR-03: 分享此圈子 — 复制当前 URL 到剪贴板 + toast
  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (!url) {
      toast('当前页面没有可分享的地址', 'error')
      return
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(url)
      } else {
        // 兜底：旧浏览器 / 非安全上下文 — 临时 textarea
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast('链接已复制', 'success')
    } catch {
      toast('复制失败，请手动复制地址栏链接', 'error')
    }
  }

  // SIDEBAR-03: 查看全部 — 超过预览上限时滚动到需求卡顶部
  function handleViewAll() {
    if (demands.length <= DEMAND_LIST_PREVIEW_LIMIT) return
    demandsCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const showViewAll = demands.length > DEMAND_LIST_PREVIEW_LIMIT

  return (
    <div className="cdb-main-inner">
      <div className="cdb-bento-grid">
        <section className="cdb-bento-hero cdb-glass-card cdb-hero-card">
          <div className="cdb-hero-glow" aria-hidden />
          <div className="cdb-hero-top">
            <div className="cdb-hero-icon">
              <MsIcon name="diversity_3" size={48} aria-hidden />
            </div>
            <div className="cdb-hero-meta">
              <div className="flex flex-wrap items-center gap-2">
                <span className="cdb-tag cdb-tag--active">{statusLabel}</span>
                <span className="cdb-tag cdb-tag--muted">{typeLabel}</span>
              </div>
              <h2 className="cdb-hero-title">{circle.name}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="cdb-owner-pill">
                  <MsIcon name="person" size={18} aria-hidden />
                  <span>
                    圈主{' '}
                    <span className="font-semibold cdb-text-primary">
                      {circle.owner?.nickname || '未知'}
                    </span>
                  </span>
                </div>
                <div className="cdb-dot" aria-hidden />
                <span className="cdb-text-body-sm cdb-text-muted">
                  南京 · 杭州开发者社群
                </span>
              </div>
            </div>
          </div>
          <p className="cdb-hero-desc">{description}</p>
          <div className="cdb-hero-members">
            <div className="flex -space-x-2">
              {firstMember?.user?.avatarUrl ? (
                <img
                  src={firstMember.user.avatarUrl}
                  alt=""
                  className="cdb-avatar"
                />
              ) : firstMember ? (
                <div className="cdb-avatar-fallback">
                  {firstMember.user?.nickname?.charAt(0) || '?'}
                </div>
              ) : null}
              <div className="cdb-avatar-fallback">+{extraMembers}</div>
            </div>
            <span className="cdb-text-body-sm cdb-text-muted">
              {memberCount} 位成员正在建设此社区
            </span>
          </div>
        </section>

        <section className="cdb-bento-stats cdb-glass-card cdb-stats-card">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="cdb-label-caps">圈子数据</h3>
              <MsIcon
                name="monitoring"
                size={24}
                className="cdb-icon-primary-soft"
                aria-hidden
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="cdb-stat-box" title="暂无活跃度数据">
                <div>
                  <div className="cdb-stat-label">周活跃度</div>
                  <div className="cdb-stat-value cdb-text-muted">--</div>
                </div>
                <div className="cdb-stat-ring" aria-hidden />
              </div>
              <div className="cdb-stat-box">
                <div>
                  <div className="cdb-stat-label">需求总量</div>
                  <div className="cdb-stat-value">{demands.length}</div>
                </div>
                <MsIcon
                  name="bar_chart"
                  size={24}
                  className="cdb-icon-muted"
                  aria-hidden
                />
              </div>
            </div>
          </div>
          <LiquidMetalButton
            type="button"
            className="cdb-btn-ghost"
            onClick={() => void handleShare()}
            data-testid="circle-share-btn"
          >
            <MsIcon name="share" size={18} aria-hidden />
            <span>分享此圈子</span>
          </LiquidMetalButton>
        </section>

        <section
          role="button"
          tabIndex={0}
          onClick={handlePublish}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handlePublish()
            }
          }}
          className="cdb-bento-cta cdb-glass-card cdb-glass-card--cta cdb-cta-card"
        >
          <div className="cdb-cta-icon">
            {joinBusy ? (
              <MsIcon
                name="progress_activity"
                size={28}
                className="animate-spin"
                aria-hidden
              />
            ) : (
              <MsIcon name="add_box" size={28} aria-hidden />
            )}
          </div>
          <div>
            <h4 className="cdb-cta-title">发布需求</h4>
            <p className="cdb-cta-desc">
              在圈内寻找合适搭子或寻求技术支持
            </p>
          </div>
        </section>

        <section
          ref={demandsCardRef}
          className="cdb-bento-demands cdb-glass-card cdb-demands-card"
        >
          <div className="cdb-demands-head">
            <div className="flex items-center gap-2">
              <h3 className="cdb-demands-title">圈内需求</h3>
              <span className="cdb-badge">NEW</span>
            </div>
            {showViewAll ? (
              <LiquidMetalButton
                type="button"
                className="cdb-demands-link"
                onClick={handleViewAll}
                data-testid="circle-view-all-btn"
              >
                查看全部
              </LiquidMetalButton>
            ) : null}
          </div>
          <div className="cdb-demands-body">
            {demands.length > 0 ? (
              <div className="flex flex-col gap-3 overflow-y-auto">
                {demands.map((d) => (
                  <LiquidMetalButton
                    key={d.id}
                    type="button"
                    onClick={() => onDemandClick(d.id)}
                    className="cdb-demand-item"
                  >
                    <p className="font-semibold cdb-text-body">
                      {d.title || '未命名需求'}
                    </p>
                    <p className="mt-1 line-clamp-2 cdb-text-body-sm cdb-text-muted">
                      {d.tagName || d.category}
                      {d.createdAgo ? ` · ${d.createdAgo}` : ''}
                    </p>
                  </LiquidMetalButton>
                ))}
              </div>
            ) : (
              <div className="cdb-demands-empty">
                <div className="cdb-demands-empty-icon">
                  <MsIcon name="inventory_2" size={36} aria-hidden />
                </div>
                <h4 className="cdb-demands-empty-title">暂无圈内需求</h4>
                <p className="cdb-demands-empty-desc">
                  这里还没有开发者发布需求。发布您的第一个需求，通过 3D
                  展示吸引合作搭子。
                </p>
                <LiquidMetalButton
                  label="立即发布"
                  disabled={joinBusy}
                  onClick={handlePublish}
                />
              </div>
            )}
          </div>
        </section>

        <section className="cdb-bento-activity cdb-glass-card cdb-activity-card">
          <h3 className="cdb-label-caps">最新动态</h3>
          <div className="flex gap-3">
            <div className="cdb-activity-dot" aria-hidden />
            <div className="min-w-0">
              <p className="cdb-text-body-sm cdb-text-body">
                圈子 “{circle.name}” 已成功创建
              </p>
              <span className="cdb-stat-label">刚刚</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}