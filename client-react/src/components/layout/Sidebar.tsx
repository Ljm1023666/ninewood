import { NavLink, useNavigate } from 'react-router-dom'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { Home, FileText, Compass, Users, Search, MessageCircle, User, Sun, Moon, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', icon: Home, label: '发现' },
  { path: '/demands/create', icon: FileText, label: '发布' },
  { path: '/shorts', icon: Compass, label: '探索' },
  { path: '/circles', icon: Users, label: '圈子' },
  { path: '/search', icon: Search, label: '找人' },
  { path: '/messages', icon: MessageCircle, label: '消息' },
  { path: '/profile', icon: User, label: '我的' },
]

export default function Sidebar() {
  const themeStore = useThemeStore()
  const logout = useUserStore((s) => s.logout)
  const unreadCount = useChatStore((s) => s.unreadCount)
  const isDark = themeStore.current.dark
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar flex flex-col items-center py-4 border-r border-border bg-card/50 w-[var(--sidebar-w)] flex-shrink-0 z-10
      max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:h-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom,0px))]
      max-md:flex-row max-md:justify-around max-md:border-r-0 max-md:border-t max-md:py-0 max-md:px-2 max-md:pb-[env(safe-area-inset-bottom,0px)]">

      <div className="sidebar-logo w-11 h-11 flex items-center justify-center cursor-pointer mb-3 max-md:hidden">
        <span className="text-[28px] font-black cyber-glow">N</span>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 max-md:flex-row max-md:flex-1 max-md:justify-around max-md:gap-0">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'nav-item w-12 h-12 flex flex-col items-center justify-center cursor-pointer rounded-lg',
              'transition-all duration-300 text-text-secondary relative',
              'hover:bg-accent/10 hover:text-text-primary',
              'max-md:w-auto max-md:h-full max-md:flex-1 max-md:px-3',
              isActive && 'active bg-accent/15 text-[var(--primary-start)] shadow-[inset_3px_0_0_var(--primary-start)]',
              isActive && 'max-md:shadow-none max-md:border-t-2 max-md:border-[var(--primary-start)]',
            )}
          >
            <div className="relative">
              <item.icon size={20} className="nav-icon relative z-[1] opacity-50 transition-all duration-300" />
              {item.path === '/messages' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center
                  rounded-full bg-red-500 text-[10px] font-bold text-white leading-none z-10">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 max-md:hidden">
        <button
          onClick={() => themeStore.toggleDarkMode()}
          className="nav-item w-12 h-12 flex flex-col items-center justify-center cursor-pointer rounded-lg text-text-secondary hover:bg-accent/10 hover:text-text-primary transition-all duration-300"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-[10px] mt-0.5">主题</span>
        </button>
        <button
          onClick={handleLogout}
          className="nav-item w-12 h-12 flex flex-col items-center justify-center cursor-pointer rounded-lg text-text-secondary hover:bg-accent/10 hover:text-text-primary transition-all duration-300"
        >
          <LogOut size={18} />
          <span className="text-[10px] mt-0.5">注销</span>
        </button>
      </div>
    </aside>
  )
}
