import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loopApi, type LoopKind, type LoopOfferingDetail } from '@/api/loop'
import { demandApi } from '@/api/demand'
import { MsIcon } from '@/components/ui/ms-icon'

/** 大众文案：禁止暴露 EARTH / HEAVEN / HUMAN 枚举 */
const KIND_LABEL: Record<LoopKind, string> = {
  HUMAN: '找人帮忙',
  EARTH: '立即使用',
  HEAVEN: '系统自动',
}

const HEALTH_LABEL: Record<string, string> = {
  ONLINE: '在线',
  DEGRADED: '降级',
  OFFLINE: '离线',
  UNKNOWN: '未知',
}

type PipelineSpec = {
  nodes: string[]
  activeIndex: number
  exampleIn: string
  exampleOut: Record<string, unknown>
}

type FreeField = 'title' | 'description' | 'minPrice' | 'paths' | 'mediaUrls'

const FIELD_PLACEHOLDER: Record<FreeField, string> = {
  title: '标题，例如：论文提纲撰写',
  description: '描述，例如：想找人帮忙写论文提纲…',
  minPrice: '最低价，例如：50',
  paths: '路径，逗号分隔，例如：tag:论文,cat:写作',
  mediaUrls: '附件 URL，逗号分隔，例如：https://…/a.png',
}

/**
 * 自由输入只展示该能力真正会读的字段（与执行器 fields 对齐）。
 * 空数组：自由输入无表单项（健康探测可一键跑；钱包一致性请选需求）。
 */
function freeFieldsFor(code: string): FreeField[] {
  if (code.includes('card_cover')) return ['title']
  if (code.includes('validate.paths')) return ['paths']
  if (code.includes('demand_fields')) return ['title', 'description', 'minPrice']
  if (code.includes('demand.paths') || (code.includes('.paths') && !code.includes('validate'))) {
    return ['title', 'description', 'minPrice']
  }
  if (code.includes('media') || code.includes('attachment')) return ['mediaUrls']
  if (code.includes('structure')) return ['description']
  if (code.includes('order_wallet') || code.includes('health')) return []
  return ['title']
}

/** 按能力 code 给出流水线节点 + 示例；未知能力退回通用管线 */
function pipelineFor(code: string, title: string): PipelineSpec {
  if (code.includes('card_cover')) {
    return {
      nodes: ['需求标题', title, '生成封面', '写入卡片', '展示'],
      activeIndex: 1,
      exampleIn: '论文提纲撰写',
      exampleOut: {
        dataUri: 'data:image/svg+xml,...',
        width: 800,
        height: 420,
        wroteBack: true,
      },
    }
  }
  if (code.includes('demand.structure') || code.includes('structure')) {
    return {
      nodes: ['口语输入', title, '标准字段', '检索路径', '路径检索'],
      activeIndex: 1,
      exampleIn: '想找人帮忙写论文提纲，预算五百左右，最好能这周搞定',
      exampleOut: {
        title: '论文提纲撰写',
        minPrice: 500,
        paths: ['tag:论文', 'bkt:price=100_500'],
      },
    }
  }
  if (code.includes('demand.paths') || (code.includes('.paths') && !code.includes('validate'))) {
    return {
      nodes: ['标准字段', title, '检索路径', '路径检索', '匹配结果'],
      activeIndex: 1,
      exampleIn: 'category=写作 · minPrice=500 · tags=[论文]',
      exampleOut: {
        paths: ['tag:论文', 'cat:写作', 'bkt:price=100_500'],
        count: 3,
      },
    }
  }
  if (code.includes('validate') || code.includes('health')) {
    return {
      nodes: ['能力输出', title, '核验结论', '指标更新', '闭环'],
      activeIndex: 1,
      exampleIn: '待校验 payload（title / paths / attachment）',
      exampleOut: {
        status: 'PASSED',
        errors: [],
      },
    }
  }
  if (code.includes('media') || code.includes('attachment')) {
    return {
      nodes: ['原始附件', title, '标准化产物', '需求卡', '展示'],
      activeIndex: 1,
      exampleIn: 'cover.png · 未裁切 · 任意尺寸',
      exampleOut: {
        ok: true,
        items: 3,
      },
    }
  }
  return {
    nodes: ['触发', title, '执行', '结果', '闭环'],
    activeIndex: 1,
    exampleIn: '（该能力暂无定制示例）',
    exampleOut: { ok: true },
  }
}

type RunMode = 'demand' | 'free'
type RunResult = {
  ran: boolean
  preview: boolean
  code: string
  status: string
  outcome: Record<string, unknown>
} | null

export default function LoopOfferingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LoopOfferingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [runMode, setRunMode] = useState<RunMode>('free')
  const [demands, setDemands] = useState<{ id: string; title: string }[]>([])
  const [selectedDemandId, setSelectedDemandId] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    minPrice: '',
    paths: '',
    mediaUrls: '',
  })
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult>(null)
  const [runError, setRunError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    setError(null)
    setResult(null)
    setRunError(null)
    loopApi
      .getOffering(id)
      .then((row) => {
        if (alive) setData(row)
      })
      .catch(() => {
        if (alive) setError('方案不存在或加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (runMode !== 'demand' || demands.length > 0) return
    let alive = true
    demandApi
      .myDemands(1)
      .then((res) => {
        if (!alive) return
        const rows = (res?.data?.data?.demands as { id: string; title: string }[]) ?? []
        setDemands(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [runMode, demands.length])

  const pipeline = useMemo(() => {
    if (!data) return null
    return pipelineFor(data.definitionCode, data.title)
  }, [data])

  const freeFields = useMemo(
    () => (data ? freeFieldsFor(data.definitionCode) : []),
    [data],
  )

  const run = async () => {
    if (!data) return
    setRunning(true)
    setRunError(null)
    setResult(null)
    try {
      if (runMode === 'demand') {
        if (!selectedDemandId) {
          setRunError('请先选一条需求')
          return
        }
        const r = await loopApi.runOffering(data.id, { demandId: selectedDemandId })
        setResult(r)
      } else {
        const input: Record<string, unknown> = {}
        if (freeFields.includes('title') && form.title.trim()) input.title = form.title.trim()
        if (freeFields.includes('description') && form.description.trim()) {
          input.description = form.description.trim()
        }
        if (freeFields.includes('minPrice') && form.minPrice.trim()) {
          input.minPrice = Number(form.minPrice)
        }
        if (freeFields.includes('paths') && form.paths.trim()) {
          input.paths = form.paths
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        }
        if (freeFields.includes('mediaUrls') && form.mediaUrls.trim()) {
          input.mediaUrls = form.mediaUrls
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        }
        // 健康探测无表单：带占位字段即可触发（endpointId 由后端注入）
        if (freeFields.length === 0 && data.definitionCode.includes('health')) {
          input.ping = true
        }
        if (Object.keys(input).length === 0) {
          setRunError(
            freeFields.length === 0
              ? '该能力请改用「选一条需求」运行'
              : '请填写上方输入后再运行',
          )
          return
        }
        const r = await loopApi.runOffering(data.id, { input })
        setResult(r)
      }
    } catch (e: any) {
      setRunError(e?.response?.data?.message || e?.message || '运行失败')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="loop-svc-root">
        <div className="loop-svc-empty">加载中…</div>
      </div>
    )
  }

  if (error || !data || !pipeline) {
    return (
      <div className="loop-svc-root">
        <div className="loop-svc-empty">
          <p>{error || '方案不存在'}</p>
          <button type="button" className="loop-svc-empty__btn" onClick={() => navigate('/services')}>
            返回找服务
          </button>
        </div>
      </div>
    )
  }

  const healthKey = data.endpoint?.healthStatus ?? 'UNKNOWN'
  const healthText = HEALTH_LABEL[healthKey] ?? HEALTH_LABEL.UNKNOWN
  const kindLabel = KIND_LABEL[data.loopKind] ?? '立即使用'
  const promise =
    data.summary ||
    data.definitionDescription ||
    '把口语描述变成可检索、可接单的标准需求字段。'
  const exampleJson = JSON.stringify(pipeline.exampleOut, null, 2)
  const dealPct = data.dealRate != null ? `${Math.round(data.dealRate * 100)}%` : '—'
  const successPct =
    data.recentTotalN > 0
      ? `${Math.round((data.recentSuccessN / data.recentTotalN) * 100)}%`
      : '—'
  const duration =
    data.avgDurationMs == null
      ? '—'
      : data.avgDurationMs < 1000
        ? `${data.avgDurationMs}ms`
        : `${(data.avgDurationMs / 1000).toFixed(1)}s`

  const imageUri =
    result && typeof result.outcome.dataUri === 'string' ? result.outcome.dataUri : null
  const statusTone =
    result?.status === 'SUCCEEDED'
      ? 'is-ok'
      : result?.status === 'FAILED' || result?.status === 'INCONCLUSIVE'
        ? 'is-bad'
        : ''

  return (
    <div className="loop-svc-root">
      <main className="loop-svc-shell">
        <button type="button" className="loop-svc-back" onClick={() => navigate('/services')}>
          <MsIcon name="arrow_left_alt" className="text-[14px]" />
          返回找服务
        </button>

        <header>
          <div className="loop-svc-title-row">
            <h1 className="loop-svc-title">{data.title}</h1>
            <span className="loop-svc-chip">{kindLabel}</span>
          </div>
          <p className="loop-svc-promise">{promise}</p>
        </header>

        {data.requiresVerification && (
          <div className="loop-svc-verify">该方案完成后需经过系统核验，才会视为成功。</div>
        )}

        <section>
          <div className="loop-svc-pipeline" aria-label="能力流水线">
            {pipeline.nodes.map((label, i) => (
              <Fragment key={`${label}-${i}`}>
                {i > 0 && <div className="loop-svc-connector" aria-hidden />}
                <div className="loop-svc-node">
                  <div
                    className={
                      i === pipeline.activeIndex
                        ? 'loop-svc-node__box is-active'
                        : 'loop-svc-node__box'
                    }
                  >
                    {label}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>

          <div className="loop-svc-example">
            <div className="loop-svc-example__pane">
              <div className="loop-svc-example__label">
                <span className="loop-svc-dot" />
                示例输入
              </div>
              <div className="loop-svc-example__input">“{pipeline.exampleIn}”</div>
            </div>
            <div className="loop-svc-example__pane">
              <div className="loop-svc-example__label">
                <span className="loop-svc-dot" />
                示例输出 (JSON)
              </div>
              <pre className="loop-svc-example__code">
                <code>{exampleJson}</code>
              </pre>
            </div>
          </div>
          <p className="loop-svc-example__hint">
            上方为能力示意；下方「运行此能力」会调用后端真实执行并返回结果。
          </p>
        </section>

        <section className="loop-svc-run" aria-label="运行此能力">
          <p className="loop-svc-run__label">运行此能力</p>
          <div className="loop-svc-run__tabs">
            <button
              type="button"
              className={runMode === 'demand' ? 'is-active' : undefined}
              onClick={() => setRunMode('demand')}
            >
              选一条需求
            </button>
            <button
              type="button"
              className={runMode === 'free' ? 'is-active' : undefined}
              onClick={() => setRunMode('free')}
            >
              自由输入
            </button>
          </div>

          {runMode === 'demand' ? (
            <div className="loop-svc-run__form">
              <select
                className="loop-svc-run__select"
                value={selectedDemandId}
                onChange={(e) => setSelectedDemandId(e.target.value)}
                aria-label="选择需求"
              >
                <option value="">选择一条我的需求…</option>
                {demands.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || d.id}
                  </option>
                ))}
              </select>
              {demands.length === 0 && (
                <p className="loop-svc-run__hint">暂无需求；可先去发布，或改用「自由输入」试跑。</p>
              )}
              <button
                type="button"
                className="loop-svc-run__btn"
                disabled={running || !selectedDemandId}
                onClick={() => void run()}
              >
                {running ? '运行中…' : '对需求运行'}
              </button>
            </div>
          ) : (
            <div className="loop-svc-run__form">
              {freeFields.includes('title') && (
                <input
                  className="loop-svc-run__input"
                  placeholder={FIELD_PLACEHOLDER.title}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  aria-label="标题"
                />
              )}
              {freeFields.includes('description') && (
                <textarea
                  className="loop-svc-run__input"
                  placeholder={FIELD_PLACEHOLDER.description}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  aria-label="描述"
                />
              )}
              {(freeFields.includes('minPrice') || freeFields.includes('paths')) && (
                <div className="loop-svc-run__row">
                  {freeFields.includes('minPrice') && (
                    <input
                      className="loop-svc-run__input"
                      placeholder={FIELD_PLACEHOLDER.minPrice}
                      value={form.minPrice}
                      onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                      aria-label="最低价"
                    />
                  )}
                  {freeFields.includes('paths') && (
                    <input
                      className="loop-svc-run__input"
                      placeholder={FIELD_PLACEHOLDER.paths}
                      value={form.paths}
                      onChange={(e) => setForm({ ...form, paths: e.target.value })}
                      aria-label="路径"
                    />
                  )}
                </div>
              )}
              {freeFields.includes('mediaUrls') && (
                <textarea
                  className="loop-svc-run__input"
                  placeholder={FIELD_PLACEHOLDER.mediaUrls}
                  rows={2}
                  value={form.mediaUrls}
                  onChange={(e) => setForm({ ...form, mediaUrls: e.target.value })}
                  aria-label="附件地址"
                />
              )}
              {freeFields.length === 0 && !data.definitionCode.includes('health') && (
                <p className="loop-svc-run__hint">该能力依赖已有需求数据，请改用「选一条需求」。</p>
              )}
              {freeFields.length === 0 && data.definitionCode.includes('health') && (
                <p className="loop-svc-run__hint">无需填写；点击下方按钮探测接口健康。</p>
              )}
              <button
                type="button"
                className="loop-svc-run__btn"
                disabled={
                  running ||
                  (freeFields.length === 0 && !data.definitionCode.includes('health'))
                }
                onClick={() => void run()}
              >
                {running ? '运行中…' : '自由输入运行'}
              </button>
            </div>
          )}

          {runError && <div className="loop-svc-run__err">{runError}</div>}

          {result && (
            <div className={`loop-svc-run__result ${statusTone}`}>
              {imageUri && <img className="loop-svc-cover" src={imageUri} alt="生成封面" />}
              <div className="loop-svc-run__result-head">
                <span className="loop-svc-run__badge">{result.status}</span>
                <span className="loop-svc-run__mode">
                  {result.preview ? '自由输入（不写库）' : '已对需求执行'}
                </span>
              </div>
              <pre className="loop-svc-run__code">
                <code>{JSON.stringify(result.outcome, null, 2)}</code>
              </pre>
            </div>
          )}
        </section>

        <section className="loop-svc-status" aria-label="状态与指标">
          <span className="inline-flex items-center">
            <span className="loop-svc-dot" />
            {healthText}
          </span>
          <span className="loop-svc-status__sep">·</span>
          <span>成交率 {dealPct}</span>
          <span className="loop-svc-status__sep">·</span>
          <span>成功率 {successPct}</span>
          <span className="loop-svc-status__sep">·</span>
          <span>平均耗时 {duration}</span>
          <span className="loop-svc-status__sep">·</span>
          <span>
            近期样本 {data.recentSuccessN}/{data.recentTotalN}
          </span>
        </section>

        <footer className="loop-svc-next">
          <h3 className="loop-svc-next__label">接下来你可以</h3>
          <div className="loop-svc-next__links">
            <button
              type="button"
              className="loop-svc-next__link"
              onClick={() => navigate('/demands/create')}
            >
              去发布需求
              <MsIcon name="arrow_outward" className="text-[16px]" />
            </button>
            <button
              type="button"
              className="loop-svc-next__link"
              onClick={() => navigate('/path-search')}
            >
              去路径检索
              <MsIcon name="arrow_outward" className="text-[16px]" />
            </button>
          </div>
        </footer>
      </main>

      <div className="loop-svc-foot">
        <span className="loop-svc-foot__id">
          {data.definitionCode} / CAPABILITY_DOCK
        </span>
      </div>
    </div>
  )
}
