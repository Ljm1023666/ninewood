import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

/** Windows 桌面：仅鼠标驱动 3D 倾斜 */
export const CometCard = ({
  rotateDepth = 17.5,
  translateDepth = 20,
  /** 1 = 不放大，底图最清晰；默认 1.05 为悬停轻微浮起 */
  hoverScale = 1.05,
  className,
  children,
}: {
  rotateDepth?: number
  translateDepth?: number
  hoverScale?: number
  className?: string
  children: React.ReactNode
}) => {
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x)
  const mouseYSpring = useSpring(y)

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [`-${rotateDepth}deg`, `${rotateDepth}deg`],
  )
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [`${rotateDepth}deg`, `-${rotateDepth}deg`],
  )

  const translateX = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [`-${translateDepth}px`, `${translateDepth}px`],
  )
  const translateY = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [`${translateDepth}px`, `-${translateDepth}px`],
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()

    const width = rect.width
    const height = rect.height

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5

    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  /** 不在最外层 overflow-hidden：3D 倾斜/翻面时内容会略超出原矩形，裁切会出现右侧空白；圆角由内层卡片自身处理 */
  return (
    <div className={cn('rounded-3xl', className)}>
      <div className="perspective-[1200px] [transform-style:preserve-3d]">
        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            translateX,
            translateY,
            transformStyle: 'preserve-3d',
          }}
          initial={{ scale: 1, z: 0 }}
          whileHover={{
            scale: hoverScale,
            z: 50,
            transition: { duration: 0.2 },
          }}
          className="relative rounded-3xl [transform-style:preserve-3d]"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
