import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { router } from '@/router/index.tsx'
import { useUserStore } from '@/stores/user'

export default function App() {
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
