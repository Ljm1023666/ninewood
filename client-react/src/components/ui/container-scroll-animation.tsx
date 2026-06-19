import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

type ContainerScrollProps = {
  titleComponent: ReactNode
  children: ReactNode
  className?: string
  /** 全屏沉浸式：加高滚动行程与卡片视口占比，用于独立页面 */
  immersive?: boolean
}

export function ContainerScroll({ titleComponent, children, className, immersive }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1])

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions())
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div
      className={
        immersive
          ? `relative box-border flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 md:px-10 md:py-12 h-[220vh] ${className ?? ''}`
          : `relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20 ${className ?? ''}`
      }
      ref={containerRef}
    >
      <div
        className={immersive ? 'relative w-full py-6 md:py-20' : 'relative w-full py-10 md:py-40'}
        style={{ perspective: '1000px' }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale} immersive={immersive}>
          {children}
        </Card>
      </div>
    </div>
  )
}

type HeaderProps = {
  translate: MotionValue<number>
  titleComponent: ReactNode
}

function Header({ translate, titleComponent }: HeaderProps) {
  return (
    <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
      {titleComponent}
    </motion.div>
  )
}

type CardProps = {
  rotate: MotionValue<number>
  scale: MotionValue<number>
  children: ReactNode
  immersive?: boolean
}

function Card({ rotate, scale, children, immersive }: CardProps) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 0 rgba(0,0,0,0.3), 0 9px 20px rgba(0,0,0,0.28), 0 37px 37px rgba(0,0,0,0.24), 0 84px 50px rgba(0,0,0,0.14), 0 149px 60px rgba(0,0,0,0.06), 0 233px 65px rgba(0,0,0,0.02)',
      }}
      className={
        immersive
          ? 'mx-auto -mt-12 h-[min(32rem,72dvh)] w-full max-w-5xl rounded-[32px] border-4 border-border bg-bg-secondary p-2 shadow-2xl md:h-[min(44rem,78dvh)] md:p-6'
          : 'mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[32px] border-4 border-border bg-bg-secondary p-2 shadow-2xl md:h-[40rem] md:p-6'
      }
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-bg-primary md:rounded-2xl md:p-4">
        {children}
      </div>
    </motion.div>
  )
}
