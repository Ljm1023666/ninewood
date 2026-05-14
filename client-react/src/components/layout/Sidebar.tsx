import { NavLink, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import {
  Home,
  Layers,
  FileText,
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
  { path: '/card-pool', icon: Layers, label: '卡池' },
  { path: '/demands/create', icon: FileText, label: '发布' },
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
    <aside className="sidebar sidebar-ct-accent z-10 flex w-[var(--sidebar-w)] flex-shrink-0 flex-col items-center border-r border-border py-4">
      <div className="sidebar-logo mb-3 flex h-11 w-11 cursor-pointer items-center justify-center">
        <span className="text-[28px] font-black cyber-glow">N</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5" aria-label="主导航">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'nav-item relative flex h-12 w-12 cursor-pointer flex-col items-center justify-center rounded-lg',
                'text-text-secondary transition-[color,background-color] duration-200 ease-out',
                'hover:bg-accent/10 hover:text-text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive &&
                  'active bg-accent/15 text-[var(--primary-start)] shadow-[inset_3px_0_0_var(--primary-start)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon
                    size={20}
                    className={cn(
                      'nav-icon relative z-[1] transition-[opacity,color] duration-200 ease-out',
                      isActive ? 'opacity-100' : 'opacity-50',
                    )}
                  />
                  {item.path === '/messages' && unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold leading-none text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-0.5 text-[10px] transition-[font-weight,color] duration-200',
                    isActive && 'font-semibold',
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <ThemeToggleButton />
        <button
          type="button"
          onClick={handleLogout}
          className="nav-item flex h-12 w-12 cursor-pointer flex-col items-center justify-center rounded-lg text-text-secondary transition-[color,background-color] duration-200 ease-out hover:bg-accent/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LogOut size={18} />
          <span className="text-[10px] mt-0.5">注销</span>
        </button>
      </div>
    </aside>
  )
}
