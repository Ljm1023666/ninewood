import { useEffect } from 'react'
import { outcomeApi, type ActiveResourceType } from '@/api/outcome'

const IDLE_MS = 60_000
const FLUSH_MS = 30_000

/** 只统计当前可见页面中明确操作的时间；不采集输入内容、鼠标移动或其他应用状态。 */
export function useTaskActiveTime(resourceType: ActiveResourceType, resourceId?: string) {
  useEffect(() => {
    if (!resourceId) return
    let lastActivity = Date.now()
    let pendingMs = 0
    let lastTick = Date.now()

    const markActive = () => { lastActivity = Date.now() }
    const tick = () => {
      const now = Date.now()
      const elapsed = Math.min(1_500, now - lastTick)
      lastTick = now
      if (document.visibilityState === 'visible' && now - lastActivity <= IDLE_MS) pendingMs += elapsed
    }
    const flush = () => {
      const activeMs = Math.trunc(pendingMs)
      pendingMs = 0
      if (activeMs > 0) void outcomeApi.recordActiveTime(resourceType, resourceId, activeMs).catch(() => {})
    }

    document.addEventListener('keydown', markActive)
    document.addEventListener('input', markActive)
    document.addEventListener('click', markActive)
    const tickTimer = window.setInterval(tick, 1_000)
    const flushTimer = window.setInterval(flush, FLUSH_MS)
    return () => {
      window.clearInterval(tickTimer)
      window.clearInterval(flushTimer)
      document.removeEventListener('keydown', markActive)
      document.removeEventListener('input', markActive)
      document.removeEventListener('click', markActive)
      flush()
    }
  }, [resourceId, resourceType])
}
