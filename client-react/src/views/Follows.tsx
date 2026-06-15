import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  SegmentedFilter,
} from '@/components/layout/internal-ui'
import { userApi } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { certLabel, certColor } from '@/constants/cert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export default function Follows() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const mode =
    (searchParams.get('mode') as 'followers' | 'following') || 'followers'
  const navigate = useNavigate()
  const myId = useUserStore((s) => s.user?.id)
  const isDark = useThemeStore((s) => s.current.dark)

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadPage = useCallback(
    async (p: number) => {
      if (!userId) return
      setLoading(true)
      try {
        const fn = mode === 'followers' ? userApi.followers : userApi.following
        const res = await fn(userId, p)
        const data = res.data.data
        const list: any[] =
          data.list ||
          data.items ||
          data.users ||
          data.followers ||
          data.following ||
          []
        const mapped = list.map((u: any) => ({
          ...u,
          isFollowing: u.isFollowing ?? mode === 'following',
        }))
        setItems((prev) => (p === 1 ? mapped : [...prev, ...mapped]))
        setHasMore(p < (data.totalPages || 1))
        setPage(p + 1)
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    },
    [mode, userId],
  )

  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    loadPage(1)
  }, [mode, userId, loadPage])

  async function toggleFollow(target: any) {
    try {
      if (target.isFollowing) {
        await userApi.unfollow(target.id)
      } else {
        await userApi.follow(target.id)
      }
      setItems((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, isFollowing: !u.isFollowing } : u,
        ),
      )
    } catch {
      /* ignore */
    }
  }

  return (
    <InternalPageShell width="narrow" className="bg-background text-text-primary">
      <PageHeader
        title={mode === 'followers' ? '粉丝' : '关注'}
        onBack="back"
      />

      <SegmentedFilter
        options={[
          { value: 'followers', label: '粉丝' },
          { value: 'following', label: '关注' },
        ]}
        value={mode}
        onChange={(v) =>
          navigate(`/follows/${userId}?mode=${v}`, { replace: true })
        }
      />

      {/* Loading */}
        {loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <MsIcon name="progress_activity" size={28} className="animate-spin text-accent" />
            <p className="mt-3 text-sm text-text-muted">加载中...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
              {mode === 'followers' ? (
                <MsIcon name="group" size={24} className="text-text-muted" />
              ) : (
                <MsIcon name="how_to_reg" size={24} className="text-text-muted" />
              )}
            </div>
            <p className="mt-4 text-sm font-medium text-text-primary">
              {mode === 'followers' ? '暂无粉丝' : '暂未关注'}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {mode === 'followers'
                ? '还没有人关注这位用户'
                : '还没有关注任何人'}
            </p>
          </div>
        )}

        {/* 用户列表 */}
        {items.length > 0 && (
          <div className="space-y-1">
            {items.map((u) => (
              <div
                key={u.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/profile/${u.id}`)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && navigate(`/profile/${u.id}`)
                }
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-all',
                  isDark
                    ? 'hover:border-border hover:bg-bg-secondary/80'
                    : 'hover:border-border hover:bg-bg-secondary/60',
                  'active:scale-[0.99]',
                )}
              >
                <div
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-md"
                  style={{
                    background:
                      certColor[
                        u.certificationLevel as keyof typeof certColor
                      ] || '#6b7280',
                    boxShadow: u.certificationLevel
                      ? `0 0 10px ${certColor[u.certificationLevel as keyof typeof certColor] || '#6b7280'}40`
                      : undefined,
                  }}
                >
                  {u.avatarUrl ? (
                    <Avatar className="h-full w-full">
                      <AvatarImage
                        src={u.avatarUrl}
                        className="h-full w-full object-cover"
                      />
                      <AvatarFallback className="h-full w-full bg-transparent text-sm font-bold text-white">
                        {(u.nickname || '?')[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    (u.nickname || '?')[0]
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium text-text-primary">
                      {u.nickname}
                    </span>
                    {u.certificationLevel &&
                      u.certificationLevel !== 'NONE' && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold"
                          style={{
                            color:
                              certColor[
                                u.certificationLevel as keyof typeof certColor
                              ],
                            backgroundColor:
                              (certColor[
                                u.certificationLevel as keyof typeof certColor
                              ] || '#6b7280') + '15',
                          }}
                        >
                          {
                            certLabel[
                              u.certificationLevel as keyof typeof certLabel
                            ]
                          }
                        </span>
                      )}
                  </div>
                  {u.bio && (
                    <p className="mt-0.5 truncate text-sm text-text-muted">
                      {u.bio.slice(0, 50)}
                    </p>
                  )}
                </div>

                {u.id !== myId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFollow(u)
                    }}
                    className={cn(
                      'shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
                      u.isFollowing
                        ? cn(
                            'border text-text-muted',
                            isDark
                              ? 'border-white/10 bg-white/5 hover:bg-white/10'
                              : 'border-border/70 bg-bg-secondary/40 hover:bg-bg-secondary/60',
                          )
                        : 'bg-[var(--primary-gradient)] text-white hover:opacity-90',
                    )}
                  >
                    {u.isFollowing ? '已关注' : '关注'}
                  </button>
                )}

                <MsIcon
                  name="chevron_right"
                  size={14}
                  className={cn(
                    'shrink-0 text-text-muted/40 opacity-0 transition-opacity group-hover:opacity-100',
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {/* 加载更多 */}
        {hasMore && items.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => loadPage(page)}
              disabled={loading}
              className={cn(
                'rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-all',
                isDark
                  ? 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-secondary'
                  : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-secondary',
                loading && 'pointer-events-none opacity-60',
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <MsIcon name="progress_activity" size={14} className="animate-spin" />
                  加载中...
                </span>
              ) : (
                '加载更多'
              )}
            </button>
          </div>
        )}
    </InternalPageShell>
  )
}
