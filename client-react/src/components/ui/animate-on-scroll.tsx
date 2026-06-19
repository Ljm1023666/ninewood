import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AnimateOnScrollProps {
  children: ReactNode
  animation?: 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight'
  delay?: number
  stagger?: number
  className?: string
}

export function AnimateOnScroll({
  children,
  animation = 'fadeUp',
  delay = 0,
  stagger = 0,
  className,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const animClass = visible ? `animate-${animation}` : 'opacity-0'

  return (
    <div
      ref={ref}
      className={cn(animClass, className)}
      style={{
        animationDelay: `${delay}ms`,
        ...(stagger > 0 && visible
          ? { ['--stagger' as string]: `${stagger}ms` }
          : {}),
      }}
    >
      {children}
    </div>
  )
}
