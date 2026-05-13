import { NavLink, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import {
  Home,
  FileText,
  Compass,
  Users,
  Search,
  MessageCircle,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggleButton } from '@/components/ui/theme-toggle'

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
  const logout = useUserStore((s) => s.logout)
  const unreadCount = useChatStore((s) => s.unreadCount)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="sidebar z-10 flex w-[var(--sidebar-w)] flex-shrink-0 flex-col items-center border-r border-border bg-card/50 py-4"
    >
      <div className="sidebar-logo mb-3 flex h-11 w-11 cursor-pointer items-center justify-center">
        <span className="text-[28px] font-black cyber-glow">N</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'nav-item relative flex h-12 w-12 cursor-pointer flex-col items-center justify-center rounded-lg',
                'text-text-secondary transition-all duration-300',
                'hover:bg-accent/10 hover:text-text-primary',
                isActive &&
                  'active bg-accent/15 text-[var(--primary-start)] shadow-[inset_3px_0_0_var(--primary-start)]',
              )
            }
          >
            <div className="relative">
              <item.icon
                size={20}
                className="nav-icon relative z-[1] opacity-50 transition-all duration-300"
              />
              {item.path === '/messages' && unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center
                  rounded-full bg-red-500 text-[10px] font-bold text-white leading-none z-10"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <ThemeToggleButton />
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
