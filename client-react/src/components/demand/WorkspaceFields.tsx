import { Monitor, MapPin, Lock, LockOpen } from 'lucide-react'
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

function LockToggleSlot({ fieldKey }: { fieldKey: string }) {
  return <LockToggle fieldKey={fieldKey} />
}

export function WorkspaceFields() {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-muted uppercase tracking-wider">
        结构化信息
      </label>

      {/* 服务类型 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2">
          <button
            type="button"
            onClick={() => updateField('serviceType', 'ONLINE')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
              fields.serviceType === 'ONLINE'
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                : 'border-border bg-bg-card text-text-muted hover:border-border'
            }`}
          >
            <Monitor className="size-4" />
            线上
          </button>
          <button
            type="button"
            onClick={() => updateField('serviceType', 'OFFLINE')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
              fields.serviceType === 'OFFLINE'
                ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                : 'border-border bg-bg-card text-text-muted hover:border-border'
            }`}
          >
            <MapPin className="size-4" />
            线下
          </button>
        </div>
        <LockToggleSlot fieldKey="serviceType" />
      </div>

      {/* 预算 + 时间 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm text-text-muted">预算</label>
            <LockToggleSlot fieldKey="budget" />
          </div>
          <input
            type="text"
            value={fields.budget}
            onChange={(e) => updateField('budget', e.target.value)}
            placeholder="如 30-50元/局"
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border focus:outline-none transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm text-text-muted">时间</label>
            <LockToggleSlot fieldKey="schedule" />
          </div>
          <input
            type="text"
            value={fields.schedule}
            onChange={(e) => updateField('schedule', e.target.value)}
            placeholder="如 今晚"
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 分类路径 */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="block text-sm text-text-muted">分类</label>
          <LockToggleSlot fieldKey="category" />
        </div>
        <input
          type="text"
          value={fields.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="如 游戏/陪玩/代打"
          className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border focus:outline-none transition-colors"
        />
        {fields.scopeLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {fields.scopeLabels.map((label) => (
              <span
                key={label}
                className="rounded-md bg-bg-secondary px-2 py-0.5 text-sm text-text-muted/80"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 关键词标签 */}
      {fields.suggestedKeywords.length > 0 && <KeywordTags />}

      {/* AI 2.5: 预期效果 */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="block text-sm text-text-muted">预期效果</label>
          <LockToggleSlot fieldKey="expectedOutcome" />
        </div>
        <input
          type="text"
          value={fields.expectedOutcome}
          onChange={(e) => updateField('expectedOutcome', e.target.value)}
          placeholder="如：星耀二上王者"
          className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border focus:outline-none transition-colors"
        />
      </div>

      {/* AI 2.5: 窗口 + 上限 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm text-text-muted mb-1">
            公开窗口 (分钟)
          </label>
          <input
            type="number"
            value={fields.visibilityWindow}
            onChange={(e) =>
              updateField(
                'visibilityWindow',
                Math.max(1, Math.min(1440, Number(e.target.value) || 15)),
              )
            }
            min={1}
            max={1440}
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-border focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted mb-1">接单上限</label>
          <input
            type="number"
            value={fields.maxApplicants}
            onChange={(e) =>
              updateField(
                'maxApplicants',
                Math.max(1, Math.min(100, Number(e.target.value) || 10)),
              )
            }
            min={1}
            max={100}
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:border-border focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

function KeywordTags() {
  const keywords = useDemandWorkspaceStore((s) => s.fields.suggestedKeywords)
  const lockedKeywords = useDemandWorkspaceStore((s) => s.lockedKeywords)
  const toggleKeywordLock = useDemandWorkspaceStore((s) => s.toggleKeywordLock)
  return (
    <div>
      <label className="block text-sm text-text-muted mb-1">
        关键词（点击锁定）
      </label>
      <div className="flex flex-wrap gap-1">
        {keywords.map((kw) => {
          const locked = lockedKeywords.has(kw)
          return (
            <button
              key={kw}
              type="button"
              onClick={() => toggleKeywordLock(kw)}
              className={`rounded-full border px-2.5 py-0.5 text-sm transition-all ${
                locked
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-border bg-bg-card text-text-muted hover:border-border hover:text-text-secondary'
              }`}
            >
              {kw}
            </button>
          )
        })}
      </div>
    </div>
  )
}
