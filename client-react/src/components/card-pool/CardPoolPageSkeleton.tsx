import { MapPin } from 'lucide-react'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { BackButton } from '@/components/ui/back-button'

/** 卡池路由 Suspense 骨架：保留标题/面包屑/网格/手牌坞，避免整页空白只剩 loader */
export function CardPoolPageSkeleton() {
  return (
    <div
      className="card-pool-stitch relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="卡池加载中"
    >
      <header className="card-pool-stitch__header flex shrink-0 items-center gap-3">
        <BackButton
          compact
          className="text-text-secondary hover:text-text-primary hover:bg-[color-mix(in_srgb,var(--cp-ink)_6%,transparent)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <MsIcon
              name={STITCH_PAGE_ICONS['card-pool']}
              size={22}
              className="shrink-0 text-[var(--cp-ink)]"
            />
            <h1 className="card-pool-stitch__title">卡池</h1>
            <span className="card-pool-location-chip">
              <MapPin
                className="size-3 shrink-0 text-[var(--cp-cyan)]"
                aria-hidden
              />
              同城 5KM
            </span>
          </div>
          <p className="card-pool-stitch__meta mt-1">正在载入分类与手牌…</p>
        </div>
        <div className="card-pool-stitch__stats shrink-0 text-right opacity-50">
          <span>浏览：…</span>
          <span className="mx-1.5 opacity-40">·</span>
          <span>手牌 …</span>
        </div>
      </header>

      <div className="card-pool-stitch__crumb flex shrink-0 items-center gap-2 px-4 py-2">
        <span className="card-pool-skel-pill h-7 w-16 rounded-md" />
        <span className="card-pool-skel-pill h-7 w-20 rounded-md" />
        <span className="card-pool-skel-pill h-7 w-14 rounded-md" />
      </div>

      <div className="card-pool-stitch__scroll flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-3">
        <div className="card-pool-skel-pack mx-auto w-full max-w-2xl" />
        <div className="card-pool-stitch__grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card-pool-skel-tile" />
          ))}
        </div>
      </div>

      <div className="card-pool-hand-dock shrink-0">
        <div className="card-pool-hand-dock__bar pointer-events-none">
          <div className="min-w-0">
            <div className="card-pool-hand-dock__meta-title">手牌 (…)</div>
            <div className="card-pool-hand-dock__meta-hint">加载中</div>
          </div>
        </div>
      </div>
    </div>
  )
}
