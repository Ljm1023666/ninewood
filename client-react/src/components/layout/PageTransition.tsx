import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'

/**
 * 路由级页面过渡：交叉淡入淡出 + 微量位移
 * 产品注册动效 — 150ms 出口，250ms 入口，不阻塞交互
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          opacity: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
          y: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          flex: 1,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
