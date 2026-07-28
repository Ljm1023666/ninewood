import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import {
  useShellStore,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  isImmersivePath,
} from '@/stores/shell'
import {
  Layers,
  FileText,
  Users,
  Search,
  MessageCircle,
  User,
  LogOut,
  HelpCircle,
  Orbit,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeCurtain } from '@/components/ui/theme-toggle'
import { presets } from '@/stores/theme'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AnimatedThemeToggle } from '@/components/ui/animated-theme-toggle'

type NavTone =
  | 'assistant'
  | 'publish'
  | 'loop'
  | 'message'
  | 'default'

/** 对齐 macOS MainShellView：助手置顶 → 主区 → 协作 → 账户；已登录 Logo 进卡池 */
const NAV_ASSISTANT: {
  path: string
  icon: LucideIcon
  label: string
  tone: NavTone
}[] = [{ path: '/agent', icon: Sparkles, label: '助手', tone: 'assistant' }]

const NAV_MAIN: {
  path: string
  icon: LucideIcon
  label: string
  tone: NavTone
}[] = [
  { path: '/card-pool', icon: Layers, label: '卡池', tone: 'default' },
  { path: '/publish', icon: FileText, label: '发布', tone: 'publish' },
  { path: '/circles', icon: Users, label: '圈子', tone: 'default' },
  { path: '/discussions', icon: MessagesSquare, label: '讨论', tone: 'default' },
  { path: '/loops', icon: Orbit, label: '回', tone: 'loop' },
]

const NAV_COLLAB: {
  path: string
  icon: LucideIcon
  label: string
  tone: NavTone
}[] = [
  { path: '/search', icon: Search, label: '找人', tone: 'default' },
  { path: '/messages', icon: MessageCircle, label: '消息', tone: 'message' },
]

const NAV_ACCOUNT: {
  path: string
  icon: LucideIcon
  label: string
  tone: NavTone
}[] = [
  { path: '/help', icon: HelpCircle, label: '帮助', tone: 'default' },
  { path: '/profile', icon: User, label: '我的', tone: 'default' },
]

const TONE_VAR: Record<NavTone, string | undefined> = {
  assistant: 'var(--nav-tone-assistant)',
  publish: 'var(--nav-tone-publish)',
  loop: 'var(--nav-tone-loop)',
  message: 'var(--nav-tone-message)',
  default: undefined,
}

export default function Sidebar() {
  const logout = useUserStore((s) => s.logout)
  const user = useUserStore((s) => s.user)
  const unreadCount = useChatStore((s) => s.unreadCount)
  const navigate = useNavigate()
  const location = useLocation()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [hover, setHover] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sidebarPinned = useShellStore((s) => s.sidebarPinned)
  const immersiveStowed = useShellStore((s) => s.immersiveStowed)
  const toggleSidebarPin = useShellStore((s) => s.toggleSidebarPin)
  const setImmersiveStowed = useShellStore((s) => s.setImmersiveStowed)
  const clearImmersiveStow = useShellStore((s) => s.clearImmersiveStow)

  const isDark = useThemeStore((s) => s.current.dark)
  const lastDarkPreset = useThemeStore((s) => s.lastDarkPreset)
  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode)
  const { triggerCurtain, curtainElement } = useThemeCurtain()

  const immersive = isImmersivePath(location.pathname)

  useEffect(() => {
    if (immersive) setImmersiveStowed(true)
    else clearImmersiveStow()
  }, [immersive, setImmersiveStowed, clearImmersiveStow])

  const expanded = hover || (sidebarPinned && !immersiveStowed)

  useEffect(() => {
    const w = expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED
    document.documentElement.style.setProperty('--sidebar-w', `${w}px`)
    return () => {
      document.documentElement.style.setProperty(
        '--sidebar-w',
        `${SIDEBAR_WIDTH_COLLAPSED}px`,
      )
    }
  }, [expanded])

  function expandSidebar() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setHover(true)
  }

  function scheduleCollapse() {
    if (sidebarPinned && !immersiveStowed) return
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setHover(false), 180)
  }

  function handleThemeToggle() {
    const destBg = isDark
      ? presets.light.bgPrimary
      : presets[lastDarkPreset]?.bgPrimary ||
        presets['morning-mist']?.bgPrimary ||
        '#0a0a1a'
    triggerCurtain(destBg, toggleDarkMode)
  }

  function doLogout() {
    setConfirmLogout(false)
    logout()
    navigate('/login', { replace: true })
  }

  const pinActive = sidebarPinned && !immersiveStowed

  return (
    <>
      {curtainElement}
      <aside
        className={cn(
          'app-sidebar sidebar sidebar-ct-accent liquid-glass-surface relative z-10 flex shrink-0 flex-col items-stretch border-r-0 py-3',
          expanded && 'app-sidebar--expanded',
        )}
        onMouseEnter={expandSidebar}
        onMouseLeave={scheduleCollapse}
      >
        {/* Logo：图标槽固定，品牌名只在右侧淡入 */}
        <button
          type="button"
          onClick={() => navigate(user ? '/card-pool' : '/')}
          className="app-sidebar__row mb-3 flex h-11 w-full shrink-0 items-center rounded-lg bg-[var(--accent-ghost)] transition-colors hover:bg-[var(--accent-muted)]"
          aria-label={user ? '卡池工作台' : '九木首页'}
        >
          <span className="app-sidebar__icon-slot flex shrink-0 items-center justify-center">
            <span className="text-[22px] font-black tracking-tight text-[var(--accent-color)]">
              N
            </span>
          </span>
          <span className="app-sidebar__side-label text-[13px] font-semibold text-[var(--text-primary)]">
            九木
          </span>
        </button>

        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden">
          <nav className="flex w-full flex-col gap-0.5" aria-label="助手">
            {NAV_ASSISTANT.map((item) => (
              <NavItem key={item.path} {...item} expanded={expanded} />
            ))}
          </nav>

          <div className="app-sidebar__divider my-2 h-px bg-[var(--bg-tertiary)]" />

          <nav className="flex w-full flex-col gap-0.5" aria-label="主区">
            {NAV_MAIN.map((item) => (
              <NavItem key={item.path} {...item} expanded={expanded} />
            ))}
          </nav>

          <div className="app-sidebar__divider my-2 h-px bg-[var(--bg-tertiary)]" />

          <nav className="flex w-full flex-col gap-0.5" aria-label="协作">
            {NAV_COLLAB.map((item) => (
              <NavItem
                key={item.path}
                {...item}
                expanded={expanded}
                unreadCount={
                  item.path === '/messages' ? unreadCount : undefined
                }
              />
            ))}
          </nav>

          <div className="app-sidebar__divider my-2 h-px bg-[var(--bg-tertiary)]" />

          <nav className="flex w-full flex-col gap-0.5" aria-label="账户">
            {NAV_ACCOUNT.map((item) => (
              <NavItem key={item.path} {...item} expanded={expanded} />
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 flex-col gap-0.5 pt-1">
          <button
            type="button"
            onClick={toggleSidebarPin}
            className={cn(
              'app-sidebar__row group relative flex h-11 w-full items-center rounded-lg text-left text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--accent-ghost)] hover:text-[var(--text-secondary)]',
              pinActive && 'bg-[var(--accent-ghost)] text-[var(--accent-color)]',
            )}
            title={pinActive ? '取消固定侧栏' : '固定侧栏'}
            aria-label={pinActive ? '取消固定侧栏' : '固定侧栏'}
            aria-pressed={pinActive}
          >
            <span className="app-sidebar__icon-slot relative flex shrink-0 flex-col items-center justify-center gap-0.5">
              {pinActive ? (
                <PanelLeftClose className="size-5" />
              ) : (
                <PanelLeftOpen className="size-5" />
              )}
              <span
                className="app-sidebar__stack-label text-[11px] font-medium leading-none"
                aria-hidden={expanded}
              >
                {pinActive ? '取消' : '固定'}
              </span>
            </span>
            <span
              className="app-sidebar__side-label text-[12px] font-medium"
              aria-hidden={!expanded}
            >
              {pinActive ? '取消固定' : '固定侧栏'}
            </span>
          </button>

          <div className="app-sidebar__row flex h-11 w-full items-center text-left">
            <span className="app-sidebar__icon-slot flex shrink-0 flex-col items-center justify-center gap-0.5">
              <AnimatedThemeToggle
                isDark={isDark}
                onToggle={handleThemeToggle}
                className="size-5 shrink-0 p-0"
              />
              <span
                className="app-sidebar__stack-label text-[11px] font-medium leading-none text-[var(--text-muted)]"
                aria-hidden={expanded}
              >
                主题
              </span>
            </span>
            <span
              className="app-sidebar__side-label text-[12px] font-medium text-[var(--text-muted)]"
              aria-hidden={!expanded}
            >
              主题
            </span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="app-sidebar__row flex h-11 w-full cursor-pointer items-center rounded-lg text-left text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--error-color)]/10 hover:text-[var(--error-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            aria-label="注销"
          >
            <span className="app-sidebar__icon-slot flex shrink-0 flex-col items-center justify-center gap-0.5">
              <LogOut className="size-5" />
              <span
                className="app-sidebar__stack-label text-[11px] font-medium leading-none"
                aria-hidden={expanded}
              >
                注销
              </span>
            </span>
            <span
              className="app-sidebar__side-label text-[12px] font-medium"
              aria-hidden={!expanded}
            >
              注销
            </span>
          </button>
        </div>

        <ConfirmDialog
          open={confirmLogout}
          title="退出登录"
          message="退出后需要重新登录才能继续使用。确认要退出当前账号吗？"
          confirmLabel="退出登录"
          onConfirm={doLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      </aside>
    </>
  )
}

function NavItem({
  path,
  icon: Icon,
  label,
  tone = 'default',
  unreadCount,
  expanded = false,
}: {
  path: string
  icon: LucideIcon
  label: string
  tone?: NavTone
  unreadCount?: number
  expanded?: boolean
}) {
  const toneColor = TONE_VAR[tone]

  return (
    <NavLink
      to={path}
      end={path === '/'}
      title={label}
      className={({ isActive }) =>
        cn(
          'app-sidebar__row group relative flex h-11 w-full items-center rounded-lg',
          'text-[var(--text-secondary)] transition-[color,background-color,box-shadow] duration-200',
          'hover:bg-[var(--liquid-glass-chip-bg-hover)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
          isActive &&
            'bg-[var(--liquid-glass-chip-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]',
        )
      }
      style={({ isActive }) =>
        isActive && toneColor
          ? { color: toneColor }
          : isActive
            ? { color: 'var(--accent-color)' }
            : undefined
      }
    >
      {({ isActive }) => (
        <>
          <span className="app-sidebar__icon-slot relative flex shrink-0 flex-col items-center justify-center gap-0.5">
            <span className="relative">
              <Icon
                className={cn(
                  'size-5 transition-transform duration-200 ease-out group-hover:scale-110',
                  isActive ? 'opacity-100' : 'opacity-70',
                )}
              />
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--error-color)] px-0.5 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span
              className={cn(
                'app-sidebar__stack-label text-[11px] font-medium leading-none',
                isActive && 'font-semibold',
              )}
              aria-hidden={expanded}
            >
              {label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full"
                style={{ background: toneColor || 'var(--accent-color)' }}
              />
            )}
          </span>
          <span
            className={cn(
              'app-sidebar__side-label text-[12px] font-medium leading-none',
              isActive && 'font-semibold',
            )}
            aria-hidden={!expanded}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}
