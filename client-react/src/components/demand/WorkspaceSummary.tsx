import { Lock, LockOpen } from 'lucide-react'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'

function LockToggle({ fieldKey }: { fieldKey: string }) {
  const locked = useDemandWorkspaceStore((s) => s.fieldOverrides.has(fieldKey))
  const toggleLock = useDemandWorkspaceStore((s) => s.toggleLock)

  return (
    <button
      type="button"
      onClick={() => toggleLock(fieldKey)}
      className={`flex size-6 items-center justify-center rounded-md transition-all ${
        locked
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-white/[0.03] text-white/15 hover:text-white/40 hover:bg-white/[0.06]'
      }`}
      title={locked ? '已锁定，AI 不会修改' : '点击锁定此字段'}
    >
      {locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
    </button>
  )
}

export function WorkspaceSummary() {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)
  const confidence = useDemandWorkspaceStore((s) => s.confidence)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-white/30 uppercase tracking-wider">
          需求摘要
        </label>
        {fields.title && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              confidence === 'high'
                ? 'bg-emerald-500/10 text-emerald-400/70'
                : confidence === 'medium'
                  ? 'bg-amber-500/10 text-amber-400/70'
                  : 'bg-red-500/10 text-red-400/70'
            }`}
          >
            {confidence === 'high'
              ? '高置信度'
              : confidence === 'medium'
                ? '中置信度'
                : '低置信度'}
          </span>
        )}
      </div>

      {/* 标题 */}
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={fields.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="需求标题（AI 自动生成）"
          className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 focus:outline-none transition-colors"
        />
        <LockToggle fieldKey="title" />
      </div>

      {/* 描述 */}
      <div className="flex items-start gap-2">
        <textarea
          value={fields.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="需求描述（AI 自动整理）"
          rows={4}
          className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 focus:outline-none transition-colors resize-none"
        />
        <LockToggle fieldKey="description" />
      </div>
    </div>
  )
}
