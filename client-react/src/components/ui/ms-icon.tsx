import { cn } from '@/lib/utils'

export interface MsIconProps {
  /** Material Symbols Outlined 字形名，如 chevron_left */
  name: string
  className?: string
  /** 像素尺寸，默认 20（对齐 Stitch 正文图标） */
  size?: number
  filled?: boolean
  'aria-hidden'?: boolean
  'aria-label'?: string
}

/** Stitch / Material Symbols Outlined 图标 */
export function MsIcon({
  name,
  className,
  size = 20,
  filled = false,
  ...rest
}: MsIconProps) {
  return (
    <span
      className={cn('ms-icon', className)}
      style={{
        fontSize: size,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden={rest['aria-hidden'] ?? !rest['aria-label']}
      aria-label={rest['aria-label']}
    >
      {name}
    </span>
  )
}
