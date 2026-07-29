import { useLocation, useNavigate } from 'react-router-dom'
import { SegmentedFilter } from '@/components/layout/internal-ui'

const TABS = [
  { key: 'discover', to: '/loops/discover', label: '发现回' },
  { key: 'mine', to: '/loops/mine', label: '我的回' },
  { key: 'accept', to: '/loops/accept', label: '承接人回' },
  { key: 'supply', to: '/loops/supply', label: '上架' },
] as const

type TabKey = (typeof TABS)[number]['key']

function resolveTab(pathname: string): TabKey | '' {
  if (pathname.startsWith('/loops/accept')) return 'accept'
  if (pathname.startsWith('/loops/supply')) return 'supply'
  if (pathname.startsWith('/loops/mine') || pathname.startsWith('/loops/runs')) return 'mine'
  if (pathname.startsWith('/loops/discover')) return 'discover'
  // offerings 详情等：不要伪选中「发现回」，否则再点 Tab 像没反应
  return ''
}

export default function LoopHubNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = resolveTab(pathname)

  return (
    <nav className="loop-hub-nav" aria-label="回中心">
      <SegmentedFilter
        options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        value={(active || ('__none__' as TabKey))}
        onChange={(key) => {
          const tab = TABS.find((t) => t.key === key)
          if (!tab) return
          navigate(tab.to)
        }}
      />
    </nav>
  )
}
