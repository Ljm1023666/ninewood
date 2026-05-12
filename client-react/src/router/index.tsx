import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '@/components/layout/Layout'
import Home from '@/views/Home'
import Profile from '@/views/Profile'
import Settings from '@/views/Settings'
import SplineDemoPage from '@/views/SplineDemo'
import LoginPage from '@/views/Login'

const Messages = lazy(() => import('@/views/Messages'))
const ChatDetail = lazy(() => import('@/views/ChatDetail'))
const Circles = lazy(() => import('@/views/Circles'))
const CircleDetail = lazy(() => import('@/views/CircleDetail'))
const Shorts = lazy(() => import('@/views/Shorts'))
const Search = lazy(() => import('@/views/Search'))
const CertCenter = lazy(() => import('@/views/CertCenter'))
const CertIntro = lazy(() => import('@/views/CertIntro'))
const Orders = lazy(() => import('@/views/Orders'))
const OrderDetail = lazy(() => import('@/views/OrderDetail'))
const Payment = lazy(() => import('@/views/Payment'))
const DemandCreate = lazy(() => import('@/views/DemandCreate'))
const DemandDetail = lazy(() => import('@/views/DemandDetail'))
const MyDemands = lazy(() => import('@/views/MyDemands'))

function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center"><span className="loader" /></div>}>
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

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <p className="text-lg">{title} — 迁移中</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'profile/:id?', element: <Profile /> },
          { path: 'settings', element: <Settings /> },
          { path: 'spline', element: <SplineDemoPage /> },
          { path: 'demands/create', element: <LazyLoad><DemandCreate /></LazyLoad> },
          { path: 'demands/:id', element: <LazyLoad><DemandDetail /></LazyLoad> },
          { path: 'my-demands', element: <LazyLoad><MyDemands /></LazyLoad> },
          { path: 'orders', element: <LazyLoad><Orders /></LazyLoad> },
          { path: 'orders/:id', element: <LazyLoad><OrderDetail /></LazyLoad> },
          { path: 'payment/:id', element: <LazyLoad><Payment /></LazyLoad> },
          { path: 'circles', element: <LazyLoad><Circles /></LazyLoad> },
          { path: 'circles/:id', element: <LazyLoad><CircleDetail /></LazyLoad> },
          { path: 'messages', element: <LazyLoad><Messages /></LazyLoad> },
          { path: 'messages/:userId', element: <LazyLoad><ChatDetail /></LazyLoad> },
          { path: 'shorts', element: <LazyLoad><Shorts /></LazyLoad> },
          { path: 'search', element: <LazyLoad><Search /></LazyLoad> },
          { path: 'cert-center', element: <LazyLoad><CertCenter /></LazyLoad> },
          { path: 'cert-intro', element: <LazyLoad><CertIntro /></LazyLoad> },
        ],
      },
    ],
  },
  { path: '/login', element: <GuestGuard /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
