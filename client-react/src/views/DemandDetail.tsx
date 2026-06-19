import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { demandApi } from '@/api/demand'
import { InteractiveProductCard } from '@/components/ui/interactive-product-card'
import { UserCoverAmbientBg } from '@/components/ui/user-cover-ambient'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'

const statusLabel: Record<string, string> = { PENDING: '进行中', FROZEN: '已冻结', COMPLETED: '已完成', CLOSED: '已关闭' }

function pageShell(inner: ReactNode) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center overflow-y-auto thin-scroll bg-bg-primary px-6 py-12">
      {inner}
    </div>
  )
}

export default function DemandDetail() {
  const { id } = useParams<{ id: string }>()
  const [demand, setDemand] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const publisherCoverUrl = useMemo(() => {
    const fromProfile = (demand?.user?.coverUrl as string | undefined)?.trim()
    if (fromProfile) return fromProfile
    return publisherUserCoverPreset(demand?.userId)
  }, [demand?.userId, demand?.user?.coverUrl])

  const imageAttachmentCount = useMemo(() => {
    const urls = demand?.mediaUrls as string[] | undefined
    if (!urls?.length) return 1
    return Math.max(1, urls.filter((url) => /\.(jpg|jpeg|png|gif|webp)/i.test(url)).length)
  }, [demand?.mediaUrls])

  const cardDescription = useMemo(() => {
    if (!demand) return ''
    const parts = [
      demand.category,
      demand.serviceType === 'ONLINE' ? '线上' : '线下',
      statusLabel[demand.status] || demand.status,
    ].filter(Boolean)
    const head = parts.join(' · ')
    const desc = (demand.description as string)?.trim()
    if (!desc) return head
    return `${head}${head ? '\n' : ''}${desc}`
  }, [demand])

  const fetchDemand = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const r = await demandApi.get(id)
      setDemand(r.data.data)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDemand()
  }, [fetchDemand])

  if (loading) {
    return pageShell(<p className="text-sm text-text-muted">加载中...</p>)
  }
  if (error) {
    return pageShell(
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-text-muted">{error}</p>
        <button type="button" onClick={fetchDemand} className="text-sm font-semibold text-accent">
          重试
        </button>
      </div>,
    )
  }
  if (!demand) return null

  return (
    <div className="relative isolate flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto thin-scroll bg-bg-primary pb-8">
      <UserCoverAmbientBg userId={demand.userId} coverUrl={demand.user?.coverUrl} />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 md:px-8 md:py-10"
      >
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 md:mb-8">
          {demand.isExample && (
            <span className="rounded px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-400">示例需求</span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${demand.serviceType === 'ONLINE' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}`}
          >
            {demand.serviceType === 'ONLINE' ? '线上' : '线下'}
          </span>
          <span className="rounded bg-bg-secondary px-2 py-0.5 text-xs font-semibold text-text-muted">{demand.category}</span>
          <span className="rounded bg-bg-secondary px-2 py-0.5 text-xs font-semibold text-text-muted">
            {statusLabel[demand.status] || demand.status}
          </span>
        </div>
        <InteractiveProductCard
          imageUrl={publisherCoverUrl}
          logoUrl={demand.user?.avatarUrl || '/favicon.svg'}
          title={demand.title}
          description={cardDescription}
          price={`¥${demand.minPrice}`}
          avatarTo={demand.userId ? `/profile/${demand.userId}` : undefined}
          avatarLabel={demand.user?.nickname ? `查看 ${demand.user.nickname} 的主页` : '查看发布者主页'}
          dotCount={Math.min(imageAttachmentCount, 6)}
          activeDotIndex={0}
          className="w-full max-w-[min(100%,338px)] shadow-[var(--shadow-lg)] ring-1 ring-border/40 md:max-w-[416px]"
        />
      </motion.div>
    </div>
  )
}
