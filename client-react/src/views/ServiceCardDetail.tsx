import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ExternalLink, Pause, Play, Send } from 'lucide-react'
import { serviceCardApi, type ServiceCard } from '@/api/service-card'
import { toPreferDetailCoverUrl } from '@/utils/user-cover-presets'

export default function ServiceCardDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [card, setCard] = useState<ServiceCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setCard(await serviceCardApi.getOwned(id))
    } catch {
      try {
        setCard(await serviceCardApi.get(id))
      } catch (err: any) {
        setError(err?.response?.data?.message || '服务卡不存在或不可见')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function togglePublish() {
    if (!card) return
    setBusy(true)
    try {
      setCard(await (card.status === 'PUBLISHED' ? serviceCardApi.unpublish(card.id) : serviceCardApi.publish(card.id)))
    } catch (err: any) {
      setError(err?.response?.data?.message || '服务卡状态更新失败')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-text-muted">正在加载服务卡…</div>
  if (error || !card) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-red-300">{error || '服务卡不存在'}</p>
        <button type="button" className="text-sm text-[var(--accent-color)]" onClick={() => navigate('/search')}>返回检索</button>
      </div>
    )
  }

  const isOwner = card.isOwner === true
  return (
    <div className="mx-auto h-full w-full max-w-5xl overflow-y-auto px-10 py-10">
      <button type="button" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> 返回
      </button>
      <div className="mt-8 grid grid-cols-[1fr_280px] gap-8">
        <main>
          <div className="flex items-start justify-between gap-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">SERVICE CARD / 服务卡</span>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary">{card.title}</h1>
              <p className="mt-3 text-base leading-7 text-text-secondary">{card.summary}</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-text-muted">{card.status === 'PUBLISHED' ? '已发布' : card.status === 'PAUSED' ? '已下架' : '草稿'}</span>
          </div>
          {card.coverImage && (
            <img
              className="mt-8 max-h-80 w-full rounded-xl object-cover"
              src={toPreferDetailCoverUrl(card.coverImage)}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-text-primary">服务说明</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-secondary">{card.description}</p>
          </section>
          <section className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-text-primary">业务范围与经验</h2>
            <div className="mt-4 space-y-3">
              {card.claims.length === 0 && <p className="text-sm text-text-muted">服务者还没有填写具体业务范围。</p>}
              {card.claims.map((claim) => {
                const fact = card.evidence.find((item) => item.label === claim.label)
                return (
                  <div key={claim.id} className={`rounded-xl border p-4 ${claim.isHighlighted ? 'border-[var(--accent-color)]/50 bg-[var(--accent-ghost)]' : 'border-border'}`}>
                    <div className="flex items-center gap-2">
                      {claim.isHighlighted && <CheckCircle2 size={16} className="text-[var(--accent-color)]" />}
                      <strong className="text-sm text-text-primary">{claim.label}</strong>
                    </div>
                    {claim.description && <p className="mt-2 text-sm text-text-secondary">{claim.description}</p>}
                    {fact && <p className="mt-3 text-xs text-text-muted">已完成相关需求 {fact.completedCount} 次 · 成功率 {fact.successRate == null ? '样本积累中' : `${Math.round(fact.successRate * 100)}%`}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        </main>
        <aside className="h-fit rounded-2xl border border-border bg-bg-card p-5">
          <p className="text-xs text-text-muted">报价</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {card.priceMin == null ? '面议' : `${card.priceMin}${card.priceMax != null ? ` - ${card.priceMax}` : '+'}`}
            {card.priceUnit && <span className="ml-1 text-sm font-normal text-text-muted">{card.priceUnit}</span>}
          </p>
          <p className="mt-5 text-xs text-text-muted">服务方式</p>
          <p className="mt-2 text-sm text-text-primary">{card.serviceType === 'ONLINE' ? '线上服务' : '线下服务'} · {card.deliveryMode}</p>
          {card.publisher && <p className="mt-5 text-sm text-text-secondary">由 {card.publisher.nickname} 提供</p>}
          {isOwner ? (
            <>
              <button type="button" onClick={() => navigate(`/service-cards/${card.id}/edit`)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-text-primary hover:border-[var(--accent-color)]">
                编辑服务卡
              </button>
              <button type="button" disabled={busy} onClick={() => void togglePublish()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-text-primary hover:border-[var(--accent-color)]">
                {card.status === 'PUBLISHED' ? <><Pause size={15} /> 下架</> : <><Play size={15} /> 发布</>}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => card.publisher && navigate(`/messages/${card.publisher.id}?serviceCardId=${card.id}`)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-3 text-sm font-semibold text-white">
              <Send size={15} /> 用这张服务卡咨询
            </button>
          )}
          <Link to="/messages" className="mt-3 flex items-center justify-center gap-2 text-xs text-text-muted hover:text-text-primary">
            进入咨询会话 <ExternalLink size={13} />
          </Link>
        </aside>
      </div>
    </div>
  )
}
