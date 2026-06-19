import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandApi } from '@/api/demand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function DemandCreate() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [serviceType, setServiceType] = useState('ONLINE')
  const [category, setCategory] = useState('')
  const [expireDays, setExpireDays] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [activeCount, setActiveCount] = useState(0)
  const [hasFrozen, setHasFrozen] = useState(false)
  const categories = ['技术开发', '设计', '维修服务', '家政服务', '教育培训', '咨询服务', '其他']
  const MAX = 3

  useEffect(() => { demandApi.getMyStatus().then(r => { const d = r.data.data; setActiveCount(d?.activeCount || 0); setHasFrozen(d?.hasFrozen) }).catch(() => {}) }, [])

  async function handleCreate() {
    if (!title.trim() || !desc.trim() || !price || !category) return
    setSubmitting(true)
    try {
      const expireAt = new Date(Date.now() + expireDays * 86400000).toISOString()
      const fd = new FormData()
      fd.append('title', title.trim())
      fd.append('description', desc.trim())
      fd.append('minPrice', price)
      fd.append('category', category)
      fd.append('serviceType', serviceType)
      fd.append('expireAt', expireAt)
      await demandApi.create(fd)
      navigate('/my-demands')
    } catch { setSubmitting(false) }
  }

  const atLimit = activeCount >= MAX
  const canSubmit = !submitting && !atLimit && title.trim() && desc.trim() && price && category

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-1 overflow-y-auto thin-scroll">
        <div className="max-w-lg mx-auto p-5">
          <div className="flex items-center gap-3 mb-6">
            {[1, 2, 3].map(i => <div key={i} className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', i === 1 ? 'bg-[var(--primary-gradient)] text-white' : 'bg-card border border-border text-text-secondary')}>{i}</div>)}
          </div>

          {atLimit && <div className="px-4 py-2.5 rounded-[10px] mb-3 bg-red-500/8 border border-red-500/20 text-[var(--error-color)] text-[13px] text-center font-semibold">已发布 {activeCount}/{MAX}，已达上限</div>}
          {hasFrozen && <div className="px-4 py-3 mb-3 rounded-[10px] bg-red-500/[0.06] border border-red-500/[0.15] text-[var(--error-color)] text-[13px] leading-relaxed text-center">⚠️ 有冻结中的需求，请先在「我的需求」中处理后再发布</div>}

          <div className="bg-card border border-border rounded-2xl p-5 mb-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="需求标题（必填）" maxLength={100} className="w-full bg-transparent border-none outline-none text-text-primary text-base font-semibold placeholder:text-text-muted mb-3" />
            <div className="h-px bg-border mb-3" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="描述你的需求（必填）" maxLength={500} rows={4} className="w-full bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-muted resize-none" />
            <div className="text-right text-xs text-text-muted">{desc.length}/500</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mb-3 flex flex-col gap-3">
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14">价格</span><div className="flex items-center gap-1 flex-1"><span className="text-text-muted">¥</span><input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="flex-1 bg-transparent border-none outline-none text-text-primary text-2xl font-extrabold" /></div></div>
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14">分类</span><select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none"><option value="">选择分类</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mb-3 flex flex-col gap-3">
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14">类型</span><div className="flex gap-2">{[{ k: 'ONLINE', l: '线上' }, { k: 'OFFLINE', l: '线下' }].map(t => <button key={t.k} onClick={() => setServiceType(t.k)} className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-all', serviceType === t.k ? 'bg-[var(--primary-gradient)] text-white' : 'bg-bg-secondary text-text-secondary')}>{t.l}</button>)}</div></div>
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14">有效期</span><div className="flex gap-2">{[1, 3, 7].map(d => <button key={d} onClick={() => setExpireDays(d)} className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-all', expireDays === d ? 'bg-[var(--primary-gradient)] text-white' : 'bg-bg-secondary text-text-secondary')}>{d}天</button>)}</div></div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-bg-primary/90 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto">
          <button onClick={handleCreate} disabled={!canSubmit} className="w-full py-3.5 rounded-xl bg-[var(--primary-gradient)] text-white text-[15px] font-bold disabled:opacity-30 disabled:cursor-not-allowed">
            {submitting ? '发布中...' : atLimit ? '已达上限' : '发布需求'}
          </button>
        </div>
      </div>
    </div>
  )
}
