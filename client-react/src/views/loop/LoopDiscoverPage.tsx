import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Clock3, Compass, ShieldCheck, Users } from 'lucide-react'
import { loopApi, type LoopRecommendationResult } from '@/api/loop'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import {
  createEmptyDemandSession,
  upsertDemandSession,
} from '@/utils/demand-session-history'

function formatDuration(value: number | null) {
  if (value == null) return '待运行后估算'
  if (value < 60_000) return `${Math.max(1, Math.round(value / 1000))} 秒`
  return `${Math.max(1, Math.round(value / 60_000))} 分钟`
}

function formatRate(value: number | null) {
  return value == null ? '验证适配中' : `${Math.round(value * 100)}%`
}

export default function LoopDiscoverPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<LoopRecommendationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      setResult(await loopApi.recommend({ q }))
    } catch (err: any) {
      setError(err?.response?.data?.message || '暂时无法寻找合适的回，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  function continueAsHuman() {
    const fallback = result?.humanFallback
    if (!fallback) return
    const session = createEmptyDemandSession()
    upsertDemandSession({
      ...session,
      title: fallback.title,
      input: fallback.description,
      messages: fallback.description
        ? [{ id: `human-${Date.now()}`, role: 'user', content: fallback.description }]
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
  }

  return (
    <main className="loop-discover">
        <header className="loop-discover-hero">
          <span className="loop-eyebrow"><Compass size={15} /> NATURAL LOOP</span>
          <h1>说出你想完成的事</h1>
          <p>我们先理解需求，再寻找能执行、能验证、能形成结果的地回。</p>
          <form onSubmit={submit} className="loop-query-form">
            <label htmlFor="loop-query">你的需求</label>
            <textarea
              id="loop-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如：把这段口语化需求整理成结构化字段，并检查路径是否有效"
              rows={4}
            />
            {/* 有输入才进入金属描边态；空闲无金属边 */}
            <LiquidMetalButton
              label={loading ? '正在寻找…' : '寻找合适的回 →'}
              disabled={loading || !query.trim()}
              active={Boolean(query.trim())}
              fullWidth
              height={46}
              onClick={() => {
                void submit({ preventDefault() {} } as FormEvent)
              }}
            />
          </form>
        </header>

        {error && <div className="loop-notice loop-notice--error">{error}</div>}

        {result && (
          <section className="loop-results" aria-live="polite">
            <div className="loop-resolved">
              <span>已理解的路径</span>
              <div>
                {[...result.resolved.paths, ...result.resolved.facets].map((path) => (
                  <code key={path}>{path}</code>
                ))}
                {!result.resolved.paths.length && !result.resolved.facets.length && <em>尚未解析到明确路径</em>}
              </div>
            </div>

            {result.items.length > 0 && (
              <div className="loop-result-grid">
                {result.items.map((item) => (
                  <article className="loop-result-card" key={item.id}>
                    <div className="loop-result-card__head">
                      <span className="loop-kind-badge">地回</span>
                      <span className="loop-verification"><ShieldCheck size={14} /> {item.verification.verifierCount} 个必要验证</span>
                    </div>
                    <h2>{item.title}</h2>
                    <p>{item.summary || item.definitionDescription || '平台内置的可执行回。'}</p>
                    <ul>
                      <li><Clock3 size={15} />预计 {formatDuration(item.metrics.avgDurationMs)}</li>
                      <li><Bot size={15} />自动执行，结果由天回验证</li>
                      <li><ShieldCheck size={15} />公开成功率 {formatRate(item.metrics.publicSuccessRate)}</li>
                    </ul>
                    <div className="loop-match-reasons">
                      {item.match.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                    </div>
                    <LiquidMetalButton
                      label="查看输入与结果契约 →"
                      height={40}
                      onClick={() => navigate(`/loops/offerings/${item.id}`)}
                    />
                  </article>
                ))}
              </div>
            )}

            {result.humanFallback && (
              <article className="loop-human-fallback">
                <span><Users size={20} /> 没有可直接执行的地回</span>
                <h2>把它转为一个待确认的人回</h2>
                <p>我们已经整理好草稿。下一步仍由你检查和确认，不会自动发布。</p>
                <LiquidMetalButton
                  label="检查人回草稿 →"
                  height={40}
                  onClick={continueAsHuman}
                />
              </article>
            )}
          </section>
        )}
      </main>
  )
}
