'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** 与主 Button 高度对齐；圆角用 rounded-xl（12px）贴合 Ninewood 页面 */
const tahoeGlassButtonVariants = cva(
  'relative isolate inline-flex items-center justify-center gap-2 rounded-xl cursor-pointer text-foreground transition-[transform] duration-300 ease-out tracking-tight hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
  {
    variants: {
      size: {
        default: 'h-10 min-h-10 px-4 py-2 text-sm font-medium',
        sm: 'h-9 min-h-9 px-3 text-sm font-medium',
        lg: 'h-11 min-h-11 px-8 text-sm font-medium',
        icon: 'h-10 w-10 min-h-10 min-w-10 shrink-0 p-0 gap-0',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

const LENS_BOX_SHADOW = `
  inset 0 0 0 1px color-mix(in srgb, white calc(var(--glass-reflex-light) * 10%), transparent),
  inset 1.8px 3px 0px -2px color-mix(in srgb, white calc(var(--glass-reflex-light) * 90%), transparent),
  inset -2px -2px 0px -2px color-mix(in srgb, white calc(var(--glass-reflex-light) * 80%), transparent),
  inset -3px -8px 1px -6px color-mix(in srgb, white calc(var(--glass-reflex-light) * 60%), transparent),
  inset -0.3px -1px 4px 0px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 12%), transparent),
  inset -1.5px 2.5px 0px -2px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 20%), transparent),
  inset 0px 3px 4px -2px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 20%), transparent),
  inset 2px -6.5px 1px -4px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 10%), transparent),
  0px 1px 5px 0px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 10%), transparent),
  0px 6px 16px 0px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 8%), transparent)
`
  .replace(/\s+/g, ' ')
  .trim()

export interface TahoeGlassButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tahoeGlassButtonVariants> {
  contentClassName?: string
  /** 玻璃底色，默认随前景色低透明 */
  glassColor?: string
}

/**
 * Apple Tahoe 系液态玻璃按钮：程序化噪声位移 + 强高光阴影栈（无外链/WebP，包体小）。
 * 若需与参考稿完全一致，可将 feTurbulence 换为 feImage + data URI 法线贴图。
 */
export const TahoeGlassButton = React.forwardRef<
  HTMLButtonElement,
  TahoeGlassButtonProps
>(
  (
    {
      className,
      children,
      size,
      contentClassName,
      glassColor,
      type = 'button',
      style,
      ...props
    },
    ref,
  ) => {
    const filterId = React.useId().replace(/:/g, '')

    const lensBg = glassColor ?? 'oklch(from var(--foreground) l c h / 6%)'

    return (
      <>
        <svg
          className="pointer-events-none absolute h-0 w-0 overflow-hidden"
          aria-hidden
        >
          <filter
            id={`liquid-glass-${filterId}`}
            primitiveUnits="objectBoundingBox"
            x="0"
            y="0"
            width="1"
            height="1"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04 0.04"
              numOctaves="1"
              seed="3"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="0.02" result="blurred" />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="0.01"
              result="blur"
            />
            <feDisplacementMap
              in="blur"
              in2="blurred"
              scale="0.035"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        <button
          ref={ref}
          type={type}
          style={
            {
              ...style,
              ['--glass-reflex-light' as string]: '1',
              ['--glass-reflex-dark' as string]: '1',
            } as React.CSSProperties
          }
          className={cn(
            tahoeGlassButtonVariants({ size }),
            'border-0 bg-transparent [appearance:none]',
            className,
          )}
          {...props}
        >
          <span
            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
            style={{
              backgroundColor: lensBg,
              backdropFilter: `blur(8px) url(#liquid-glass-${filterId}) saturate(150%)`,
              WebkitBackdropFilter: 'blur(8px) saturate(150%)',
              boxShadow: LENS_BOX_SHADOW,
              transition:
                'background-color 400ms cubic-bezier(1, 0, 0.4, 1), box-shadow 400ms cubic-bezier(1, 0, 0.4, 1)',
            }}
          />
          <span
            className={cn(
              'relative z-10 flex w-full items-center justify-center gap-[inherit] select-none',
              contentClassName,
            )}
            style={{
              textShadow: '0 1px 2px oklch(from var(--background) l c h / 30%)',
            }}
          >
            {children}
          </span>
        </button>
      </>
    )
  },
)
TahoeGlassButton.displayName = 'TahoeGlassButton'

export { tahoeGlassButtonVariants }
