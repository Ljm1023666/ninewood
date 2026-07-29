import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { migrateLegacyLoopUrl } from '@/router/loop-route-migration'
import LoopHubNav from './LoopHubNav'
import LoopDiscoverPage from './LoopDiscoverPage'
import MyLoopsPage from './MyLoopsPage'
import LoopAcceptPage from './LoopAcceptPage'
import LoopSupplyPage from './LoopSupplyPage'
import LoopOfferingDetailPage from './LoopOfferingDetailPage'
import LoopRunDetailPage from './LoopRunDetailPage'

function LegacyLoopRedirect() {
  const location = useLocation()
  return <Navigate to={migrateLegacyLoopUrl(location.pathname, location.search)} replace />
}

/**
 * 回中心持久壳：顶栏不重挂；子页同 chunk 静态导入。
 * 软跳转只换 Routes，不再经 Suspense/startTransition 假导航。
 */
export default function LoopHubLayout() {
  const { pathname } = useLocation()
  const acceptMode = pathname.startsWith('/loops/accept')

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
        <Routes>
          <Route index element={<LegacyLoopRedirect />} />
          <Route path="discover" element={<LoopDiscoverPage />} />
          <Route path="mine" element={<MyLoopsPage />} />
          <Route path="accept" element={<LoopAcceptPage />} />
          <Route path="supply" element={<LoopSupplyPage />} />
          <Route path="offerings/:id" element={<LoopOfferingDetailPage />} />
          <Route path="runs/:id" element={<LoopRunDetailPage />} />
          <Route path="*" element={<LegacyLoopRedirect />} />
        </Routes>
      </div>
    </div>
  )
}
