import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '@/api/user'
import { certLabel } from '@/constants/cert'
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
} from '@/components/layout/desktop-page'
import { LoadingState } from '@/components/ui/loading-state'
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

  return (
    <DesktopPageShell title="找人" subtitle="搜索用户昵称或手机号">
      <div className="dlp-search-row">
        <input
          className="dlp-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索用户、标签、需求…"
        />
        {keyword ? (
          <DlpBtnGhost onClick={handleClear} aria-label="清空">
            <MsIcon name="close" size={16} />
          </DlpBtnGhost>
        ) : null}
        <DlpBtnPrimary onClick={handleSearch} disabled={loading || !keyword.trim()}>
          {loading ? '搜索中…' : '搜索'}
        </DlpBtnPrimary>
      </div>

      <div className="dlp-split dlp-split--aside-rail">
        <div>
          {loading && <LoadingState variant="internal" lines={4} />}

          {searched && !loading && results.length === 0 && (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="person_search" size={48} />}
                title="未找到匹配的用户"
                description="试试其他关键词"
              />
            </DlpGlass>
          )}

          {searched && !loading && results.length > 0 && (
            <>
              <p className="mb-4 text-sm text-text-muted">找到 {results.length} 个用户</p>
              <div className="dlp-card-grid">
                {results.map((u) => {
                  const certText =
                    u.certificationLevel !== 'NONE'
                      ? certLabel[u.certificationLevel as keyof typeof certLabel]
                      : null
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className="dlp-glass dlp-user-card"
                      onClick={() => navigate(`/profile/${u.id}`)}
                    >
                      <div className="dlp-avatar">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" />
                        ) : (
                          u.nickname?.charAt(0) ?? '?'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-text-primary">
                            {u.nickname}
                          </h3>
                          {certText ? (
                            <DlpBadge tone="gold">{certText}</DlpBadge>
                          ) : (
                            <DlpBadge>用户</DlpBadge>
                          )}
                        </div>
                        {u.bio ? (
                          <p className="mt-2 line-clamp-2 text-sm text-text-muted">{u.bio}</p>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {!searched && !loading && (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="person_search" size={48} />}
                title="输入昵称或手机号搜索用户"
                description="支持按认证等级、简介关键词匹配"
              />
            </DlpGlass>
          )}
        </div>

        <aside>
          <DlpGlass>
            <DlpGlassHead title="搜索提示" subtitle="桌面端支持更宽结果区展示" />
            <DlpGlassBody className="space-y-3 text-sm text-text-muted">
              <p>· 输入完整或部分昵称</p>
              <p>· 支持手机号精确查找</p>
              <p>· 点击卡片进入用户主页</p>
            </DlpGlassBody>
          </DlpGlass>
        </aside>
      </div>
    </DesktopPageShell>
  )
}
