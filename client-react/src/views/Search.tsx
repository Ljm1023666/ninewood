import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '@/api/user'
import { certLabel } from '@/constants/cert'
import { MsIcon } from '@/components/ui/ms-icon'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SettingsInput,
  SettingsActionButton,
  SearchResultRow,
} from '@/components/layout/internal-ui'
import { EmptyState } from '@/components/ui/empty-state'
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
    <InternalPageShell width="medium" contentClassName="flex min-h-full flex-col">
      <PageHeader title="找人" subtitle="搜索用户昵称或手机号" onBack="back" />

      <InternalContentBlock className="flex-1">
        <div className="flex items-center gap-2">
          <SettingsInput
            value={keyword}
            onChange={setKeyword}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索用户、标签、需求…"
            className="flex-1"
          />
          {keyword ? (
            <button
              type="button"
              aria-label="清空"
              onClick={handleClear}
              className="flex size-11 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
            >
              <MsIcon name="close" size={14} />
            </button>
          ) : null}
          <SettingsActionButton
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            variant="primary"
          >
            {loading ? '搜索中…' : '搜索'}
          </SettingsActionButton>
        </div>

        {loading && <LoadingState variant="internal" lines={4} />}

        {searched && !loading && results.length === 0 && (
          <EmptyState
            type="search"
            variant="internal"
            message="未找到匹配的用户，试试其他关键词"
          />
        )}

        {searched && !loading && results.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs text-text-muted">
              找到 {results.length} 个用户
            </p>
            {results.map((u) => {
              const certText =
                u.certificationLevel !== 'NONE'
                  ? certLabel[u.certificationLevel as keyof typeof certLabel]
                  : null
              const meta = [u.bio?.slice(0, 50), certText]
                .filter(Boolean)
                .join(' · ')

              return (
                <SearchResultRow
                  key={u.id}
                  title={u.nickname}
                  meta={meta || undefined}
                  badge={certText || '用户'}
                  avatar={
                    u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : undefined
                  }
                  avatarFallback={u.nickname?.charAt(0)}
                  onClick={() => navigate(`/profile/${u.id}`)}
                />
              )
            })}
          </div>
        )}

        {!searched && !loading && (
          <EmptyState
            type="search"
            variant="internal"
            message="输入昵称或手机号搜索用户"
          />
        )}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
