import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
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
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="返回发现"
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-text-primary">需求搜索</h1>
            <p className="text-xs text-text-muted">当前：{filterHint}</p>
          </div>
        </div>

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
