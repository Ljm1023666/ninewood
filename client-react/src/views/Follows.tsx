import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { userApi } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { certColor } from '@/constants/cert'
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
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto thin-scroll">
      <div className="mx-auto w-full max-w-[36rem] px-4 py-6">
        {/* 顶部 tab 切换 */}
        <div className="flex items-center gap-2 mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]',
            )}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => {
                setItems([])
                setPage(1)
                setHasMore(true)
                navigate(`/follows/${userId}?mode=followers`, { replace: true })
              }}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-semibold transition',
                mode === 'followers'
                  ? 'bg-[var(--primary-gradient)] text-white'
                  : isDark
                    ? 'text-white/60'
                    : 'text-text-secondary',
              )}
            >
              粉丝
            </button>
            <button
              type="button"
              onClick={() => {
                setItems([])
                setPage(1)
                setHasMore(true)
                navigate(`/follows/${userId}?mode=following`, { replace: true })
              }}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-semibold transition',
                mode === 'following'
                  ? 'bg-[var(--primary-gradient)] text-white'
                  : isDark
                    ? 'text-white/60'
                    : 'text-text-secondary',
              )}
            >
              关注
            </button>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="flex flex-col">
          {items.map((u) => (
            <div
              key={u.id}
              className={cn(
                'flex items-center gap-3 py-3 border-b',
                isDark ? 'border-white/5' : 'border-black/[0.06]',
              )}
            >
              <div
                className={cn(
                  'h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden cursor-pointer',
                  isDark ? 'bg-white/10' : 'bg-black/[0.06]',
                )}
                style={{
                  boxShadow: u.certificationLevel
                    ? `0 0 8px ${certColor[u.certificationLevel]}40`
                    : undefined,
                }}
                onClick={() => navigate(`/profile/${u.id}`)}
              >
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (u.nickname || '?')[0]
                )}
              </div>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => navigate(`/profile/${u.id}`)}
              >
                <p className="text-sm font-semibold text-text-primary truncate">
                  {u.nickname}
                </p>
                {u.bio && (
                  <p className="text-xs text-text-muted truncate">{u.bio}</p>
                )}
              </div>
              {u.id !== myId && (
                <button
                  onClick={() => toggleFollow(u)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0',
                    u.isFollowing
                      ? cn(
                          'border text-text-muted',
                          isDark
                            ? 'border-white/10 bg-white/5'
                            : 'border-black/[0.08] bg-black/[0.04]',
                        )
                      : 'bg-[var(--primary-gradient)] text-white',
                  )}
                >
                  {u.isFollowing ? '已关注' : '关注'}
                </button>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => loadPage(page)}
              disabled={loading}
              className="w-full py-3 text-sm text-text-muted hover:text-text-secondary mt-2"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
