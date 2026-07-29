import { MsIcon } from '@/components/ui/ms-icon'
import { AGENT_TOOL_LABELS } from '@/types/agent-access'
import {
  getDemandId,
  getNavigatePath,
  isPendingToolCall,
  type AgentToolCall,
} from '@/types/agent-tool-call'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

type AgentToolCallCardProps = {
  tool: AgentToolCall
  onApprove?: () => void
  onReject?: () => void
  onNavigate?: (path: string) => void
  className?: string
}

export function AgentToolCallCard({
  tool,
  onApprove,
  onReject,
  onNavigate,
  className = '',
}: AgentToolCallCardProps) {
  const pending = isPendingToolCall(tool)
  const navigatePath = getNavigatePath(tool)
  const demandId = getDemandId(tool)
  const label = AGENT_TOOL_LABELS[tool.name] ?? tool.name

  const statusLabel = pending
    ? '待批准'
    : tool.status === 'rejected'
      ? '已拒绝'
      : tool.result
        ? '完成'
        : '执行中'

  const statusClass = pending
    ? 'text-amber-500'
    : tool.status === 'rejected'
      ? 'text-red-500/80'
      : tool.result
        ? 'text-emerald-600'
        : 'text-text-muted'

  return (
    <div className={`agent-codex-tool-card ${className}`.trim()}>
      <div className="flex items-center gap-2 px-3 py-2">
        <MsIcon
          name="build"
          size={14}
          className="shrink-0 text-[var(--internal-text-muted)]"
        />
        <span className="text-xs font-medium text-text-primary">{label}</span>
        <span className="flex-1" />
        <span className={`text-xs ${statusClass}`}>
          {!pending && tool.result && tool.status !== 'rejected' ? (
            <span className="inline-flex items-center gap-1">
              <MsIcon name="check" size={12} />
              {statusLabel}
            </span>
          ) : pending ? (
            statusLabel
          ) : tool.status !== 'executed' && !tool.result ? (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--internal-accent)]" />
              {statusLabel}
            </span>
          ) : (
            statusLabel
          )}
        </span>
      </div>

      {tool.steps && tool.steps.length > 0 ? (
        <div className="border-t border-[var(--internal-hairline)] px-3 py-2">
          <ol className="space-y-1">
            {tool.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-text-muted"
              >
                <span className="shrink-0 font-mono text-[10px] text-text-secondary">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : tool.result ? (
        <div className="border-t border-[var(--internal-hairline)] px-3 pb-2.5 pt-0">
          <div className="mt-1.5 text-xs leading-relaxed text-text-muted">
            {tool.result}
          </div>
        </div>
      ) : null}

      {pending && onApprove && onReject ? (
        <div className="agent-codex-tool-approval">
          <LiquidMetalButton
            type="button"
            className="agent-codex-tool-approval__btn agent-codex-tool-approval__btn--approve"
            onClick={onApprove}
          >
            批准
          </LiquidMetalButton>
          <LiquidMetalButton
            type="button"
            className="agent-codex-tool-approval__btn agent-codex-tool-approval__btn--reject"
            onClick={onReject}
          >
            拒绝
          </LiquidMetalButton>
        </div>
      ) : null}

      {navigatePath && onNavigate && !pending ? (
        <div className="border-t border-[var(--internal-hairline)] px-3 py-2">
          <LiquidMetalButton
            type="button"
            onClick={() => onNavigate(navigatePath)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--internal-accent)] transition-colors hover:opacity-80"
          >
            前往页面
            <MsIcon name="chevron_right" size={12} />
          </LiquidMetalButton>
        </div>
      ) : null}

      {demandId && onNavigate && !pending ? (
        <div className="border-t border-[var(--internal-hairline)] px-3 py-2">
          <LiquidMetalButton
            type="button"
            onClick={() => onNavigate(`/demands/${demandId}`)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--internal-accent)] transition-colors hover:opacity-80"
          >
            查看需求卡片
            <MsIcon name="chevron_right" size={12} />
          </LiquidMetalButton>
        </div>
      ) : null}
    </div>
  )
}
