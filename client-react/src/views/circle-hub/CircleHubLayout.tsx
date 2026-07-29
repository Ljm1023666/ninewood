import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { useUserStore } from '@/stores/user'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/confirm-dialog'
import { useBentoShell } from '@/components/layout/BentoAppShell'
import type {
  CircleDetailData,
  CircleMember,
} from '@/components/circle/circle-detail-types'
import type { DemandRow } from '@/components/demand/DemandDiscoveryList'
import {
  CircleHubProvider,
  type CircleHubContextValue,
} from './circle-hub-context'

const statusMap: Record<string, string> = {
  ACTIVE: '活跃',
  WARNING: '低活跃',
  DEFUNCT: '已失活',
}

export default function CircleHubLayout() {
  const { id: circleId } = useParams<{ id: string }>()
  const userId = useUserStore((s) => s.user?.id)
  const { setAmbientCoverUrl } = useBentoShell()
  const [circle, setCircle] = useState<CircleDetailData | null>(null)
  const [demands, setDemands] = useState<DemandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!circleId) return
    setLoading(true)
    setError('')
    try {
      const [cRes, dRes] = await Promise.all([
        circleApi.get(circleId),
        circleApi.getDemands(circleId),
      ])
      setCircle(cRes.data.data as CircleDetailData)
      setDemands((dRes.data.data?.demands as DemandRow[]) || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [circleId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    setAmbientCoverUrl(circle?.coverUrl ?? null)
    return () => setAmbientCoverUrl(null)
  }, [circle?.coverUrl, setAmbientCoverUrl])



  const isMember = Boolean(circle?.members?.some((m) => m.userId === userId))

  // Heartbeat on mount (best-effort) - depends on isMember above
  useEffect(() => {
    if (!circleId || !isMember) return
    circleApi.postHeartbeat(circleId).catch(() => undefined)
    const t = setInterval(() => {
      circleApi.postHeartbeat(circleId).catch(() => undefined)
    }, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [circleId, isMember])

  const isPublic = circle?.type === 'PUBLIC'
  const canJoin = Boolean(
    circleId && isPublic && !isMember && circle?.status !== 'DEFUNCT',
  )

  const handleJoin = useCallback(async () => {
    if (!circleId || !canJoin) return
    setJoinBusy(true)
    try {
      await circleApi.join(circleId)
      toast('已加入圈子', 'success')
      await fetchAll()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '加入失败', 'error')
    } finally {
      setJoinBusy(false)
    }
  }, [circleId, canJoin, fetchAll])

  const memberCount = circle?._count?.members ?? circle?.members?.length ?? 0
  const previewMembers = (circle?.members || []).slice(0, 8) as CircleMember[]
  const statusLabel =
    statusMap[circle?.status || 'ACTIVE'] || statusMap.ACTIVE

  const contextValue = useMemo<CircleHubContextValue>(
    () => ({
      circleId: circleId || '',
      circle,
      demands,
      loading,
      error,
      refetch: fetchAll,
      isMember,
      canJoin,
      joinBusy,
      handleJoin,
      memberCount,
      previewMembers,
      statusLabel,
    }),
    [
      circleId,
      circle,
      demands,
      loading,
      error,
      fetchAll,
      isMember,
      canJoin,
      joinBusy,
      memberCount,
      previewMembers,
      statusLabel,
    ],
  )

  if (!circleId) return null

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
          <LiquidMetalButton
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => void fetchAll()}
          >
            重试
          </LiquidMetalButton>
        </div>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="cdb-main-inner">
        <p className="cdb-text-muted py-24 text-center">圈子不存在或已被删除</p>
      </div>
    )
  }

  return (
    <CircleHubProvider value={contextValue}>
      <Outlet />
    </CircleHubProvider>
  )
}
