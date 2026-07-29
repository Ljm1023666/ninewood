import {
  defaultObjectSizing,
  getShaderColorFromString,
  liquidMetalFragmentShader,
  LiquidMetalShapes,
  ShaderFitOptions,
  ShaderMount,
} from '@paper-design/shaders'
import { Loader2, Sparkles } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

const DEFAULT_HEIGHT = 46
const ICON_BUTTON_SIZE = 46
const MIN_TEXT_BUTTON_WIDTH = 142
const TEXT_HORIZONTAL_PADDING = 56

function estimateTextButtonWidth(label: string): number {
  let textWidth = 0
  for (const char of label) textWidth += char.charCodeAt(0) > 255 ? 15 : 8
  return Math.max(MIN_TEXT_BUTTON_WIDTH, textWidth + TEXT_HORIZONTAL_PADDING)
}

function resolveBorderRadius(shape: 'pill' | 'rect', radius?: number) {
  if (radius != null) return radius
  return shape === 'pill' ? 100 : 6
}

function buildShaderUniforms(isLight: boolean) {
  return {
    u_isImage: false,
    u_shape: LiquidMetalShapes.none,
    u_colorBack: getShaderColorFromString(isLight ? '#B8B8BE' : '#AAAAAC'),
    u_colorTint: getShaderColorFromString('#FFFFFF'),
    u_repetition: 1.6,
    u_softness: 0.05,
    u_shiftRed: 0.3,
    u_shiftBlue: 0.3,
    u_distortion: 0.1,
    u_contour: 0.4,
    u_angle: 90,
    u_fit: ShaderFitOptions[defaultObjectSizing.fit],
    u_scale: 1,
    u_rotation: defaultObjectSizing.rotation,
    u_offsetX: defaultObjectSizing.offsetX,
    u_offsetY: defaultObjectSizing.offsetY,
    u_originX: defaultObjectSizing.originX,
    u_originY: defaultObjectSizing.originY,
    u_worldWidth: defaultObjectSizing.worldWidth,
    u_worldHeight: defaultObjectSizing.worldHeight,
  }
}

function getOuterShadow(isPressed: boolean, isHovered: boolean, isLight: boolean) {
  if (isPressed) {
    return isLight
      ? '0 0 0 1px rgba(0,0,0,.14),0 1px 2px rgba(0,0,0,.08)'
      : '0 0 0 1px rgba(0,0,0,.5),0 1px 2px rgba(0,0,0,.3)'
  }
  if (isHovered) {
    return isLight
      ? '0 0 0 1px rgba(0,0,0,.16),0 10px 8px rgba(0,0,0,.06),0 4px 4px rgba(0,0,0,.08)'
      : '0 0 0 1px rgba(0,0,0,.4),0 12px 6px rgba(0,0,0,.05),0 8px 5px rgba(0,0,0,.1)'
  }
  return isLight
    ? '0 0 0 1px rgba(0,0,0,.1),0 8px 6px rgba(0,0,0,.04),0 2px 4px rgba(0,0,0,.06)'
    : '0 0 0 1px rgba(0,0,0,.3),0 20px 12px rgba(0,0,0,.08),0 9px 9px rgba(0,0,0,.12)'
}

export type LiquidMetalButtonVariant =
  | 'primary'
  | 'default'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'destructive'
  | 'outline'
  | 'link'

export type LiquidMetalButtonSize = 'sm' | 'md' | 'default' | 'lg' | 'icon'

export interface LiquidMetalButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: React.ReactNode
  label?: string
  viewMode?: 'text' | 'icon'
  shape?: 'pill' | 'rect'
  radius?: number
  icon?: React.ReactNode
  variant?: LiquidMetalButtonVariant
  size?: LiquidMetalButtonSize
  active?: boolean
  loading?: boolean
  /** 未传时仅在按下或锁定（active / aria-pressed / aria-selected）时显示金属外圈。 */
  metalGlow?: boolean
  fullWidth?: boolean
  height?: number
}

const SIZE_HEIGHTS: Record<LiquidMetalButtonSize, number> = {
  sm: 34,
  md: DEFAULT_HEIGHT,
  default: DEFAULT_HEIGHT,
  lg: 52,
  icon: ICON_BUTTON_SIZE,
}

export const LiquidMetalButton = React.forwardRef<
  HTMLButtonElement,
  LiquidMetalButtonProps
>(function LiquidMetalButton(
  {
    children,
    label,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onMouseDown,
    onMouseUp,
    onBlur,
    viewMode = 'text',
    shape = 'pill',
    radius,
    icon,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    active = false,
    metalGlow,
    fullWidth = false,
    height,
    className,
    style,
    type = 'button',
    role,
    'aria-label': ariaLabel,
    'aria-selected': ariaSelected,
    ...buttonProps
  },
  forwardedRef,
) {
  const isLight = useThemeStore((state) => !state.current.dark)
  const isDisabled = disabled || loading
  const canonicalVariant: 'primary' | 'secondary' | 'ghost' | 'danger' =
    variant === 'danger' || variant === 'destructive'
      ? 'danger'
      : variant === 'secondary' || variant === 'outline'
        ? 'secondary'
        : variant === 'ghost' || variant === 'link'
          ? 'ghost'
          : 'primary'
  const hasCustomContent = children != null
  const resolvedLabel = label ?? (hasCustomContent ? '' : 'Get Started')
  const requestedHeight = height ?? (hasCustomContent ? undefined : SIZE_HEIGHTS[size])
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null)
  const [hasVisibleSize, setHasVisibleSize] = useState(false)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const shaderRef = useRef<HTMLDivElement>(null)
  const shaderMount = useRef<ShaderMount | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleId = useRef(0)

  useEffect(() => {
    const node = buttonRef.current
    if (!node) return
    const update = () => {
      const rect = node.getBoundingClientRect()
      setHasVisibleSize(rect.width > 0 && rect.height > 0)
      if (rect.width > 0 && rect.height > 0) {
        setMeasuredSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry?.isIntersecting ?? false),
      { rootMargin: '120px' },
    )
    visibilityObserver.observe(node)
    return () => {
      observer.disconnect()
      visibilityObserver.disconnect()
    }
  }, [children, fullWidth, requestedHeight, resolvedLabel, size])

  const staticWidth = useMemo(() => {
    if (measuredSize?.width) return measuredSize.width
    if (fullWidth) return MIN_TEXT_BUTTON_WIDTH
    if (viewMode === 'icon' || size === 'icon' || hasCustomContent) return ICON_BUTTON_SIZE
    return estimateTextButtonWidth(resolvedLabel)
  }, [fullWidth, hasCustomContent, measuredSize?.width, resolvedLabel, size, viewMode])
  const resolvedHeight = measuredSize?.height ?? requestedHeight ?? SIZE_HEIGHTS[size]
  const borderRadius = viewMode === 'icon' || size === 'icon'
    ? resolvedHeight / 2
    : resolveBorderRadius(shape, radius)
  const roundedStyle = `${borderRadius}px`
  const isAriaPressed = buttonProps['aria-pressed'] === true || buttonProps['aria-pressed'] === 'true'
  const isAriaSelected = ariaSelected === true || ariaSelected === 'true'
  const isLocked = active || isAriaPressed || isAriaSelected
  const emphasize = isLocked || isPressed
  const showMetalGlow = metalGlow ?? (isLocked || isPressed)
  const shaderUniforms = useMemo(() => buildShaderUniforms(isLight), [isLight])

  useEffect(() => {
    const styleId = 'shader-canvas-style-liquid-metal-button'
    if (document.getElementById(styleId)) return
    const sheet = document.createElement('style')
    sheet.id = styleId
    sheet.textContent = `
      .shader-container-liquid-metal canvas{width:100%!important;height:100%!important;display:block!important;position:absolute!important;inset:0!important;border-radius:inherit!important}
      @keyframes liquid-metal-ripple{0%{transform:translate(-50%,-50%) scale(0);opacity:.6}100%{transform:translate(-50%,-50%) scale(4);opacity:0}}
    `
    document.head.appendChild(sheet)
  }, [])

  useEffect(() => {
    if (
      !showMetalGlow ||
      !hasVisibleSize ||
      !isNearViewport ||
      !shaderRef.current ||
      staticWidth <= 0 ||
      resolvedHeight <= 0
    ) {
      shaderMount.current?.dispose()
      shaderMount.current = null
      return
    }
    shaderMount.current?.dispose()
    shaderMount.current = new ShaderMount(
      shaderRef.current,
      liquidMetalFragmentShader,
      shaderUniforms,
      undefined,
      1,
    )
    return () => {
      shaderMount.current?.dispose()
      shaderMount.current = null
    }
  }, [hasVisibleSize, isNearViewport, resolvedHeight, shaderUniforms, showMetalGlow, staticWidth])

  useEffect(() => {
    if (!showMetalGlow) return
    shaderMount.current?.setUniforms(shaderUniforms)
    shaderMount.current?.setSpeed(isHovered || emphasize ? 1 : 0.6)
  }, [emphasize, isHovered, shaderUniforms, showMetalGlow])

  const setButtonRef = (node: HTMLButtonElement | null) => {
    buttonRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return
    if (showMetalGlow) {
      shaderMount.current?.setSpeed(2.4)
      window.setTimeout(() => shaderMount.current?.setSpeed(isHovered || isLocked ? 1 : 0.6), 300)
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const ripple = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      id: rippleId.current++,
    }
    setRipples((current) => [...current, ripple])
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id))
    }, 600)
    onClick?.(event)
  }

  const contentColor = canonicalVariant === 'danger'
    ? 'var(--error-color, var(--destructive, #ef4444))'
    : emphasize || (canonicalVariant === 'primary' && role !== 'tab')
      ? 'var(--internal-text, var(--text-primary, #e8e8e8))'
      : 'var(--internal-text-secondary, var(--text-secondary, #888888))'
  const pressTransform = isPressed ? 'translateY(1px) scale(.98)' : 'translateY(0) scale(1)'
  const rimMask = {
    padding: 2,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor' as const,
    mask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
    maskComposite: 'exclude' as const,
  }

  return (
    <button
      ref={setButtonRef}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      onMouseEnter={(event) => {
        if (!isDisabled) setIsHovered(true)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setIsHovered(false)
        setIsPressed(false)
        onMouseLeave?.(event)
      }}
      onMouseDown={(event) => {
        if (!isDisabled) setIsPressed(true)
        onMouseDown?.(event)
      }}
      onMouseUp={(event) => {
        setIsPressed(false)
        onMouseUp?.(event)
      }}
      onBlur={(event) => {
        setIsPressed(false)
        onBlur?.(event)
      }}
      className={cn(
        'liquid-metal-button relative isolate inline-flex min-h-9 items-center justify-center gap-2 overflow-hidden border-0 bg-transparent px-3 align-middle outline-none transition-[opacity,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#2fbbe0)] focus-visible:ring-offset-2',
        !showMetalGlow && 'liquid-metal-button--flat',
        `liquid-metal-button--${canonicalVariant}`,
        `liquid-metal-button--${size}`,
        fullWidth ? 'w-full min-w-0' : 'w-auto',
        isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer opacity-100',
        className,
      )}
      style={{
        ...style,
        width: fullWidth ? '100%' : hasCustomContent ? style?.width : `${staticWidth}px`,
        height: requestedHeight != null ? `${requestedHeight}px` : style?.height,
        borderRadius: roundedStyle,
        background: 'transparent',
        border: 'none',
        WebkitAppearance: 'none',
        boxSizing: 'border-box',
      }}
      aria-label={ariaLabel ?? (!hasCustomContent && viewMode === 'text' ? resolvedLabel : undefined)}
      aria-pressed={active || buttonProps['aria-pressed'] || undefined}
      aria-selected={ariaSelected}
      aria-busy={loading || undefined}
      role={role}
      {...buttonProps}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          borderRadius: roundedStyle,
          boxShadow: showMetalGlow ? getOuterShadow(isPressed, isHovered || isLocked, isLight) : 'none',
          transform: pressTransform,
          transition: 'box-shadow .15s cubic-bezier(.4,0,.2,1),transform .15s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
          visibility: showMetalGlow ? 'visible' : 'hidden',
          pointerEvents: 'none',
          ...rimMask,
        }}
      >
        <span
          ref={shaderRef}
          className="shader-container-liquid-metal"
          style={{
            position: 'relative',
            display: 'block',
            margin: -2,
            width: 'calc(100% + 4px)',
            height: 'calc(100% + 4px)',
            borderRadius: roundedStyle,
          }}
        />
      </span>
      <span
        aria-hidden
        className={cn(
          'liquid-metal-button__glass-core absolute inset-0 z-20 pointer-events-none',
          emphasize && 'liquid-metal-button__glass-core--active',
          isPressed && 'liquid-metal-button__glass-core--pressed',
          canonicalVariant === 'danger' && 'liquid-metal-button__glass-core--danger',
        )}
        style={{ inset: 2, borderRadius: roundedStyle, transform: pressTransform }}
      />
      <span
        className="liquid-metal-button__content relative z-30 inline-flex items-center justify-center gap-2"
        style={{
          color: contentColor,
          fontSize: 'var(--lm-label-size,14px)',
          fontWeight: emphasize ? 600 : 500,
          textShadow: 'var(--lm-text-shadow)',
          transform: pressTransform,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {hasCustomContent
          ? <>{loading && <Loader2 className="size-4 animate-spin" />}{children}</>
          : viewMode === 'icon'
            ? icon ?? <Sparkles size={16} />
            : resolvedLabel}
      </span>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden
          style={{
            position: 'absolute',
            zIndex: 35,
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--lm-ripple)',
            pointerEvents: 'none',
            animation: 'liquid-metal-ripple .6s ease-out',
          }}
        />
      ))}
    </button>
  )
})

LiquidMetalButton.displayName = 'LiquidMetalButton'
