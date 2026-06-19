import { useState, useCallback } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Zap,
  FileText,
  MessageSquare,
  Wand2,
  XCircle,
  PencilLine,
  CheckCircle2,
} from 'lucide-react'
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

  // 合并所有缺失信息的显示状态
  const allItems = [...new Set([...missingInfo, ...resolvedQueue])]

  return (
    <div className="space-y-4">
      {/* 润色工具 */}
      <div>
        <label className="text-sm font-medium text-text-muted uppercase tracking-wider">
          润色工具
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(
            [
              ['shorten', '缩短', FileText],
              ['expand', '扩写', Zap],
            ] as const
          ).map(([action, label, Icon]) => (
            <button
              key={action}
              type="button"
              disabled={!description.trim() || polishing !== null}
              onClick={() => handlePolish(action)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm text-text-muted hover:border-border hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {polishing === action ? (
                <span className="inline-block size-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              ) : (
                <Icon className="size-3" />
              )}
              {label}
            </button>
          ))}
          <span className="w-px bg-border mx-1 self-stretch" />
          {(
            [
              ['formal', '正式版', Wand2],
              ['casual', '口语版', MessageSquare],
            ] as const
          ).map(([action, label, Icon]) => (
            <button
              key={action}
              type="button"
              disabled={!description.trim() || polishing !== null}
              onClick={() => handlePolish(action)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm text-text-muted hover:border-border hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {polishing === action ? (
                <span className="inline-block size-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              ) : (
                <Icon className="size-3" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 缺失信息（可勾选队列） */}
      {allItems.length > 0 && (
        <div>
          <label className="text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="size-3 text-amber-400/60" />
            缺失信息
            {missingQueue.length > 0 && (
              <span className="text-red-400/70">
                （{missingQueue.length} 项待回答）
              </span>
            )}
            {answeredQueue.length > 0 && (
              <span className="text-gray-400/70">
                （{answeredQueue.length} 项已收集，待分析）
              </span>
            )}
          </label>
          <div className="mt-2 space-y-1.5">
            {allItems.map((info) => {
              const isQueued = missingQueue.includes(info)
              const isAnswered = answeredQueue.includes(info)
              const isResolved = resolvedQueue.includes(info)

              let border = 'border-amber-500/15'
              let bg = 'bg-amber-500/[0.04]'
              let textColor = 'text-amber-300/70'
              let Icon = Sparkles
              let iconColor = 'text-amber-400/50'
              let hover = ''

              if (isResolved) {
                border = 'border-emerald-500/20'
                bg = 'bg-emerald-500/[0.04]'
                textColor = 'text-emerald-300/60'
                Icon = CheckCircle2
                iconColor = 'text-emerald-400/50'
              } else if (isAnswered) {
                border = 'border-gray-500/20'
                bg = 'bg-gray-500/[0.04]'
                textColor = 'text-gray-300/50'
                Icon = PencilLine
                iconColor = 'text-gray-400/50'
              } else if (isQueued) {
                border = 'border-red-500/30'
                bg = 'bg-red-500/[0.06]'
                textColor = 'text-red-300/80'
                Icon = XCircle
                iconColor = 'text-red-400/60'
                hover = 'hover:border-red-500/40 hover:bg-red-500/[0.10]'
              } else {
                hover = 'hover:border-amber-500/30 hover:bg-amber-500/[0.08]'
              }

              return (
                <button
                  key={info}
                  type="button"
                  disabled={isAnswered || isResolved}
                  onClick={() => toggleMissingQueue(info)}
                  className={`flex w-full items-center gap-2 rounded-lg border ${border} ${bg} ${hover} px-3 py-2 text-left transition-all disabled:cursor-not-allowed group`}
                >
                  <Icon className={`size-3 shrink-0 ${iconColor}`} />
                  <span className={`text-sm ${textColor} flex-1`}>{info}</span>
                  {isQueued && (
                    <span className="text-sm text-red-400/40 font-medium">
                      待回答
                    </span>
                  )}
                  {isAnswered && (
                    <span className="text-sm text-gray-400/40 font-medium">
                      已收集
                    </span>
                  )}
                  {isResolved && (
                    <span className="text-sm text-emerald-400/40 font-medium">
                      已解决
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
