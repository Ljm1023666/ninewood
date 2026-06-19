import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SparklesCore } from '@/components/ui/sparkles'

export default function Home() {
  const navigate = useNavigate()

  const goDiscover = useCallback(() => {
    navigate('/discover')
  }, [navigate])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // 排除左侧导航栏区域
      if (e.clientX < 100) return
      goDiscover()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        goDiscover()
      }
    }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [goDiscover])

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-black text-white">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden antialiased translate-y-8">
        <div className="relative z-10 flex flex-col items-center gap-4 px-4">
          <h1
            className="text-5xl font-bold text-center text-white md:text-7xl lg:text-9xl select-none"
            style={{
              textShadow:
                '0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.2), 0 2px 8px rgba(99,102,241,0.08)',
              filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.1))',
            }}
          >
            Ninewood
          </h1>
        </div>

        <div className="relative z-0 mt-10 w-full max-w-2xl h-40">
          <div className="absolute inset-x-0 top-0 flex flex-col items-center">
            <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm mt-px" />
            <div className="h-px w-1/4 bg-gradient-to-r from-transparent via-sky-500 to-transparent mt-1" />
            <div className="h-[3px] w-1/4 bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-sm mt-px" />
          </div>

          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={1200}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={0.6}
          />

          <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
        </div>
      </div>
    </div>
  )
}
