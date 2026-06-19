"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ── SVG 液态玻璃滤镜 ──

function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter
          id="liquid-btn-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur
            in="turbulence"
            stdDeviation="2"
            result="blurredNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

// ── CVA variants ──

const liquidButtonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,box-shadow] duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[--accent-color]/35",
  {
    variants: {
      variant: {
        default:
          "bg-transparent hover:scale-105 text-[--text-primary]",
        destructive:
          "bg-[--error-color]/15 text-[--error-color] hover:bg-[--error-color]/25",
        outline:
          "border border-[--border-color] bg-transparent hover:bg-[--bg-card] text-[--text-primary]",
        secondary:
          "bg-[--bg-card] text-[--text-secondary] hover:bg-[--bg-tertiary]",
        ghost:
          "hover:bg-[--bg-card] text-[--text-primary]",
      },
      size: {
        sm: "h-8 text-xs gap-1.5 px-4 rounded-lg",
        default: "h-9 px-4 py-2 rounded-lg",
        lg: "h-10 px-6 rounded-lg text-sm",
        xl: "h-12 px-8 rounded-xl text-sm",
        xxl: "h-14 px-10 rounded-xl text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xxl",
    },
  }
)

// ── 玻璃层样式 ──

const glassLayerBase: React.CSSProperties = {
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  filter: 'url("#liquid-btn-glass")',
  isolation: 'isolate' as const,
}

const glassTintDark: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
}
const glassTintLight: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.04)',
}

const glassBevelDark: React.CSSProperties = {
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15)',
}
const glassBevelLight: React.CSSProperties = {
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
}

// ── 带玻璃效果的主按钮 ──

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidButtonVariants> {
  asChild?: boolean
  /** 覆盖玻璃层主题，默认跟随 data-appearance */
  glassSurface?: "dark" | "light"
}

export const LiquidButton = React.forwardRef<
  HTMLButtonElement,
  LiquidButtonProps
>(
  (
    {
      className,
      variant = "default",
      size,
      asChild = false,
      glassSurface,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDefaultVariant = variant === "default"
    const isLightSurface = glassSurface === "light"

    const tint = isLightSurface ? glassTintLight : glassTintDark
    const bevel = isLightSurface ? glassBevelLight : glassBevelDark

    return (
      <>
        <Comp
          data-slot="button"
          ref={ref}
          className={cn(
            "relative overflow-hidden",
            liquidButtonVariants({ variant, size, className })
          )}
          {...props}
        >
          {/* 玻璃层（仅 default variant） */}
          {isDefaultVariant && (
            <>
              {/* 玻璃模糊 + 液态变形层 */}
              <div
                className="absolute inset-0 z-0 overflow-hidden rounded-inherit"
                style={glassLayerBase}
              />
              {/* 玻璃底色 */}
              <div
                className="absolute inset-0 z-[5] rounded-inherit"
                style={tint}
              />
              {/* 玻璃边缘高光 */}
              <div
                className="absolute inset-0 z-[15] rounded-inherit overflow-hidden pointer-events-none"
                style={bevel}
              />
            </>
          )}

          {/* 文字 */}
          <span className="pointer-events-none relative z-20">
            {children}
          </span>

          {isDefaultVariant && <GlassFilter />}
        </Comp>
      </>
    )
  }
)
LiquidButton.displayName = "LiquidButton"

// ── 简化版玻璃按钮（无 SVG 滤镜，纯 CSS 玻璃态）──

const glassButtonVariants = cva(
  "relative isolate cursor-pointer rounded-full transition-all duration-300 font-medium",
  {
    variants: {
      size: {
        default: "text-base",
        sm: "text-sm",
        lg: "text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string
}

export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  GlassButtonProps
>(({ className, children, size, contentClassName, ...props }, ref) => {
  return (
    <div className={cn("glass-button-wrap cursor-pointer rounded-full", className)}>
      <button
        className={cn("glass-button", glassButtonVariants({ size }))}
        ref={ref}
        {...props}
      >
        <span className={cn("glass-button-text relative block select-none tracking-tighter", contentClassName)}>
          {children}
        </span>
      </button>
      <div className="glass-button-shadow rounded-full"></div>
    </div>
  )
})
GlassButton.displayName = "GlassButton"
