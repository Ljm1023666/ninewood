import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas'

interface CanvasManagerProps {
  /** 根据 canvas tab 的 type 渲染对应内容 */
  renderContent: (tab: {
    id: string
    title: string
    type?: string
    data?: unknown
  }) => ReactNode
}

export function CanvasManager({ renderContent }: CanvasManagerProps) {
  const { canvases, activeId, setActive, close } = useCanvasStore()

  if (canvases.length === 0) return null

  return (
    <div className="fixed inset-0 z-[var(--z-max)] flex flex-col bg-black/80 backdrop-blur-sm">
      {/* 标签栏 */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-bg-primary px-2 py-2">
        {canvases.map((canvas) => {
          const isActive = canvas.id === activeId
          return (
            <button
              key={canvas.id}
              onClick={() => setActive(canvas.id)}
              className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              }`}
            >
              <span className="max-w-[160px] truncate">{canvas.title}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  close(canvas.id)
                }}
                className="flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-bg-tertiary group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          )
        })}
      </div>

      {/* Canvas 内容区 */}
      <AnimatePresence mode="wait">
        {canvases.map((canvas) =>
          canvas.id === activeId ? (
            <motion.div
              key={canvas.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              {renderContent(canvas)}
            </motion.div>
          ) : null,
        )}
      </AnimatePresence>
    </div>
  )
}
