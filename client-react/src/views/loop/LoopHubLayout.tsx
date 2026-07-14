import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import LoopHubNav from './LoopHubNav'

/** 预取三页 chunk，避免初次点 Tab 时 Suspense 整页闪一下 */
function prefetchLoopHubPages() {
  void import('./LoopDiscoverPage')
  void import('./MyLoopsPage')
  void import('./LoopAcceptPage')
}

/**
 * 回中心持久壳：顶栏不重挂；子页经 Outlet 切换。
 * 承接页需要铺满滚动容器，由路径开关 scroll-fill。
 */
export default function LoopHubLayout() {
  const { pathname } = useLocation()
  const acceptMode = pathname.startsWith('/loops/accept')

  useEffect(() => {
    prefetchLoopHubPages()
  }, [])

  return (
    <div
      className={
        acceptMode
          ? 'loop-hub-page loop-hub-page--scroll-fill'
          : 'loop-hub-page loop-hub-page--hub'
      }
    >
      <LoopHubNav />
      <Outlet />
    </div>
  )
}
