import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: '首页', to: '/' },
  { label: '发现', to: '/' },
  { label: '圈子', to: '/circles' },
] as const

export function LoginMiniNavbar({
  isLogin,
  onToggleMode,
}: {
  isLogin: boolean
  onToggleMode: (login: boolean) => void
}) {
  return (
    <nav className="fixed top-0 left-1/2 z-50 flex w-fit -translate-x-1/2 items-center gap-6 rounded-full border border-white/10 bg-white/[0.03] px-6 py-2.5 shadow-xl backdrop-blur-xl mt-6">
      <div className="text-sm font-bold tracking-widest text-[#abc7ff]">· · ·</div>

      <div className="flex items-center gap-4">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className="rounded-full px-3 py-1.5 text-sm text-white/60 transition-[color,background-color] duration-200 hover:bg-white/10 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleMode(true)}
          className={cn(
            'px-4 py-1.5 text-sm transition-[color,background-color] duration-200',
            isLogin
              ? 'border-b-2 border-[#3388FF] font-bold text-[#3388FF]'
              : 'rounded-full text-white/60 hover:bg-white/10 hover:text-white',
          )}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => onToggleMode(false)}
          className={cn(
            'px-4 py-1.5 text-sm transition-[color,background-color] duration-200',
            !isLogin
              ? 'rounded-full bg-[#3388FF]/10 font-bold text-[#3388FF]'
              : 'rounded-full text-white/60 hover:bg-white/10 hover:text-white',
          )}
        >
          注册
        </button>
      </div>
    </nav>
  )
}
