import { useParams, useNavigate } from 'react-router-dom'
import { DemandOwnerPaths } from '@/components/demand/DemandOwnerPaths'
import {
  DesktopPageShell,
  DlpBtnGhost,
} from '@/components/layout/desktop-page'

/** 需求后置页：发布者编辑匹配路径 */
export default function DemandPathsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    return null
  }

  return (
    <DesktopPageShell
      title="编辑匹配路径"
      subtitle="后置管理 · 仅发布者可见"
      onBack={() => navigate(`/demands/${id}`)}
      actions={
        <DlpBtnGhost type="button" onClick={() => navigate(`/demands/${id}`)}>
          返回详情
        </DlpBtnGhost>
      }
    >
      <DemandOwnerPaths demandId={id} />
    </DesktopPageShell>
  )
}
