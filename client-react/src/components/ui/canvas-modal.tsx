import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'

interface CanvasModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** 头部右侧操作区 */
  headerRight?: ReactNode
  /** 覆盖默认头部，传入 null 可完全隐藏头部 */
  header?: ReactNode | null
  children: ReactNode
}

export function CanvasModal({
  open,
  onClose,
  title,
  headerRight,
  header,
  children,
}: CanvasModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[var(--z-max)] bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-4 flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-elevation-2"
          >
            {/* 头部 */}
            {header !== null && (
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  {title && (
                    <h2 className="text-lg font-semibold text-text-primary truncate">
                      {title}
                    </h2>
                  )}
                </div>
                {headerRight && (
                  <div className="flex items-center gap-2">{headerRight}</div>
                )}
              </div>
            )}

            {/* 内容 */}
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
