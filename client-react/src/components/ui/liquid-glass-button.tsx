'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// ============ 基础 Button（shadcn 风格） ============

const buttonVariants = cva(
  'inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-primary-foreground hover:bg-destructive/90',
        cool: 'dark:inset-shadow-2xs dark:inset-shadow-white/10 bg-linear-to-t border border-b-2 border-zinc-950/40 from-primary to-primary/85 shadow-md shadow-primary/20 ring-1 ring-inset ring-white/25 transition-[filter] duration-200 hover:brightness-110 active:brightness-90 dark:border-x-0 text-primary-foreground dark:text-primary-foreground dark:border-t-0 dark:border-primary/50 dark:ring-white/5',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

// ============ Liquid Button — 玻璃液态按钮 ============

const liquidbuttonVariants = cva(
  "inline-flex items-center transition-colors justify-center cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-transparent hover:scale-105 duration-300 transition text-primary',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 text-xs gap-1.5 px-4 has-[>svg]:px-4',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        xl: 'h-12 rounded-md px-8 has-[>svg]:px-6',
        xxl: 'h-14 rounded-md px-10 has-[>svg]:px-8',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'xxl' },
  },
)

function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter
          id="container-glass"
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

function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof liquidbuttonVariants> & { asChild?: boolean }) {
  const GLASS_SHADOW =
    'shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]'

  // asChild: glass layers sit outside Slot so it only gets one child
  if (asChild) {
    return (
      <div
        className={cn(
          'relative inline-flex',
          liquidbuttonVariants({ variant, size, className }),
        )}
      >
        <div
          className={`pointer-events-none absolute inset-0 z-0 transition-all ${GLASS_SHADOW}`}
          style={{ borderRadius: 'inherit' }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            borderRadius: 'inherit',
            backdropFilter: 'url("#container-glass")',
          }}
        />
        <Slot data-slot="button" className="relative z-10" {...props}>
          {children}
        </Slot>
        <GlassFilter />
      </div>
    )
  }

  // Normal button mode: glass layers are inside the <button>
  return (
    <button
      data-slot="button"
      className={cn(
        'relative',
        liquidbuttonVariants({ variant, size, className }),
      )}
      {...props}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-0 transition-all ${GLASS_SHADOW}`}
        style={{ borderRadius: 'inherit' }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          borderRadius: 'inherit',
          backdropFilter: 'url("#container-glass")',
        }}
      />
      <div className="pointer-events-none relative z-10">{children}</div>
      <GlassFilter />
    </button>
  )
}

// ============ Metal Button — 金属质感按钮 ============

type ColorVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'error'
  | 'gold'
  | 'bronze'

interface MetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ColorVariant
}

const colorVariants: Record<
  ColorVariant,
  {
    outer: string
    inner: string
    button: string
    textColor: string
    textShadow: string
  }
> = {
  default: {
    outer: 'bg-gradient-to-b from-[#000] to-[#A0A0A0]',
    inner: 'bg-gradient-to-b from-[#FAFAFA] via-[#3E3E3E] to-[#E5E5E5]',
    button: 'bg-gradient-to-b from-[#B9B9B9] to-[#969696]',
    textColor: 'text-white',
    textShadow: '[text-shadow:_0_-1px_0_rgb(80_80_80_/_100%)]',
  },
  primary: {
    outer: 'bg-gradient-to-b from-[#000] to-[#A0A0A0]',
    inner: 'bg-gradient-to-b from-primary via-secondary to-muted',
    button: 'bg-gradient-to-b from-primary to-primary/40',
    textColor: 'text-white',
    textShadow: '[text-shadow:_0_-1px_0_rgb(30_58_138_/_100%)]',
  },
  success: {
    outer: 'bg-gradient-to-b from-[#005A43] to-[#7CCB9B]',
    inner: 'bg-gradient-to-b from-[#E5F8F0] via-[#00352F] to-[#D1F0E6]',
    button: 'bg-gradient-to-b from-[#9ADBC8] to-[#3E8F7C]',
    textColor: 'text-[#FFF7F0]',
    textShadow: '[text-shadow:_0_-1px_0_rgb(6_78_59_/_100%)]',
  },
  error: {
    outer: 'bg-gradient-to-b from-[#5A0000] to-[#FFAEB0]',
    inner: 'bg-gradient-to-b from-[#FFDEDE] via-[#680002] to-[#FFE9E9]',
    button: 'bg-gradient-to-b from-[#F08D8F] to-[#A45253]',
    textColor: 'text-[#FFF7F0]',
    textShadow: '[text-shadow:_0_-1px_0_rgb(146_64_14_/_100%)]',
  },
  gold: {
    outer: 'bg-gradient-to-b from-[#917100] to-[#EAD98F]',
    inner: 'bg-gradient-to-b from-[#FFFDDD] via-[#856807] to-[#FFF1B3]',
    button: 'bg-gradient-to-b from-[#FFEBA1] to-[#9B873F]',
    textColor: 'text-[#FFFDE5]',
    textShadow: '[text-shadow:_0_-1px_0_rgb(178_140_2_/_100%)]',
  },
  bronze: {
    outer: 'bg-gradient-to-b from-[#864813] to-[#E9B486]',
    inner: 'bg-gradient-to-b from-[#EDC5A1] via-[#5F2D01] to-[#FFDEC1]',
    button: 'bg-gradient-to-b from-[#FFE3C9] to-[#A36F3D]',
    textColor: 'text-[#FFF7F0]',
    textShadow: '[text-shadow:_0_-1px_0_rgb(124_45_18_/_100%)]',
  },
}

function metalButtonVariants(
  variant: ColorVariant,
  isPressed: boolean,
  isHovered: boolean,
) {
  const colors = colorVariants[variant]
  const t = 'all 250ms cubic-bezier(0.1, 0.4, 0.2, 1)'

  return {
    // 与 Sidebar 传入的 rounded-xl 一致，避免外圈 rounded-md + 投影看起来像方角
    wrapper: cn(
      'relative inline-flex transform-gpu rounded-xl p-[1.25px] will-change-transform',
      colors.outer,
    ),
    wrapperStyle: {
      transform: isPressed
        ? 'translateY(2.5px) scale(0.99)'
        : 'translateY(0) scale(1)',
      boxShadow: isPressed
        ? '0 1px 2px rgba(0, 0, 0, 0.15)'
        : isHovered
          ? '0 4px 12px rgba(0, 0, 0, 0.12)'
          : '0 3px 8px rgba(0, 0, 0, 0.08)',
      transition: t,
      transformOrigin: 'center center',
    },
    inner: cn(
      'absolute inset-[1px] transform-gpu rounded-[inherit] will-change-transform',
      colors.inner,
    ),
    innerStyle: {
      transition: t,
      transformOrigin: 'center center',
      filter:
        isHovered && !isPressed ? 'brightness(1.05)' : 'none',
    },
    button: cn(
      'relative z-10 m-[1px] inline-flex h-11 transform-gpu cursor-pointer items-center justify-center overflow-hidden rounded-[inherit] px-6 py-2 text-sm leading-none font-semibold will-change-transform outline-none',
      colors.button,
      colors.textColor,
      colors.textShadow,
    ),
    buttonStyle: {
      transform: isPressed ? 'scale(0.97)' : 'scale(1)',
      transition: t,
      transformOrigin: 'center center',
      filter:
        isHovered && !isPressed ? 'brightness(1.02)' : 'none',
    },
  }
}

const ShineEffect = ({ isPressed }: { isPressed: boolean }) => (
  <div
    className={cn(
      'pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit] transition-opacity duration-300',
      isPressed ? 'opacity-20' : 'opacity-0',
    )}
  >
    <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-transparent via-neutral-100 to-transparent" />
  </div>
)

export const MetalButton = React.forwardRef<
  HTMLButtonElement,
  MetalButtonProps
>(({ children, className, variant = 'default', ...props }, ref) => {
  const [isPressed, setIsPressed] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)

  const v = metalButtonVariants(variant, isPressed, isHovered)

  return (
    <div className={v.wrapper} style={v.wrapperStyle}>
      <div className={v.inner} style={v.innerStyle} />
      <button
        ref={ref}
        className={cn(v.button, className)}
        style={v.buttonStyle}
        {...props}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => {
          setIsPressed(false)
          setIsHovered(false)
        }}
        onMouseEnter={() => setIsHovered(true)}
      >
        <ShineEffect isPressed={isPressed} />
        {children}
        {isHovered && !isPressed && (
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-t from-transparent to-white/5" />
        )}
      </button>
    </div>
  )
})
MetalButton.displayName = 'MetalButton'

export { Button, buttonVariants, LiquidButton, GlassFilter }
