import { useCallback, useEffect, useState } from 'react'
import { pathSearchApi } from '@/api/path-search'
import { PathEditorPanel } from '@/components/path/PathEditorPanel'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { toast } from '@/components/ui/confirm-dialog'

/** 需求详情 · 发布者编辑匹配路径 */
export function DemandOwnerPaths({ demandId }: { demandId: string }) {
  const [paths, setPaths] = useState<string[]>([])
  const [autoPaths, setAutoPaths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pathSearchApi.getDemandPaths(demandId)
      setPaths(res.data.data.paths)
      setAutoPaths(res.data.data.autoPaths)
    } catch {
      toast('加载路径失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [demandId])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await pathSearchApi.updateDemandPaths(demandId, paths)
      toast('路径已更新', 'success')
      await load()
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '保存失败'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-bg-secondary/40 p-4 text-sm text-text-muted">
        加载匹配路径…
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-bg-secondary/40 p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">匹配路径</h3>
      <PathEditorPanel paths={paths} onChange={setPaths} autoPaths={autoPaths} />
      <div className="mt-4">
        <LiquidMetalButton
          label={saving ? '保存中…' : '保存路径'}
          disabled={saving}
          onClick={() => void save()}
        />
      </div>
    </div>
  )
}
