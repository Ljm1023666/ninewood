import { Lock, LockOpen } from 'lucide-react'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'
import { MaterialSwitch } from '@/components/ui/material-switch'

function LockToggle({ fieldKey }: { fieldKey: string }) {
  const locked = useDemandWorkspaceStore((s) => s.fieldOverrides.has(fieldKey))
  const toggleLock = useDemandWorkspaceStore((s) => s.toggleLock)

  return (
    <MaterialSwitch
      checked={locked}
      onCheckedChange={() => toggleLock(fieldKey)}
      size="sm"
      showIcons
      checkedIcon={<Lock className="size-2.5" />}
      uncheckedIcon={<LockOpen className="size-2.5" />}
      haptic="light"
      className="-mt-4"
    />
  )
}

export function WorkspaceSummary() {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)
  const speedMode = useDemandWorkspaceStore((s) => s.speedMode)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-muted uppercase tracking-wider">
          需求摘要
        </label>
      </div>

      {/* 标题 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={fields.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="需求标题（AI 自动生成）"
          className="flex-1 rounded-xl border border-border bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border focus:outline-none transition-colors"
        />
        {!speedMode && <LockToggle fieldKey="title" />}
      </div>

      {/* 描述 */}
      <div className="flex items-start gap-2">
        <textarea
          value={fields.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="需求描述（AI 自动整理）"
          rows={4}
          className="flex-1 rounded-xl border border-border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border focus:outline-none transition-colors resize-none"
        />
        {!speedMode && (
          <div className="-mt-3 shrink-0">
            <LockToggle fieldKey="description" />
          </div>
        )}
      </div>
    </div>
  )
}
