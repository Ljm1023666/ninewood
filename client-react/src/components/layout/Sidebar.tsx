import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import {
  Home,
  Layers,
  FileText,
  Users,
  Search,
  MessageCircle,
  User,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeCurtain } from '@/components/ui/theme-toggle'
import { presets } from '@/stores/theme'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const NAV_TOP = [
  { path: '/', icon: Home, label: '发现' },
  { path: '/card-pool', icon: Layers, label: '卡池' },
  { path: '/demands/create', icon: FileText, label: '发布' },
  { path: '/circles', icon: Users, label: '圈子' },
]

const NAV_BOTTOM = [
  { path: '/search', icon: Search, label: '找人' },
  { path: '/messages', icon: MessageCircle, label: '消息' },
  { path: '/profile', icon: User, label: '我的' },
]

export default function Sidebar() {
  const logout = useUserStore((s) => s.logout)
  const unreadCount = useChatStore((s) => s.unreadCount)
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const isDark = useThemeStore((s) => s.current.dark)
  const lastDarkPreset = useThemeStore((s) => s.lastDarkPreset)
  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode)
  const { triggerCurtain, curtainElement } = useThemeCurtain()

  function handleThemeToggle() {
    const destBg = isDark
      ? presets.light.bgPrimary
      : presets[lastDarkPreset]?.bgPrimary ||
        presets['amber-stream']?.bgPrimary ||
        '#0a0a1a'
    triggerCurtain(destBg, toggleDarkMode)
  }

  function doLogout() {
    setConfirmLogout(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {curtainElement}
      <aside className="sidebar sidebar-ct-accent z-10 flex w-[var(--sidebar-w)] shrink-0 flex-col items-center border-r border-border py-5">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 flex size-12 items-center justify-center rounded-xl bg-[var(--accent-ghost)] transition-colors hover:bg-[var(--accent-muted)]"
          aria-label="九木首页"
        >
          <span className="text-[26px] font-black tracking-tight text-[var(--accent-color)]">
            N
          </span>
        </button>

        {/* 主导航上组 */}
        <nav
          className="flex w-full flex-col items-center gap-1.5"
          aria-label="主导航"
        >
          {NAV_TOP.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              unreadCount={item.path === '/messages' ? unreadCount : undefined}
            />
          ))}
        </nav>

        {/* 分隔 */}
        <div className="my-3 h-px w-8 bg-[var(--bg-tertiary)]" />

        {/* 主导航下组 */}
        <nav
          className="flex w-full flex-col items-center gap-1.5"
          aria-label="次级导航"
        >
          {NAV_BOTTOM.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              unreadCount={item.path === '/messages' ? unreadCount : undefined}
            />
          ))}
        </nav>

        {/* 底部操作 */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="flex size-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--accent-ghost)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            aria-label={isDark ? '切换亮色模式' : '切换暗色模式'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-[10px] font-medium leading-none">主题</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="flex size-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-[var(--text-muted)] transition-all duration-200 hover:bg-[var(--error-color)]/10 hover:text-[var(--error-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
            aria-label="注销"
          >
            <LogOut size={18} />
            <span className="text-[10px] font-medium leading-none">注销</span>
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

/** 单个导航项：图标在上，标签在下。激活态用底部 pill 指示器替代侧边描条 */
function NavItem({
  path,
  icon: Icon,
  label,
  unreadCount,
}: {
  path: string
  icon: typeof Home
  label: string
  unreadCount?: number
}) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'group relative flex size-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl',
          'text-[var(--text-secondary)] transition-all duration-200',
          'hover:bg-[var(--accent-ghost)] hover:text-[var(--text-secondary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
          isActive && 'text-[var(--accent-color)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <Icon
              size={20}
              className={cn(
                'transition-all duration-200 ease-out',
                'group-hover:scale-110',
                isActive ? 'opacity-100' : 'opacity-55',
              )}
            />
            {unreadCount !== undefined && unreadCount > 0 && (
              <span className="absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--error-color)] px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span
            className={cn(
              'text-[10px] font-medium leading-none transition-all duration-200',
              isActive && 'font-semibold',
            )}
          >
            {label}
          </span>
          {/* 激活态底部 pill 指示器（替代侧边描条——违反绝对禁令） */}
          {isActive && (
            <span className="absolute bottom-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-[var(--accent-color)]" />
          )}
        </>
      )}
    </NavLink>
  )
}
