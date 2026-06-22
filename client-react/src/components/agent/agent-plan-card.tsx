import { MsIcon } from "@/components/ui/ms-icon"

export interface AgentPlanStep {
  key: string
  label: string
}

export interface AgentPlanCardData {
  planId: string
  toolCallId?: string
  capabilityId: string
  name: string
  title: string
  steps: AgentPlanStep[]
}

/**
 * 计划公示卡：写操作前给用户的「我将要做」概览（仪式一）。
 * 见 docs/specs/AGENT-INTERACTION-RITUALS.md §3。
 *
 * 注意：当前实施把 Plan 卡与现有 tool_pending 批准流绑定（同一 toolCallId），
 * 确认按钮直接复用 approve-tool API。
 */
interface AgentPlanCardProps {
  data: AgentPlanCardData
  onConfirm?: () => void
  onCancel?: () => void
  className?: string
}

export function AgentPlanCard({
  data,
  onConfirm,
  onCancel,
  className = "",
}: AgentPlanCardProps) {
  return (
    <div className={"agent-codex-plan " + className}>
      <div className="agent-codex-plan__head">
        <span className="agent-codex-plan__icon" aria-hidden>
          <MsIcon name="checklist" size={14} />
        </span>
        <span className="agent-codex-plan__title">执行计划</span>
      </div>
      <p className="agent-codex-plan__body">{data.title}</p>
      <ol className="agent-codex-plan__steps">
        {data.steps.map((s, i) => (
          <li key={s.key} className="agent-codex-plan__step">
            <span className="agent-codex-plan__step-idx">{i + 1}</span>
            <span className="agent-codex-plan__step-label">{s.label}</span>
          </li>
        ))}
      </ol>
      {onConfirm || onCancel ? (
        <div className="agent-codex-plan__actions">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="agent-codex-plan__btn agent-codex-plan__btn--cancel"
            >
              取消
            </button>
          ) : null}
          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              className="agent-codex-plan__btn agent-codex-plan__btn--confirm"
            >
              确认执行
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}