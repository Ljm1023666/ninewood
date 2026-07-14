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
    primaryStart: '#0A84FF',
    primaryEnd: '#5E5CE6',
    bgPrimary: '#1C1C1E',
    bgSecondary: '#2C2C2E',
    bgTertiary: '#3A3A3C',
    bgCard: '#2C2C2E',
    textPrimary: '#F5F5F7',
    textSecondary: '#AEAEB2',
    textMuted: '#8E8E93',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  light: {
    name: 'light',
    dark: false,
    primaryStart: '#007AFF',
    primaryEnd: '#0A84FF',
    bgPrimary: '#F5F5F7',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#E5E5EA',
    bgCard: '#FFFFFF',
    textPrimary: '#1D1D1F',
    textSecondary: '#515154',
    textMuted: '#86868B',
    borderColor: 'rgba(60, 60, 67, 0.18)',
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
    root.style.setProperty('--price-foreground', '#e8e8e8')
    root.style.setProperty('--price-surface', 'rgba(255, 255, 255, 0.08)')
    root.style.setProperty('--price-border', 'rgba(255, 255, 255, 0.16)')
    root.style.setProperty('--wallet-panel-bg', 'rgba(255, 255, 255, 0.04)')
    root.style.setProperty('--wallet-row-hover', 'rgba(255, 255, 255, 0.03)')
    root.style.setProperty('--wallet-glass-bg', 'color-mix(in srgb, var(--bg-card) 68%, transparent)')
    root.style.setProperty('--wallet-glass-border', 'var(--border-color)')
    root.style.setProperty('--wallet-glow-a', 'rgba(255, 255, 255, 0.03)')
    root.style.setProperty('--wallet-glow-b', 'rgba(255, 255, 255, 0.015)')
    root.style.setProperty(
      '--wallet-hero-radial',
      'radial-gradient(ellipse 85% 65% at 50% -15%, var(--wallet-glow-a), transparent 72%)',
    )
    root.style.setProperty(
      '--wallet-accent-gradient',
      'linear-gradient(135deg, #f0f0f0, #cccccc)',
    )
    root.style.setProperty('--wallet-on-accent', '#111111')
    root.style.setProperty('--wallet-watermark-opacity', '0.05')
    root.style.setProperty('--wallet-stat-icon', 'rgba(255, 255, 255, 0.35)')
    root.style.setProperty('--wallet-btn-ghost-bg', 'color-mix(in srgb, var(--text-primary) 5%, transparent)')
    root.style.setProperty('--wallet-divider', 'color-mix(in srgb, var(--text-primary) 6%, transparent)')
    root.style.setProperty('--wallet-table-head-bg', 'color-mix(in srgb, var(--text-primary) 2%, transparent)')
    root.style.setProperty('--wallet-serif', "'Inter', 'HarmonyOS Sans', 'PingFang SC', sans-serif")
  } else {
    root.style.setProperty('--price-foreground', '#111111')
    root.style.setProperty('--price-surface', 'rgba(0, 0, 0, 0.06)')
    root.style.setProperty('--price-border', 'rgba(0, 0, 0, 0.12)')
    root.style.setProperty('--wallet-panel-bg', 'rgba(0, 0, 0, 0.03)')
    root.style.setProperty('--wallet-row-hover', 'rgba(0, 0, 0, 0.04)')
    root.style.setProperty('--wallet-glass-bg', 'var(--bg-card)')
    root.style.setProperty('--wallet-glass-border', 'var(--border-color)')
    root.style.setProperty('--wallet-glow-a', 'rgba(0, 0, 0, 0.02)')
    root.style.setProperty('--wallet-glow-b', 'rgba(0, 0, 0, 0.01)')
    root.style.setProperty(
      '--wallet-hero-radial',
      'radial-gradient(ellipse 85% 65% at 50% -15%, var(--wallet-glow-a), transparent 72%)',
    )
    root.style.setProperty(
      '--wallet-accent-gradient',
      'linear-gradient(135deg, #111111, #333333)',
    )
    root.style.setProperty('--wallet-on-accent', '#ffffff')
    root.style.setProperty('--wallet-watermark-opacity', '0.04')
    root.style.setProperty('--wallet-stat-icon', 'rgba(0, 0, 0, 0.35)')
    root.style.setProperty('--wallet-btn-ghost-bg', 'color-mix(in srgb, var(--text-primary) 4%, transparent)')
    root.style.setProperty('--wallet-divider', 'color-mix(in srgb, var(--text-primary) 8%, transparent)')
    root.style.setProperty('--wallet-table-head-bg', 'color-mix(in srgb, var(--text-primary) 3%, var(--bg-card))')
    root.style.setProperty('--wallet-serif', "'Inter', 'HarmonyOS Sans', 'PingFang SC', sans-serif")
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
