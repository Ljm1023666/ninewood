import { useState, useCallback, useRef } from 'react'
import { useThemeStore } from '@/stores/theme'
import { MaterialSwitch } from '@/components/ui/material-switch'

type CurtainPhase = 'idle' | 'falling' | 'rising'

const CURTAIN_DURATION = 400

export function useThemeCurtain() {
  const [phase, setPhase] = useState<CurtainPhase>('idle')
  const curtainColorRef = useRef('')
  const callbackRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const triggerCurtain = useCallback(
    (destinationBg: string, onCovered: () => void) => {
      if (phase !== 'idle') return
      curtainColorRef.current = destinationBg
      callbackRef.current = onCovered
      setPhase('falling')
    },
    [phase],
  )

  // transitionend 精确同步动画完成时刻，避免 setTimeout 的不可靠时序
  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return

    if (phaseRef.current === 'falling') {
      callbackRef.current?.()
      // 强制同步布局：applyTheme() 有 16 次 setProperty，
      // 仅靠 rAF 无法保证样式重算在动画启动前完成
      void document.documentElement.offsetHeight
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('rising')
        })
      })
    } else if (phaseRef.current === 'rising') {
      setPhase('idle')
      callbackRef.current = null
    }
  }, [])

  const curtainElement = (
    <div
      aria-hidden="true"
      data-curtain
      onTransitionEnd={handleTransitionEnd}
      style={{
        position: 'fixed',
        inset: 0,
        background: curtainColorRef.current,
        transformOrigin: 'top',
        transform: phase === 'falling' ? 'scaleY(1)' : 'scaleY(0)',
        transition:
          phase !== 'idle'
            ? `transform ${CURTAIN_DURATION}ms cubic-bezier(0.76,0,0.24,1)`
            : 'none',
        zIndex: 'var(--z-max)',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    />
  )

  return { triggerCurtain, curtainElement }
}

function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

export function ThemeToggleButton() {
  const themeStore = useThemeStore()
  const isDark = themeStore.current.dark
  const toggle = useCallback(() => themeStore.toggleDarkMode(), [themeStore])

  return (
    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
      <MaterialSwitch
        checked={isDark}
        onCheckedChange={toggle}
        size="sm"
        showIcons
        checkedIcon={<MoonIcon />}
        uncheckedIcon={<SunIcon />}
        haptic="light"
      />
      <span className="text-xs text-white/60">深色模式</span>
    </label>
  )
}
