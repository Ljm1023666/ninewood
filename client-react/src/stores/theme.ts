import { create } from 'zustand'

export interface ThemeConfig {
  name: string
  dark: boolean
  primaryStart: string
  primaryEnd: string
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgCard: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  borderColor: string
}

const presets: Record<string, ThemeConfig> = {
  cyberpunk: {
    name: 'cyberpunk',
    dark: true,
    primaryStart: '#667eea',
    primaryEnd: '#764ba2',
    bgPrimary: '#0a0a1a',
    bgSecondary: '#12122a',
    bgTertiary: '#1a1a3a',
    bgCard: 'rgba(102, 126, 234, 0.08)',
    textPrimary: '#e0e0f0',
    textSecondary: '#b0b0d0',
    textMuted: '#8080a8',
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  ocean: {
    name: 'ocean',
    dark: true,
    primaryStart: '#0ea5e9',
    primaryEnd: '#06b6d4',
    bgPrimary: '#0a1628',
    bgSecondary: '#0f2240',
    bgTertiary: '#152e50',
    bgCard: 'rgba(14, 165, 233, 0.08)',
    textPrimary: '#dceefb',
    textSecondary: '#a0c4e8',
    textMuted: '#6088a8',
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  sunset: {
    name: 'sunset',
    dark: true,
    primaryStart: '#f97316',
    primaryEnd: '#ef4444',
    bgPrimary: '#1a0f0a',
    bgSecondary: '#2a1812',
    bgTertiary: '#3a221a',
    bgCard: 'rgba(249, 115, 22, 0.08)',
    textPrimary: '#fce8d9',
    textSecondary: '#d4a88c',
    textMuted: '#a07058',
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  forest: {
    name: 'forest',
    dark: true,
    primaryStart: '#22c55e',
    primaryEnd: '#10b981',
    bgPrimary: '#0a1a0f',
    bgSecondary: '#122a1a',
    bgTertiary: '#1a3a22',
    bgCard: 'rgba(34, 197, 94, 0.08)',
    textPrimary: '#d9fce1',
    textSecondary: '#8cd4a0',
    textMuted: '#58a070',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  crimson: {
    name: 'crimson',
    dark: true,
    primaryStart: '#dc2626',
    primaryEnd: '#b91c1c',
    bgPrimary: '#1a0a0a',
    bgSecondary: '#2a1212',
    bgTertiary: '#3a1a1a',
    bgCard: 'rgba(220, 38, 38, 0.08)',
    textPrimary: '#fcd9d9',
    textSecondary: '#d48c8c',
    textMuted: '#a05858',
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  light: {
    name: 'light',
    dark: false,
    primaryStart: '#667eea',
    primaryEnd: '#764ba2',
    bgPrimary: '#edf1f7',
    bgSecondary: '#e3e9f2',
    bgTertiary: '#d8dfeb',
    bgCard: 'rgba(255, 255, 255, 0.68)',
    textPrimary: '#111827',
    textSecondary: '#334155',
    textMuted: '#64748b',
    borderColor: 'rgba(30, 41, 59, 0.14)',
  },
}

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement
  root.dataset.appearance = config.dark ? 'dark' : 'light'
  root.style.setProperty('--primary-start', config.primaryStart)
  root.style.setProperty('--primary-end', config.primaryEnd)
  root.style.setProperty('--accent-color', config.primaryStart)
  root.style.setProperty('--bg-primary', config.bgPrimary)
  root.style.setProperty('--bg-secondary', config.bgSecondary)
  root.style.setProperty('--bg-tertiary', config.bgTertiary)
  root.style.setProperty('--bg-card', config.bgCard)
  root.style.setProperty('--border-color', config.borderColor)
  root.style.setProperty(
    '--primary-gradient',
    `linear-gradient(135deg, ${config.primaryStart}, ${config.primaryEnd})`,
  )
  // 正文色与皮肤色相解耦：浅色模式统一深色字，深色模式统一浅色字
  if (config.dark) {
    root.style.setProperty('--text-primary', '#f4f4f5')
    root.style.setProperty('--text-secondary', '#d4d4d8')
    root.style.setProperty('--text-muted', '#a1a1aa')
  } else {
    root.style.setProperty('--text-primary', '#171717')
    root.style.setProperty('--text-secondary', '#404040')
    root.style.setProperty('--text-muted', '#737373')
  }
  // 浅色模式提高金额对比度；暗色保持琥珀色可读性
  if (config.dark) {
    root.style.setProperty('--price-foreground', '#fbbf24')
    root.style.setProperty('--price-surface', 'rgba(251, 191, 36, 0.12)')
    root.style.setProperty('--price-border', 'rgba(251, 191, 36, 0.32)')
  } else {
    root.style.setProperty('--price-foreground', '#b45309')
    root.style.setProperty('--price-surface', 'rgba(180, 83, 9, 0.1)')
    root.style.setProperty('--price-border', 'rgba(180, 83, 9, 0.28)')
  }
}

interface ThemeState {
  current: ThemeConfig
  darkMode: boolean
  lastDarkPreset: string
  setTheme: (name: string) => void
  toggleDarkMode: () => void
}

function getInitial() {
  const saved =
    typeof window !== 'undefined'
      ? localStorage.getItem('ninewood-theme')
      : null
  const savedDark =
    typeof window !== 'undefined'
      ? localStorage.getItem('ninewood-dark-preset')
      : null
  const savedLight =
    typeof window !== 'undefined'
      ? localStorage.getItem('ninewood-light-mode') === 'true'
      : false

  if (saved && presets[saved]) {
    const preset = presets[saved]
    if (saved === 'light') {
      const dp = presets[savedDark || 'cyberpunk'] || presets.cyberpunk
      return {
        config: {
          ...presets.light,
          primaryStart: dp.primaryStart,
          primaryEnd: dp.primaryEnd,
          name: 'light',
        },
        darkPreset: savedDark || 'cyberpunk',
        darkMode: true,
      }
    }
    if (savedLight) {
      return {
        config: {
          ...presets.light,
          primaryStart: preset.primaryStart,
          primaryEnd: preset.primaryEnd,
          name: saved,
        },
        darkPreset: saved,
        darkMode: true,
      }
    }
    return { config: preset, darkPreset: saved, darkMode: false }
  }
  return { config: presets.cyberpunk, darkPreset: 'cyberpunk', darkMode: false }
}

const init = getInitial()
const initial = init.config
const initialDarkPreset = init.darkPreset
const initialDarkMode = init.darkMode

applyTheme(initial)

export const useThemeStore = create<ThemeState>((set, get) => ({
  current: initial,
  darkMode: initialDarkMode,
  lastDarkPreset: initialDarkPreset,

  setTheme: (name: string) => {
    const config = presets[name]
    if (!config) return

    if (name === 'light') {
      const dp = presets[get().lastDarkPreset] || presets.cyberpunk
      const lightConfig: ThemeConfig = {
        ...presets.light,
        primaryStart: dp.primaryStart,
        primaryEnd: dp.primaryEnd,
        name: 'light',
      }
      applyTheme(lightConfig)
      localStorage.setItem('ninewood-theme', name)
      localStorage.setItem('ninewood-light-mode', 'true')
      set({ current: lightConfig, darkMode: true })
    } else {
      applyTheme(config)
      const isLight = get().darkMode
      if (isLight) {
        const lightConfig: ThemeConfig = {
          ...presets.light,
          primaryStart: config.primaryStart,
          primaryEnd: config.primaryEnd,
          name: name,
        }
        applyTheme(lightConfig)
        set({ current: lightConfig, lastDarkPreset: name, darkMode: true })
      } else {
        set({ current: config, lastDarkPreset: name, darkMode: false })
      }
      localStorage.setItem('ninewood-theme', name)
      localStorage.setItem('ninewood-dark-preset', name)
      localStorage.removeItem('ninewood-light-mode')
    }
  },

  toggleDarkMode: () => {
    const { current, darkMode, lastDarkPreset } = get()
    if (darkMode) {
      // 当前是亮色 → 切到暗色
      const dp = presets[lastDarkPreset] || presets.cyberpunk
      applyTheme(dp)
      localStorage.setItem('ninewood-theme', lastDarkPreset)
      localStorage.removeItem('ninewood-light-mode')
      set({ current: dp, darkMode: false })
    } else {
      // 当前是暗色 → 切到亮色
      const lightConfig: ThemeConfig = {
        ...presets.light,
        primaryStart: current.primaryStart,
        primaryEnd: current.primaryEnd,
        name: current.name,
      }
      applyTheme(lightConfig)
      localStorage.setItem('ninewood-light-mode', 'true')
      set({ current: lightConfig, darkMode: true })
    }
  },
}))
