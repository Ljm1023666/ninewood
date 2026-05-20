import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import {
  Moon,
  Sun,
  Palette,
  Check,
  ChevronRight,
  LogOut,
  Award,
  UserRound,
} from 'lucide-react'

const themeNames: Record<string, string> = {
  'amber-stream': '琥珀川',
  'morning-mist': '薄雾晨光',
  'moon-through-pines': '松间照',
  'green-vines': '青萝拂衣',
  'twilight-violet': '暮山紫',
  'snow-on-pines': '雪落松枝',
  'sunset-molten-gold': '夕照熔金',
  'emerald-mist': '空翠湿人衣',
  'autumn-river': '秋水长天',
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
  /** 与 theme 配置一致：浅色界面时避免白字叠在浅玻璃上 */
  const isUiLight = !current.dark
  const cardSurface = isUiLight
    ? 'text-text-primary bg-bg-card/95 border border-black/[0.08]'
    : 'text-white bg-white/[0.08]'
  const labelMuted = isUiLight ? 'text-text-muted' : 'text-white/50'
  const sectionTitle = isUiLight ? 'text-text-secondary' : 'text-white/80'
  const sectionHeading = isUiLight ? 'text-text-muted' : 'text-white/55'

  const heroBackgroundUrl = useMemo(
    () =>
      user?.coverUrl ||
      publisherUserCoverPreset(user?.id) ||
      SETTINGS_HERO_FALLBACK,
    [user?.coverUrl, user?.id],
  )

  const presets = [
    { name: 'amber-stream', gradient: 'from-[#c4873b] to-[#b5772e]' },
    { name: 'morning-mist', gradient: 'from-[#d4a574] to-[#c49568]' },
    { name: 'moon-through-pines', gradient: 'from-[#4a9e6b] to-[#3a8a5a]' },
    { name: 'green-vines', gradient: 'from-[#5cb87a] to-[#4ca86a]' },
    { name: 'twilight-violet', gradient: 'from-[#8b6bc4] to-[#7a5ab3]' },
    { name: 'snow-on-pines', gradient: 'from-[#c8d4c0] to-[#b8c4b0]' },
    { name: 'sunset-molten-gold', gradient: 'from-[#d4873b] to-[#c4772e]' },
    { name: 'emerald-mist', gradient: 'from-[#4ab874] to-[#3aa864]' },
    { name: 'autumn-river', gradient: 'from-[#5a8cc4] to-[#4a7cb3]' },
  ]

  function goDark() {
    if (darkMode) {
      themeStore.toggleDarkMode()
    }
  }
  function goLight() {
    if (!darkMode) {
      themeStore.toggleDarkMode()
    }
  }

  function handleSetTheme(name: string) {
    themeStore.setTheme(name)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full flex-col items-stretch overflow-y-auto thin-scroll">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b',
          current.dark
            ? 'from-black/50 via-bg-primary/85 to-bg-primary'
            : 'from-white/25 via-bg-primary/38 to-bg-primary/82',
        )}
      />

      <div className="relative z-10 box-border w-full max-w-2xl shrink-0 self-center px-4 pb-28 pt-14 md:px-6 md:pt-16">
        <div className="mb-8 text-center">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.2em]',
              isUiLight ? 'text-text-muted' : 'text-white/50',
            )}
          >
            账户
          </p>
          <h1
            className={cn(
              'mt-1 text-2xl font-black tracking-tight drop-shadow-sm',
              isUiLight ? 'text-text-primary' : 'text-white',
            )}
          >
            设置
          </h1>
          <p
            className={cn(
              'mt-1 text-sm',
              isUiLight ? 'text-text-secondary' : 'text-white/65',
            )}
          >
            外观与常用入口
          </p>
        </div>

        <LiquidGlassCard
          draggable={false}
          shadowIntensity="xs"
          glowIntensity="none"
          borderRadius="16px"
          className={cn('mb-4 p-5', cardSurface)}
        >
          <div className={cn('mb-4 flex items-center gap-2', sectionTitle)}>
            <Palette className="h-4 w-4 shrink-0" aria-hidden />
            <h2
              className={cn(
                'text-xs font-bold uppercase tracking-wider',
                sectionHeading,
              )}
            >
              外观
            </h2>
          </div>

          <p className={cn('mb-2 text-[11px]', labelMuted)}>显示模式</p>
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={goDark}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-[color,background-color,border-color,box-shadow]',
                !darkMode
                  ? isUiLight
                    ? 'border-black/15 bg-black/[0.06] text-text-primary shadow-sm shadow-black/10'
                    : 'border-white/35 bg-white/20 text-white shadow-md shadow-black/20'
                  : isUiLight
                    ? 'border-black/10 bg-black/[0.03] text-text-secondary hover:bg-black/[0.06]'
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
                'flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-[color,background-color,border-color,box-shadow]',
                darkMode
                  ? isUiLight
                    ? 'border-black/20 bg-white text-text-primary shadow-sm shadow-black/10'
                    : 'border-white/35 bg-white/20 text-white shadow-md shadow-black/20'
                  : isUiLight
                    ? 'border-black/10 bg-black/[0.03] text-text-secondary hover:bg-black/[0.06]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
              )}
            >
              <Sun className="h-4 w-4" aria-hidden />
              浅色
            </button>
          </div>

          <p className={cn('mb-2 text-[11px]', labelMuted)}>主题色</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {presets.map((preset) => {
              const active = current.name === preset.name
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSetTheme(preset.name)}
                  className={cn(
                    'relative rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow]',
                    isUiLight
                      ? 'border-black/[0.08] bg-black/[0.03] hover:border-black/15 hover:bg-black/[0.06]'
                      : 'border-white/12 bg-white/5 hover:border-white/25 hover:bg-white/10',
                    active &&
                      (isUiLight
                        ? 'border-black/25 bg-white ring-1 ring-black/10'
                        : 'border-white/45 bg-white/15 ring-1 ring-white/30'),
                  )}
                >
                  <div
                    className={cn(
                      'mb-2 h-9 rounded-lg bg-gradient-to-br shadow-inner',
                      preset.gradient,
                    )}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isUiLight ? 'text-text-primary' : 'text-white/85',
                    )}
                  >
                    {themeNames[preset.name]}
                  </span>
                  {active && (
                    <span
                      className={cn(
                        'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full shadow',
                        isUiLight
                          ? 'bg-[var(--text-primary)] text-white'
                          : 'bg-white/90 text-emerald-600',
                      )}
                    >
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
          className={cn('mb-4 p-2', cardSurface)}
        >
          <p
            className={cn(
              'px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-wider',
              labelMuted,
            )}
          >
            快捷入口
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-[background-color]',
              isUiLight ? 'hover:bg-black/[0.04]' : 'hover:bg-white/10',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isUiLight ? 'bg-black/[0.06]' : 'bg-white/10',
              )}
            >
              <UserRound
                className={cn(
                  'h-5 w-5',
                  isUiLight ? 'text-text-primary' : 'text-white/90',
                )}
                aria-hidden
              />
            </span>
            <span
              className={cn(
                'flex-1 text-sm font-semibold',
                isUiLight ? 'text-text-primary' : 'text-white/95',
              )}
            >
              个人主页
            </span>
            <ChevronRight
              className={cn(
                'h-4 w-4',
                isUiLight ? 'text-text-muted' : 'text-white/40',
              )}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => navigate('/cert-center')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-[background-color]',
              isUiLight ? 'hover:bg-black/[0.04]' : 'hover:bg-white/10',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isUiLight ? 'bg-black/[0.06]' : 'bg-white/10',
              )}
            >
              <Award
                className={cn(
                  'h-5 w-5',
                  isUiLight ? 'text-text-primary' : 'text-white/90',
                )}
                aria-hidden
              />
            </span>
            <span
              className={cn(
                'flex-1 text-sm font-semibold',
                isUiLight ? 'text-text-primary' : 'text-white/95',
              )}
            >
              认证中心
            </span>
            <ChevronRight
              className={cn(
                'h-4 w-4',
                isUiLight ? 'text-text-muted' : 'text-white/40',
              )}
              aria-hidden
            />
          </button>
        </LiquidGlassCard>

        <LiquidGlassCard
          draggable={false}
          shadowIntensity="xs"
          glowIntensity="none"
          borderRadius="16px"
          className={cn(
            'p-4',
            isUiLight
              ? 'text-text-primary bg-bg-card/95 border border-black/[0.08]'
              : 'text-white bg-white/[0.06]',
          )}
        >
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-[color,background-color,border-color]',
              isUiLight
                ? 'border-red-300 bg-red-500/10 text-red-700 hover:bg-red-500/15'
                : 'border-red-400/35 bg-red-500/15 text-red-200 hover:bg-red-500/25',
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            退出登录
          </button>
        </LiquidGlassCard>

        <p
          className={cn(
            'mt-8 text-center text-xs',
            isUiLight ? 'text-text-muted' : 'text-white/40',
          )}
        >
          九木平台 v1.0.0
        </p>
      </div>
    </div>
  )
}
