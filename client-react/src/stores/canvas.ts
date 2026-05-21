import { create } from 'zustand'

export interface CanvasTab {
  id: string
  title: string
  /** 用于决定渲染哪个内容组件 */
  type?: string
  /** 传递给内容组件的额外数据 */
  data?: unknown
}

interface CanvasState {
  canvases: CanvasTab[]
  activeId: string | null
  open: (tab: CanvasTab) => void
  close: (id: string) => void
  setActive: (id: string) => void
  closeAll: () => void
}

let nextId = 1
function genId() {
  return `canvas-${nextId++}-${Date.now()}`
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  canvases: [],
  activeId: null,

  open: (tab) => {
    const id = tab.id || genId()
    const { canvases } = get()
    const existing = canvases.find((c) => c.id === id)
    if (existing) {
      set({ activeId: id })
      return
    }
    set({ canvases: [...canvases, { ...tab, id }], activeId: id })
  },

  close: (id) => {
    const { canvases, activeId } = get()
    const next = canvases.filter((c) => c.id !== id)
    const nextActive =
      activeId === id
        ? next.length > 0
          ? next[next.length - 1]!.id
          : null
        : activeId
    set({ canvases: next, activeId: nextActive })
  },

  setActive: (id) => set({ activeId: id }),

  closeAll: () => set({ canvases: [], activeId: null }),
}))
