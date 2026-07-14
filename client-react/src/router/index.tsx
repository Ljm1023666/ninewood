import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '@/components/layout/Layout'
import { BentoAppShell } from '@/components/layout/BentoAppShell'
import Profile from '@/views/Profile'
import Settings from '@/views/Settings'
import LoginPage from '@/views/Login'
import { useUserStore } from '@/stores/user'
import { migrateLegacyLoopUrl } from './loop-route-migration'

const MessagesLayout = lazy(() => import('@/views/MessagesLayout'))
const ChatDetail = lazy(() => import('@/views/ChatDetail'))
const MessagesIndexPlaceholder = lazy(
  () => import('@/views/MessagesIndexPlaceholder'),
)
const Circles = lazy(() => import('@/views/Circles'))
const CircleHubLayout = lazy(() => import('@/views/circle-hub/CircleHubLayout'))
const CircleHubHome = lazy(() => import('@/views/circle-hub/CircleHubHome'))
const CircleHubCommunity = lazy(() => import('@/views/circle-hub/CircleHubCommunity'))
const CircleHubResources = lazy(() => import('@/views/circle-hub/CircleHubResources'))
const CircleHubAnalytics = lazy(() => import('@/views/circle-hub/CircleHubAnalytics'))
const CircleHubTeams = lazy(() => import('@/views/circle-hub/CircleHubTeams'))
const CircleHubHelp = lazy(() => import('@/views/circle-hub/CircleHubHelp'))
const Search = lazy(() => import('@/views/Search'))
const CertCenter = lazy(() => import('@/views/CertCenter'))
const CertIntro = lazy(() => import('@/views/CertIntro'))
const Orders = lazy(() => import('@/views/Orders'))
const OrderDetail = lazy(() => import('@/views/OrderDetail'))
const Payment = lazy(() => import('@/views/Payment'))
const DemandCreate = lazy(() => import('@/views/DemandCreate'))
const PublishPage = lazy(() => import('@/views/PublishPage'))
const ServiceCardCreate = lazy(() => import('@/views/ServiceCardCreate'))
const ServiceCardsPage = lazy(() => import('@/views/ServiceCardsPage'))
const ServiceCardDetail = lazy(() => import('@/views/ServiceCardDetail'))
const DemandDetail = lazy(() => import('@/views/DemandDetail'))
const MyDemands = lazy(() => import('@/views/MyDemands'))
const Discover = lazy(() => import('@/views/Discover'))
const Providers = lazy(() => import('@/views/Providers'))
const UserTagsManage = lazy(() => import('@/views/UserTagsManage'))
const PushSettings = lazy(() => import('@/views/PushSettings'))
const WelfareCenter = lazy(() => import('@/views/WelfareCenter'))
const TransactionHistory = lazy(() => import('@/views/TransactionHistory'))
const Wallet = lazy(() => import('@/views/Wallet'))
const CircleList = lazy(() => import('@/views/CircleList'))
const TagStatsDashboard = lazy(() => import('@/views/TagStatsDashboard'))
const CertifiedSearch = lazy(() => import('@/views/CertifiedSearch'))
const MyBids = lazy(() => import('@/views/MyBids'))
const Help = lazy(() => import('@/views/Help'))
const HelpDocs = lazy(() => import('@/views/HelpDocs'))
const AgentChat = lazy(() => import('@/views/AgentChat'))
const AgentTasksPage = lazy(() => import('@/views/agent/AgentTasksPage'))
const Privacy = lazy(() => import('@/views/Privacy'))
const Terms = lazy(() => import('@/views/Terms'))
const Licenses = lazy(() => import('@/views/Licenses'))
const MyData = lazy(() => import('@/views/MyData'))
const NewGroupChat = lazy(() => import('@/views/NewGroupChat'))
const CardPool = lazy(() => import('@/views/CardPool'))
const CardPoolResourceExplorer = lazy(
  () => import('@/views/CardPoolResourceExplorer'),
)
const DeadPool = lazy(() => import('@/views/DeadPool'))
const MyTags = lazy(() => import('@/views/MyTags'))
const FiltersPreview = lazy(() => import('@/views/FiltersPreview'))
const TaxVisualizerPage = lazy(() => import('@/views/tax-visualizer/TaxVisualizerPage'))
const PublishPathsPage = lazy(() => import('@/views/demand-paths/PublishPathsPage'))
const DemandPathsPage = lazy(() => import('@/views/demand-paths/DemandPathsPage'))
const NotFound = lazy(() => import('@/views/NotFound'))
const Follows = lazy(() => import('@/views/Follows'))
const Dashboard = lazy(() => import('@/views/Dashboard'))
const LoopOfferingDetailPage = lazy(() => import('@/views/loop/LoopOfferingRoutePage'))
const MyLoopsPage = lazy(() => import('@/views/loop/MyLoopsPage'))
const LoopDiscoverPage = lazy(() => import('@/views/loop/LoopDiscoverPage'))
const LoopAcceptPage = lazy(() => import('@/views/loop/LoopAcceptPage'))
const LoopRunDetailPage = lazy(() => import('@/views/loop/LoopRunDetailPage'))

function LegacyLoopRedirect() {
  const location = useLocation()
  return <Navigate to={migrateLegacyLoopUrl(location.pathname, location.search)} replace />
}

function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
          <span className="loader" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function AuthGuard() {
  const ready = useUserStore((s) => s.ready)
  const user = useUserStore((s) => s.user)
  if (!ready) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <span className="loader" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function GuestGuard() {
  const ready = useUserStore((s) => s.ready)
  const user = useUserStore((s) => s.user)
  if (!ready) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <span className="loader" />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />
  return <LoginPage />
}

export const router = createBrowserRouter([
  /* 闂佸啿鍘滈崑鎾绘煃閸忓浜?婵☆偓绲鹃悧鐘诲Υ婢舵劖鏅柛顐ｇ箓缁叉椽鏌ｅ鈧崡鎶藉Υ婢舵劖鏅悘鐐舵瑜板棛鈧鍠掗崑鎾绘偣娴ｅ憡鍋ユ俊顐㈢埣閺?闂佸啿鍘滈崑鎾绘煃閸忓浜?*/
  {
    path: '/',
    element: (
      <LazyLoad>
        <Discover />
      </LazyLoad>
    ),
  },
  /* 闂佸啿鍘滈崑鎾绘煃閸忓浜?闂傚倸娲犻崑鎾绘偡閺囨俺鍏屾繛鍛劥閵囨劙寮撮悩宕囨殸闁荤姳璀﹂崹鎶藉极?闂佸啿鍘滈崑鎾绘煃閸忓浜?*/
  {
    element: <AuthGuard />,
    children: [
      {
        path: 'dashboard',
        element: (
          <LazyLoad>
            <Dashboard />
          </LazyLoad>
        ),
      },
      {
        /* 圈子详情：唯一带 Stitch 侧栏 + Bento 背景的页面 */
        element: <BentoAppShell />,
        children: [
          {
            path: 'circles/:id',
            element: (
              <LazyLoad>
                <CircleHubLayout />
              </LazyLoad>
            ),
            children: [
              { index: true, element: <Navigate to="community" replace /> },
              {
                path: 'home',
                element: (
                  <LazyLoad>
                    <CircleHubHome />
                  </LazyLoad>
                ),
              },
              {
                path: 'community',
                element: (
                  <LazyLoad>
                    <CircleHubCommunity />
                  </LazyLoad>
                ),
              },
              {
                path: 'resources',
                element: (
                  <LazyLoad>
                    <CircleHubResources />
                  </LazyLoad>
                ),
              },
              {
                path: 'analytics',
                element: (
                  <LazyLoad>
                    <CircleHubAnalytics />
                  </LazyLoad>
                ),
              },
              {
                path: 'teams',
                element: (
                  <LazyLoad>
                    <CircleHubTeams />
                  </LazyLoad>
                ),
              },
              {
                path: 'help',
                element: (
                  <LazyLoad>
                    <CircleHubHelp />
                  </LazyLoad>
                ),
              },
            ],
          },
        ],
      },
      {
        element: <Layout />,
        children: [
          {
            path: 'cert-center',
            element: (
              <LazyLoad>
                <CertCenter />
              </LazyLoad>
            ),
          },
          {
            path: 'cert-intro',
            element: (
              <LazyLoad>
                <CertIntro />
              </LazyLoad>
            ),
          },
          {
            path: 'discover',
            element: <Navigate to="/" replace />,
          },
          {
            path: 'card-pool/explorer',
            element: (
              <LazyLoad>
                <CardPoolResourceExplorer />
              </LazyLoad>
            ),
          },
          {
            path: 'card-pool/dead',
            element: (
              <LazyLoad>
                <DeadPool />
              </LazyLoad>
            ),
          },
          {
            path: 'card-pool',
            element: (
              <LazyLoad>
                <CardPool />
              </LazyLoad>
            ),
          },
          {
            path: 'tag-stats',
            element: (
              <LazyLoad>
                <TagStatsDashboard />
              </LazyLoad>
            ),
          },
          {
            path: 'circles-list',
            element: (
              <LazyLoad>
                <CircleList />
              </LazyLoad>
            ),
          },
          {
            path: 'circles',
            element: (
              <LazyLoad>
                <Circles />
              </LazyLoad>
            ),
          },
          {
            path: 'help/docs',
            element: (
              <LazyLoad>
                <HelpDocs />
              </LazyLoad>
            ),
          },
          {
            path: 'help',
            element: (
              <LazyLoad>
                <Help />
              </LazyLoad>
            ),
          },
          { path: 'profile/:id?', element: <Profile /> },
          {
            path: 'follows/:userId',
            element: (
              <LazyLoad>
                <Follows />
              </LazyLoad>
            ),
          },
          { path: 'settings', element: <Settings /> },
          {
            path: 'providers',
            element: (
              <LazyLoad>
                <Providers />
              </LazyLoad>
            ),
          },
          {
            path: 'my-tags-manage',
            element: (
              <LazyLoad>
                <UserTagsManage />
              </LazyLoad>
            ),
          },
          {
            path: 'push-settings',
            element: (
              <LazyLoad>
                <PushSettings />
              </LazyLoad>
            ),
          },
          {
            path: 'welfare',
            element: (
              <LazyLoad>
                <WelfareCenter />
              </LazyLoad>
            ),
          },
          {
            path: 'transactions',
            element: (
              <LazyLoad>
                <TransactionHistory />
              </LazyLoad>
            ),
          },
          {
            path: 'wallet',
            element: (
              <LazyLoad>
                <Wallet />
              </LazyLoad>
            ),
          },
          {
            path: 'discover/certified',
            element: (
              <LazyLoad>
                <CertifiedSearch />
              </LazyLoad>
            ),
          },
          {
            path: 'demands/create/paths',
            element: (
              <LazyLoad>
                <PublishPathsPage />
              </LazyLoad>
            ),
          },
          {
            path: 'publish',
            element: (
              <LazyLoad>
                <PublishPage />
              </LazyLoad>
            ),
          },
          {
            path: 'demands/create',
            element: (
              <LazyLoad>
                <DemandCreate />
              </LazyLoad>
            ),
          },
          {
            path: 'demands/:id/paths',
            element: (
              <LazyLoad>
                <DemandPathsPage />
              </LazyLoad>
            ),
          },
          {
            path: 'demands/:id',
            element: (
              <LazyLoad>
                <DemandDetail />
              </LazyLoad>
            ),
          },
          {
            path: 'my-demands',
            element: (
              <LazyLoad>
                <MyDemands />
              </LazyLoad>
            ),
          },
          {
            path: 'filters-preview',
            element: (
              <LazyLoad>
                <FiltersPreview />
              </LazyLoad>
            ),
          },
          {
            path: 'my-tags',
            element: (
              <LazyLoad>
                <MyTags />
              </LazyLoad>
            ),
          },
          {
            path: 'my-bids',
            element: (
              <LazyLoad>
                <MyBids />
              </LazyLoad>
            ),
          },
          {
            path: 'orders',
            element: (
              <LazyLoad>
                <Orders />
              </LazyLoad>
            ),
          },
          {
            path: 'orders/:id',
            element: (
              <LazyLoad>
                <OrderDetail />
              </LazyLoad>
            ),
          },
          {
            path: 'payment/:id',
            element: (
              <LazyLoad>
                <Payment />
              </LazyLoad>
            ),
          },
          {
            path: 'messages',
            element: (
              <LazyLoad>
                <MessagesLayout />
              </LazyLoad>
            ),
            children: [
              {
                index: true,
                element: (
                  <LazyLoad>
                    <MessagesIndexPlaceholder />
                  </LazyLoad>
                ),
              },
              {
                path: ':userId',
                element: (
                  <LazyLoad>
                    <ChatDetail />
                  </LazyLoad>
                ),
              },
              {
                path: 'merge/:mergeId',
                element: (
                  <LazyLoad>
                    <ChatDetail />
                  </LazyLoad>
                ),
              },
            ],
          },
          {
            path: 'messages/new-group',
            element: (
              <LazyLoad>
                <NewGroupChat />
              </LazyLoad>
            ),
          },
          {
            path: 'search',
            element: (
              <LazyLoad>
                <Search />
              </LazyLoad>
            ),
          },

          {
            path: 'agent',
            element: (
              <LazyLoad>
                <AgentChat />
              </LazyLoad>
            ),
          },
          {
            path: 'agent/tasks',
            element: (
              <LazyLoad>
                <AgentTasksPage />
              </LazyLoad>
            ),
          },
          {
            path: 'agent/:id',
            element: (
              <LazyLoad>
                <AgentChat />
              </LazyLoad>
            ),
          },
          {
            path: 'loops/mine',
            element: (
              <LazyLoad>
                <MyLoopsPage />
              </LazyLoad>
            ),
          },
          {
            path: 'loops/runs/:id',
            element: (
              <LazyLoad>
                <LoopRunDetailPage />
              </LazyLoad>
            ),
          },
          {
            path: 'my-service-cards',
            element: (
              <LazyLoad>
                <ServiceCardsPage />
              </LazyLoad>
            ),
          },
          {
            path: 'service-cards/:id',
            element: (
              <LazyLoad>
                <ServiceCardDetail />
              </LazyLoad>
            ),
          },
          {
            path: 'service-cards/:id/edit',
            element: (
              <LazyLoad>
                <ServiceCardCreate />
              </LazyLoad>
            ),
          },
          {
            path: 'service-cards/create',
            element: (
              <LazyLoad>
                <ServiceCardCreate />
              </LazyLoad>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <GuestGuard />,
  },
  {
    /* 税务可视化:无需登录,但走 Layout 以获得侧栏/页眉/PageTransition 等公共壳层 */
    element: <Layout />,
    children: [
      {
        path: '/tax-visualizer',
        element: (
          <LazyLoad>
            <TaxVisualizerPage />
          </LazyLoad>
        ),
      },
      {
        path: '/path-search',
        element: <LegacyLoopRedirect />,
      },
      {
        path: '/services',
        element: <LegacyLoopRedirect />,
      },
      {
        path: '/services/:id',
        element: <LegacyLoopRedirect />,
      },
      {
        path: '/loops',
        element: <LegacyLoopRedirect />,
      },
      {
        path: '/loops/discover',
        element: <LazyLoad><LoopDiscoverPage /></LazyLoad>,
      },
      {
        path: '/loops/accept',
        element: <LazyLoad><LoopAcceptPage /></LazyLoad>,
      },
      {
        path: '/loops/offerings/:id',
        element: <LazyLoad><LoopOfferingDetailPage /></LazyLoad>,
      },
    ],
  },
  {
    path: '/privacy',
    element: (
      <LazyLoad>
        <Privacy />
      </LazyLoad>
    ),
  },
  {
    path: '/terms',
    element: (
      <LazyLoad>
        <Terms />
      </LazyLoad>
    ),
  },
  {
    path: '/licenses',
    element: (
      <LazyLoad>
        <Licenses />
      </LazyLoad>
    ),
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/settings/data',
        element: (
          <LazyLoad>
            <MyData />
          </LazyLoad>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <LazyLoad>
        <NotFound />
      </LazyLoad>
    ),
  },
])
