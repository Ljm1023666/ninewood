import * as Sentry from '@sentry/react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { router } from '@/router/index.tsx'
import { useUserStore } from '@/stores/user'

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] p-8">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
        <span className="text-2xl">!</span>
      </div>
      <h2 className="text-lg font-semibold text-white/85">页面出现异常</h2>
      <p className="max-w-md text-center text-sm text-white/50">
        {error.message || '发生了意外错误，请刷新页面重试'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        刷新页面
      </button>
    </div>
  )
}

export default Sentry.withErrorBoundary(AppInner, {
  fallback: (props) => <ErrorFallback error={props.error} />,
})

function AppInner() {
  const [ready, setReady] = useState(false)
  const init = useUserStore((s) => s.init)

  useEffect(() => {
    init().then(() => setReady(true))
  }, [init])

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full">
      <Toaster position="top-center" richColors />
      {ready ? (
        <RouterProvider router={router} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]" />
      )}
    </div>
  )
}
