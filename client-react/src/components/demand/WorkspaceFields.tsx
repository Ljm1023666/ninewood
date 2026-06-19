import { Monitor, MapPin, Lock, LockOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
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

function LockToggleSlot({ fieldKey }: { fieldKey: string }) {
  return <LockToggle fieldKey={fieldKey} />
}

export function WorkspaceFields() {
  const fields = useDemandWorkspaceStore((s) => s.fields)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)

  return (
    <div>
      <span className="ws-section-label">结构化信息</span>

      <div className="ws-field-row" style={{ marginBottom: 12 }}>
        <div className="ws-seg">
          <button
            type="button"
            onClick={() => updateField('serviceType', 'ONLINE')}
            className={cn(
              'ws-seg-btn',
              fields.serviceType === 'ONLINE' && 'ws-seg-btn--on ws-seg-btn--online',
            )}
          >
            <Monitor className="size-4" />
            线上
          </button>
          <button
            type="button"
            onClick={() => updateField('serviceType', 'OFFLINE')}
            className={cn(
              'ws-seg-btn',
              fields.serviceType === 'OFFLINE' && 'ws-seg-btn--on ws-seg-btn--offline',
            )}
          >
            <MapPin className="size-4" />
            线下
          </button>
        </div>
        <LockToggleSlot fieldKey="serviceType" />
      </div>

      <div className="ws-grid-2 ws-field">
        <div>
          <div className="ws-field-row" style={{ alignItems: 'center', marginBottom: 4 }}>
            <label className="ws-field-label" style={{ margin: 0 }}>预算</label>
            <LockToggleSlot fieldKey="budget" />
          </div>
          <input
            type="text"
            value={fields.budget}
            onChange={(e) => updateField('budget', e.target.value)}
            placeholder="如 30-50元/局"
            className="ws-input"
          />
        </div>
        <div>
          <div className="ws-field-row" style={{ alignItems: 'center', marginBottom: 4 }}>
            <label className="ws-field-label" style={{ margin: 0 }}>时间</label>
            <LockToggleSlot fieldKey="schedule" />
          </div>
          <input
            type="text"
            value={fields.schedule}
            onChange={(e) => updateField('schedule', e.target.value)}
            placeholder="如 今晚"
            className="ws-input"
          />
        </div>
      </div>

      <div className="ws-field">
        <div className="ws-field-row" style={{ alignItems: 'center', marginBottom: 4 }}>
          <label className="ws-field-label" style={{ margin: 0 }}>分类</label>
          <LockToggleSlot fieldKey="category" />
        </div>
        <input
          type="text"
          value={fields.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="如 游戏/陪玩/代打"
          className="ws-input"
        />
        {fields.scopeLabels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {fields.scopeLabels.map((label) => (
              <span key={label} className="ws-tag">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {fields.suggestedKeywords.length > 0 && <KeywordTags />}

      <div className="ws-field">
        <div className="ws-field-row" style={{ alignItems: 'center', marginBottom: 4 }}>
          <label className="ws-field-label" style={{ margin: 0 }}>预期效果</label>
          <LockToggleSlot fieldKey="expectedOutcome" />
        </div>
        <input
          type="text"
          value={fields.expectedOutcome}
          onChange={(e) => updateField('expectedOutcome', e.target.value)}
          placeholder="如：星耀二上王者"
          className="ws-input"
        />
      </div>

      <div className="ws-grid-2">
        <div>
          <label className="ws-field-label">公开窗口 (分钟)</label>
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
            className="ws-input"
          />
        </div>
        <div>
          <label className="ws-field-label">接单上限</label>
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
            className="ws-input"
          />
        </div>
      </div>

      <div className="ws-field">
        <label className="ws-field-label">服务时限（分钟，可选）</label>
        <input
          type="number"
          value={fields.timeLimitMinutes ?? ''}
          onChange={(e) => {
            const v = e.target.value
            updateField(
              'timeLimitMinutes',
              v === '' ? undefined : Math.max(15, Math.min(10080, Number(v) || 0)),
            )
          }}
          min={15}
          max={10080}
          placeholder="如 60（最小 15，最大 10080）"
          className="ws-input"
        />
        <p style={{ marginTop: 6, fontSize: 12, color: "var(--ws-text-muted, #888)" }}>
          可选；到期后平台会提醒双方确认进度，不会自动扣款
        </p>
      </div>
    </div>
  )
}

function KeywordTags() {
  const keywords = useDemandWorkspaceStore((s) => s.fields.suggestedKeywords)
  const lockedKeywords = useDemandWorkspaceStore((s) => s.lockedKeywords)
  const toggleKeywordLock = useDemandWorkspaceStore((s) => s.toggleKeywordLock)
  return (
    <div className="ws-field">
      <label className="ws-field-label">关键词（点击锁定）</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {keywords.map((kw) => {
          const locked = lockedKeywords.has(kw)
          return (
            <button
              key={kw}
              type="button"
              onClick={() => toggleKeywordLock(kw)}
              className={cn('ws-tag', locked && 'ws-tag--locked')}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {kw}
            </button>
          )
        })}
      </div>
    </div>
  )
}
