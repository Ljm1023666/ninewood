import PathSearchPage from '@/views/path-search/PathSearchPage'
import LoopHubNav from './LoopHubNav'

export default function LoopAcceptPage() {
  return (
    <div className="loop-hub-page">
      <LoopHubNav />
      <PathSearchPage />
    </div>
  )
}
