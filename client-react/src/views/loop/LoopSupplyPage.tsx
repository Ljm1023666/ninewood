import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loopApi, type LoopOfferingItem } from '@/api/loop'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

/**
 * 开放地回供给（V3）：用户上架 EXTERNAL_API 地回。
 * 必须绑定天回；健康检查通过后才进推荐池。
 */
export default function LoopSupplyPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LoopOfferingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    summary: '',
    endpointUrl: '',
    ioDoc: '',
    paths: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await loopApi.listMyOfferings())
    } catch (err: any) {
      setError(err?.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit() {
    if (!form.title.trim()) {
      setError('请填写标题')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await loopApi.createMyOffering({
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        endpointUrl: form.endpointUrl.trim() || undefined,
        ioDoc: form.ioDoc.trim() || undefined,
        paths: form.paths
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        verifierCodes: ['builtin.heaven.validate.demand_fields'],
      })
      setForm({ title: '', summary: '', endpointUrl: '', ioDoc: '', paths: '' })
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.message || '上架失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="loop-discover">
      <header className="loop-discover-hero">
        <span className="loop-eyebrow">开放供给 · V3</span>
        <h1>上架我的地回</h1>
        <p>
          提供可调用接口与 IO 文档，并绑定至少一个天回验证。健康检查通过后才会进入需求者推荐池。
        </p>
      </header>

      {error && <div className="loop-notice loop-notice--error">{error}</div>}

      <section className="loop-results">
        <div className="loop-result-card">
          <h2>新建地回</h2>
          <div className="loop-query-form">
            <label>标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例如：论文提纲整理接口"
            />
            <label>摘要</label>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="一句话说明这个地回解决什么"
            />
            <label>接口 URL（EXTERNAL_API）</label>
            <input
              value={form.endpointUrl}
              onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
              placeholder="https://example.com/api/loop"
            />
            <label>路径（逗号分隔）</label>
            <input
              value={form.paths}
              onChange={(e) => setForm({ ...form, paths: e.target.value })}
              placeholder="tag:论文,intent:提纲"
            />
            <label>IO 文档</label>
            <textarea
              rows={4}
              value={form.ioDoc}
              onChange={(e) => setForm({ ...form, ioDoc: e.target.value })}
              placeholder={'输入：…\n输出：…\n不写文档会变成孤岛。'}
            />
            <LiquidMetalButton
              label={saving ? '提交中…' : '上架地回'}
              disabled={saving || !form.title.trim()}
              active={Boolean(form.title.trim())}
              fullWidth
              height={44}
              onClick={() => void submit()}
            />
          </div>
        </div>

        <div className="loop-result-grid">
          {loading && <div className="loop-notice">加载中…</div>}
          {!loading && items.length === 0 && (
            <div className="loop-notice">还没有上架的地回。</div>
          )}
          {items.map((item) => (
            <article className="loop-result-card" key={item.id}>
              <div className="loop-result-card__head">
                <span className="loop-kind-badge">我的地回</span>
                <span>{item.endpoint.healthStatus ?? 'UNKNOWN'}</span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.summary || item.ioDoc || '—'}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <LiquidMetalButton
                  label="健康检查"
                  height={36}
                  onClick={() =>
                    void loopApi.healthCheckMyOffering(item.id).then(() => load())
                  }
                />
                <LiquidMetalButton
                  label="查看详情"
                  height={36}
                  onClick={() => navigate(`/loops/offerings/${item.id}`)}
                />
                <LiquidMetalButton
                  label="暂停"
                  height={36}
                  onClick={() =>
                    void loopApi.setMyOfferingStatus(item.id, 'PAUSED').then(() => load())
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
