import { useState, useCallback, useRef, useEffect } from 'react'
import { useThemeStore } from '@/stores/theme'

type CurtainPhase = 'idle' | 'falling' | 'rising'

const DURATION = 550

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  const [phase, setPhase] = useState<CurtainPhase>('idle')
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const curtainColorRef = useRef('')

  /** 目标页背景色 */
  useEffect(() => {
    if (phase !== 'idle') return
    const presets: Record<string, string> = {
      cyberpunk: '#0a0a1a', ocean: '#0a1628', sunset: '#1a0f0a',
      forest: '#0a1a0f', crimson: '#1a0a0a',
    }
    curtainColorRef.current = isDark
      ? '#edf1f7'
      : (presets[themeStore.lastDarkPreset] || '#0a0a1a')
  }, [isDark, phase, themeStore.lastDarkPreset])

  const handleToggle = useCallback(() => {
    if (phase !== 'idle') return
    setPhase('falling')
    setTimeout(() => {
      toggle()
      setPhase('rising')
      setTimeout(() => setPhase('idle'), DURATION + 60)
    }, DURATION)
  }, [phase, toggle])

  const btnScale = pressed ? 0.96 : hovered ? 1.1 : 1

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: curtainColorRef.current,
          transformOrigin: 'top',
          transform: phase === 'falling' ? 'scaleY(1)' : 'scaleY(0)',
          transition: phase !== 'idle' ? `transform ${DURATION}ms cubic-bezier(0.76,0,0.24,1)` : 'none',
          zIndex: 9997,
          pointerEvents: 'none',
        }}
      />

      <button
        onClick={handleToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        className="nav-item w-12 h-12 flex flex-col items-center justify-center cursor-pointer rounded-lg transition-all duration-300"
        style={{
          color: 'var(--text-secondary)',
          background: 'transparent',
          transform: `scale(${btnScale})`,
        }}
        aria-label={isDark ? '切换亮色模式' : '切换暗色模式'}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
        <span className="text-[10px] mt-0.5">主题</span>
      </button>
    </>
  )
}
