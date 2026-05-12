import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandApi } from '@/api/demand'
import { useThemeStore } from '@/stores/theme'
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
  const [error, setError] = useState('')
  const [activeCount, setActiveCount] = useState(0)
  const [hasFrozen, setHasFrozen] = useState(false)
  const isDark = useThemeStore((s) => s.current.dark)
  const categories = ['技术开发', '设计', '维修服务', '家政服务', '教育培训', '咨询服务', '其他']
  const MAX = 3

  useEffect(() => { demandApi.getMyStatus().then(r => { const d = r.data.data; setActiveCount(d?.activeCount || 0); setHasFrozen(d?.hasFrozen) }).catch(() => {}) }, [])

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!title.trim() || !desc.trim() || !price || !category) return
    setError('')
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
    } catch {
      setError('发布失败，请稍后重试')
      setSubmitting(false)
    }
  }

  const atLimit = activeCount >= MAX
  const canSubmit = !submitting && !atLimit && title.trim() && desc.trim() && price && category

  return (
    <form
      className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch bg-bg-primary"
      onSubmit={handleCreate}
    >
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        <div className="relative z-10 mx-auto box-border w-full max-w-lg shrink-0 self-center px-5 pb-32 pt-5">
          <div className="flex items-center gap-3 mb-6">
            {[1, 2, 3].map(i => <div key={i} className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', i === 1 ? cn('bg-[var(--primary-gradient)]', isDark ? 'text-white' : 'text-text-primary') : 'bg-card border border-border text-text-secondary')}>{i}</div>)}
          </div>

          {atLimit && (
            <div
              className="px-4 py-2 rounded-xl mb-3 text-[13px] text-center font-semibold"
              style={{
                color: 'var(--error-color)',
                background: 'color-mix(in srgb, var(--error-color) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--error-color) 20%, transparent)',
              }}
            >
              已发布 {activeCount}/{MAX}，已达上限
            </div>
          )}
          {hasFrozen && (
            <div
              className="px-4 py-3 mb-3 rounded-xl text-[13px] leading-relaxed text-center"
              style={{
                color: 'var(--error-color)',
                background: 'color-mix(in srgb, var(--error-color) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--error-color) 15%, transparent)',
              }}
            >
              ⚠️ 有冻结中的需求，请先在「我的需求」中处理后再发布
            </div>
          )}
          {error && (
            <div
              className="px-4 py-2 rounded-xl mb-3 text-[13px] text-center font-semibold"
              style={{
                color: 'var(--error-color)',
                background: 'color-mix(in srgb, var(--error-color) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--error-color) 20%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5 mb-3">
            <label className="block">
              <span className="sr-only">需求标题</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="需求标题（必填）" maxLength={100} className="w-full bg-transparent border-none outline-none text-text-primary text-base font-semibold placeholder:text-text-muted mb-3" />
            </label>
            <div className="h-px bg-border mb-3" />
            <label className="block">
              <span className="sr-only">需求描述</span>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="描述你的需求（必填）" maxLength={500} rows={4} className="w-full bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-muted resize-none" />
            </label>
            <div className="text-right text-xs text-text-muted">{desc.length}/500</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mb-3 flex flex-col gap-3">
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14" id="price-label">价格</span><div className="flex items-center gap-1 flex-1"><span className="text-text-muted">¥</span><input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" aria-labelledby="price-label" className="flex-1 bg-transparent border-none outline-none text-text-primary text-2xl font-extrabold" /></div></div>
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14" id="category-label">分类</span><select value={category} onChange={e => setCategory(e.target.value)} aria-labelledby="category-label" className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none"><option value="">选择分类</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mb-3 flex flex-col gap-3">
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14">类型</span><div className="flex gap-2">{[{ k: 'ONLINE', l: '线上' }, { k: 'OFFLINE', l: '线下' }].map(t => <button key={t.k} type="button" onClick={() => setServiceType(t.k)} className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-colors', serviceType === t.k ? 'text-red-500' : 'text-text-primary')}>{t.l}</button>)}</div></div>
            <div className="flex items-center gap-3"><span className="text-text-secondary text-sm w-14">有效期</span><div className="flex gap-2">{[1, 3, 7].map(d => <button key={d} type="button" onClick={() => setExpireDays(d)} className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-colors', expireDays === d ? 'text-red-500' : 'text-text-primary')}>{d}天</button>)}</div></div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-bg-primary/90 backdrop-blur-md border-t border-border" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="relative z-10 mx-auto w-full max-w-lg shrink-0 px-5 pb-2">
          <button type="submit" disabled={!canSubmit} className={cn('w-full py-3 rounded-xl bg-[var(--primary-gradient)] text-[15px] font-bold disabled:opacity-30 disabled:cursor-not-allowed', isDark ? 'text-white' : 'text-text-primary')}>
            {submitting ? '发布中...' : atLimit ? '已达上限' : '发布需求'}
          </button>
        </div>
      </div>
    </form>
  )
}
