import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthToken } from '@/api/auth-session'

export interface ServiceStatus {
  name: string
  port: number
  status: 'online' | 'offline' | 'error'
  responseTime: number
  error?: string
}

export interface HealthData {
  status: 'healthy' | 'degraded'
  services: ServiceStatus[]
  timestamp: string
  totalCheckTime: number
}

interface PortHistoryPoint {
  time: string
  [portName: string]: number | string
}

const MAX_HISTORY = 60

function healthActionHeaders(): HeadersInit {
  const headers: Record<string, string> = {}
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function usePortMonitor(pollInterval = 5000) {
  const [data, setData] = useState<HealthData | null>(null)
  const [history, setHistory] = useState<PortHistoryPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health/services', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: HealthData = await res.json()
      if (!mountedRef.current) return
      setData(json)
      setError(null)

      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      setHistory((prev) => {
        const point: PortHistoryPoint = { time }
        for (const svc of json.services) {
          point[svc.name] = svc.responseTime
        }
        const next = [...prev, point]
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
      })
    } catch (e: any) {
      if (!mountedRef.current) return
      setError(e.message || '获取健康数据失败')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchHealth()
    const timer = setInterval(fetchHealth, pollInterval)
    return () => {
      mountedRef.current = false
      clearInterval(timer)
    }
  }, [fetchHealth, pollInterval])

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const restartService = useCallback(async (name: string) => {
    setActionLoading(name)
    try {
      const res = await fetch(`/api/health/restart/${encodeURIComponent(name)}`, {
        method: 'POST',
        credentials: 'include',
        headers: healthActionHeaders(),
      })
      const json = await res.json()
      await fetchHealth()
      return json
    } finally {
      setActionLoading(null)
    }
  }, [fetchHealth])

  const startAll = useCallback(async () => {
    setActionLoading('__all__')
    try {
      const res = await fetch('/api/health/start-all', {
        method: 'POST',
        credentials: 'include',
        headers: healthActionHeaders(),
      })
      const json = await res.json()
      await fetchHealth()
      return json
    } finally {
      setActionLoading(null)
    }
  }, [fetchHealth])

  return { data, history, error, actionLoading, refetch: fetchHealth, restartService, startAll }
}
