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

export function WorkspaceFields() {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)
  const speedMode = useDemandWorkspaceStore((s) => s.speedMode)

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/30 uppercase tracking-wider">
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
                : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/15'
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
                : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-white/15'
            }`}
          >
            <MapPin className="size-4" />
            线下
          </button>
        </div>
        {!speedMode && <LockToggle fieldKey="serviceType" />}
      </div>

      {/* 预算 + 时间 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm text-white/25">预算</label>
            {!speedMode && <LockToggle fieldKey="budget" />}
          </div>
          <input
            type="text"
            value={fields.budget}
            onChange={(e) => updateField('budget', e.target.value)}
            placeholder="如 30-50元/局"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm text-white/25">时间</label>
            {!speedMode && <LockToggle fieldKey="schedule" />}
          </div>
          <input
            type="text"
            value={fields.schedule}
            onChange={(e) => updateField('schedule', e.target.value)}
            placeholder="如 今晚"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 分类路径 */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="block text-sm text-white/25">分类</label>
          {!speedMode && <LockToggle fieldKey="category" />}
        </div>
        <input
          type="text"
          value={fields.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="如 游戏/陪玩/代打"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:border-white/20 focus:outline-none transition-colors"
        />
        {fields.scopeLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {fields.scopeLabels.map((label) => (
              <span
                key={label}
                className="rounded-md bg-white/[0.04] px-2 py-0.5 text-sm text-white/35"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 关键词标签 */}
      {fields.suggestedKeywords.length > 0 && <KeywordTags />}
    </div>
  )
}

function KeywordTags() {
  const keywords = useDemandWorkspaceStore((s) => s.fields.suggestedKeywords)
  const lockedKeywords = useDemandWorkspaceStore((s) => s.lockedKeywords)
  const toggleKeywordLock = useDemandWorkspaceStore((s) => s.toggleKeywordLock)
  const speedMode = useDemandWorkspaceStore((s) => s.speedMode)

  return (
    <div>
      <label className="block text-sm text-white/25 mb-1">
        关键词{speedMode ? '（点击解锁）' : '（点击锁定）'}
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
                  : 'border-white/[0.06] bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70'
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
