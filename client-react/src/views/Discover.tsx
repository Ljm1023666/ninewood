import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HorizonHeroSection } from '@/components/ui/horizon-hero-section'
import { ScrollNavbar } from '@/components/ui/scroll-navigation-menu'
import { Footer } from '@/components/ui/footer-section'
import { SearchBar } from '@/components/ui/search-bar'
import { Timeline } from '@/components/ui/modern-timeline'
import { toast } from '@/components/ui/confirm-dialog'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'
import {
  loopApi,
  type LoopRecommendation,
  type LoopRecommendationResult,
} from '@/api/loop'
import {
  createEmptyDemandSession,
  upsertDemandSession,
} from '@/utils/demand-session-history'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

function formatDuration(value: number | null) {
  if (value == null) return '耗时待估算'
  if (value < 60_000) return `约 ${Math.max(1, Math.round(value / 1000))} 秒`
  return `约 ${Math.max(1, Math.round(value / 60_000))} 分钟`
}

function formatRate(value: number | null) {
  return value == null ? '验证适配中' : `成功率 ${Math.round(value * 100)}%`
}

export default function Discover() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.current.dark)
  const tone = isDark ? 'dark' : 'light'
  const [loading, setLoading] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')
  const [result, setResult] = useState<LoopRecommendationResult | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setSearchMsg('')
    setResult(null)
    try {
      const data = await loopApi.recommend({ q })
      setResult(data)
      const n = data.items.length
      if (n > 0) {
        setSearchMsg(`找到 ${n} 个可用方案`)
      } else if (data.humanFallback) {
        setSearchMsg('暂无直接可用方案，可转为人工程序草稿')
      } else {
        setSearchMsg('未找到匹配方案')
      }
      ;(document.activeElement as HTMLElement)?.blur()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || '暂时无法寻找合适的方案'
      setSearchMsg(message)
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const continueAsHuman = useCallback(() => {
    const fallback = result?.humanFallback
    if (!fallback) return
    const session = createEmptyDemandSession()
    upsertDemandSession({
      ...session,
      title: fallback.title,
      input: fallback.description,
      messages: fallback.description
        ? [
            {
              id: `human-${Date.now()}`,
              role: 'user',
              content: fallback.description,
            },
          ]
        : [],
      fields: {
        ...session.fields,
        title: fallback.title.replace(/^发布人回：/, ''),
        description: fallback.description,
        scopeLabels: fallback.paths,
        tags: fallback.facets,
      },
      confidence: 'medium',
      readyToPublish: false,
    })
    navigate('/demands/create')
  }, [navigate, result])

  const timelineItems = useMemo(() => {
    if (!result?.items.length) return []
    return result.items.map((item: LoopRecommendation) => ({
      title: item.title,
      tagName: '可用方案',
      category: item.match.reasons[0] || '立即使用',
      description: [
        item.summary || item.definitionDescription || '可执行、可验证的解决方案',
        formatDuration(item.metrics.avgDurationMs),
        formatRate(item.metrics.publicSuccessRate),
        item.verification.verifierCount > 0
          ? `${item.verification.verifierCount} 项结果核验`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      status: 'current' as const,
      onClick: () => navigate(`/loops/offerings/${item.id}`),
    }))
  }, [navigate, result])

  const heroSections = useMemo(
    () => [
      {
        title: 'Ninewood',
        subtitle: { line1: '', line2: '' },
        titleClassName: 'font-serif italic tracking-tighter',
      },
      {
        title: '遇见',
        subtitle: {
          line1: '说出你想完成的事，',
          line2: '我们寻找能执行、能验证的方案',
        },
        render: () => (
          <>
            <SearchBar
              tone={tone}
              placeholder="例如：整理需求字段并检查路径是否有效"
              onSearch={handleSearch}
            />
            {loading && (
              <p
                className={cn(
                  'mt-3 text-center text-sm',
                  tone === 'light' ? 'text-text-muted' : 'text-white/60',
                )}
              >
                正在寻找…
              </p>
            )}
            {!loading && searchMsg && (
              <p
                className={cn(
                  'mt-3 text-center text-sm',
                  tone === 'light' ? 'text-text-muted' : 'text-white/60',
                )}
              >
                {searchMsg}
              </p>
            )}
          </>
        ),
      },
    ],
    [handleSearch, loading, searchMsg, tone],
  )

  const showResults = !!result

  return (
    <div className="flex min-h-full flex-col">
      <ScrollNavbar tone={tone} />
      <HorizonHeroSection
        key={tone}
        tone={tone}
        sections={heroSections}
        footer={<Footer />}
      >
        {showResults && (
          <div className="w-full">
            {timelineItems.length > 0 ? (
              <Timeline items={timelineItems} tone={tone} />
            ) : null}

            {result.humanFallback ? (
              <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pb-10">
                <LiquidMetalButton
                  type="button"
                  onClick={continueAsHuman}
                  className={cn(
                    'w-full rounded-2xl border p-6 text-left transition',
                    tone === 'light'
                      ? 'border-border bg-bg-card hover:border-[var(--accent-color)]/35 hover:bg-bg-secondary'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
                  )}
                >
                  <p
                    className={cn(
                      'text-sm',
                      tone === 'light' ? 'text-text-muted' : 'text-white/50',
                    )}
                  >
                    没有可直接执行的方案
                  </p>
                  <h3
                    className={cn(
                      'mt-2 text-lg font-semibold',
                      tone === 'light' ? 'text-text-primary' : 'text-white',
                    )}
                  >
                    检查人工草稿后再发布
                  </h3>
                  <p
                    className={cn(
                      'mt-2 text-sm',
                      tone === 'light' ? 'text-text-secondary' : 'text-white/60',
                    )}
                  >
                    已整理草稿，下一步由你确认，不会自动发布。
                  </p>
                </LiquidMetalButton>
              </div>
            ) : null}

            {!result.items.length && !result.humanFallback ? (
              <p
                className={cn(
                  'py-12 text-center text-sm',
                  tone === 'light' ? 'text-text-muted' : 'text-white/50',
                )}
              >
                暂无匹配结果
              </p>
            ) : null}
          </div>
        )}
      </HorizonHeroSection>
    </div>
  )
}
