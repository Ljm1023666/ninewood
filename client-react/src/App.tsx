import { Component, useEffect, useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/router/index.tsx'
import { useUserStore } from '@/stores/user'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

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
      <LiquidMetalButton
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        刷新页面
      </LiquidMetalButton>
    </div>
  )
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: unknown) {
    return {
      error: error instanceof Error ? error : new Error('发生了意外错误'),
    }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.VITE_SENTRY_DSN) {
      void import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error)
      })
    }
  }

  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} />
    return this.props.children
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppInner />
    </AppErrorBoundary>
  )
}

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
