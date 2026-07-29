import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '@/api/user'
import { cardSearchApi, type UnifiedCardResult } from '@/api/card-search'
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
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { SegmentedFilter } from '@/components/layout/internal-ui'

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
  const [cardRefreshing, setCardRefreshing] = useState(false)
  const [searched, setSearched] = useState(false)
  const [identity, setIdentity] = useState<'DEMANDER' | 'PROVIDER'>(
    () => (localStorage.getItem('ninewood-search-identity') as 'DEMANDER' | 'PROVIDER') || 'DEMANDER',
  )
  const [cardResults, setCardResults] = useState<UnifiedCardResult[]>([])

  async function handleSearch(overrideIdentity?: 'DEMANDER' | 'PROVIDER') {
    const kw = keyword.trim()
    if (!kw) return
    const activeIdentity = overrideIdentity ?? identity
    setLoading(true)
    setSearched(true)
    try {
      const [res, cards] = await Promise.all([
        userApi.search(kw),
        cardSearchApi.search(kw, activeIdentity),
      ])
      setResults(res.data.data)
      setCardResults(cards)
    } catch {
      setResults([])
      setCardResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setKeyword('')
    setResults([])
    setSearched(false)
    setCardResults([])
  }

  async function changeIdentity(next: 'DEMANDER' | 'PROVIDER') {
    if (next === identity) return
    setIdentity(next)
    localStorage.setItem('ninewood-search-identity', next)
    const kw = keyword.trim()
    if (!kw || !searched) return
    // 身份只影响卡片排序：保留用户列表，避免整页 Loading 闪烁
    setCardRefreshing(true)
    try {
      setCardResults(await cardSearchApi.search(kw, next))
    } catch {
      setCardResults([])
    } finally {
      setCardRefreshing(false)
    }
  }

  return (
    <DesktopPageShell title="找人" subtitle="搜索用户昵称或手机号">
      <DlpSearchBar
        value={keyword}
        onChange={setKeyword}
        onSearch={() => void handleSearch()}
        onClear={handleClear}
        loading={loading}
        placeholder="搜索用户、手机号、标签"
        autoFocus
      />

      <div className="mb-6 flex flex-col items-center gap-3">
        <p className="text-[15px] font-medium text-text-secondary">当前优先找</p>
        <SegmentedFilter
          fit
          options={[
            { value: 'DEMANDER', label: '我是需求者' },
            { value: 'PROVIDER', label: '我是服务者' },
          ]}
          value={identity}
          onChange={(next) => {
            if (!cardRefreshing) void changeIdentity(next)
          }}
        />
      </div>

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
                    <LiquidMetalButton
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
                    </LiquidMetalButton>
                  )
                })}
              </div>
            </>
          )}

          {searched && !loading && cardResults.length > 0 && (
            <section
              className={`mt-8 transition-opacity duration-150 ${cardRefreshing ? 'opacity-60' : 'opacity-100'}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">相关卡片</h2>
                <span className="text-xs text-text-muted">
                  {cardRefreshing
                    ? '正在按身份重排…'
                    : identity === 'DEMANDER'
                      ? '优先展示服务卡'
                      : '优先展示需求卡'}
                </span>
              </div>
              <div className="space-y-3">
                {cardResults.map((card) => (
                  card.resultType === 'SERVICE_CARD' ? (
                    <LiquidMetalButton
                      key={`service-${card.id}`}
                      type="button"
                      className="flex w-full items-start gap-4 rounded-xl border border-border bg-bg-card p-4 text-left transition-colors hover:border-[var(--accent-color)]"
                      onClick={() => navigate(`/service-cards/${card.id}`)}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-ghost)] text-xs font-semibold text-[var(--accent-color)]">服务</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-text-primary">{card.title}</h3>
                          <span className="text-xs text-text-muted">服务卡</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{card.summary || card.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                          <span>{card.category}</span>
                          {card.evidence.slice(0, 2).map((evidence) => (
                            <span key={evidence.label}>{evidence.label} {evidence.completedCount} 次</span>
                          ))}
                        </div>
                      </div>
                    </LiquidMetalButton>
                  ) : (
                    <LiquidMetalButton
                      key={`demand-${card.id}`}
                      type="button"
                      className="flex w-full items-start gap-4 rounded-xl border border-border bg-bg-card p-4 text-left transition-colors hover:border-[var(--accent-color)]"
                      onClick={() => navigate(`/demands/${card.id}`)}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-ghost)] text-xs font-semibold text-[var(--accent-color)]">需求</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-text-primary">{card.title}</h3>
                          <span className="text-xs text-text-muted">需求卡</span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{card.category} · 预算 {card.price}</p>
                        <p className="mt-2 text-xs text-text-muted">{card.applicants} 人已申请</p>
                      </div>
                    </LiquidMetalButton>
                  )
                ))}
              </div>
            </section>
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
