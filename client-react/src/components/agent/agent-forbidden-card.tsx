import { MsIcon } from "@/components/ui/ms-icon"

export interface AgentForbiddenCardData {
  id?: string
  matchedSignal?: string
  message: string
  redirect?: string
  redirectPattern?: string
  fallbackPage?: string
}

interface AgentForbiddenCardProps {
  data: AgentForbiddenCardData
  onNavigate?: (path: string) => void
  className?: string
}

/**
 * 拒绝卡片：用于「平台禁区」类请求（如代为支付、注销账号、变更权限）。
 * 见 docs/specs/AGENT-INTERACTION-RITUALS.md §8.2。
 */
export function AgentForbiddenCard({
  data,
  onNavigate,
  className = "",
}: AgentForbiddenCardProps) {
  const label = data.id ? "无法代你完成此操作" : "操作受限"
  const targetPath = data.redirect ?? data.fallbackPage
  const buttonText = data.redirect
    ? "前往相关页面"
    : data.fallbackPage
      ? "前往手动页面"
      : null

  return (
    <div className={"agent-codex-forbidden " + className}>
      <div className="agent-codex-forbidden__head">
        <span className="agent-codex-forbidden__icon" aria-hidden>
          <MsIcon name="block" size={14} />
        </span>
        <span className="agent-codex-forbidden__label">{label}</span>
      </div>
      <p className="agent-codex-forbidden__body">{data.message}</p>
      {targetPath && onNavigate && buttonText ? (
        <div className="agent-codex-forbidden__action">
          <button
            type="button"
            onClick={() => onNavigate(targetPath)}
            className="agent-codex-forbidden__btn"
          >
            {buttonText}
            <MsIcon name="chevron_right" size={12} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
