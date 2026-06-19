import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '@/components/layout/Layout'
import Home from '@/views/Home'
import Profile from '@/views/Profile'
import Settings from '@/views/Settings'
import LoginPage from '@/views/Login'

const MessagesLayout = lazy(() => import('@/views/MessagesLayout'))
const ChatDetail = lazy(() => import('@/views/ChatDetail'))
const MessagesIndexPlaceholder = lazy(
  () => import('@/views/MessagesIndexPlaceholder'),
)
const Circles = lazy(() => import('@/views/Circles'))
const CircleDetail = lazy(() => import('@/views/CircleDetail'))
const Search = lazy(() => import('@/views/Search'))
const CertCenter = lazy(() => import('@/views/CertCenter'))
const CertIntro = lazy(() => import('@/views/CertIntro'))
const Orders = lazy(() => import('@/views/Orders'))
const OrderDetail = lazy(() => import('@/views/OrderDetail'))
const Payment = lazy(() => import('@/views/Payment'))
const DemandCreate = lazy(() => import('@/views/DemandCreate'))
const DemandDetail = lazy(() => import('@/views/DemandDetail'))
const MyDemands = lazy(() => import('@/views/MyDemands'))
const Discover = lazy(() => import('@/views/Discover'))
const Help = lazy(() => import('@/views/Help'))
const NewGroupChat = lazy(() => import('@/views/NewGroupChat'))
const CardPool = lazy(() => import('@/views/CardPool'))
const CardPoolResourceExplorer = lazy(
  () => import('@/views/CardPoolResourceExplorer'),
)
const NotFound = lazy(() => import('@/views/NotFound'))
const Follows = lazy(() => import('@/views/Follows'))

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
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

function GuestGuard() {
  const token = localStorage.getItem('token')
  if (token) return <Navigate to="/" replace />
  return <LoginPage />
}

export const router = createBrowserRouter([
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          {
            path: 'card-pool/explorer',
            element: (
              <LazyLoad>
                <CardPoolResourceExplorer />
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
            path: 'discover',
            element: (
              <LazyLoad>
                <Discover />
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
            path: 'circles',
            element: (
              <LazyLoad>
                <Circles />
              </LazyLoad>
            ),
          },
          {
            path: 'circles/:id',
            element: (
              <LazyLoad>
                <CircleDetail />
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
            path: 'help',
            element: (
              <LazyLoad>
                <Help />
              </LazyLoad>
            ),
          },
        ],
      },
    ],
  },
  { path: '/login', element: <GuestGuard /> },
  {
    path: '*',
    element: (
      <LazyLoad>
        <NotFound />
      </LazyLoad>
    ),
  },
])
