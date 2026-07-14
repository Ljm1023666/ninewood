import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 路由级 key 切换容器：路由变化时强制重新挂载子页面
 * 入场动画由各页面自行处理（首页 BackgroundBeams、Profile 封面开场等）
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  // 消息页有自己的持久化左右分栏；切换会话时不能重挂整个壳层。
  // 回中心三 Tab 共用持久壳，key 稳住以免切页整容器闪一下。
  const pageKey = location.pathname.startsWith('/messages/')
    ? '/messages'
    : /^\/loops\/(discover|mine|accept)(\/|$)/.test(location.pathname)
      ? '/loops-hub'
      : location.pathname

  return (
    <div
      key={pageKey}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        flex: 1,
      }}
    >
      {children}
    </div>
  )
}
