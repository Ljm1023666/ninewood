import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileText,
  ListChecks,
  MessageCircle,
  Search,
  Sparkles,
  Tags,
  Target,
} from 'lucide-react'

export default function PublishPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'service' ? 'service' : 'demand'
  const isService = mode === 'service'

  function changeMode(next: 'demand' | 'service') {
    setSearchParams(next === 'service' ? { mode: 'service' } : {})
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-primary">
      <div className="flex min-h-full w-full flex-col px-14 py-12">
        <header className="flex items-start justify-between gap-8">
          <div>
            <p className="mb-3 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
              <span className="size-1 bg-text-primary" />
              发布工作台
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-text-primary">
              先决定，你要让谁找到你
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-secondary">
              需求卡用于寻找服务者，服务卡用于展示你的能力。接下来由 AI 帮你整理成一张清晰、可检索的卡片。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-secondary">
            <Sparkles className="size-3.5 text-text-primary" />
            AI 辅助整理
          </div>
        </header>

        <main className="publish-layout mt-12">
          <section className="publish-choice-column">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">STEP 01 / 选择发布方向</p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">选择发布方向</h2>
              </div>
              <span className="text-sm text-text-muted">可随时切换</span>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                aria-pressed={!isService}
                onClick={() => changeMode('demand')}
                className={`group flex w-full items-start gap-6 rounded-none border p-7 text-left transition-[border-color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] ${
                  !isService
                    ? 'border-text-primary bg-bg-tertiary'
                    : 'border-border bg-bg-card hover:border-text-muted'
                }`}
              >
                <span className={`flex size-10 shrink-0 items-center justify-center ${!isService ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-secondary'}`}>
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-text-primary">发布需求卡</span>
                    {!isService && <Check className="size-4 text-text-primary" />}
                  </span>
                  <span className="mt-2 block text-base leading-7 text-text-secondary">
                    说清楚你要解决的问题，让合适的服务者主动找到你。
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-pressed={isService}
                onClick={() => changeMode('service')}
                className={`group flex w-full items-start gap-6 rounded-none border p-7 text-left transition-[border-color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] ${
                  isService
                    ? 'border-text-primary bg-bg-tertiary'
                    : 'border-border bg-bg-card hover:border-text-muted'
                }`}
              >
                <span className={`flex size-10 shrink-0 items-center justify-center ${isService ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-secondary'}`}>
                  <BriefcaseBusiness className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-text-primary">发布服务卡</span>
                    {isService && <Check className="size-4 text-text-primary" />}
                  </span>
                  <span className="mt-2 block text-base leading-7 text-text-secondary">
                    展示你能提供的服务，让有明确需求的人找到你。
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-8 border border-border bg-bg-secondary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">AI 会优先整理</p>
                  <p className="mt-2 text-sm text-text-secondary">你只需要先说清楚事情，字段可以边聊边补齐。</p>
                </div>
                <Sparkles className="size-4 text-text-primary" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <Target className="size-4 text-text-secondary" />
                  <span className="text-base text-text-primary">{isService ? '服务范围与交付结果' : '要解决的问题与目标'}</span>
                </div>
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <ListChecks className="size-4 text-text-secondary" />
                  <span className="text-base text-text-primary">{isService ? '交付方式与时间' : '预算与期望时间'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Tags className="size-4 text-text-secondary" />
                  <span className="text-base text-text-primary">分类、标签与检索路径</span>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="size-4 text-text-secondary" />
                  <span className="text-base text-text-primary">发布前确认关键信息</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid flex-1 grid-cols-2 gap-8 border-t border-border pt-8">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">发布后</p>
                <div className="mt-5 space-y-5">
                  <div className="flex gap-3">
                    <Search className="mt-0.5 size-4 shrink-0 text-text-secondary" />
                    <div>
                      <p className="text-base text-text-primary">进入检索</p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">让合适的人看到这张卡片。</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-text-secondary" />
                    <div>
                      <p className="text-base text-text-primary">开始咨询</p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">咨询中可以互发两种卡片。</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">平台记录</p>
                <div className="mt-5 flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-text-secondary" />
                  <div>
                    <p className="text-base text-text-primary">客观经验</p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      完成订单后的经验数据由平台生成，不能手动修改。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="publish-confirm-panel border border-border bg-bg-card p-8">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">STEP 02 / 当前选择</p>
            <div className="mt-10">
              <div className="flex size-12 items-center justify-center bg-bg-tertiary text-text-primary">
                {isService ? <BriefcaseBusiness className="size-6" /> : <FileText className="size-6" />}
              </div>
              <p className="mt-6 font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-secondary">
                {isService ? 'SERVICE CARD' : 'DEMAND CARD'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                {isService ? '让有需求的人找到你' : '让合适的服务者找到你'}
              </h2>
              <p className="mt-4 text-base leading-7 text-text-secondary">
                {isService
                  ? '从你的服务内容开始，AI 会协助整理服务范围、交付方式和报价。完成订单后的经验数据由平台自动生成。'
                  : '从你想解决的问题开始，AI 会协助整理目标、预算、时间和检索路径，减少反复填写。'}
              </p>
            </div>
            <div className="mt-10 border-t border-border pt-7">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">工作流预览</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center bg-text-primary font-mono text-[10px] text-bg-primary">01</span>
                  <span className="text-base text-text-secondary">用自然语言描述你的想法</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center bg-bg-tertiary font-mono text-[10px] text-text-secondary">02</span>
                  <span className="text-base text-text-secondary">AI 提问并生成结构化草稿</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center bg-bg-tertiary font-mono text-[10px] text-text-secondary">03</span>
                  <span className="text-base text-text-secondary">确认后发布到检索网络</span>
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-border pt-7">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-muted">发布规则</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                <p>发布前可以返回修改，发布后仍可编辑或下架。</p>
                <p>{isService ? '服务卡的客观经验只来自已完成订单。' : '需求卡会根据内容生成检索路径。'}</p>
              </div>
            </div>
            <div className="publish-action-dock">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 bg-text-primary px-5 py-3.5 text-sm font-semibold text-bg-primary transition-[background-color,transform] duration-200 hover:bg-text-secondary active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                onClick={() => navigate(isService ? '/demands/create?mode=service' : '/demands/create')}
              >
                开始用 AI 整理 <ArrowRight className="size-4" />
              </button>
              <p className="mt-3 text-center text-sm text-text-muted">预计 3 分钟完成初稿</p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
