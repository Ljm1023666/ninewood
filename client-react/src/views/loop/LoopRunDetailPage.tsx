import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GitBranch, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { loopApi, type LoopRunDetail } from '@/api/loop'
import {
  notificationPolicyApi,
  type CompletionSummary,
} from '@/api/notification-policy'
import { CompletionSummaryView } from '@/components/outcome/CompletionSummary'
import { useTaskActiveTime } from '@/utils/task-active-time'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

const STATUS: Record<string, string> = {
  TRIGGERED: '已触发', EXECUTING: '执行中', VERIFYING: '验证中',
  SUCCEEDED: '已成功', FAILED: '失败', INCONCLUSIVE: '无法判断', CLOSED: '已关闭',
}

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'INCONCLUSIVE', 'CLOSED'])

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
  const [completion, setCompletion] = useState<CompletionSummary | null>(null)
  useTaskActiveTime('LOOP_RUN', id)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try { setRun(await loopApi.getRun(id)) }
    catch (err: any) { setError(err?.response?.data?.message || '无法读取这次回的详情。') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!id || !run || !TERMINAL.has(run.status)) {
      setCompletion(null)
      return
    }
    notificationPolicyApi
      .getCompletion('LOOP_RUN', id)
      .then((r) => setCompletion(r.data?.data ?? null))
      .catch(() =>
        setCompletion({
          resourceType: 'LOOP_RUN',
          resourceId: id,
          outcomeStatus:
            run.status === 'FAILED'
              ? 'FAILED'
              : run.status === 'INCONCLUSIVE'
                ? 'INCONCLUSIVE'
                : 'SUCCEEDED',
          outcomeSummary: `回运行状态：${STATUS[run.status] || run.status}`,
          nextRequiredAction:
            run.status === 'FAILED' || run.status === 'INCONCLUSIVE'
              ? { label: '查看详情或重试', action: 'VIEW_DETAIL' }
              : null,
          notificationsStopped: [],
        }),
      )
  }, [id, run?.status])

  async function retry() {
    if (!id) return
    setRetrying(true)
    setError(null)
    try { await loopApi.retryVerification(id); await load() }
    catch (err: any) { setError(err?.response?.data?.message || '验证重试失败。') }
    finally { setRetrying(false) }
  }

  return (
      <main className="loop-run-detail">
        <LiquidMetalButton type="button" className="loop-back" onClick={() => navigate('/loops/mine')}><ArrowLeft size={16} /> 返回我的回</LiquidMetalButton>
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
                <LiquidMetalButton type="button" onClick={() => void load()}><RefreshCw size={15} />刷新</LiquidMetalButton>
                {run.loopKind === 'EARTH' && run.status === 'INCONCLUSIVE' && (
                  <LiquidMetalButton type="button" onClick={retry} disabled={retrying}><RotateCcw size={15} />{retrying ? '重试中…' : '重试验证'}</LiquidMetalButton>
                )}
              </div>
            </header>

            {completion && (
              <div className="mb-6">
                <CompletionSummaryView
                  summary={completion}
                  returnTo="/loops/mine"
                  onViewDetail={
                    completion.nextRequiredAction
                      ? () => {
                          document.querySelector('.loop-detail-section')?.scrollIntoView({ behavior: 'smooth' })
                        }
                      : undefined
                  }
                />
              </div>
            )}

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

            {(() => {
              const types = new Set(run.events.map((e) => e.type))
              const prepaid = [...run.events].reverse().find((e) => e.type === 'SETTLEMENT_PREPAID')
              const captured = [...run.events].reverse().find((e) => e.type === 'SETTLEMENT_CAPTURED')
              const refunded = [...run.events].reverse().find((e) => e.type === 'SETTLEMENT_REFUNDED')
              const gate = [...run.events].reverse().find(
                (e) => e.type === 'SETTLEMENT_ELIGIBLE' || e.type === 'SETTLEMENT_BLOCKED',
              )
              if (!gate && !prepaid && !captured && !refunded) return null
              const title = captured
                ? '已结算（供给方已收款）'
                : refunded
                  ? '已退款（供给方未收款）'
                  : gate?.type === 'SETTLEMENT_ELIGIBLE'
                    ? '允许进入结算'
                    : gate
                      ? '禁止结算'
                      : '已预付，等待核验'
              const hint = captured
                ? '天回已通过，服务款已按预付分账；平台佣金与验证费留在体系内。'
                : refunded
                  ? '天回未通过或运行失败：供给方不得收款；验证费政策见事件详情。'
                  : gate?.type === 'SETTLEMENT_ELIGIBLE'
                    ? '全部必要天回已通过，正在或已完成捕获。'
                    : '天回核验未通过或无法判断，本轮不可付给供给方。'
              return (
                <section className="loop-detail-section" aria-label="结算">
                  <h2>{title}</h2>
                  <p>{hint}</p>
                  {prepaid && <JsonBlock value={{ type: 'SETTLEMENT_PREPAID', ...prepaid.payload }} />}
                  {gate && <JsonBlock value={{ type: gate.type, ...gate.payload }} />}
                  {captured && <JsonBlock value={{ type: 'SETTLEMENT_CAPTURED', ...captured.payload }} />}
                  {refunded && <JsonBlock value={{ type: 'SETTLEMENT_REFUNDED', ...refunded.payload }} />}
                  {!types.has('SETTLEMENT_PREPAID') && gate && (
                    <p className="loop-muted">本次为免费试跑，未发生点数预付。</p>
                  )}
                </section>
              )
            })()}

            <section className="loop-detail-section">
              <h2><GitBranch size={18} />父子回与关系</h2>
              {[...run.linksIn, ...run.linksOut].length === 0 ? <p>没有关联回。</p> : (
                <div className="loop-link-list">{[...run.linksIn, ...run.linksOut].map((link) => {
                  const target = link.targetRun || link.sourceRun
                  return target && <LiquidMetalButton type="button" key={link.id} onClick={() => navigate(`/loops/runs/${target.id}`)}>
                    <span>{link.relation}</span><strong>{target.definition.name}</strong><em>{STATUS[target.status] || target.status}</em>
                  </LiquidMetalButton>
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
  )
}
