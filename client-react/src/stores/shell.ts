import { create } from 'zustand'

const SIDEBAR_PIN_KEY = 'ninewood-sidebar-pinned'

/** 沉浸页：进入后临时收起侧栏（仍可悬停展开 / 再固定） */
export const IMMERSIVE_ROUTE_PREFIXES = ['/messages', '/agent'] as const

export const SIDEBAR_WIDTH_COLLAPSED = 72
export const SIDEBAR_WIDTH_EXPANDED = 208

export function isImmersivePath(pathname: string): boolean {
  return IMMERSIVE_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

interface ShellState {
  sidebarPinned: boolean
  /** 沉浸页自动收起覆盖：为 true 时忽略 pin，直到用户再次固定 */
  immersiveStowed: boolean
  setSidebarPinned: (pinned: boolean) => void
  toggleSidebarPin: () => void
  /** 进入/离开沉浸路由时由 Layout 调用 */
  setImmersiveStowed: (stowed: boolean) => void
  clearImmersiveStow: () => void
}

function readPinned(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_PIN_KEY) === '1'
  } catch {
    return false
  }
}

export const useShellStore = create<ShellState>((set, get) => ({
  sidebarPinned: readPinned(),
  immersiveStowed: false,

  setSidebarPinned: (pinned) => {
    try {
      localStorage.setItem(SIDEBAR_PIN_KEY, pinned ? '1' : '0')
    } catch {
      /* ignore */
    }
    set({ sidebarPinned: pinned })
  },

  toggleSidebarPin: () => {
    const { sidebarPinned, immersiveStowed } = get()
    if (immersiveStowed) {
      // 沉浸收起中点固定 → 解除收起并固定展开
      try {
        localStorage.setItem(SIDEBAR_PIN_KEY, '1')
      } catch {
        /* ignore */
      }
      set({ immersiveStowed: false, sidebarPinned: true })
      return
    }
    const next = !sidebarPinned
    try {
      localStorage.setItem(SIDEBAR_PIN_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
    set({ sidebarPinned: next })
  },

  setImmersiveStowed: (stowed) => set({ immersiveStowed: stowed }),

  clearImmersiveStow: () => set({ immersiveStowed: false }),
}))
