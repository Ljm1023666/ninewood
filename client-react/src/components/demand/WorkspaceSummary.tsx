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
      className="shrink-0"
    />
  )
}

export function WorkspaceSummary() {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)

  return (
    <div>
      <span className="ws-section-label">需求摘要</span>
      <div className="ws-field-row" style={{ marginBottom: 12 }}>
        <input
          type="text"
          value={fields.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="需求标题（AI 自动生成）"
          className="ws-input"
        />
        <LockToggle fieldKey="title" />
      </div>
      <div className="ws-field-row">
        <textarea
          value={fields.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="需求描述（AI 自动整理）"
          rows={4}
          className="ws-textarea"
        />
        <LockToggle fieldKey="description" />
      </div>
    </div>
  )
}
