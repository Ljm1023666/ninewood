import {
  useId,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

type BlurIntensity = 'sm' | 'md' | 'lg' | 'xl'
type ShadowIntensity = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type GlowIntensity = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface LiquidGlassCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  children: ReactNode
  draggable?: boolean
  expandable?: boolean
  width?: string
  height?: string
  expandedWidth?: string
  expandedHeight?: string
  blurIntensity?: BlurIntensity
  shadowIntensity?: ShadowIntensity
  borderRadius?: string
  glowIntensity?: GlowIntensity
}

const blurClasses: Record<BlurIntensity, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
}

const shadowStyles: Record<ShadowIntensity, string> = {
  none: 'inset 0 0 0 0 rgba(255, 255, 255, 0)',
  xs: 'inset 1px 1px 1px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 1px 0 rgba(255, 255, 255, 0.3)',
  sm: 'inset 2px 2px 2px 0 rgba(255, 255, 255, 0.35), inset -2px -2px 2px 0 rgba(255, 255, 255, 0.35)',
  md: 'inset 3px 3px 3px 0 rgba(255, 255, 255, 0.45), inset -3px -3px 3px 0 rgba(255, 255, 255, 0.45)',
  lg: 'inset 4px 4px 4px 0 rgba(255, 255, 255, 0.5), inset -4px -4px 4px 0 rgba(255, 255, 255, 0.5)',
  xl: 'inset 6px 6px 6px 0 rgba(255, 255, 255, 0.55), inset -6px -6px 6px 0 rgba(255, 255, 255, 0.55)',
}

const glowStyles: Record<GlowIntensity, string> = {
  none: '0 4px 4px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 0, 0, 0.05)',
  xs: '0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 16px rgba(255, 255, 255, 0.05)',
  sm: '0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 24px rgba(255, 255, 255, 0.1)',
  md: '0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 32px rgba(255, 255, 255, 0.15)',
  lg: '0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 40px rgba(255, 255, 255, 0.2)',
  xl: '0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 48px rgba(255, 255, 255, 0.25)',
}

export function LiquidGlassCard({
  children,
  className = '',
  draggable = false,
  expandable = false,
  width,
  height,
  expandedWidth,
  expandedHeight,
  blurIntensity = 'xl',
  borderRadius = '16px',
  glowIntensity = 'sm',
  shadowIntensity = 'md',
  ...props
}: LiquidGlassCardProps) {
  const { style: propStyle, ...rest } = props
  const [isExpanded, setIsExpanded] = useState(false)
  const filterId = useId().replace(/:/g, '')

  const handleToggleExpansion = (e: MouseEvent<HTMLDivElement>) => {
    if (!expandable) return
    const t = e.target as HTMLElement
    if (t.closest('a, button, input, select, textarea')) return
    setIsExpanded((v) => !v)
  }

  const containerVariants = expandable
    ? {
        collapsed: {
          width: width || 'auto',
          height: height || 'auto',
          transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] as const },
        },
        expanded: {
          width: expandedWidth || 'auto',
          height: expandedHeight || 'auto',
          transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] as const },
        },
      }
    : undefined

  const baseClassName = cn(
    'relative overflow-hidden',
    draggable && 'cursor-grab active:cursor-grabbing',
    expandable && 'cursor-pointer',
    className,
  )

  const baseStyle: CSSProperties = {
    borderRadius,
    ...(width && !expandable ? { width } : {}),
    ...(height && !expandable ? { height } : {}),
  }

  const layers = (
    <>
      <div
        className={cn('absolute inset-0 z-0', blurClasses[blurIntensity])}
        style={{
          borderRadius,
          filter: `url(#${filterId})`,
        }}
      />
      <div
        className="absolute inset-0 z-10"
        style={{ borderRadius, boxShadow: glowStyles[glowIntensity] }}
      />
      <div
        className="absolute inset-0 z-20"
        style={{ borderRadius, boxShadow: shadowStyles[shadowIntensity] }}
      />
      <div className="relative z-30">{children}</div>
    </>
  )

  return (
    <>
      <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
        <defs>
          <filter
            id={filterId}
            x="0"
            y="0"
            width="100%"
            height="100%"
            filterUnits="objectBoundingBox"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.003 0.007"
              numOctaves={1}
              result="turbulence"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale={200}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        className={baseClassName}
        style={{ ...baseStyle, ...propStyle }}
        variants={containerVariants}
        animate={expandable ? (isExpanded ? 'expanded' : 'collapsed') : undefined}
        onClick={expandable ? handleToggleExpansion : undefined}
        drag={draggable}
        dragConstraints={draggable ? ({ left: 0, right: 0, top: 0, bottom: 0 } as const) : undefined}
        dragElastic={draggable ? 0.3 : undefined}
        dragTransition={draggable ? { bounceStiffness: 300, bounceDamping: 10, power: 0.3 } : undefined}
        whileDrag={draggable ? { scale: 1.02 } : undefined}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        {...rest}
      >
        {layers}
      </motion.div>
    </>
  )
}
