import { useEffect, useState } from 'react'
import api from '@/api'
import { toast } from '@/components/ui/confirm-dialog'

export interface DashboardData {
  overview: {
    userCount: number
    demandCount: number
    orderCount: number
    disputeCount: number
    circleCount: number
    providerCount: number
  }
  revenueTrend: { name: string; revenue: number }[]
  userGrowthTrend: { name: string; users: number; newUsers: number }[]
  orderDistribution: Record<string, number>
  demandDistribution: Record<string, number>
  recentOrders: {
    id: string
    demandTitle: string
    provider: string
    requester: string
    amount: number
    status: string
    createdAt: string
    completedAt: string | null
  }[]
  topTags: { tagName: string; count: number }[]
  circlesByType: { type: string; _count: { id: number } }[]
}

export function useAdminData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/admin/dashboard')
      setData(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '加载失败')
      toast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
  }, [])

  return { data, loading, error, refetch: fetch }
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '进行中',
  WAITING_REVIEW: '待审核',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  FROZEN: '已冻结',
  WITHDRAWN: '已撤回',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: '#3B82F6',
  IN_PROGRESS: '#3B82F6',
  WAITING_REVIEW: '#F97316',
  COMPLETED: '#22C55E',
  CANCELLED: '#6B7280',
}

export const COLORS = ['#F97316', '#14B8A6', '#3B82F6', '#8B5CF6', '#22C55E']
