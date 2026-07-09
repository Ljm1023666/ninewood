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
  DlpBadge,
  DlpEmpty,
  DlpSearchBar,
  DlpBenefitItem,
} from '@/components/layout/desktop-page'
import { LoadingState } from '@/components/ui/loading-state'

interface SearchUser {
  id: string
  nickname: string
  avatarUrl?: string
  bio?: string
  certificationLevel: string
}

const searchTips = [
  {
    icon: 'person',
    title: '昵称搜索',
    description: '输入完整或部分昵称即可匹配',
  },
  {
    icon: 'phone',
    title: '手机号查找',
    description: '支持手机号精确查找用户',
  },
  {
    icon: 'open_in_new',
    title: '进入主页',
    description: '点击用户卡片查看详细资料',
  },
] as const

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
      <DlpSearchBar
        value={keyword}
        onChange={setKeyword}
        onSearch={handleSearch}
        onClear={handleClear}
        loading={loading}
        placeholder="搜索用户、手机号、标签"
      />

      <div className="dlp-split dlp-split--aside-rail">
        <div>
          {loading && <LoadingState variant="internal" lines={4} />}

          {searched && !loading && results.length === 0 && (
            <DlpGlass>
              <DlpEmpty
                icon={<MsIcon name="person_off" size={28} />}
                title="未找到匹配的用户"
                description="试试其他关键词，或检查拼写是否正确"
              />
            </DlpGlass>
          )}

          {searched && !loading && results.length > 0 && (
            <>
              <p className="mb-4 text-sm text-text-muted">
                找到 <span className="font-semibold text-text-primary">{results.length}</span> 个用户
              </p>
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
                icon={<MsIcon name="person_search" size={28} />}
                title="开始寻找用户"
                description="输入昵称、手机号或标签，发现平台上的服务者与合作伙伴"
              />
            </DlpGlass>
          )}
        </div>

        <aside>
          <DlpGlass>
            <DlpGlassHead title="搜索提示" subtitle="快速找到你需要的用户" />
            <DlpGlassBody className="!p-0">
              <div className="dlp-benefit-grid">
                {searchTips.map((tip) => (
                  <DlpBenefitItem
                    key={tip.title}
                    icon={<MsIcon name={tip.icon} size={20} />}
                    title={tip.title}
                    description={tip.description}
                  />
                ))}
              </div>
            </DlpGlassBody>
          </DlpGlass>
        </aside>
      </div>
    </DesktopPageShell>
  )
}
