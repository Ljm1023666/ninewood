import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  formatDiscoverFilterHint,
  parseDiscoverUrlParams,
} from '@/utils/discover-search'

export default function Discover() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { keyword, serviceType } = parseDiscoverUrlParams(searchParams)
  const filterHint = formatDiscoverFilterHint(keyword, serviceType)

  return (
    <div
      ref={scrollRef}
      className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto thin-scroll bg-background text-foreground"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-3xl shrink-0 flex-col self-center px-4 pb-8 pt-4 sm:px-6">
        <PageHeader
          title="需求搜索"
          subtitle={`当前：${filterHint}`}
          onBack={() => navigate('/')}
        />

        <DemandDiscoveryList
          keyword={keyword}
          serviceType={serviceType}
          scrollRootRef={scrollRef}
          paginationMode="paged"
          pageSize={10}
        />
      </div>
    </div>
  )
}
