import { MsIcon } from "@/components/ui/ms-icon"
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

export interface AgentReportData {
  toolCallId?: string
  name: string
  summary: string
  verification: { path: string; label?: string } | null
  rollback: { hint?: string; utterance?: string; tool?: string } | null
}

/**
 * 执行报告卡：写操作 / 导航链完成后的仪式三。
 * 见 docs/specs/AGENT-INTERACTION-RITUALS.md §5。
 *
 * 三要素强制：执行摘要、验收路径（至少 link）、回滚方式（写操作）。
 */
interface AgentReportCardProps {
  data: AgentReportData
  onNavigate?: (path: string) => void
  className?: string
}

export function AgentExecutionReportCard({
  data,
  onNavigate,
  className = "",
}: AgentReportCardProps) {
  return (
    <div className={"agent-codex-report " + className}>
      <div className="agent-codex-report__head">
        <span className="agent-codex-report__icon" aria-hidden>
          <MsIcon name="check_circle" size={14} />
        </span>
        <span className="agent-codex-report__title">全部完成</span>
      </div>

      {data.summary ? (
        <div className="agent-codex-report__section">
          <p className="agent-codex-report__label">执行摘要</p>
          <p className="agent-codex-report__summary">{data.summary}</p>
        </div>
      ) : null}

      {data.verification?.path && onNavigate ? (
        <div className="agent-codex-report__section">
          <p className="agent-codex-report__label">验收</p>
          <LiquidMetalButton
            type="button"
            onClick={() => onNavigate(data.verification!.path)}
            className="agent-codex-report__btn"
          >
            {data.verification.label ?? "查看详情"}
            <MsIcon name="chevron_right" size={12} />
          </LiquidMetalButton>
        </div>
      ) : null}

      {data.rollback?.hint ? (
        <div className="agent-codex-report__section">
          <p className="agent-codex-report__label">如需撤销</p>
          <p className="agent-codex-report__rollback">{data.rollback.hint}</p>
        </div>
      ) : null}
    </div>
  )
}