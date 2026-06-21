import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { toast } from '@/components/ui/confirm-dialog'
import { CircleDetailBentoView } from '@/components/circle/CircleDetailBentoView'
import { useBentoShell } from '@/components/layout/BentoAppShell'
import type {
  CircleDetailData,
  CircleMember,
} from '@/components/circle/circle-detail-types'
import type { DemandRow } from '@/components/demand/DemandDiscoveryList'

const statusMap: Record<string, string> = {
  ACTIVE: '活跃',
  WARNING: '低活跃',
  DEFUNCT: '已失活',
}

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useUserStore((s) => s.user?.id)
  const { setAmbientCoverUrl } = useBentoShell()
  const [circle, setCircle] = useState<CircleDetailData | null>(null)
  const [demands, setDemands] = useState<DemandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)

  const isMember = Boolean(circle?.members?.some((m) => m.userId === userId))
  const isPublic = circle?.type === 'PUBLIC'
  const canJoin = Boolean(
    id && isPublic && !isMember && circle?.status !== 'DEFUNCT',
  )

  const fetchAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [cRes, dRes] = await Promise.all([
        circleApi.get(id),
        circleApi.getDemands(id),
      ])
      setCircle(cRes.data.data as CircleDetailData)
      setDemands((dRes.data.data?.demands as DemandRow[]) || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  // SIDEBAR-02: 详情页的 coverUrl 注入 BentoAppShell 背景层；
  // 离开/卸载时复位为 fallback，避免污染下一路由。
  useEffect(() => {
    setAmbientCoverUrl(circle?.coverUrl ?? null)
    return () => setAmbientCoverUrl(null)
  }, [circle?.coverUrl, setAmbientCoverUrl])

  async function handleJoin() {
    if (!id || !canJoin) return
    setJoinBusy(true)
    try {
      await circleApi.join(id)
      toast('已加入圈子', 'success')
      await fetchAll()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '加入失败', 'error')
    } finally {
      setJoinBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="cdb-main-inner">
        <div className="cdb-bento-grid">
          <Skeleton className="cdb-bento-hero cdb-skeleton min-h-[260px]" />
          <Skeleton className="cdb-bento-stats cdb-skeleton min-h-[260px]" />
          <Skeleton className="cdb-bento-cta cdb-skeleton min-h-[160px]" />
          <Skeleton className="cdb-bento-demands cdb-skeleton min-h-[340px]" />
          <Skeleton className="cdb-bento-activity cdb-skeleton min-h-[120px]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cdb-main-inner">
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <p className="cdb-text-body-sm cdb-text-muted">{error}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => void fetchAll()}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (!circle) return <ErrorState message="圈子不存在或已被删除" />

  const statusLabel = statusMap[circle.status || 'ACTIVE'] || statusMap.ACTIVE
  const memberCount = circle._count?.members ?? circle.members?.length ?? 0
  const previewMembers = (circle.members || []).slice(0, 8) as CircleMember[]

  return (
    <CircleDetailBentoView
      circle={circle}
      demands={demands}
      memberCount={memberCount}
      previewMembers={previewMembers}
      statusLabel={statusLabel}
      isMember={isMember}
      canJoin={canJoin}
      joinBusy={joinBusy}
      onPostDemand={() => navigate(`/demands/create?circleId=${circle.id}`)}
      onJoin={() => void handleJoin()}
      onDemandClick={(demandId) => navigate(`/demands/${demandId}`)}
    />
  )
}