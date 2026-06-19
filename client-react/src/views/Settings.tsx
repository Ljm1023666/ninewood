import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import { Moon, Sun, Palette, Check, ChevronRight, LogOut, Award, UserRound } from 'lucide-react'

const themeNames: Record<string, string> = {
  cyberpunk: '赛博朋克',
  ocean: '深海',
  sunset: '日落',
  forest: '森林',
  crimson: '绯红',
  light: '浅色',
}

const SETTINGS_HERO_FALLBACK =
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80'

export default function Settings() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const themeStore = useThemeStore()
  const current = themeStore.current
  const darkMode = themeStore.darkMode

  const heroBackgroundUrl = useMemo(
    () => user?.coverUrl || publisherUserCoverPreset(user?.id) || SETTINGS_HERO_FALLBACK,
    [user?.coverUrl, user?.id],
  )

  const presets = [
    { name: 'cyberpunk', gradient: 'from-[#667eea] to-[#764ba2]' },
    { name: 'ocean', gradient: 'from-[#0ea5e9] to-[#06b6d4]' },
    { name: 'sunset', gradient: 'from-[#f97316] to-[#ef4444]' },
    { name: 'forest', gradient: 'from-[#22c55e] to-[#10b981]' },
    { name: 'crimson', gradient: 'from-[#dc2626] to-[#b91c1c]' },
    { name: 'light', gradient: 'from-[#94a3b8] to-[#64748b]' },
  ]

  function goDark() {
    if (darkMode) themeStore.toggleDarkMode()
  }
  function goLight() {
    if (!darkMode) themeStore.toggleDarkMode()
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative z-[1] flex min-h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-bg-primary/85 to-bg-primary" />

      <div className="relative z-10 box-border w-[min(100%,36rem)] shrink-0 px-4 pb-28 pt-14 md:px-6 md:pt-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">账户</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white drop-shadow-sm">设置</h1>
          <p className="mt-1 text-sm text-white/65">外观与常用入口</p>
        </div>

        <LiquidGlassCard
          draggable={false}
          shadowIntensity="xs"
          glowIntensity="none"
          borderRadius="16px"
          className="mb-4 p-5 text-white bg-white/[0.08]"
        >
          <div className="mb-4 flex items-center gap-2 text-white/80">
            <Palette className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/55">外观</h2>
          </div>

          <p className="mb-2 text-[11px] text-white/50">显示模式</p>
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={goDark}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all',
                !darkMode
                  ? 'border-white/35 bg-white/20 text-white shadow-md shadow-black/20'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
              )}
            >
              <Moon className="h-4 w-4" aria-hidden />
              深色
            </button>
            <button
              type="button"
              onClick={goLight}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all',
                darkMode
                  ? 'border-white/35 bg-white/20 text-white shadow-md shadow-black/20'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
              )}
            >
              <Sun className="h-4 w-4" aria-hidden />
              浅色
            </button>
          </div>

          <p className="mb-2 text-[11px] text-white/50">主题色</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {presets.map((preset) => {
              const active = current.name === preset.name
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => themeStore.setTheme(preset.name)}
                  className={cn(
                    'relative rounded-xl border p-3 text-left transition-all',
                    'border-white/12 bg-white/5 hover:border-white/25 hover:bg-white/10',
                    active && 'border-white/45 bg-white/15 ring-1 ring-white/30',
                  )}
                >
                  <div className={cn('mb-2 h-9 rounded-lg bg-gradient-to-br shadow-inner', preset.gradient)} />
                  <span className="text-[11px] font-medium text-white/85">{themeNames[preset.name]}</span>
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-emerald-600 shadow">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard
          draggable={false}
          shadowIntensity="xs"
          glowIntensity="none"
          borderRadius="16px"
          className="mb-4 p-2 text-white bg-white/[0.08]"
        >
          <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-white/50">快捷入口</p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <UserRound className="h-5 w-5 text-white/90" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold text-white/95">个人主页</span>
            <ChevronRight className="h-4 w-4 text-white/40" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => navigate('/cert-center')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Award className="h-5 w-5 text-white/90" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold text-white/95">认证中心</span>
            <ChevronRight className="h-4 w-4 text-white/40" aria-hidden />
          </button>
        </LiquidGlassCard>

        <LiquidGlassCard
          draggable={false}
          shadowIntensity="xs"
          glowIntensity="none"
          borderRadius="16px"
          className="p-4 text-white bg-white/[0.06]"
        >
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/25"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            退出登录
          </button>
        </LiquidGlassCard>

        <p className="mt-8 text-center text-xs text-white/40">九木平台 v1.0.0</p>
      </div>
    </div>
  )
}
