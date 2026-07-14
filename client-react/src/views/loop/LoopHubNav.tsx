import { NavLink, useLocation } from 'react-router-dom'
import { Compass, Handshake, Orbit } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'discover', to: '/loops/discover', label: '发现回', icon: Compass },
  { key: 'mine', to: '/loops/mine', label: '我的回', icon: Orbit },
  { key: 'accept', to: '/loops/accept', label: '承接人回', icon: Handshake },
] as const

type TabKey = (typeof TABS)[number]['key']

function resolveTab(pathname: string): TabKey {
  if (pathname.startsWith('/loops/accept')) return 'accept'
  if (pathname.startsWith('/loops/mine') || pathname.startsWith('/loops/runs')) return 'mine'
  return 'discover'
}

export default function LoopHubNav() {
  const { pathname } = useLocation()
  const active = resolveTab(pathname)

  return (
    <nav className="loop-hub-nav" aria-label="回中心">
      <div
        className={cn('loop-hub-tabs', `is-${active}`)}
        role="tablist"
        aria-label="回视图"
      >
        {TABS.map(({ key, to, label, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            role="tab"
            aria-selected={active === key}
            className={() => cn(active === key && 'is-active')}
            onMouseEnter={() => {
              if (key === 'discover') void import('./LoopDiscoverPage')
              if (key === 'mine') void import('./MyLoopsPage')
              if (key === 'accept') void import('./LoopAcceptPage')
            }}
          >
            <Icon size={16} aria-hidden />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
