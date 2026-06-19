import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface AuroraGradientBarProps {
  className?: string
  /** 0.5 - 2.0，影响动画速度与对比 */
  intensity?: number
}

/**
 * 动态极光彩带（Canvas）。
 * 父级需 `position: relative` 且具备明确高度；常用 `absolute inset-0` 铺满标题条。
 */
export function AuroraGradientBar({
  className,
  intensity = 1,
}: AuroraGradientBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animationId = 0
    let time = 0
    let hueShift = 0
    const int = Math.min(2, Math.max(0.5, intensity))
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const getDpr = () => Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const dpr = getDpr()
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w < 1 || h < 1) return
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)
    window.addEventListener('resize', resize)
    resize()

    const draw = () => {
      if (document.visibilityState === 'hidden') {
        animationId = requestAnimationFrame(draw)
        return
      }

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w < 1 || h < 1) {
        animationId = requestAnimationFrame(draw)
        return
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dpr = getDpr()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const dt = reduceMotion ? 0.2 : 1

      const layers = [
        { speed: 0.02, offset: 0, alphaBase: 0.52 },
        { speed: 0.03, offset: 120, alphaBase: 0.42 },
        { speed: 0.015, offset: 240, alphaBase: 0.48 },
        { speed: 0.04, offset: 60, alphaBase: 0.38 },
      ]

      layers.forEach((layer, idx) => {
        const gradient = ctx.createLinearGradient(0, 0, w, 0)
        // 蓝色基准：色相 220，营造冷静的蓝色流动感
        const lBase = 48 + Math.sin(time * 0.01 + idx) * 8 * int
        const cBase = 0.12 + Math.cos(time * 0.008 + idx) * 0.04 * int

        for (let i = 0; i <= 8; i++) {
          const pos = i / 8
          const l = lBase + Math.sin(pos * Math.PI + time * 0.02) * 10
          const c = cBase + Math.cos(pos * Math.PI + time * 0.01) * 0.05
          gradient.addColorStop(
            pos,
            `oklch(${Math.min(75, Math.max(35, l))}% ${Math.min(0.2, Math.max(0.05, c))} 220)`,
          )
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = Math.min(
          0.85,
          (layer.alphaBase + Math.sin(time * 0.01 + idx) * 0.1) * int,
        )
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
        ctx.globalAlpha = 1
      })

      if (!reduceMotion) {
        const sparkleCount = Math.min(10, Math.max(2, Math.floor(w / 72)))
        for (let i = 0; i < sparkleCount; i++) {
          const x = ((time * 0.38 * int + i * 47) % (w + 16)) - 8
          const y = h / 2 + Math.sin(time * 0.017 * int + i) * (h * 0.32)
          const radius = 1 + Math.sin(time * 0.07 * int + i) * 0.6
          const alpha = 0.06 + Math.sin(time * 0.11 * int + i) * 0.05
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${(hueShift + i * 30) % 360}, 70%, 48%, ${alpha})`
          ctx.fill()
        }
      }

      hueShift = (hueShift + 0.38 * int * dt) % 360
      time += dt
      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [intensity])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'pointer-events-none block h-full min-h-[44px] w-full',
        className,
      )}
      aria-hidden
    />
  )
}
