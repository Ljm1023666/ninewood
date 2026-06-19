import { useRef, type ReactNode } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'

type ContainerScrollProps = {
  titleComponent: ReactNode
  children: ReactNode
  className?: string
  /** 全屏沉浸式：加高滚动行程与卡片视口占比，用于独立页面 */
  immersive?: boolean
}

/** 桌面固定视口与间距，不按宽度切换「移动端」分支 */
export function ContainerScroll({
  titleComponent,
  children,
  className,
  immersive,
}: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1])
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div
      className={
        immersive
          ? `relative box-border flex h-[220vh] min-h-screen w-full items-center justify-center px-10 py-12 ${className ?? ''}`
          : `relative flex h-[80rem] items-center justify-center p-20 ${className ?? ''}`
      }
      ref={containerRef}
    >
      <div
        className={
          immersive ? 'relative w-full py-20' : 'relative w-full py-40'
        }
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
    <motion.div
      style={{ translateY: translate }}
      className="mx-auto max-w-5xl text-center"
    >
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
          ? 'mx-auto -mt-12 h-[min(44rem,78vh)] w-full max-w-5xl rounded-[32px] border-4 border-border bg-bg-secondary p-6 shadow-2xl'
          : 'mx-auto -mt-12 h-[40rem] w-full max-w-5xl rounded-[32px] border-4 border-border bg-bg-secondary p-6 shadow-2xl'
      }
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-bg-primary p-4">
        {children}
      </div>
    </motion.div>
  )
}
