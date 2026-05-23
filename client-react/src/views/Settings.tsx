import { useNavigate } from 'react-router-dom'
import { useThemeStore, presets as themePresets } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import { ThemeToggleButton } from '@/components/ui/theme-toggle'
import {
  Palette,
  Check,
  ChevronRight,
  LogOut,
  Award,
  UserRound,
} from 'lucide-react'

const themeNames: Record<string, string> = {
  'ocean-blue': '海蓝',
  'amber-stream': '琥珀川',
  'morning-mist': '薄雾晨光',
  'moon-through-pines': '松间照',
  'green-vines': '青萝拂衣',
  'twilight-violet': '暮山紫',
  'snow-on-pines': '雪落松枝',
  'sunset-molten-gold': '夕照熔金',
  'emerald-mist': '空翠湿人衣',
  'autumn-river': '秋水长天',
}

/** 暗色预设列表（排除 light） */
const darkPresetEntries = Object.keys(themeNames)

export default function Settings() {
  const navigate = useNavigate()
  const logout = useUserStore((s) => s.logout)
  const themeStore = useThemeStore()
  const current = themeStore.current

  function handleSetTheme(name: string) {
    themeStore.setTheme(name)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-stretch overflow-y-auto thin-scroll">
      <div className="mx-auto w-full max-w-2xl shrink-0 px-4 pb-28 pt-14 md:px-6 md:pt-16">
        {/* ── Header ── */}
        <header className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-muted">
            账户
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">
            设置
          </h1>
          <p className="mt-1 text-sm text-text-secondary">外观与常用入口</p>
        </header>

        {/* ── 外观 ── */}
        <section
          className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5"
          aria-labelledby="appearance-heading"
        >
          <div className="mb-4 flex items-center gap-2 text-text-secondary">
            <Palette className="h-4 w-4 shrink-0" aria-hidden />
            <h2
              id="appearance-heading"
              className="text-sm font-bold uppercase tracking-wider"
            >
              外观
            </h2>
          </div>

          {/* 显示模式 */}
          <p className="mb-2 text-sm text-text-muted" id="display-mode-label">
            显示模式
          </p>
          <div
            className="mb-6"
            role="group"
            aria-labelledby="display-mode-label"
          >
            <ThemeToggleButton />
          </div>

          {/* 主题色 */}
          <p className="mb-2 text-sm text-text-muted" id="theme-color-label">
            主题色
          </p>
          <div
            className="grid grid-cols-3 gap-2 sm:gap-3"
            role="radiogroup"
            aria-labelledby="theme-color-label"
          >
            {darkPresetEntries.map((name) => {
              const cfg = themePresets[name]
              const active = current.name === name && !themeStore.darkMode
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleSetTheme(name)}
                  className={cn(
                    'relative rounded-xl border p-3 text-center transition-[background-color,border-color,box-shadow]',
                    'border-border bg-bg-card/40 hover:border-accent/50 hover:bg-accent/6',
                    active &&
                      'border-accent/60 bg-accent/6 ring-1 ring-accent/30',
                  )}
                >
                  <div
                    className="mb-2 h-9 rounded-lg shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${cfg.primaryStart}, ${cfg.primaryEnd})`,
                    }}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {themeNames[name]}
                  </span>
                  {active && (
                    <span
                      className={cn(
                        'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full',
                        'bg-accent text-white',
                      )}
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 快捷入口 ── */}
        <section
          className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5"
          aria-labelledby="shortcuts-heading"
        >
          <h2
            id="shortcuts-heading"
            className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted"
          >
            快捷入口
          </h2>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/6"
            aria-label="前往个人主页"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card">
              <UserRound className="h-5 w-5 text-text-primary" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold text-text-primary">
              个人主页
            </span>
            <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => navigate('/cert-center')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/6"
            aria-label="前往认证中心"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card">
              <Award className="h-5 w-5 text-text-primary" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold text-text-primary">
              认证中心
            </span>
            <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />
          </button>
        </section>

        {/* ── 退出登录 ── */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-[14px] border px-8 py-4 text-sm font-semibold transition-colors',
            'border-error/30 bg-error/10 text-error hover:bg-error/20',
            'focus-visible:ring-[3px] focus-visible:ring-error/35',
          )}
          aria-label="退出当前账户"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          退出登录
        </button>

        {/* ── 版本 ── */}
        <p className="mt-8 text-center text-sm text-text-muted">
          九木平台 v1.0.0
        </p>
      </div>
    </div>
  )
}
