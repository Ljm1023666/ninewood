import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ListItemCardProps {
  children: ReactNode
  clickable?: boolean
  onClick?: () => void
  onDoubleClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  className?: string
  /** internal = Stitch 发丝线卡片（无阴影）；default = 发现页原有 elevation */
  variant?: 'default' | 'internal'
}

export function ListItemCard({
  children,
  clickable = true,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  variant = 'default',
}: ListItemCardProps) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        'group relative overflow-hidden',
        variant === 'internal'
          ? cn(
              'internal-list-card',
              clickable && 'cursor-pointer',
            )
          : cn(
              'rounded-xl border border-border/90 bg-card/95 shadow-elevation-1',
              'transition-[border-color,box-shadow] duration-300',
              clickable && 'cursor-pointer',
              clickable &&
                'hover:border-white/20 hover:bg-bg-secondary hover:shadow-elevation-2',
              clickable && 'active:scale-[0.99]',
            ),
        className,
      )}
    >
      {children}
    </div>
  )
}
