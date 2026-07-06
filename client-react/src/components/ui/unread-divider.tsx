import { cn } from '@/lib/utils'

interface UnreadDividerProps {
  className?: string
}

/** 未读消息分隔线（Slack / 微信风格） */
export function UnreadDivider({ className }: UnreadDividerProps) {
  return (
    <div className={cn('msg-unread-divider', className)} role="separator">
      <span className="msg-unread-divider__line" aria-hidden />
      <span className="msg-unread-divider__label">以下为新消息</span>
      <span className="msg-unread-divider__line" aria-hidden />
    </div>
  )
}
