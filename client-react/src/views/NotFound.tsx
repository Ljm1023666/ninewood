import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center gap-5 bg-background p-8">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06]">
        <span className="text-4xl font-bold text-white/20">404</span>
      </div>
      <h2 className="text-lg font-semibold text-white/75">页面不存在</h2>
      <p className="max-w-sm text-center text-sm text-white/40">
        你访问的页面不存在，可能已被移除或链接有误
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          返回上一页
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          回首页
        </button>
      </div>
    </div>
  )
}
