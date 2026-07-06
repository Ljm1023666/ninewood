import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpBtnPrimary,
  DlpBtnGhost,
  DlpBadge,
  DlpEmpty,
  DlpStat,
} from '@/components/layout/desktop-page'
import { userApi } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { certLabel, certColor } from '@/constants/cert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export default function Follows() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const mode = (searchParams.get('mode') as 'followers' | 'following') || 'followers'
  const navigate = useNavigate()
  const myId = useUserStore((s) => s.user?.id)

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)

  const loadPage = useCallback(
    async (p: number) => {
      if (!userId) return
      setLoading(true)
      try {
        const fn = mode === 'followers' ? userApi.followers : userApi.following
        const res = await fn(userId, p)
        const data = res.data.data
        const list: any[] =
          data.list || data.items || data.users || data.followers || data.following || []
        const mapped = list.map((u: any) => ({
          ...u,
          isFollowing: u.isFollowing ?? mode === 'following',
        }))
        setItems((prev) => (p === 1 ? mapped : [...prev, ...mapped]))
        setTotal(data.total ?? mapped.length)
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
      if (target.isFollowing) await userApi.unfollow(target.id)
      else await userApi.follow(target.id)
      setItems((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, isFollowing: !u.isFollowing } : u)),
      )
    } catch {
      /* ignore */
    }
  }

  return (
    <DesktopPageShell title="我的社交" subtitle="管理粉丝与关注列表">
      <div className="dlp-tabs">
        {(['followers', 'following'] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={cn('dlp-tab', mode === v && 'dlp-tab--active')}
            onClick={() => navigate(`/follows/${userId}?mode=${v}`, { replace: true })}
          >
            {v === 'followers' ? '粉丝' : '关注'}
          </button>
        ))}
      </div>

      <div className="dlp-split dlp-split--aside-rail">
        <div>
          {loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <MsIcon name="progress_activity" size={28} className="animate-spin text-[var(--price-foreground)]" />
              <p className="mt-3 text-sm text-text-muted">加载中…</p>
            </div>
          )}

          {!loading && items.length === 0 && (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name={mode === 'followers' ? 'group' : 'how_to_reg'} size={48} />}
                title={mode === 'followers' ? '暂无粉丝' : '暂未关注'}
                description={
                  mode === 'followers' ? '还没有人关注这位用户' : '还没有关注任何人'
                }
              />
            </DlpGlass>
          )}

          {items.length > 0 && (
            <DlpGlass>
              <div className="dlp-table-wrap">
                <table className="dlp-table">
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th>认证</th>
                      <th>简介</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => {
                      const certText =
                        u.certificationLevel && u.certificationLevel !== 'NONE'
                          ? certLabel[u.certificationLevel as keyof typeof certLabel]
                          : null
                      return (
                        <tr
                          key={u.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/profile/${u.id}`)}
                        >
                          <td>
                            <div className="flex items-center gap-3">
                              <div
                                className="dlp-avatar !size-10 !rounded-lg text-white"
                                style={{
                                  background:
                                    certColor[u.certificationLevel as keyof typeof certColor] ||
                                    '#6b7280',
                                }}
                              >
                                {u.avatarUrl ? (
                                  <Avatar className="size-full rounded-lg">
                                    <AvatarImage src={u.avatarUrl} className="object-cover" />
                                    <AvatarFallback className="rounded-lg bg-transparent text-white">
                                      {(u.nickname || '?')[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  (u.nickname || '?')[0]
                                )}
                              </div>
                              <span className="dlp-table__primary">{u.nickname}</span>
                            </div>
                          </td>
                          <td>
                            {certText ? (
                              <DlpBadge tone="gold">{certText}</DlpBadge>
                            ) : (
                              <span className="text-sm text-text-muted">—</span>
                            )}
                          </td>
                          <td className="max-w-[280px]">
                            <span className="line-clamp-1 text-sm">{u.bio?.slice(0, 60) || '—'}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {u.id !== myId ? (
                              u.isFollowing ? (
                                <DlpBtnGhost onClick={() => toggleFollow(u)}>已关注</DlpBtnGhost>
                              ) : (
                                <DlpBtnPrimary onClick={() => toggleFollow(u)}>关注</DlpBtnPrimary>
                              )
                            ) : (
                              <span className="text-sm text-text-muted">本人</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </DlpGlass>
          )}

          {hasMore && items.length > 0 && (
            <div className="mt-4 flex justify-center">
              <DlpBtnGhost onClick={() => loadPage(page)} disabled={loading}>
                {loading ? '加载中…' : '加载更多'}
              </DlpBtnGhost>
            </div>
          )}
        </div>

        <aside>
          <DlpGlass>
            <DlpGlassHead title="社交统计" />
            <DlpGlassBody>
              <DlpStat label={mode === 'followers' ? '粉丝' : '关注'} value={total || items.length} gold />
              <p className="mt-4 text-sm text-text-secondary">
                点击行进入用户主页；操作列可快速关注或取消关注。
              </p>
            </DlpGlassBody>
          </DlpGlass>
        </aside>
      </div>
    </DesktopPageShell>
  )
}
