import { type ReactNode, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ListItemCardProps {
  children: ReactNode
  clickable?: boolean
  onClick?: () => void
  onDoubleClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  className?: string
  accentBar?: boolean
}

export function ListItemCard({
  children,
  clickable = true,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  accentBar = true,
}: ListItemCardProps) {
  const rippleRef = useRef<HTMLDivElement>(null)

  function handleClick(e: React.MouseEvent) {
    if (!onClick) return
    // ripple
    const el = rippleRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2
      const ripple = document.createElement('span')
      ripple.style.cssText = [
        `position:absolute; left:${x}px; top:${y}px`,
        `width:${size}px; height:${size}px`,
        'border-radius:50%',
        'background:rgba(255,255,255,0.1)',
        'transform:scale(0)',
        'animation:ripple-effect 0.5s ease-out forwards',
        'pointer-events:none',
      ].join(';')
      el.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    }
    onClick()
  }

  return (
    <motion.div
      ref={rippleRef}
      onClick={clickable ? handleClick : undefined}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/90 bg-card/95 shadow-elevation-1 backdrop-blur-sm',
        'transition-[transform,border-color,background-color,box-shadow] duration-200',
        clickable &&
          'cursor-pointer hover:bg-bg-tertiary hover:border-accent/45',
        clickable &&
          accentBar &&
          'hover:shadow-[4px_0_0_var(--primary-start),var(--elevation-2)]',
        clickable && !accentBar && 'hover:shadow-elevation-2',
        clickable && 'active:scale-[0.98]',
        className,
      )}
      whileHover={clickable ? { x: 4 } : undefined}
    >
      {children}
    </motion.div>
  )
}
