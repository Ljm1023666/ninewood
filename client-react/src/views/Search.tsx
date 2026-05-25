import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '@/api/user'
import { certLabel, certColor, certGlow } from '@/constants/cert'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { BackButton } from '@/components/ui/back-button'

interface SearchUser {
  id: string
  nickname: string
  avatarUrl?: string
  bio?: string
  certificationLevel: string
}

export default function Search() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const kw = keyword.trim()
    if (!kw) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await userApi.search(kw)
      setResults(res.data.data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setKeyword('')
    setResults([])
    setSearched(false)
  }

  function getAvatarBgColor(certLevel: string) {
    return certColor[certLevel as keyof typeof certColor] || '#6b7280'
  }

  function getCertGlow(certLevel: string) {
    return certGlow[certLevel as keyof typeof certGlow] || 'none'
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-text-primary">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-3xl shrink-0 flex-col self-center">
        <div className="shrink-0 px-4 py-4 sm:px-6">
          <BackButton />
          <div className="mb-1 mt-2">
            <h1 className="text-xl font-bold text-text-primary">找人</h1>
            <p className="text-sm text-text-muted">搜索用户昵称或手机号</p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex flex-1 items-center">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入关键词搜索..."
                autoFocus
                className="h-10 w-full rounded-lg border border-border bg-bg-secondary pl-3 pr-10 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              {keyword && (
                <button
                  type="button"
                  aria-label="清空"
                  onClick={handleClear}
                  className="absolute right-3 text-text-muted transition-colors hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleSearch}
              disabled={loading || !keyword.trim()}
              className="h-10 shrink-0 px-4"
            >
              {loading ? '搜索中...' : '搜索'}
            </Button>
          </div>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          {loading && (
            <div className="space-y-2 pb-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-bg-secondary/40 p-3"
                >
                  <Skeleton className="size-12 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/5 rounded" />
                    <Skeleton className="h-3 w-3/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <EmptyState
              type="search"
              message="未找到匹配的用户，试试其他关键词"
            />
          )}

          {searched && !loading && results.length > 0 && (
            <div className="space-y-2 pb-4">
              <p className="px-1 text-sm text-text-muted">
                找到 {results.length} 个用户
              </p>
              <div className="space-y-1">
                {results.map((u) => (
                  <div
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/profile/${u.id}`)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && navigate(`/profile/${u.id}`)
                    }
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-bg-secondary/50 p-3 transition-all hover:border-border hover:bg-bg-secondary active:scale-[0.99]"
                  >
                    <div
                      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white shadow-md"
                      style={{
                        background: getAvatarBgColor(u.certificationLevel),
                        boxShadow: getCertGlow(u.certificationLevel),
                      }}
                    >
                      {u.avatarUrl ? (
                        <Avatar className="h-full w-full">
                          <AvatarImage
                            src={u.avatarUrl}
                            className="h-full w-full object-cover"
                          />
                          <AvatarFallback className="h-full w-full bg-transparent text-lg font-bold text-white">
                            {u.nickname?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        u.nickname?.charAt(0)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium text-text-primary">
                          {u.nickname}
                        </span>
                        {u.certificationLevel !== 'NONE' && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold"
                            style={{
                              color: getAvatarBgColor(u.certificationLevel),
                              backgroundColor:
                                getAvatarBgColor(u.certificationLevel) + '15',
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

                    <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-text-muted"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--accent-ghost)] mb-3">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">
                输入昵称或手机号搜索用户
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
