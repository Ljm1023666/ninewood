import type { DemandRow } from '@/components/demand/DemandDiscoveryList'

export type CircleMember = {
  userId: string
  role: string
  user?: {
    nickname?: string
    avatarUrl?: string | null
  }
}

export type CircleDetailData = {
  id: string
  name: string
  description?: string | null
  coverUrl?: string | null
  type?: string
  status?: string
  owner?: { id?: string; nickname?: string }
  members?: CircleMember[]
  _count?: { members?: number }
}

export type CircleDetailBentoProps = {
  circle: CircleDetailData
  demands: DemandRow[]
  memberCount: number
  previewMembers: CircleMember[]
  statusLabel: string
  isMember: boolean
  canJoin: boolean
  joinBusy: boolean
  onPostDemand: () => void
  onJoin: () => void
  onDemandClick: (demandId: string) => void
}
