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
  'amber-stream': {
    name: 'amber-stream',
    dark: true,
    primaryStart: 'oklch(82% 0.15 60)',
    primaryEnd: 'oklch(73% 0.15 60)',
    bgPrimary: 'oklch(15% 0.01 50)',
    bgSecondary: 'oklch(20% 0.012 52)',
    bgTertiary: 'oklch(27% 0.014 54)',
    bgCard: 'oklch(73% 0.15 60 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(33% 0.014 54)',
  },
  'morning-mist': {
    name: 'morning-mist',
    dark: true,
    primaryStart: 'oklch(80% 0.13 85)',
    primaryEnd: 'oklch(72% 0.13 85)',
    bgPrimary: 'oklch(16% 0.005 70)',
    bgSecondary: 'oklch(20% 0.008 72)',
    bgTertiary: 'oklch(26% 0.01 75)',
    bgCard: 'oklch(72% 0.13 85 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(33% 0.01 75)',
  },
  'moon-through-pines': {
    name: 'moon-through-pines',
    dark: true,
    primaryStart: 'oklch(82% 0.11 150)',
    primaryEnd: 'oklch(74% 0.11 150)',
    bgPrimary: 'oklch(14% 0.01 140)',
    bgSecondary: 'oklch(19% 0.012 138)',
    bgTertiary: 'oklch(25% 0.014 135)',
    bgCard: 'oklch(74% 0.11 150 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(32% 0.014 135)',
  },
  'green-vines': {
    name: 'green-vines',
    dark: true,
    primaryStart: 'oklch(84% 0.12 160)',
    primaryEnd: 'oklch(76% 0.12 160)',
    bgPrimary: 'oklch(14% 0.008 150)',
    bgSecondary: 'oklch(19% 0.01 148)',
    bgTertiary: 'oklch(25% 0.012 145)',
    bgCard: 'oklch(76% 0.12 160 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(32% 0.012 145)',
  },
  'twilight-violet': {
    name: 'twilight-violet',
    dark: true,
    primaryStart: 'oklch(76% 0.16 300)',
    primaryEnd: 'oklch(68% 0.16 300)',
    bgPrimary: 'oklch(12% 0.015 295)',
    bgSecondary: 'oklch(17% 0.016 292)',
    bgTertiary: 'oklch(24% 0.018 290)',
    bgCard: 'oklch(68% 0.16 300 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(31% 0.018 290)',
  },
  'snow-on-pines': {
    name: 'snow-on-pines',
    dark: true,
    primaryStart: 'oklch(88% 0.02 85)',
    primaryEnd: 'oklch(80% 0.02 85)',
    bgPrimary: 'oklch(18% 0.008 140)',
    bgSecondary: 'oklch(23% 0.01 138)',
    bgTertiary: 'oklch(29% 0.012 135)',
    bgCard: 'oklch(80% 0.02 85 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(35% 0.012 135)',
  },
  'sunset-molten-gold': {
    name: 'sunset-molten-gold',
    dark: true,
    primaryStart: 'oklch(86% 0.18 70)',
    primaryEnd: 'oklch(78% 0.18 70)',
    bgPrimary: 'oklch(13% 0.018 45)',
    bgSecondary: 'oklch(18% 0.02 48)',
    bgTertiary: 'oklch(25% 0.022 50)',
    bgCard: 'oklch(78% 0.18 70 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(32% 0.022 50)',
  },
  'emerald-mist': {
    name: 'emerald-mist',
    dark: true,
    primaryStart: 'oklch(80% 0.14 165)',
    primaryEnd: 'oklch(72% 0.14 165)',
    bgPrimary: 'oklch(14% 0.012 160)',
    bgSecondary: 'oklch(19% 0.014 158)',
    bgTertiary: 'oklch(26% 0.016 155)',
    bgCard: 'oklch(72% 0.14 165 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(33% 0.016 155)',
  },
  'autumn-river': {
    name: 'autumn-river',
    dark: true,
    primaryStart: 'oklch(78% 0.13 270)',
    primaryEnd: 'oklch(70% 0.13 270)',
    bgPrimary: 'oklch(12% 0.01 265)',
    bgSecondary: 'oklch(17% 0.012 262)',
    bgTertiary: 'oklch(24% 0.014 260)',
    bgCard: 'oklch(70% 0.13 270 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(78% 0.01 58)',
    textMuted: 'oklch(58% 0.012 55)',
    borderColor: 'oklch(31% 0.014 260)',
  },
  light: {
    name: 'light',
    dark: false,
    primaryStart: 'oklch(58% 0.16 45)',
    primaryEnd: 'oklch(52% 0.18 35)',
    bgPrimary: 'oklch(96% 0.004 60)',
    bgSecondary: 'oklch(91% 0.006 58)',
    bgTertiary: 'oklch(85% 0.008 55)',
    bgCard: 'oklch(58% 0.16 45 / 0.04)',
    textPrimary: '#111111',
    textSecondary: '#333333',
    textMuted: '#525252',
    borderColor: 'oklch(60% 0.003 58 / 0.2)',
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
      const dp = presets[savedDark || 'amber-stream'] || presets['amber-stream']
      return {
        config: {
          ...presets.light,
          primaryStart: dp.primaryStart,
          primaryEnd: dp.primaryEnd,
          name: 'light',
        },
        darkPreset: savedDark || 'amber-stream',
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
    config: presets['amber-stream'],
    darkPreset: 'amber-stream',
    darkMode: false,
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
      const dp = presets[get().lastDarkPreset] || presets['amber-stream']
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
      const dp = presets[lastDarkPreset] || presets['amber-stream']
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
