import { Component, type ErrorInfo, type ReactNode } from 'react'
import PathSearchPage from '@/views/path-search/PathSearchPage'

class PathSearchErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('承接人回页面渲染失败', error, info)
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="loop-accept-recovery" role="alert">
          <div className="loop-accept-recovery__icon">!</div>
          <h1>承接页暂时无法显示</h1>
          <p>页面数据已被安全拦截。请重新加载，或返回后重新发起搜索。</p>
          <button type="button" onClick={() => window.location.reload()}>重新加载</button>
        </section>
      )
    }

    return this.props.children
  }
}

export default function LoopAcceptPage() {
  return (
    <PathSearchErrorBoundary>
      <PathSearchPage />
    </PathSearchErrorBoundary>
  )
}
