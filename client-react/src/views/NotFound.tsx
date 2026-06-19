import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { InternalPageShell } from '@/components/layout/internal-ui'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <InternalPageShell
      width="narrow"
      contentClassName="flex min-h-full flex-col"
    >
      <PageHeader title="页面不存在" onBack="back" divider={false} className="mb-2" />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12">
        <div className="flex size-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03]">
          <span className="text-4xl font-bold text-white/20">404</span>
        </div>
        <p className="max-w-sm text-center text-sm text-text-muted">
          你访问的页面不存在，可能已被移除或链接有误
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
          >
            返回上一页
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl bg-[var(--internal-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            回首页
          </button>
        </div>
      </div>
    </InternalPageShell>
  )
}
