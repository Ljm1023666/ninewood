import { createContext, useContext } from 'react'
import type {
  CircleDetailData,
  CircleMember,
} from '@/components/circle/circle-detail-types'
import type { DemandRow } from '@/components/demand/DemandDiscoveryList'

export type CircleHubContextValue = {
  circleId: string
  circle: CircleDetailData | null
  demands: DemandRow[]
  loading: boolean
  error: string
  refetch: () => Promise<void>
  isMember: boolean
  canJoin: boolean
  joinBusy: boolean
  handleJoin: () => Promise<void>
  memberCount: number
  previewMembers: CircleMember[]
  statusLabel: string
}

const CircleHubContext = createContext<CircleHubContextValue | null>(null)

export function CircleHubProvider({
  value,
  children,
}: {
  value: CircleHubContextValue
  children: React.ReactNode
}) {
  return (
    <CircleHubContext.Provider value={value}>{children}</CircleHubContext.Provider>
  )
}

export function useCircleHub(): CircleHubContextValue {
  const ctx = useContext(CircleHubContext)
  if (!ctx) {
    throw new Error('useCircleHub must be used within CircleHubLayout')
  }
  return ctx
}
