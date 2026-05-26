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

export const presets: Record<string, ThemeConfig> = {
  'morning-mist': {
    name: 'morning-mist',
    dark: true,
    primaryStart: '#78909C',
    primaryEnd: '#90A4AE',
    bgPrimary: '#000000',
    bgSecondary: '#0A0A0A',
    bgTertiary: '#1A1A1A',
    bgCard: '#0F0F0F',
    textPrimary: '#FFFFFF',
    textSecondary: '#9A9A9A',
    textMuted: '#5A5A5A',
    borderColor: '#2A2A2A',
  },
  light: {
    name: 'light',
    dark: false,
    primaryStart: '#3388FF',
    primaryEnd: '#5599FF',
    bgPrimary: '#F5F5F5',
    bgSecondary: '#EEEEEE',
    bgTertiary: '#E0E0E0',
    bgCard: '#FFFFFF',
    textPrimary: '#111111',
    textSecondary: '#555555',
    textMuted: '#888888',
    borderColor: '#D0D0D0',
  },
}

function hexToRgb(hex: string) {
  const v = parseInt(hex.replace('#', ''), 16)
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement
  root.dataset.appearance = config.dark ? 'dark' : 'light'
  root.style.setProperty('--primary-start', config.primaryStart)
  root.style.setProperty('--primary-end', config.primaryEnd)
  root.style.setProperty('--accent-color', config.primaryStart)
  root.style.setProperty('--accent-hover', config.primaryEnd)

  // Compute accent-muted (12%) and accent-ghost (6%) from accent color
  const { r, g, b } = hexToRgb(config.primaryStart)
  root.style.setProperty('--accent-muted', `rgba(${r}, ${g}, ${b}, 0.12)`)
  root.style.setProperty('--accent-ghost', `rgba(${r}, ${g}, ${b}, 0.06)`)

  root.style.setProperty('--bg-primary', config.bgPrimary)
  root.style.setProperty('--bg-secondary', config.bgSecondary)
  root.style.setProperty('--bg-tertiary', config.bgTertiary)
  root.style.setProperty('--bg-card', config.bgCard)
  root.style.setProperty('--border-color', config.borderColor)
  root.style.setProperty(
    '--primary-gradient',
    `linear-gradient(135deg, ${config.primaryStart}, ${config.primaryEnd})`,
  )
  root.style.setProperty('--text-primary', config.textPrimary)
  root.style.setProperty('--text-secondary', config.textSecondary)
  root.style.setProperty('--text-muted', config.textMuted)
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
      const dp = presets[savedDark || 'morning-mist'] || presets['morning-mist']
      return {
        config: {
          ...presets.light,
          primaryStart: dp.primaryStart,
          primaryEnd: dp.primaryEnd,
          name: 'light',
        },
        darkPreset: savedDark || 'morning-mist',
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
  return {
    config: presets['light'],
    darkPreset: 'morning-mist',
    darkMode: true,
  }
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
      const dp = presets[get().lastDarkPreset] || presets['morning-mist']
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
      const dp = presets[lastDarkPreset] || presets['morning-mist']
      applyTheme(dp)
      localStorage.setItem('ninewood-theme', lastDarkPreset)
      localStorage.removeItem('ninewood-light-mode')
      set({ current: dp, darkMode: false })
    } else {
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
