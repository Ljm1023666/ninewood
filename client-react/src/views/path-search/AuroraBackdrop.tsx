import { useEffect, useRef } from 'react'

type Pt = { x: number; y: number; vx: number; vy: number }

/** 粒子路径网络背景（限定在父容器内，不覆盖侧栏） */
export function AuroraBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let pts: Pt[] = []
    let raf = 0

    const resize = () => {
      const rect = root.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.width = Math.max(1, Math.round(rect.width * dpr))
      h = canvas.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const n = Math.round(rect.width / 26)
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18 * dpr,
        vy: (Math.random() - 0.5) * 0.18 * dpr,
      }))
    }

    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      const max = 140 * dpr
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i]
          const b = pts[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < max) {
            ctx.strokeStyle = `rgba(120,150,255,${(1 - d / max) * 0.14})`
            ctx.lineWidth = dpr
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = 'rgba(150,170,255,.5)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.3 * dpr, 0, 7)
        ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    if (reduced) {
      frame()
      cancelAnimationFrame(raf)
    } else {
      frame()
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={rootRef} className="psa-backdrop" aria-hidden>
      <canvas ref={canvasRef} className="psa-net" />
    </div>
  )
}
