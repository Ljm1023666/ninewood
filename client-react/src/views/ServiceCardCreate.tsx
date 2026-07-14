import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { serviceCardApi, type ServiceCardInput } from '@/api/service-card'

const initialForm: ServiceCardInput = {
  title: '',
  summary: '',
  description: '',
  category: '',
  serviceType: 'ONLINE',
  deliveryMode: 'ONLINE',
  claims: [],
}

export default function ServiceCardCreate() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [form, setForm] = useState<ServiceCardInput>(initialForm)
  const [claim, setClaim] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    serviceCardApi.getOwned(id)
      .then((card) => setForm({
        title: card.title,
        summary: card.summary || '',
        description: card.description,
        coverImage: card.coverImage || '',
        category: card.category,
        serviceType: card.serviceType,
        cityCode: card.cityCode || '',
        regionId: card.regionId || undefined,
        paths: card.paths,
        tags: card.tags,
        priceMin: card.priceMin == null ? undefined : Number(card.priceMin),
        priceMax: card.priceMax == null ? undefined : Number(card.priceMax),
        priceUnit: card.priceUnit || '',
        deliveryMode: card.deliveryMode,
        availability: card.availability,
        claims: card.claims.map((claim) => ({ label: claim.label, description: claim.description || undefined })),
      }))
      .catch((err: any) => setError(err?.response?.data?.message || '服务卡加载失败'))
  }, [id])

  function update<K extends keyof ServiceCardInput>(key: K, value: ServiceCardInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addClaim() {
    const label = claim.trim()
    if (!label) return
    update('claims', [...(form.claims ?? []), { label }])
    setClaim('')
  }

  function removeClaim(index: number) {
    update('claims', (form.claims ?? []).filter((_, current) => current !== index))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const card = id ? await serviceCardApi.update(id, form) : await serviceCardApi.create(form)
      navigate(`/service-cards/${card.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message || '服务卡保存失败，请检查输入')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto h-full w-full max-w-4xl overflow-y-auto px-10 py-10">
      <button type="button" className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary" onClick={() => navigate('/publish')}>
        <ArrowLeft size={16} /> 返回发布
      </button>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">SERVICE CARD / 服务卡</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary">{id ? '编辑服务卡' : '介绍你能提供的服务'}</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        这里填写的是你的主观声明。完成订单后，平台会单独生成可验证的经验数字，不需要你手动填写。
      </p>

      <form className="mt-10 space-y-6" onSubmit={submit}>
        <Field label="服务卡标题" required>
          <input className="publish-input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="例如：小程序前端设计与开发" required />
        </Field>
        <Field label="一句话简介">
          <input className="publish-input" value={form.summary} onChange={(e) => update('summary', e.target.value)} placeholder="让需求者先知道你主要解决什么问题" />
        </Field>
        <Field label="服务说明" required>
          <textarea className="publish-input min-h-40 resize-y" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="业务范围、交付内容、合作方式、你希望提前说明的限制…" required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="服务类别" required>
            <input className="publish-input" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="例如：软件开发" required />
          </Field>
          <Field label="服务方式">
            <select className="publish-input" value={form.serviceType} onChange={(e) => update('serviceType', e.target.value as 'ONLINE' | 'OFFLINE')}>
              <option value="ONLINE">线上</option>
              <option value="OFFLINE">线下</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="最低报价">
            <input className="publish-input" type="number" min="0" value={form.priceMin ?? ''} onChange={(e) => update('priceMin', e.target.value ? Number(e.target.value) : undefined)} placeholder="可选" />
          </Field>
          <Field label="最高报价">
            <input className="publish-input" type="number" min="0" value={form.priceMax ?? ''} onChange={(e) => update('priceMax', e.target.value ? Number(e.target.value) : undefined)} placeholder="可选" />
          </Field>
          <Field label="报价单位">
            <input className="publish-input" value={form.priceUnit} onChange={(e) => update('priceUnit', e.target.value)} placeholder="按件 / 按小时" />
          </Field>
        </div>
        <Field label="业务范围关键词">
          <div className="flex gap-2">
            <input className="publish-input" value={claim} onChange={(e) => setClaim(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addClaim() } }} placeholder="例如：小程序前端设计" />
            <button type="button" className="publish-add" onClick={addClaim}><Plus size={16} /> 添加</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(form.claims ?? []).map((item, index) => (
              <span key={`${item.label}-${index}`} className="publish-tag">
                {item.label}
                <button type="button" onClick={() => removeClaim(index)} aria-label={`删除${item.label}`}><X size={13} /></button>
              </span>
            ))}
          </div>
        </Field>
        {error && <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <p className="text-xs text-text-muted">发布后仍可编辑或下架；经验数字由平台自动计算。</p>
          <button type="submit" className="rounded-lg bg-[var(--accent-color)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={saving}>
            {saving ? '保存中…' : id ? '保存修改' : '保存服务卡'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text-primary">{label}{required && <span className="ml-1 text-red-400">*</span>}</span>
      {children}
    </label>
  )
}
