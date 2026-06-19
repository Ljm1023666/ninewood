import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { userApi } from '@/api/user'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { certColor } from '@/constants/cert'
import { cn } from '@/lib/utils'

interface FollowListProps {
  visible: boolean
  userId: string
  mode: 'followers' | 'following'
  onClose: () => void
}

export function FollowList({
  visible,
  userId,
  mode,
  onClose,
}: FollowListProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const navigate = useNavigate()
  const myId = useUserStore((s) => s.user?.id)
  const isDark = useThemeStore((s) => s.current.dark)

  const loadPage = useCallback(
    async (p: number) => {
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
        // "关注"列表默认都是已关注，"粉丝"列表默认未关注
        const mapped = list.map((u: any) => ({
          ...u,
          isFollowing: u.isFollowing ?? mode === 'following',
        }))
        setItems((prev) => (p === 1 ? mapped : [...prev, ...mapped]))
        const totalPages = data.totalPages || 1
        setHasMore(p < totalPages)
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
    if (!visible) return
    setItems([])
    setPage(1)
    setHasMore(true)
    loadPage(1)
  }, [visible, mode, userId, loadPage])

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
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 top-0 z-[101] bg-card/95 backdrop-blur-xl border-b border-border rounded-b-2xl max-h-[70vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 pb-3">
              <span className="text-base font-semibold text-text-primary">
                {mode === 'followers' ? '粉丝' : '关注'} ({items.length})
              </span>
              <button
                onClick={onClose}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg',
                  isDark ? 'bg-white/5' : 'bg-black/[0.04]',
                )}
              >
                <X size={16} className="text-text-secondary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
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
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0 cursor-pointer',
                      isDark ? 'bg-white/10' : 'bg-black/[0.06]',
                    )}
                    style={{
                      boxShadow: u.certificationLevel
                        ? `0 0 8px ${certColor[u.certificationLevel]}40`
                        : undefined,
                    }}
                    onClick={() => {
                      navigate(`/profile/${u.id}`)
                      onClose()
                    }}
                  >
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (u.nickname || '?')[0]
                    )}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      navigate(`/profile/${u.id}`)
                      onClose()
                    }}
                  >
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {u.nickname}
                    </p>
                    {u.bio && (
                      <p className="text-xs text-text-muted truncate">
                        {u.bio}
                      </p>
                    )}
                  </div>
                  {u.id !== myId && (
                    <button
                      onClick={() => toggleFollow(u)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        u.isFollowing
                          ? cn(
                              'text-text-muted border',
                              isDark
                                ? 'bg-white/5 border-white/10'
                                : 'bg-black/[0.04] border-black/[0.08]',
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
