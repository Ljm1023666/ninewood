import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

/** 金额数字滚动动画 */
export function useAnimatedNumber(target: number, duration = 0.4): number {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (from === target) {
      setDisplay(target)
      return
    }
    const controls = animate(from, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [target, duration])

  return Math.round(display)
}
