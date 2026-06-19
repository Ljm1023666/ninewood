import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { buildDiscoverSearchQuery } from '@/utils/discover-search'

export default function Home() {
  const navigate = useNavigate()
  const [heroInput, setHeroInput] = useState('')

  function goDiscover() {
    const qs = buildDiscoverSearchQuery(heroInput.trim())
    navigate(qs ? `/discover?${qs}` : '/discover')
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground">
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center bg-neutral-950 antialiased">
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
            placeholder="输入「全部」「线上」「线下」或关键词，回车跳转结果页"
            aria-label="需求搜索"
            className="relative z-10 mt-4 w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 px-3 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <BackgroundBeams />
      </div>
    </div>
  )
}
