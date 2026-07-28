import { useLocation, useNavigate } from 'react-router-dom'
import { SegmentedFilter } from '@/components/layout/internal-ui'

const TABS = [
  { key: 'discover', to: '/loops/discover', label: '发现回' },
  { key: 'mine', to: '/loops/mine', label: '我的回' },
  { key: 'accept', to: '/loops/accept', label: '承接人回' },
] as const

type TabKey = (typeof TABS)[number]['key']

function resolveTab(pathname: string): TabKey {
  if (pathname.startsWith('/loops/accept')) return 'accept'
  if (pathname.startsWith('/loops/mine') || pathname.startsWith('/loops/runs')) return 'mine'
  return 'discover'
}

export default function LoopHubNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = resolveTab(pathname)

  return (
    <nav className="loop-hub-nav" aria-label="回中心">
      <SegmentedFilter
        options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        value={active}
        onChange={(key) => {
          const tab = TABS.find((t) => t.key === key)
          if (!tab) return
          // 预取目标页 chunk
          if (key === 'discover') void import('./LoopDiscoverPage')
          if (key === 'mine') void import('./MyLoopsPage')
          if (key === 'accept') void import('./LoopAcceptPage')
          navigate(tab.to)
        }}
      />
    </nav>
  )
}
