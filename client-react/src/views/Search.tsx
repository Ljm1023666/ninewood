import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '@/api/user'
import { certLabel, certColor } from '@/constants/cert'
import { Search as SearchIcon, X } from 'lucide-react'
import { AcetBackdropBlurButton } from '@/components/ui/tailwindcss-buttons-variants'

export default function Search() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
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

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch bg-bg-primary">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-3xl shrink-0 flex-col self-center">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2">
            <SearchIcon size={16} className="flex-shrink-0 text-text-muted" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索用户昵称或手机号"
              autoFocus
              className="flex-1 border-none bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted"
            />
            {keyword && (
              <button
                type="button"
                aria-label="清空"
                onClick={() => {
                  setKeyword('')
                  setResults([])
                  setSearched(false)
                }}
                className="text-text-muted"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <AcetBackdropBlurButton
            type="button"
            onClick={handleSearch}
            className="!shrink-0 !rounded-lg !px-4 !py-2 !text-sm font-semibold !text-text-primary"
          >
            搜索
          </AcetBackdropBlurButton>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <p className="py-16 text-center text-sm text-text-muted">
              搜索中...
            </p>
          )}
          {searched &&
            !loading &&
            (results.length === 0 ? (
              <p className="py-16 text-center text-sm text-text-muted">
                未找到相关用户
              </p>
            ) : (
              results.map((u: any) => (
                <div
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/profile/${u.id}`)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && navigate(`/profile/${u.id}`)
                  }
                  className="flex cursor-pointer items-center gap-3 px-4 py-4 hover:bg-bg-secondary sm:px-5"
                >
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white"
                    style={{
                      background:
                        certColor[
                          u.certificationLevel as keyof typeof certColor
                        ] || '#6b7280',
                    }}
                  >
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        className="h-full w-full object-cover"
                        alt=""
                      />
                    ) : (
                      u.nickname?.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium">{u.nickname}</div>
                    {u.bio && (
                      <div className="mt-0.5 truncate text-xs text-text-muted">
                        {u.bio.slice(0, 40)}
                      </div>
                    )}
                  </div>
                  {u.certificationLevel !== 'NONE' && (
                    <span
                      className="flex-shrink-0 text-[11px] font-semibold"
                      style={{
                        color:
                          certColor[
                            u.certificationLevel as keyof typeof certColor
                          ],
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
              ))
            ))}
        </div>
      </div>
    </div>
  )
}
