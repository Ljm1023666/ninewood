import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Tags,
  Target,
} from 'lucide-react'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

export default function PublishPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'service' ? 'service' : 'demand'
  const isService = mode === 'service'

  function changeMode(next: 'demand' | 'service') {
    setSearchParams(next === 'service' ? { mode: 'service' } : {})
  }

  return (
    <div className="publish-page">
      <div className="publish-shell">
        <header className="publish-header">
          <h1 className="publish-title">发布工作台</h1>
          <p className="publish-subtitle">先决定，你要让谁找到你</p>
          <p className="publish-lead">
            需求卡用于寻找服务者，服务卡用于展示你的能力。接下来由 AI 帮你整理成一张清晰、可检索的卡片。
          </p>
        </header>

        <main className="publish-layout">
          <section className="publish-choice-column" aria-labelledby="publish-choice-heading">
            <h2 id="publish-choice-heading" className="sr-only">
              选择发布方向
            </h2>

            <div className="publish-choice-list" role="radiogroup" aria-label="发布方向">
              <button
                type="button"
                role="radio"
                aria-checked={!isService}
                onClick={() => changeMode('demand')}
                className={`publish-choice-card${!isService ? ' is-selected' : ''}`}
              >
                <span className={`publish-choice-icon${!isService ? ' is-selected' : ''}`}>
                  <FileText className="size-5" aria-hidden />
                </span>
                <span className="publish-choice-copy">
                  <span className="publish-choice-title-row">
                    <span className="publish-choice-title">发布需求卡</span>
                    {!isService && <Check className="publish-choice-check size-4" aria-hidden />}
                  </span>
                  <span className="publish-choice-desc">
                    说清楚你要解决的问题，让合适的服务者主动找到你。
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={isService}
                onClick={() => changeMode('service')}
                className={`publish-choice-card${isService ? ' is-selected' : ''}`}
              >
                <span className={`publish-choice-icon${isService ? ' is-selected' : ''}`}>
                  <BriefcaseBusiness className="size-5" aria-hidden />
                </span>
                <span className="publish-choice-copy">
                  <span className="publish-choice-title-row">
                    <span className="publish-choice-title">发布服务卡</span>
                    {isService && <Check className="publish-choice-check size-4" aria-hidden />}
                  </span>
                  <span className="publish-choice-desc">
                    展示你能提供的服务，让有明确需求的人找到你。
                  </span>
                </span>
              </button>
            </div>

            <div className="publish-ai-points">
              <p className="publish-ai-points__label">AI 优先整理</p>
              <ul className="publish-ai-points__grid">
                <li>
                  <span className="publish-ai-tile" aria-hidden>
                    <Target className="size-4" strokeWidth={1.75} />
                  </span>
                  <span>{isService ? '服务范围与交付结果' : '要解决的问题与目标'}</span>
                </li>
                <li>
                  <span className="publish-ai-tile" aria-hidden>
                    <Clock3 className="size-4" strokeWidth={1.75} />
                  </span>
                  <span>{isService ? '交付方式与时间' : '预算与期望时间'}</span>
                </li>
                <li>
                  <span className="publish-ai-tile" aria-hidden>
                    <Tags className="size-4" strokeWidth={1.75} />
                  </span>
                  <span>分类、标签与检索路径</span>
                </li>
                <li>
                  <span className="publish-ai-tile" aria-hidden>
                    <CheckCircle2 className="size-4" strokeWidth={1.75} />
                  </span>
                  <span>发布前确认关键信息</span>
                </li>
              </ul>
            </div>
          </section>

          <aside className="publish-confirm-panel" aria-live="polite">
            <div className="publish-confirm-body">
              <div className="publish-confirm-kicker">
                <span className="publish-confirm-icon" aria-hidden>
                  {isService ? <BriefcaseBusiness className="size-4" /> : <FileText className="size-4" />}
                </span>
                <span>{isService ? 'SERVICE CARD' : 'DEMAND CARD'}</span>
              </div>

              <h2 className="publish-confirm-title">
                {isService ? '让有需求的人找到你' : '让合适的服务者找到你'}
              </h2>
              <p className="publish-confirm-desc">
                {isService
                  ? '从你的服务内容开始，AI 会协助整理服务范围、交付方式和报价。完成订单后的经验数据由平台自动生成。'
                  : '从你想解决的问题开始，AI 会协助整理目标、预算、时间和检索路径，减少反复填写。'}
              </p>

              <ol className="publish-workflow" aria-label="工作流预览">
                <li>
                  <span className="publish-step is-active">01</span>
                </li>
                <li aria-hidden className="publish-workflow__arrow">
                  <ArrowRight className="size-3.5" />
                </li>
                <li>
                  <span className="publish-step">02</span>
                </li>
                <li aria-hidden className="publish-workflow__arrow">
                  <ArrowRight className="size-3.5" />
                </li>
                <li>
                  <span className="publish-step">03</span>
                </li>
              </ol>
            </div>

            <div className="publish-action-dock">
              <LiquidMetalButton
                label="开始用 AI 整理"
                fullWidth
                height={48}
                onClick={() =>
                  navigate(
                    isService ? '/demands/create?mode=service' : '/demands/create',
                  )
                }
              />
              <p className="publish-eta">预计 3 分钟完成初稿</p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
