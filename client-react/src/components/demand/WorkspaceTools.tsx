import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  Zap,
  FileText,
  MessageSquare,
  Wand2,
  CheckCircle2,
  PencilLine,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'

type PolishAction = 'shorten' | 'expand' | 'formal' | 'casual'

export function WorkspaceTools() {
  const missingInfo = useDemandWorkspaceStore((s) => s.missingInfo)
  const missingQueue = useDemandWorkspaceStore((s) => s.missingQueue)
  const answeredQueue = useDemandWorkspaceStore((s) => s.answeredQueue)
  const resolvedQueue = useDemandWorkspaceStore((s) => s.resolvedQueue)
  const toggleMissingQueue = useDemandWorkspaceStore(
    (s) => s.toggleMissingQueue,
  )
  const description = useDemandWorkspaceStore((s) => s.fields.description)
  const updateField = useDemandWorkspaceStore((s) => s.updateField)
  const [polishing, setPolishing] = useState<PolishAction | null>(null)

  const handlePolish = useCallback(
    async (action: PolishAction) => {
      if (!description.trim() || polishing) return
      setPolishing(action)
      try {
        const prompts: Record<PolishAction, string> = {
          shorten: `将以下需求描述缩短 50%，保留核心信息，去除冗余修饰：\n${description}`,
          expand: `将以下需求描述详细展开，补充合理的细节，让需求更完整：\n${description}`,
          formal: `将以下需求描述改写成正式、专业的商务风格：\n${description}`,
          casual: `将以下需求描述改写成口语化、亲切自然的风格：\n${description}`,
        }
        const res = await fetch('/api/ai/analyze-demand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: prompts[action] }),
        })
        if (!res.ok) return
        const json = await res.json()
        const polished = json.data?.summary
        if (polished) updateField('description', polished)
      } catch {
        /* 静默失败 */
      } finally {
        setPolishing(null)
      }
    },
    [description, polishing, updateField],
  )

  const allItems = [...new Set([...missingInfo, ...resolvedQueue])]

  return (
    <div className="ws-stack">
      <div>
        <span className="ws-section-label">润色工具</span>
        <div className="ws-tool-row">
          {(
            [
              ['shorten', '缩短', FileText],
              ['expand', '扩写', Zap],
              ['formal', '正式版', Wand2],
              ['casual', '口语版', MessageSquare],
            ] as const
          ).map(([action, label, Icon]) => (
            <button
              key={action}
              type="button"
              disabled={!description.trim() || polishing !== null}
              onClick={() => handlePolish(action)}
              className="ws-tool-btn"
            >
              {polishing === action ? (
                <span className="ws-spinner" style={{ width: 12, height: 12 }} />
              ) : (
                <Icon className="size-3.5" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {allItems.length > 0 && (
        <div>
          <span className="ws-section-label">
            <AlertTriangle
              className="size-3.5 inline-block align-text-bottom"
              style={{ marginRight: 6, color: 'var(--ws-warning)' }}
            />
            待补充信息
            {missingQueue.length > 0 && (
              <span style={{ color: 'var(--ws-danger)', fontWeight: 400 }}>
                {' '}
                （{missingQueue.length} 项待回答）
              </span>
            )}
          </span>
          {allItems.map((info) => {
            const isQueued = missingQueue.includes(info)
            const isAnswered = answeredQueue.includes(info)
            const isResolved = resolvedQueue.includes(info)

            return (
              <button
                key={info}
                type="button"
                disabled={isAnswered || isResolved}
                onClick={() => toggleMissingQueue(info)}
                className={cn(
                  'ws-missing',
                  isResolved && 'ws-missing--resolved',
                  isQueued && 'ws-missing--queued',
                )}
              >
                {isResolved ? (
                  <CheckCircle2 className="size-3.5 shrink-0" style={{ color: 'var(--ws-success)' }} />
                ) : isAnswered ? (
                  <PencilLine className="size-3.5 shrink-0" />
                ) : isQueued ? (
                  <XCircle className="size-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="size-3.5 shrink-0" style={{ color: 'var(--ws-warning)' }} />
                )}
                <span style={{ flex: 1 }}>{info}</span>
                {isQueued && <span style={{ fontSize: 12, opacity: 0.7 }}>待回答</span>}
                {isAnswered && <span style={{ fontSize: 12, opacity: 0.7 }}>已收集</span>}
                {isResolved && <span style={{ fontSize: 12, opacity: 0.7 }}>已解决</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
