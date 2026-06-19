import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PenSquare } from 'lucide-react'
import { AcetSimpleButton, AcetSketchButton } from '@/components/ui/tailwindcss-buttons-variants'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'
import {
  buildDiscoverSearchQuery,
  formatDiscoverFilterHint,
  parseHeroSearch,
} from '@/utils/discover-search'

export default function Home() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.current.dark)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [heroInput, setHeroInput] = useState('')
  const [listKeyword, setListKeyword] = useState('')
  const [listServiceType, setListServiceType] = useState<
    'ALL' | 'ONLINE' | 'OFFLINE'
  >('ALL')

  useEffect(() => {
    const t = window.setTimeout(() => {
      const p = parseHeroSearch(heroInput.trim())
      setListKeyword(p.keyword)
      setListServiceType(p.serviceType)
    }, 320)
    return () => window.clearTimeout(t)
  }, [heroInput])

  function goDiscover() {
    const qs = buildDiscoverSearchQuery(heroInput.trim())
    navigate(qs ? `/discover?${qs}` : '/discover')
  }

  const listHint = formatDiscoverFilterHint(listKeyword, listServiceType)

  return (
    <div
      ref={scrollRef}
      className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-background text-foreground"
    >
      <div className="relative flex min-h-full w-full shrink-0 flex-col items-center justify-center bg-neutral-950 antialiased">
        <div className="relative z-10 mx-auto max-w-2xl p-4">
          <h1 className="relative z-10 bg-gradient-to-b from-neutral-200 to-neutral-600 bg-clip-text text-center font-sans text-lg font-bold text-transparent md:text-7xl">
            发现
          </h1>
          <p />
          <p className="relative z-10 mx-auto my-2 max-w-lg text-center text-sm text-neutral-500">
            浏览最新需求，接单赚钱；多一个人发布，就多一个机会。发布需求、搜索匹配、站内沟通与订单履约，都在九木完成。
          </p>
          <input
            type="text"
            value={heroInput}
            onChange={(e) => setHeroInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goDiscover()
            }}
            placeholder="「全部」「线上」「线下」或关键词；下方列表同步筛选，回车跳转结果页"
            aria-label="需求搜索"
            className="relative z-10 mt-4 w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 px-3 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <BackgroundBeams />
      </div>

      <div className="relative z-10 box-border mx-auto flex w-full max-w-3xl shrink-0 flex-col items-stretch self-center px-4 py-8 sm:px-6">
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <AcetSketchButton
            type="button"
            className={cn(
              'gap-2 px-6 py-3 text-base font-semibold',
              isDark
                ? 'shadow-[0_0_0_1.5px_rgba(255,255,255,0.15)] !border-white/20 !bg-white/10 !text-white hover:!shadow-[4px_4px_0px_0px_rgba(255,255,255,0.25)]'
                : 'shadow-[0_0_0_1.5px_rgba(0,0,0,0.08)] !text-text-primary',
            )}
            onClick={() => navigate('/demands/create')}
          >
            <span className="inline-flex items-center gap-2">
              <PenSquare className="size-4" />
              发布需求
            </span>
          </AcetSketchButton>
          <AcetSimpleButton
            type="button"
            className={cn(
              'gap-2 px-6 py-3 text-base font-semibold',
              isDark
                ? 'shadow-[0_0_0_1.5px_rgba(255,255,255,0.15)] !border-white/15 !bg-white/10 !text-white hover:!shadow-md'
                : 'shadow-[0_0_0_1.5px_rgba(0,0,0,0.08)] !text-text-primary',
            )}
            onClick={() => navigate('/search')}
          >
            <span className="inline-flex items-center gap-2">
              <Search className="size-4" />
              找人
            </span>
          </AcetSimpleButton>
        </div>

        <p className="mb-3 text-xs text-text-muted">列表与搜索一致：{listHint}</p>

        <DemandDiscoveryList
          keyword={listKeyword}
          serviceType={listServiceType}
          scrollRootRef={scrollRef}
        />
      </div>
    </div>
  )
}
