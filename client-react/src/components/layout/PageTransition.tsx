import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 路由级 key 切换容器：路由变化时强制重新挂载子页面
 * 入场动画由各页面自行处理（首页 BackgroundBeams、Profile 封面开场等）
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div
      key={location.pathname}
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
