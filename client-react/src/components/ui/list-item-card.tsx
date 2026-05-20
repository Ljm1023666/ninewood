import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ListItemCardProps {
  children: ReactNode
  clickable?: boolean
  onClick?: () => void
  onDoubleClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  className?: string
}

export function ListItemCard({
  children,
  clickable = true,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
}: ListItemCardProps) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/90 bg-card/95 shadow-elevation-1',
        'transition-[border-color,box-shadow] duration-300',
        clickable && 'cursor-pointer',
        clickable && 'hover:border-accent/50 hover:bg-accent-ghost hover:shadow-elevation-2',
        clickable && 'active:scale-[0.99]',
        className,
      )}
    >
      {children}
    </div>
  )
}
