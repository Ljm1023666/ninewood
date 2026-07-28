import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, RefreshCw } from 'lucide-react'
import { serviceCardApi, type ServiceCard } from '@/api/service-card'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

export default function ServiceCardsPage() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<ServiceCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setCards(await serviceCardApi.listMine())
    } catch (err: any) {
      setError(err?.response?.data?.message || '服务卡加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto px-10 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">MY SERVICE CARDS</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary">我的服务卡</h1>
          <p className="mt-3 text-sm text-text-secondary">你的主观服务声明，以及平台根据完成订单生成的客观经验。</p>
        </div>
        <LiquidMetalButton
          label="新建服务卡"
          onClick={() => navigate('/service-cards/create')}
        />
      </div>
      {error && (
        <div className="mt-10 flex items-center justify-between rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          <button type="button" onClick={() => void load()}><RefreshCw size={16} /></button>
        </div>
      )}
      {loading && <div className="py-24 text-center text-sm text-text-muted">正在读取服务卡…</div>}
      {!loading && !error && cards.length === 0 && (
        <div className="mt-12 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
          <BriefcaseBusiness size={28} className="text-text-muted" />
          <h2 className="mt-4 text-xl font-semibold text-text-primary">还没有服务卡</h2>
          <p className="mt-2 text-sm text-text-muted">把你能提供的服务写下来，让需求者找上门。</p>
          <Link className="mt-5 text-sm text-[var(--accent-color)]" to="/service-cards/create">创建第一张服务卡</Link>
        </div>
      )}
      <div className="mt-10 grid grid-cols-2 gap-5">
        {cards.map((card) => (
          <Link key={card.id} to={`/service-cards/${card.id}`} className="rounded-2xl border border-border bg-bg-card p-6 transition-colors hover:border-[var(--accent-color)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs text-text-muted">{card.status === 'PUBLISHED' ? '已发布' : card.status === 'PAUSED' ? '已下架' : '草稿'}</span>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">{card.title}</h2>
              </div>
              <span className="text-xs text-text-muted">{card.category}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{card.summary || card.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {card.claims.slice(0, 4).map((claim) => <span key={claim.id} className="publish-tag">{claim.label}</span>)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
