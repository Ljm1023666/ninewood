import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { toast } from '@/components/ui/confirm-dialog'
import { HorizonHeroSection } from '@/components/ui/horizon-hero-section'
import { ScrollNavbar } from '@/components/ui/scroll-navigation-menu'
import { Footer } from '@/components/ui/footer-section'

import { SearchBar } from '@/components/ui/search-bar'
import { InputWithTags } from '@/components/ui/input-with-tags'
import { SparklesCore } from '@/components/ui/sparkles'
import { getAuthToken } from '@/api/auth-session'

export default function Discover() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const tagsWrapperRef = useRef<HTMLDivElement>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchNodeIds, setSearchNodeIds] = useState<string[]>([])
  const [searchKeywords, setSearchKeywords] = useState<string[]>([])
  const [searchClassifiedLabels, setSearchClassifiedLabels] = useState<
    string[]
  >([])
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [tagResetKey, setTagResetKey] = useState(0)
  const [searchMsg, setSearchMsg] = useState('')
  const [resultCount, setResultCount] = useState(-1)

  const handleTagsChange = useCallback((newTags: string[]) => {
    setFilterTags(newTags)
  }, [])

  const handleSend = useCallback(async (message: string) => {
    setSearchMsg('')
    setResultCount(-1)
    try {
      const res = await fetch('/api/ai/discover-classify-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: [], thinkMode: false }),
      })
      if (!res.ok || !res.body) {
        toast('网络异常', 'error')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let result: any = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const events = buf.split('\n\n')
        buf = events.pop() || ''
        for (const event of events) {
          const lines = event.split('\n')
          const eventType = lines[0]?.replace('event: ', '')
          const dataLine = lines.find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          const data = dataLine.slice(6)
          if (eventType === 'result') {
            try {
              result = JSON.parse(data)
            } catch {
              /* stream chunk parse */
            }
          } else if (eventType === 'error') {
            try {
              const { message: errMsg } = JSON.parse(data)
              toast(errMsg || 'AI 错误', 'error')
            } catch {
              /* stream chunk parse */
            }
          }
        }
      }
      if (result) {
        setSearchKeyword(message)
        setSearchNodeIds(result.classifiedNodeIds || [])
        const kw = result.keywords || []
        setSearchKeywords(kw)
        setSearchClassifiedLabels(result.classifiedLabels || [])
        setFilterTags(kw)
        setTagResetKey((n) => n + 1)
        setSearchMsg(kw.length > 0 ? `已识别：${kw.join('、')}` : '搜索完成')
        ;(document.activeElement as HTMLElement)?.blur()
      } else {
        setSearchMsg('未找到匹配')
      }
    } catch {
      setSearchMsg('网络异常')
    }
  }, [])

  const showResults = !!(searchKeyword || filterTags.length > 0)

  const handleSearch = useCallback(
    (query: string) => {
      handleSend(query)
    },
    [handleSend],
  )

  const heroSections = useMemo(
    () => [
      {
        title: 'Ninewood',
        subtitle: { line1: '', line2: '' },
        render: () => (
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-2xl h-40 z-0 bg-black">
            <div className="absolute inset-x-0 top-0 flex flex-col items-center">
              <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm mt-px" />
              <div className="h-px w-1/4 bg-gradient-to-r from-transparent via-sky-500 to-transparent mt-1" />
              <div className="h-[3px] w-1/4 bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-sm mt-px" />
            </div>
            <SparklesCore
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={100}
              className="w-full h-full"
              particleColor="#FFFFFF"
              speed={0.6}
            />
          </div>
        ),
      },
      {
        title: '遇见',
        subtitle: {
          line1: '在这个空间里，',
          line2: '创意与需求相遇',
        },
        render: () => (
          <>
            <SearchBar placeholder="搜索需求..." onSearch={handleSearch} />
            {searchMsg && (
              <p className="text-sm text-white/60 text-center mt-3">
                {searchMsg}
              </p>
            )}
            {resultCount >= 0 && (
              <p className="text-sm text-white/40 text-center mt-1">
                {resultCount > 0 ? `${resultCount} 个结果` : '无结果'}
              </p>
            )}
          </>
        ),
      },
      {
        title: '寻觅',
        subtitle: {
          line1: '探索创意的边界，',
          line2: '发现无限可能',
        },
        render: () => (
          <div ref={tagsWrapperRef}>
            <InputWithTags
              key={tagResetKey}
              placeholder="输入标签后回车"
              className="mx-auto"
              onTagsChange={handleTagsChange}
              initialTags={filterTags}
              pinkTags={searchKeywords.filter((k) =>
                searchClassifiedLabels.includes(k),
              )}
              purpleTags={searchKeywords.filter(
                (k) => !searchClassifiedLabels.includes(k),
              )}
            />
          </div>
        ),
      },
      {
        title: '直达',
        subtitle: {
          line1: '连接每一个机会，',
          line2: '匿名检索，直达服务',
        },
        render: () => (
          <ProviderSearchPanel />
        ),
      },
    ],
    [
      handleSearch,
      searchMsg,
      resultCount,
      handleTagsChange,
      filterTags,
      tagResetKey,
      searchKeywords,
      searchClassifiedLabels,
    ],
  )

  return (
    <div className="flex min-h-full flex-col">
      <ScrollNavbar />
      <HorizonHeroSection sections={heroSections} footer={<Footer />}>
        {showResults && (
          <div ref={resultsRef} className="w-full">
            <DemandDiscoveryList
              keyword={searchKeyword}
              serviceType="ALL"
              taxonomyLeafIds={searchNodeIds}
              tagNames={filterTags
                .filter(
                  (t) =>
                    !searchKeywords.includes(t) ||
                    searchClassifiedLabels.includes(t),
                )
                .join(',')}
              scrollRootRef={scrollRef}
              paginationMode="paged"
              pageSize={12}
              renderMode="timeline"
              suppressEmptyAction
              onTotalChange={setResultCount}
            />
          </div>
        )}
      </HorizonHeroSection>
    </div>
  )
}


/**
 * P1-06: 服务者检索面板
 * - 输入服务标签后跳出可跳转的服务者列表
 * - 点击跳转到 /profile/:userId
 */
function ProviderSearchPanel() {
  const [tag, setTag] = useState('')
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const nav = useNavigate()
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    // 获取当前用户，跳转个人主页时使用其 userId
    fetch('/api/users/me', {
      credentials: 'include',
      headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setMe(d?.data || null))
      .catch(() => {})
  }, [])

  async function search() {
    const t = tag.trim()
    if (!t) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/providers/search?tagName=${encodeURIComponent(t)}&limit=10`)
      const d = await res.json()
      setProviders(d.data?.providers || [])
    } catch {
      setProviders([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-sm text-white/40 text-center">输入服务标签，检索附近空闲的服务者</p>
      <input
        type="text"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
        placeholder="例如：出租车司机、平面设计..."
        className="w-full max-w-md mx-auto rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-white/40 outline-none backdrop-blur-md"
      />
      {loading && <p className="text-sm text-white/40">搜索中...</p>}
      {searched && !loading && providers.length === 0 && (
        <p className="text-sm text-white/40">暂无空闲服务者</p>
      )}
      {providers.length > 0 && (
        <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <button
              key={p.userId}
              type="button"
              onClick={() => nav(`/profile/${p.userId}`)}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
            >
              <p className="text-sm font-medium text-white">{p.userId === me?.id ? '你本人' : `服务者 ${p.userId.slice(0, 8)}…`}</p>
              <p className="mt-1 text-xs text-white/50">
                标签：{p.tagName} · 评分：{(p.rating ?? 0).toFixed(1)} · 完成：{p.orderCount ?? 0}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
