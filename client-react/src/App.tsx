import { RouterProvider } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { router } from '@/router'
import { useUserStore } from '@/stores/user'

export default function App() {
  const [ready, setReady] = useState(false)
  const init = useUserStore((s) => s.init)

  useEffect(() => {
    init().then(() => setReady(true))
  }, [init])

  if (!ready) return null

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full">
      <RouterProvider router={router} />
    </div>
  )
}
