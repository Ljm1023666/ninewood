import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { toast } from '@/components/ui/confirm-dialog'
import { HorizonHeroSection } from '@/components/ui/horizon-hero-section'

import { SearchBar } from '@/components/ui/search-bar'
import { InputWithTags } from '@/components/ui/input-with-tags'

export default function Discover() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const tagsWrapperRef = useRef<HTMLDivElement>(null)
  const enterStepRef = useRef(0)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchNodeIds, setSearchNodeIds] = useState<string[]>([])
  const [searchKeywords, setSearchKeywords] = useState<string[]>([])
  const [searchClassifiedLabels, setSearchClassifiedLabels] = useState<string[]>([])
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [tagResetKey, setTagResetKey] = useState(0)
  const [searchMsg, setSearchMsg] = useState('')
  const [resultCount, setResultCount] = useState(-1) // -1 = 未加载

  const handleTagsChange = useCallback((newTags: string[]) => {
    setFilterTags(newTags)
  }, [])

  const handleSend = useCallback(async (message: string) => {
    setSearchMsg('')
    setResultCount(-1)
    try {
      const res = await fetch('/api/ai/discover-classify-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, history: [], thinkMode: false }) })
      if (!res.ok || !res.body) { toast('网络异常', 'error'); return }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''; let result: any = null
      while (true) { const { done, value } = await reader.read(); if (done) break; buf += decoder.decode(value, { stream: true }); const events = buf.split('\n\n'); buf = events.pop() || ''
        for (const event of events) { const lines = event.split('\n'); const eventType = lines[0]?.replace('event: ', ''); const dataLine = lines.find(l => l.startsWith('data: ')); if (!dataLine) continue; const data = dataLine.slice(6)
          if (eventType === 'result') { try { result = JSON.parse(data) } catch { /* stream chunk parse */ } }
          else if (eventType === 'error') { try { const { message: errMsg } = JSON.parse(data); toast(errMsg || 'AI 错误', 'error') } catch { /* stream chunk parse */ } }
      } }
      if (result) {
        setSearchKeyword(message)
        setSearchNodeIds(result.classifiedNodeIds || [])
        const kw = result.keywords || []
        setSearchKeywords(kw)
        setSearchClassifiedLabels(result.classifiedLabels || [])
        setFilterTags(kw)
        setTagResetKey(n => n + 1)
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

  // 全局回车链：一次回车→滚动结果，二次回车→聚焦第二搜索框
  useEffect(() => {
    const onInput = () => { enterStepRef.current = 0 }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      // 如果焦点在 input/textarea 内，不拦截（让用户正常输入）
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (enterStepRef.current === 1 && resultsRef.current) {
        e.preventDefault()
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        enterStepRef.current = 2
      } else if (enterStepRef.current >= 2 && tagsWrapperRef.current) {
        e.preventDefault()
        const el = tagsWrapperRef.current
        const start = window.scrollY
        const end = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3
        const duration = 800
        const startTime = performance.now()
        const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // easeInOutQuad
        const animate = (now: number) => {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / duration, 1)
          window.scrollTo({ top: start + (end - start) * ease(progress) })
          if (progress < 1) requestAnimationFrame(animate)
          else {
            const input = el.querySelector('input') as HTMLInputElement | null
            input?.focus()
          }
        }
        requestAnimationFrame(animate)
      }
    }
    window.addEventListener('input', onInput, { capture: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('input', onInput, { capture: true })
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // 搜索结果加载完成后，设置第一步：再次回车可滚动到结果
  useEffect(() => {
    if (resultCount > 0) enterStepRef.current = 1
  }, [resultCount])

  const handleSearch = useCallback((query: string) => {
    handleSend(query)
  }, [handleSend])

  const heroSections = useMemo(() => [
    {
      title: '遇见',
      subtitle: {
        line1: '在这个空间里，',
        line2: '创意与需求相遇',
      },
      render: () => (
        <>
          <SearchBar
            placeholder="搜索需求..."
            onSearch={handleSearch}
          />
          {searchMsg && (
            <p className="text-sm text-white/60 text-center mt-3">{searchMsg}</p>
          )}
          {resultCount >= 0 && (
            <p className="text-sm text-white/40 text-center mt-1">
              {resultCount > 0 ? `${resultCount} 个结果，按回车跳转` : '无结果'}
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
            pinkTags={searchKeywords.filter(k => searchClassifiedLabels.includes(k))}
            purpleTags={searchKeywords.filter(k => !searchClassifiedLabels.includes(k))}
          />
        </div>
      ),
    },
  ], [handleSearch, searchMsg, resultCount, handleTagsChange, filterTags, tagResetKey, searchKeywords, searchClassifiedLabels])

  return (
    <>
      <HorizonHeroSection sections={heroSections}>
        {showResults && (
          <div ref={resultsRef} className="w-full">
            <DemandDiscoveryList
              keyword={searchKeyword}
              serviceType="ALL"
              taxonomyLeafIds={searchNodeIds}
              tagNames={filterTags.filter(t => !searchKeywords.includes(t) || searchClassifiedLabels.includes(t)).join(',')}
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

    </>
  )
}
