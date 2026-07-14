import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GitBranch, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { loopApi, type LoopRunDetail } from '@/api/loop'
import LoopHubNav from './LoopHubNav'

const STATUS: Record<string, string> = {
  TRIGGERED: '已触发', EXECUTING: '执行中', VERIFYING: '验证中',
  SUCCEEDED: '已成功', FAILED: '失败', INCONCLUSIVE: '无法判断',
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="loop-json">{JSON.stringify(value ?? null, null, 2)}</pre>
}

export default function LoopRunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [run, setRun] = useState<LoopRunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try { setRun(await loopApi.getRun(id)) }
    catch (err: any) { setError(err?.response?.data?.message || '无法读取这次回的详情。') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function retry() {
    if (!id) return
    setRetrying(true)
    setError(null)
    try { await loopApi.retryVerification(id); await load() }
    catch (err: any) { setError(err?.response?.data?.message || '验证重试失败。') }
    finally { setRetrying(false) }
  }

  return (
    <div className="loop-hub-page">
      <LoopHubNav />
      <main className="loop-run-detail">
        <button type="button" className="loop-back" onClick={() => navigate('/loops/mine')}><ArrowLeft size={16} /> 返回我的回</button>
        {loading && <div className="loop-notice">正在读取运行详情…</div>}
        {error && <div className="loop-notice loop-notice--error">{error}</div>}
        {run && (
          <>
            <header className="loop-run-head">
              <div>
                <span className="loop-eyebrow">{run.loopKind} LOOP RUN</span>
                <h1>{run.offering?.title || run.definition.name}</h1>
                <p>{run.definition.description}</p>
              </div>
              <div className="loop-run-actions">
                <span className={`loop-run-status loop-run-status--${run.status.toLowerCase()}`}>{STATUS[run.status] || run.status}</span>
                <button type="button" onClick={() => void load()}><RefreshCw size={15} />刷新</button>
                {run.loopKind === 'EARTH' && run.status === 'INCONCLUSIVE' && (
                  <button type="button" onClick={retry} disabled={retrying}><RotateCcw size={15} />{retrying ? '重试中…' : '重试验证'}</button>
                )}
              </div>
            </header>

            <section className="loop-contract-grid">
              <article><h2>输入</h2><JsonBlock value={run.inputJson} /></article>
              <article><h2>预期输出</h2><JsonBlock value={run.expectedOutcome} /></article>
              <article><h2>实际输出</h2><JsonBlock value={run.actualOutcome} /></article>
            </section>

            <section className="loop-detail-section">
              <h2><ShieldCheck size={18} />验证链</h2>
              {run.verificationRuns.length === 0 ? <p>尚未产生验证记录。</p> : (
                <div className="loop-verification-list">{run.verificationRuns.map((verification) => (
                  <article key={verification.id}>
                    <strong>{verification.verifier.name}</strong><span>{verification.status}</span>
                    <JsonBlock value={verification.resultJson} />
                  </article>
                ))}</div>
              )}
            </section>

            <section className="loop-detail-section">
              <h2><GitBranch size={18} />父子回与关系</h2>
              {[...run.linksIn, ...run.linksOut].length === 0 ? <p>没有关联回。</p> : (
                <div className="loop-link-list">{[...run.linksIn, ...run.linksOut].map((link) => {
                  const target = link.targetRun || link.sourceRun
                  return target && <button type="button" key={link.id} onClick={() => navigate(`/loops/runs/${target.id}`)}>
                    <span>{link.relation}</span><strong>{target.definition.name}</strong><em>{STATUS[target.status] || target.status}</em>
                  </button>
                })}</div>
              )}
            </section>

            <section className="loop-detail-section">
              <h2>事件时间线</h2>
              <ol className="loop-timeline">{run.events.map((event) => (
                <li key={event.id}><time>{new Date(event.createdAt).toLocaleString('zh-CN')}</time><strong>{event.type}</strong><span>{event.actorRef}</span><JsonBlock value={event.payload} /></li>
              ))}</ol>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
