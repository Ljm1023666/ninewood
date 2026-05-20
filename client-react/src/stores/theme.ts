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
    primaryStart: 'oklch(70% 0.14 55)',
    primaryEnd: 'oklch(60% 0.16 45)',
    bgPrimary: 'oklch(18% 0.01 50)',
    bgSecondary: 'oklch(24% 0.012 52)',
    bgTertiary: 'oklch(30% 0.014 54)',
    bgCard: 'oklch(70% 0.14 55 / 0.08)',
    textPrimary: 'oklch(94% 0.008 60)',
    textSecondary: 'oklch(80% 0.01 58)',
    textMuted: 'oklch(62% 0.012 55)',
    borderColor: 'oklch(36% 0.012 53)',
  },
  'morning-mist': {
    name: 'morning-mist',
    dark: false,
    primaryStart: 'oklch(68% 0.12 85)',
    primaryEnd: 'oklch(58% 0.14 80)',
    bgPrimary: 'oklch(98% 0.003 85)',
    bgSecondary: 'oklch(94% 0.005 80)',
    bgTertiary: 'oklch(88% 0.008 78)',
    bgCard: 'oklch(68% 0.12 85 / 0.06)',
    textPrimary: 'oklch(22% 0.008 70)',
    textSecondary: 'oklch(45% 0.01 75)',
    textMuted: 'oklch(60% 0.01 78)',
    borderColor: 'oklch(70% 0.008 78)',
  },
  'moon-through-pines': {
    name: 'moon-through-pines',
    dark: true,
    primaryStart: 'oklch(72% 0.09 145)',
    primaryEnd: 'oklch(60% 0.10 140)',
    bgPrimary: 'oklch(12% 0.008 140)',
    bgSecondary: 'oklch(16% 0.01 138)',
    bgTertiary: 'oklch(22% 0.012 135)',
    bgCard: 'oklch(72% 0.09 145 / 0.08)',
    textPrimary: 'oklch(92% 0.008 85)',
    textSecondary: 'oklch(78% 0.01 80)',
    textMuted: 'oklch(60% 0.015 75)',
    borderColor: 'oklch(28% 0.012 136)',
  },
  'green-vines': {
    name: 'green-vines',
    dark: false,
    primaryStart: 'oklch(74% 0.11 155)',
    primaryEnd: 'oklch(64% 0.12 150)',
    bgPrimary: 'oklch(96% 0.008 145)',
    bgSecondary: 'oklch(91% 0.01 148)',
    bgTertiary: 'oklch(85% 0.012 150)',
    bgCard: 'oklch(74% 0.11 155 / 0.06)',
    textPrimary: 'oklch(18% 0.006 140)',
    textSecondary: 'oklch(42% 0.008 138)',
    textMuted: 'oklch(56% 0.01 135)',
    borderColor: 'oklch(72% 0.012 148)',
  },
  'twilight-violet': {
    name: 'twilight-violet',
    dark: true,
    primaryStart: 'oklch(62% 0.14 295)',
    primaryEnd: 'oklch(52% 0.16 290)',
    bgPrimary: 'oklch(10% 0.012 290)',
    bgSecondary: 'oklch(15% 0.014 292)',
    bgTertiary: 'oklch(22% 0.016 295)',
    bgCard: 'oklch(62% 0.14 295 / 0.08)',
    textPrimary: 'oklch(92% 0.008 80)',
    textSecondary: 'oklch(75% 0.01 75)',
    textMuted: 'oklch(55% 0.015 70)',
    borderColor: 'oklch(28% 0.016 294)',
  },
  'snow-on-pines': {
    name: 'snow-on-pines',
    dark: false,
    primaryStart: 'oklch(82% 0.02 165)',
    primaryEnd: 'oklch(72% 0.03 160)',
    bgPrimary: 'oklch(98% 0.002 90)',
    bgSecondary: 'oklch(94% 0.003 95)',
    bgTertiary: 'oklch(88% 0.004 100)',
    bgCard: 'oklch(82% 0.02 165 / 0.06)',
    textPrimary: 'oklch(15% 0.005 145)',
    textSecondary: 'oklch(35% 0.008 140)',
    textMuted: 'oklch(52% 0.01 135)',
    borderColor: 'oklch(72% 0.004 95)',
  },
  'sunset-molten-gold': {
    name: 'sunset-molten-gold',
    dark: true,
    primaryStart: 'oklch(75% 0.18 65)',
    primaryEnd: 'oklch(62% 0.20 55)',
    bgPrimary: 'oklch(8% 0.015 40)',
    bgSecondary: 'oklch(14% 0.018 42)',
    bgTertiary: 'oklch(22% 0.02 45)',
    bgCard: 'oklch(75% 0.18 65 / 0.08)',
    textPrimary: 'oklch(94% 0.01 75)',
    textSecondary: 'oklch(80% 0.015 70)',
    textMuted: 'oklch(58% 0.02 65)',
    borderColor: 'oklch(28% 0.02 44)',
  },
  'emerald-mist': {
    name: 'emerald-mist',
    dark: false,
    primaryStart: 'oklch(68% 0.14 160)',
    primaryEnd: 'oklch(58% 0.16 155)',
    bgPrimary: 'oklch(98% 0.006 155)',
    bgSecondary: 'oklch(93% 0.008 158)',
    bgTertiary: 'oklch(86% 0.01 160)',
    bgCard: 'oklch(68% 0.14 160 / 0.06)',
    textPrimary: 'oklch(14% 0.008 150)',
    textSecondary: 'oklch(38% 0.01 148)',
    textMuted: 'oklch(54% 0.012 145)',
    borderColor: 'oklch(72% 0.01 158)',
  },
  'autumn-river': {
    name: 'autumn-river',
    dark: false,
    primaryStart: 'oklch(66% 0.11 265)',
    primaryEnd: 'oklch(56% 0.12 260)',
    bgPrimary: 'oklch(96% 0.006 260)',
    bgSecondary: 'oklch(90% 0.008 262)',
    bgTertiary: 'oklch(82% 0.01 265)',
    bgCard: 'oklch(66% 0.11 265 / 0.06)',
    textPrimary: 'oklch(12% 0.008 255)',
    textSecondary: 'oklch(34% 0.01 258)',
    textMuted: 'oklch(50% 0.012 260)',
    borderColor: 'oklch(68% 0.008 262)',
  },
  light: {
    name: 'light',
    dark: false,
    primaryStart: 'oklch(58% 0.16 45)',
    primaryEnd: 'oklch(52% 0.18 35)',
    bgPrimary: 'oklch(96% 0.004 65)',
    bgSecondary: 'oklch(90% 0.004 62)',
    bgTertiary: 'oklch(84% 0.003 58)',
    bgCard: 'oklch(58% 0.16 45 / 0.04)',
    textPrimary: '#111111',
    textSecondary: '#333333',
    textMuted: '#666666',
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
  // 正文色与皮肤色相解耦：浅色模式统一深色字，深色模式统一浅色字
  root.style.setProperty('--text-primary', config.textPrimary)
  root.style.setProperty('--text-secondary', config.textSecondary)
  root.style.setProperty('--text-muted', config.textMuted)
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
      const dp = presets[get().lastDarkPreset] || presets.amber
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
      const dp = presets[lastDarkPreset] || presets.amber
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
