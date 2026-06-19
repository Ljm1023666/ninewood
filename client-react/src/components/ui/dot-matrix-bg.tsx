import { useRef, useEffect, useCallback } from 'react'

interface DotMatrixBgProps {
  className?: string
  colors?: string[]
  dotSize?: number
  gridSpacing?: number
  animationSpeed?: number
  reverse?: boolean
}

export function DotMatrixBg({
  className = '',
  colors = ['rgba(255,255,255,0.15)', 'rgba(180,180,180,0.12)', 'rgba(100,100,100,0.08)'],
  dotSize = 2,
  gridSpacing = 24,
  animationSpeed = 0.6,
  reverse = false,
}: DotMatrixBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = (timestamp - startTimeRef.current) / 1000

      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, w, h)

      const cols = Math.floor(w / gridSpacing)
      const rows = Math.floor(h / gridSpacing)
      const offsetX = (w - cols * gridSpacing) / 2
      const offsetY = (h - rows * gridSpacing) / 2

      const centerX = cols / 2
      const centerY = rows / 2
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * gridSpacing
          const y = offsetY + r * gridSpacing

          const distFromCenter = Math.sqrt((c - centerX) ** 2 + (r - centerY) ** 2)
          const seed = (((r * 0x9e3779b1 + c * 0x517cc1b7) >>> 0) % 9973) / 9973

          let normalizedDist: number
          if (reverse) {
            // Reverse: reveal from edges inward
            normalizedDist = (maxDist - distFromCenter) / maxDist
          } else {
            // Forward: reveal from center outward
            normalizedDist = distFromCenter / maxDist
          }

          const delay = normalizedDist * 0.8 + seed * 0.2
          const progress = Math.max(0, Math.min(1, (elapsed * animationSpeed - delay)))

          const colorStr = colors[Math.floor(seed * colors.length)] || colors[0]
          const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
          const red = rgbaMatch ? parseInt(rgbaMatch[1]) : 255
          const green = rgbaMatch ? parseInt(rgbaMatch[2]) : 255
          const blue = rgbaMatch ? parseInt(rgbaMatch[3]) : 255
          const baseAlpha = rgbaMatch ? parseFloat(rgbaMatch[4]) : 0.08

          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3)
          const alpha = eased * baseAlpha || 0.03

          ctx.beginPath()
          ctx.arc(x, y, dotSize * eased, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
          ctx.fill()
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    },
    [colors, dotSize, gridSpacing, animationSpeed, reverse],
  )

  useEffect(() => {
    startTimeRef.current = 0
    animationRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animationRef.current)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  )
}
