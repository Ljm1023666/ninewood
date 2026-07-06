import { useNavigate } from 'react-router-dom'
import { CircleDetailBentoView } from '@/components/circle/CircleDetailBentoView'
import { useCircleHub } from './circle-hub-context'

/** 圈子社区 — 保持现有 Bento 详情页不变 */
export default function CircleHubCommunity() {
  const navigate = useNavigate()
  const {
    circle,
    demands,
    memberCount,
    previewMembers,
    statusLabel,
    isMember,
    canJoin,
    joinBusy,
    handleJoin,
  } = useCircleHub()

  if (!circle) return null

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
