import { useEffect, useState } from 'react'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

/**
 * P3-07: Electron 窗口控制接入
 * - 仅在 window.electronAPI 存在时渲染
 * - Web 环境下不会使用（也不会报错）
 */
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      platform: string
      quitApp: () => Promise<void>
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
    }
  }
}

export function ElectronTitleBar() {
  const [hasElectron, setHasElectron] = useState(false)

  useEffect(() => {
    setHasElectron(typeof window !== 'undefined' && !!window.electronAPI)
  }, [])

  if (!hasElectron) return null

  return (
    <div className="flex h-7 shrink-0 items-center justify-end gap-1 border-b border-[var(--internal-hairline)] bg-[var(--admin-card-bg)] px-2">
      <LiquidMetalButton
        type="button"
        onClick={() => window.electronAPI?.minimizeWindow()}
        className="flex h-5 w-8 items-center justify-center text-xs text-[var(--admin-text-secondary)] hover:bg-black/[0.05]"
        title="最小化"
        aria-label="最小化"
      >
        —
      </LiquidMetalButton>
      <LiquidMetalButton
        type="button"
        onClick={() => window.electronAPI?.maximizeWindow()}
        className="flex h-5 w-8 items-center justify-center text-xs text-[var(--admin-text-secondary)] hover:bg-black/[0.05]"
        title="最大化"
        aria-label="最大化"
      >
        □
      </LiquidMetalButton>
      <LiquidMetalButton
        type="button"
        onClick={() => window.electronAPI?.quitApp()}
        className="flex h-5 w-8 items-center justify-center text-xs text-red-500 hover:bg-red-500/10"
        title="关闭"
        aria-label="关闭"
      >
        ×
      </LiquidMetalButton>
    </div>
  )
}
