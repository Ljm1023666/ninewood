import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  discussionsApi,
  type DiscussionTopic,
} from '@/api/discussions'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import { LoadingState } from '@/components/ui/loading-state'
import {
  DesktopPageShell,
  DlpGlass,
  DlpEmpty,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { toast } from '@/components/ui/confirm-dialog'
import '@/styles/discussions-plaza.css'

function formatRelativeTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} 天前`
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Discussions() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<DiscussionTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [publishBusy, setPublishBusy] = useState(false)

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await discussionsApi.list({ page: nextPage, pageSize: 20 })
      const data = res.data.data
      setTopics((data?.list || []) as DiscussionTopic[])
      setPage(data?.page || nextPage)
      setTotalPages(data?.totalPages || 1)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
      setTopics([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(1)
  }, [load])

  async function handlePublish() {
    setPublishBusy(true)
    try {
      const res = await discussionsApi.publishTargets()
      const targets = (res.data.data || []) as Array<{ id: string; name: string }>
      if (targets.length === 0) {
        toast('需要先成为某个圈子的圈主或管理员，才能发布话题', 'info')
        navigate('/circles')
        return
      }
      navigate(`/circles/${targets[0].id}/home`)
    } catch {
      toast('无法获取可发布圈子', 'error')
      navigate('/circles')
    } finally {
      setPublishBusy(false)
    }
  }

  return (
    <DesktopPageShell
      title="热门讨论"
      subtitle="汇聚圈子公告与社区话题"
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
            onClick={() => void load(page)}
          />
          <LiquidMetalButton
            label={publishBusy ? '…' : '发布话题'}
            disabled={publishBusy}
            onClick={() => void handlePublish()}
          />
        </div>
      }
    >
      <div className="discussions-plaza">
        <section className="discussions-plaza__hero">
          <div className="discussions-plaza__hero-inner">
            <div>
              <span className="discussions-plaza__chip">
                <MsIcon name="forum" size={14} aria-hidden />
                社区讨论
              </span>
              <h2 className="discussions-plaza__hero-title">热门讨论</h2>
              <p className="discussions-plaza__hero-desc">
                汇聚圈子公告与热门话题，参与讨论，分享你的见解
              </p>
            </div>
            <LiquidMetalButton
              label={publishBusy ? '…' : '发布话题'}
              disabled={publishBusy}
              onClick={() => void handlePublish()}
            />
          </div>
        </section>

        {error ? (
          <DlpGlass>
            <DlpEmpty
              icon={<MsIcon name="error_outline" size={48} />}
              title="加载失败"
              description={error}
              action={
                <DlpBtnPrimary onClick={() => void load(1)}>重试</DlpBtnPrimary>
              }
            />
          </DlpGlass>
        ) : null}

        {loading && !error ? <LoadingState variant="internal" lines={4} /> : null}

        {!loading && !error && topics.length === 0 ? (
          <DlpGlass>
            <DlpEmpty
              icon={<MsIcon name="chat_bubble_outline" size={48} />}
              title="暂无话题"
              description="还没有圈子公告，去圈子广场看看或创建圈子吧"
              action={
                <LiquidMetalButton
                  label="前往圈子"
                  onClick={() => navigate('/circles')}
                />
              }
            />
          </DlpGlass>
        ) : null}

        {!loading && !error && topics.length > 0 ? (
          <>
            <div className="discussions-plaza__list">
              {topics.map((t) => {
                const tags = (t.tags || '')
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean)
                return (
                  <article
                    key={t.id}
                    className="discussions-plaza__card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/circles/${t.circleId}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/circles/${t.circleId}`)
                      }
                    }}
                  >
                    <div className="discussions-plaza__bar" aria-hidden />
                    <div className="discussions-plaza__row">
                      <div className="discussions-plaza__avatar" aria-hidden>
                        {t.publisherAvatar ? (
                          <img src={t.publisherAvatar} alt="" loading="lazy" />
                        ) : (
                          (t.publisherNickname || '?').slice(0, 1)
                        )}
                      </div>
                      <div className="discussions-plaza__main">
                        <div className="discussions-plaza__title-row">
                          {t.isPinned ? (
                            <span className="discussions-plaza__pin">
                              <MsIcon name="push_pin" size={12} aria-hidden />
                              置顶
                            </span>
                          ) : null}
                          <h3 className="discussions-plaza__title">{t.title}</h3>
                        </div>
                        <div className="discussions-plaza__meta">
                          <strong>{t.publisherNickname || '匿名'}</strong>
                          <span aria-hidden>·</span>
                          {t.circleName ? (
                            <>
                              <span className="inline-flex items-center gap-0.5">
                                <MsIcon name="groups" size={13} aria-hidden />
                                {t.circleName}
                              </span>
                              <span aria-hidden>·</span>
                            </>
                          ) : null}
                          <span className="inline-flex items-center gap-0.5">
                            <MsIcon name="schedule" size={13} aria-hidden />
                            {formatRelativeTime(t.createdAt)}
                          </span>
                        </div>
                        {tags.length > 0 ? (
                          <div className="discussions-plaza__tags">
                            {tags.map((tag) => (
                              <span key={tag} className="discussions-plaza__tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="discussions-plaza__content line-clamp-3">
                          {t.content || ''}
                        </p>
                      </div>
                      <MsIcon
                        name="chevron_right"
                        size={20}
                        className="discussions-plaza__chevron"
                        aria-hidden
                      />
                    </div>
                  </article>
                )
              })}
            </div>

            {totalPages > 1 ? (
              <div className="discussions-plaza__pager">
                <LiquidMetalButton
                  type="button"
                  className="discussions-plaza__page-btn"
                  disabled={page <= 1}
                  onClick={() => void load(page - 1)}
                >
                  <MsIcon name="chevron_left" size={16} aria-hidden />
                  上一页
                </LiquidMetalButton>
                <span className="discussions-plaza__page-num">
                  {page} / {totalPages}
                </span>
                <LiquidMetalButton
                  type="button"
                  className="discussions-plaza__page-btn"
                  disabled={page >= totalPages}
                  onClick={() => void load(page + 1)}
                >
                  下一页
                  <MsIcon name="chevron_right" size={16} aria-hidden />
                </LiquidMetalButton>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </DesktopPageShell>
  )
}
