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
 * 根节点 class 保持稳定，避免切到「发现回」时整壳重排导致导航滑块错位。
 * 承接页的铺满滚动改由 outlet 包裹层承担。
 */
export default function LoopHubLayout() {
  const { pathname } = useLocation()
  const acceptMode = pathname.startsWith('/loops/accept')

  useEffect(() => {
    prefetchLoopHubPages()
  }, [])

  return (
    <div className="loop-hub-page loop-hub-page--hub">
      <LoopHubNav />
      <div
        className={
          acceptMode
            ? 'loop-hub-outlet loop-hub-outlet--accept'
            : 'loop-hub-outlet'
        }
      >
        <Outlet />
      </div>
    </div>
  )
}
