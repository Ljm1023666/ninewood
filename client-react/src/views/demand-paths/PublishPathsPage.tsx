import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandApi } from '@/api/demand'
import { toast } from '@/components/ui/confirm-dialog'
import { PathEditorPanel } from '@/components/path/PathEditorPanel'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassBody,
  DlpGlassHead,
  DlpBtnPrimary,
  DlpBtnGhost,
} from '@/components/layout/desktop-page'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'
import { buildDemandFormData } from '@/utils/build-demand-form-data'
import {
  formatDemandApiError,
  validateDemandForPublish,
} from '@/utils/demand-publish'
import { derivePathsFromWorkspaceFields } from '@/utils/path-codec'
import { REGION_ID_LABEL } from '@/constants/path-search'

/** 发布前置页：确认匹配路径后再提交 */
export default function PublishPathsPage() {
  const navigate = useNavigate()

  const fields = useDemandWorkspaceStore((s) => s.fields)
  const resetWorkspace = useDemandWorkspaceStore((s) => s.reset)
  const manualRef = useRef(false)
  const [paths, setPaths] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)

  const autoPaths = useMemo(
    () => derivePathsFromWorkspaceFields(fields),
    [fields],
  )

  useEffect(() => {
    if (!manualRef.current) {
      setPaths(autoPaths)
    }
  }, [autoPaths])

  const onChange = (next: string[]) => {
    manualRef.current = true
    setPaths(next)
  }

  const confirmPublish = async () => {
    const issues = validateDemandForPublish(fields)
    if (issues.length > 0) {
      toast(issues.map((i) => i.message).join('；'), 'error')
      navigate('/demands/create')
      return
    }
    setPublishing(true)
    try {
      const fd = buildDemandFormData(fields, { paths })
      await demandApi.create(fd)
      toast('发布成功', 'success')
      resetWorkspace()
      navigate('/my-demands')
    } catch (e: unknown) {
      toast(formatDemandApiError(e), 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <DesktopPageShell
      title="确认匹配路径"
      subtitle="发布前置步骤 · 路径决定需求如何被检索命中"
      onBack={() => navigate('/demands/create')}
      actions={
        <DlpBtnGhost type="button" onClick={() => navigate('/demands/create')}>
          返回编辑
        </DlpBtnGhost>
      }
    >
      <DlpGlass className="mb-6">
        <DlpGlassHead title="需求摘要" />
        <DlpGlassBody className="space-y-2 text-sm text-text-secondary">
          <p>
            <span className="text-text-muted">标题：</span>
            {fields.title.trim() || '（未填写）'}
          </p>
          <p>
            <span className="text-text-muted">类目：</span>
            {fields.category || '—'}
          </p>
          <p>
            <span className="text-text-muted">预算：</span>
            {fields.budget || '—'}
          </p>
          {fields.regionId != null && (
            <p>
              <span className="text-text-muted">地区：</span>
              {REGION_ID_LABEL[fields.regionId] ?? fields.regionId}
            </p>
          )}
        </DlpGlassBody>
      </DlpGlass>

      <DlpGlass className="mb-6">
        <DlpGlassHead title="匹配路径" />
        <DlpGlassBody>
          <PathEditorPanel
            paths={paths}
            onChange={onChange}
            autoPaths={autoPaths}
          />
        </DlpGlassBody>
      </DlpGlass>

      <div className="flex flex-wrap gap-3">
        <DlpBtnPrimary
          type="button"
          disabled={publishing}
          onClick={() => void confirmPublish()}
        >
          {publishing ? '发布中…' : '确认发布'}
        </DlpBtnPrimary>
        <DlpBtnGhost type="button" onClick={() => navigate('/demands/create')}>
          取消
        </DlpBtnGhost>
      </div>
    </DesktopPageShell>
  )
}
