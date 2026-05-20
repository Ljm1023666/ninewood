import { type ReactNode } from 'react'
import {
  FileText,
  Inbox,
  MessageCircle,
  ShoppingBag,
  Users,
  SearchX,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  type?: string
  message?: string
  actionLabel?: string
  variant?: 'default' | 'error'
  onAction?: () => void
  actionSlot?: ReactNode
  className?: string
}

const typeDefaults: Record<string, { title: string; message: string; action?: string; icon: typeof Inbox }> = {
  demand: { title: '工坊空空', message: '还没有需求发布。来写第一条，吸引合适的合作方。', action: '发布需求', icon: Inbox },
  message: { title: '静悄悄的', message: '还没有聊过天。去发现页面找找合作方？', action: '去发现', icon: MessageCircle },
  order: { title: '没有订单', message: '发布需求或接单后，订单会出现在这里。', icon: ShoppingBag },
  circle: { title: '未加入圈子', message: '发现有趣的圈子，找到志同道合的同行。', action: '发现圈子', icon: Users },
  search: { title: '没有结果', message: '没找到匹配的内容。试试换一批关键词？', icon: SearchX },
  video: { title: '暂无视频', message: '还没有短视频内容，稍后再来看看。', action: '返回首页', icon: Video },
}

export function EmptyState({
  type = 'demand',
  message,
  actionLabel,
  variant = 'default',
  onAction,
  actionSlot,
  className,
}: EmptyStateProps) {
  const d = typeDefaults[type] || typeDefaults.demand
  const title = d.title
  const desc = message || d.message
  const IconComponent = d.icon
  const isError = variant === 'error'

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div
        className={cn(
          'size-12 rounded-xl flex items-center justify-center mb-4',
          isError
            ? 'bg-red-500/10 text-red-400'
            : 'bg-[var(--accent-ghost)] text-[var(--accent-color)]',
        )}
      >
        <IconComponent className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted text-center max-w-xs">{desc}</p>
      {actionSlot ? (
        <div className="mt-4">{actionSlot}</div>
      ) : (
        onAction &&
        (actionLabel || d.action) && (
          <button
            onClick={onAction}
            className={cn(
              'mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold transition',
              isError
                ? 'bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25'
                : 'border border-border bg-card text-text-primary hover:bg-bg-tertiary',
            )}
          >
            {actionLabel || d.action}
          </button>
        )
      )}
    </div>
  )
}
