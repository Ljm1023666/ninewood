/**
 * Task 10 · 自动化任务草稿卡
 *
 * 在 /agent 对话中由 draft_automation_task 工具触发（SSE task_draft）。
 * 确认 → POST /api/agent/tasks；取消 → 仅移除卡片，不创建任务。
 *
 * 平台宪法：创建必经此卡确认，禁止静默创建（spec §0.1/§7）。
 */
import { useState } from 'react'
import { agentTasksApi, type DeliveryChannel } from '@/api/agent-tasks'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { cn } from '@/lib/utils'

export interface AgentTaskDraftData {
  draftId: string
  name: string
  type: 'DEMAND_DIGEST'
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY'
  atHour: number | null
  atMinute: number
  weekday: number | null
  filters: Record<string, unknown>
  deliveryChannels: DeliveryChannel[]
  humanSchedule: string
  humanFilters: string
}

type AgentTaskDraft = AgentTaskDraftData

interface Props {
  draft: AgentTaskDraft
  onConfirmed?: (taskId: string) => void
  onCancelled?: () => void
  className?: string
}

export function AgentTaskDraftCard({ draft, onConfirmed, onCancelled, className }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'confirmed' | 'cancelled' | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      const task = await agentTasksApi.create({
        name: draft.name,
        type: draft.type,
        frequency: draft.frequency,
        atHour: draft.atHour ?? undefined,
        atMinute: draft.atMinute,
        weekday: draft.weekday ?? undefined,
        filters: draft.filters,
        deliveryChannels: draft.deliveryChannels,
      })
      setDone('confirmed')
      onConfirmed?.(task.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '创建失败，请重试'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel() {
    setDone('cancelled')
    onCancelled?.()
  }

  return (
    <div className={cn('agent-card agent-task-draft-card', className)} data-draft-id={draft.draftId}>
      <div className="agent-task-draft-card__header">
        <span className="agent-task-draft-card__icon" aria-hidden>
          ⏱
        </span>
        <div className="agent-task-draft-card__title">
          <strong>自动化任务草稿</strong>
          <span className="agent-task-draft-card__sub">定时筛选 + 推送摘要</span>
        </div>
      </div>

      <div className="agent-task-draft-card__body">
        <div className="agent-task-draft-card__row">
          <span className="agent-task-draft-card__label">任务名</span>
          <span className="agent-task-draft-card__value">{draft.name}</span>
        </div>
        <div className="agent-task-draft-card__row">
          <span className="agent-task-draft-card__label">运行时刻</span>
          <span className="agent-task-draft-card__value">{draft.humanSchedule}</span>
        </div>
        <div className="agent-task-draft-card__row">
          <span className="agent-task-draft-card__label">筛选条件</span>
          <span className="agent-task-draft-card__value">{draft.humanFilters}</span>
        </div>
        <div className="agent-task-draft-card__row">
          <span className="agent-task-draft-card__label">投递通道</span>
          <span className="agent-task-draft-card__value">
            {draft.deliveryChannels.map(ch =>
              ch === 'MESSAGE' ? '消息中心' : 'Agent 结果箱',
            ).join(' + ')}
          </span>
        </div>
      </div>

      {done === null && (
        <div className="agent-task-draft-card__actions">
          <LiquidMetalButton
            label={submitting ? '创建中…' : '确认创建'}
            onClick={handleConfirm}
            disabled={submitting}
          />
          <button
            type="button"
            className="agent-btn agent-btn--ghost"
            onClick={handleCancel}
            disabled={submitting}
          >
            取消
          </button>
        </div>
      )}

      {done === 'confirmed' && (
        <div className="agent-task-draft-card__status agent-task-draft-card__status--ok">
          ✓ 已创建任务，可在「自动化」页管理
        </div>
      )}
      {done === 'cancelled' && (
        <div className="agent-task-draft-card__status">已取消，未创建任务</div>
      )}
      {error && (
        <div className="agent-task-draft-card__status agent-task-draft-card__status--err">
          {error}
        </div>
      )}

      <div className="agent-task-draft-card__hint">
        平台宪法：自动化只读 + 只推送，永不调用写工具
      </div>
    </div>
  )
}