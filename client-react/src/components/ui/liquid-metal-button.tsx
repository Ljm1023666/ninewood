import {
  defaultObjectSizing,
  getShaderColorFromString,
  liquidMetalFragmentShader,
  LiquidMetalShapes,
  ShaderFitOptions,
  ShaderMount,
} from '@paper-design/shaders'
import { Sparkles } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

const DEFAULT_HEIGHT = 46
const ICON_BUTTON_SIZE = 46
const MIN_TEXT_BUTTON_WIDTH = 142
const TEXT_HORIZONTAL_PADDING = 56

function estimateTextButtonWidth(label: string): number {
  let textWidth = 0
  for (const char of label) {
    textWidth += char.charCodeAt(0) > 255 ? 15 : 8
  }
  return Math.max(MIN_TEXT_BUTTON_WIDTH, textWidth + TEXT_HORIZONTAL_PADDING)
}

function resolveBorderRadius(shape: 'pill' | 'rect', _height: number, radius?: number) {
  if (radius != null) return radius
  // 与参考 preset 一致：胶囊形用 100px 圆角
  return shape === 'pill' ? 100 : 6
}

/** 官方 preset 参数：矩形用 none 铺满裁切，圆形用 circle */
function buildShaderUniforms(isLight: boolean, shape: number) {
  const isCircle = shape === LiquidMetalShapes.circle
  const colorBack = isLight ? '#B8B8BE' : '#AAAAAC'
  const colorTint = '#FFFFFF'

  return {
    u_isImage: false,
    u_shape: shape,
    u_colorBack: getShaderColorFromString(colorBack),
    u_colorTint: getShaderColorFromString(colorTint),
    u_repetition: isCircle ? 2 : 1.6,
    u_softness: isCircle ? 0.1 : 0.05,
    u_shiftRed: 0.3,
    u_shiftBlue: 0.3,
    u_distortion: isCircle ? 0.07 : 0.1,
    u_contour: 0.4,
    u_angle: isCircle ? 70 : 90,
    u_fit: ShaderFitOptions[defaultObjectSizing.fit],
    u_scale: isCircle ? 0.6 : 1,
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
      ? '0 0 0 1px rgba(0, 0, 0, 0.14), 0 1px 2px rgba(0, 0, 0, 0.08)'
      : '0 0 0 1px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)'
  }
  if (isHovered) {
    return isLight
      ? '0 0 0 1px rgba(0, 0, 0, 0.16), 0 10px 8px rgba(0, 0, 0, 0.06), 0 4px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.1)'
      : '0 0 0 1px rgba(0, 0, 0, 0.4), 0 12px 6px rgba(0, 0, 0, 0.05), 0 8px 5px rgba(0, 0, 0, 0.1), 0 4px 4px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.2)'
  }
  return isLight
    ? '0 0 0 1px rgba(0, 0, 0, 0.1), 0 8px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06)'
    : '0 0 0 1px rgba(0, 0, 0, 0.3), 0 36px 14px rgba(0, 0, 0, 0.02), 0 20px 12px rgba(0, 0, 0, 0.08), 0 9px 9px rgba(0, 0, 0, 0.12), 0 2px 5px rgba(0, 0, 0, 0.15)'
}

export interface LiquidMetalButtonProps {
  label?: string
  onClick?: () => void
  viewMode?: 'text' | 'icon'
  shape?: 'pill' | 'rect'
  radius?: number
  icon?: React.ReactNode
  disabled?: boolean
  /**
   * 选中/按下强调态：加粗文字、提高描边亮度/动效强度。
   * 不控制描边是否出现——描边由 metalGlow 决定，默认空闲也常驻。
   */
  active?: boolean
  /**
   * 是否渲染金属 shader 描边。默认 true：空闲态即常驻铬/金属折射描边
   * （金标准：`PublishPage`「开始用 AI 整理」）。传 false 才隐藏。
   */
  metalGlow?: boolean
  fullWidth?: boolean
  height?: number
  className?: string
  role?: React.AriaRole
  'aria-label'?: string
  'aria-selected'?: boolean
  tabIndex?: number
}

export function LiquidMetalButton({
  label = 'Get Started',
  onClick,
  viewMode = 'text',
  shape,
  radius,
  icon,
  disabled = false,
  active = false,
  metalGlow = true,
  fullWidth = false,
  height = DEFAULT_HEIGHT,
  className,
  role,
  'aria-label': ariaLabel,
  'aria-selected': ariaSelected,
  tabIndex,
}: LiquidMetalButtonProps) {
  const isLight = useThemeStore((s) => !s.current.dark)
  const resolvedShape = shape ?? 'pill'
  // 一律用 none + CSS 圆角裁切（金标准同款），icon 圆钮也走这条路径；
  // 旧 LiquidMetalShapes.circle 在小尺寸上描边发虚，看起来像「白边旧按钮」。
  const shaderShape = LiquidMetalShapes.none
  const borderRadius =
    viewMode === 'icon'
      ? height / 2
      : resolveBorderRadius(resolvedShape, height, radius)

  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([])
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const shaderRef = useRef<HTMLDivElement>(null)
  const shaderMount = useRef<ShaderMount | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleId = useRef(0)

  useEffect(() => {
    if (!fullWidth || !shellRef.current) return

    const node = shellRef.current
    const update = () => {
      const w = node.getBoundingClientRect().width
      if (w > 0) setMeasuredWidth(Math.floor(w))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [fullWidth, label])

  const staticWidth = useMemo(() => {
    if (fullWidth) return measuredWidth ?? MIN_TEXT_BUTTON_WIDTH
    if (viewMode === 'icon') return ICON_BUTTON_SIZE
    return estimateTextButtonWidth(label)
  }, [fullWidth, measuredWidth, label, viewMode])

  const dimensions = useMemo(
    () => ({
      width: staticWidth,
      height,
      borderRadius,
    }),
    [staticWidth, height, borderRadius],
  )

  const roundedStyle = `${dimensions.borderRadius}px`
  // metalGlow=true（默认）即常驻描边；active/isPressed 只提升强调程度，不再决定是否出现
  const allowMetal = Boolean(metalGlow)
  const showMetalGlow = allowMetal
  const emphasize = active || isPressed
  const shaderUniforms = useMemo(
    () => buildShaderUniforms(isLight, shaderShape),
    [isLight, shaderShape],
  )

  useEffect(() => {
    const styleId = 'shader-canvas-style-liquid-metal-button'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .shader-container-liquid-metal canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: inherit !important;
        }
        @keyframes liquid-metal-ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    // metalGlow=false 时释放 Shader，避免隐藏 canvas 空转 rAF
    if (!showMetalGlow || !shaderRef.current || dimensions.width <= 0) {
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
  }, [dimensions.width, dimensions.height, shaderShape, showMetalGlow, shaderUniforms])

  useEffect(() => {
    if (!showMetalGlow) return
    shaderMount.current?.setUniforms(shaderUniforms)
  }, [shaderUniforms, showMetalGlow])

  useEffect(() => {
    // 空闲态也保持低速常驻流光，不再冻结；hover/按下时提速强调
    if (!showMetalGlow) return
    shaderMount.current?.setSpeed(isHovered || emphasize ? 1 : 0.6)
  }, [emphasize, isHovered, showMetalGlow])

  const handleMouseEnter = () => {
    if (disabled) return
    setIsHovered(true)
    if (allowMetal) {
      shaderMount.current?.setSpeed(1)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsPressed(false)
    if (allowMetal) {
      shaderMount.current?.setSpeed(active ? 1 : 0.6)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return

    if (allowMetal) {
      shaderMount.current?.setSpeed(2.4)
      setTimeout(() => {
        if (isHovered || active) {
          shaderMount.current?.setSpeed(1)
        } else {
          shaderMount.current?.setSpeed(0.6)
        }
      }, 300)
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const ripple = { x, y, id: rippleId.current++ }

      setRipples((prev) => [...prev, ripple])
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id))
      }, 600)
    }

    onClick?.()
  }

  // 分段未选中用次要色；主 CTA / 选中 / 按下用主文字色
  const contentColor =
    emphasize || role !== 'tab'
      ? 'var(--internal-text, var(--text-primary, #e8e8e8))'
      : 'var(--internal-text-secondary, var(--text-secondary, #888888))'
  const iconNode = icon ?? <Sparkles size={16} />
  const pressTransform = isPressed
    ? 'translateY(1px) scale(0.98)'
    : 'translateY(0) scale(1)'
  const outerShadow = showMetalGlow
    ? getOuterShadow(isPressed, isHovered || active, isLight)
    : 'none'
  // 仅露出外圈金属描边，中心留给液态玻璃去透出氛围底
  const rimMask = {
    padding: 2,
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor' as const,
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude' as const,
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        'liquid-metal-button relative transition-opacity duration-200',
        !showMetalGlow && 'liquid-metal-button--flat',
        fullWidth ? 'block h-full min-w-0 w-full' : 'inline-block',
        disabled ? 'pointer-events-none opacity-40' : 'opacity-100',
        className,
      )}
      style={{ height: fullWidth ? `${height}px` : undefined }}
    >
      <div
        style={{
          position: 'relative',
          width: fullWidth ? '100%' : `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        {/* 金属 shader 仅作 rim（mask 挖空中心，避免挡住玻璃透底） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: pressTransform,
            zIndex: 10,
            borderRadius: roundedStyle,
            boxShadow: outerShadow,
            transition:
              'box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            visibility: showMetalGlow ? 'visible' : 'hidden',
            ...rimMask,
          }}
        >
          <div
            ref={shaderRef}
            className="shader-container-liquid-metal"
            style={{
              borderRadius: roundedStyle,
              position: 'relative',
              // 抵消 rim padding，让 shader 仍铺满外轮廓
              margin: -2,
              width: 'calc(100% + 4px)',
              height: 'calc(100% + 4px)',
            }}
          />
        </div>

        {/* 中间液态玻璃芯 */}
        <div
          className={cn(
            'liquid-metal-button__glass-core',
            emphasize && 'liquid-metal-button__glass-core--active',
            isPressed && 'liquid-metal-button__glass-core--pressed',
          )}
          style={{
            position: 'absolute',
            inset: 2,
            zIndex: 20,
            pointerEvents: 'none',
            borderRadius: roundedStyle,
            transform: pressTransform,
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* 文字 / 图标 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            zIndex: 30,
            pointerEvents: 'none',
            transform: pressTransform,
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {viewMode === 'icon' && (
            <span
              style={{
                color: contentColor,
                filter: 'var(--lm-icon-drop)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {iconNode}
            </span>
          )}
          {viewMode === 'text' && (
            <span
              style={{
                fontSize: 'var(--lm-label-size, 14px)',
                color: contentColor,
                fontWeight: emphasize ? 600 : 500,
                textShadow: 'var(--lm-text-shadow)',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          )}
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={() => !disabled && setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          disabled={disabled}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
            zIndex: 40,
            overflow: 'hidden',
            borderRadius: roundedStyle,
          }}
          aria-label={ariaLabel ?? (viewMode === 'text' ? label : undefined)}
          aria-pressed={active || undefined}
          aria-selected={ariaSelected}
          role={role}
          tabIndex={tabIndex}
        >
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              style={{
                position: 'absolute',
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--lm-ripple)',
                pointerEvents: 'none',
                animation: 'liquid-metal-ripple 0.6s ease-out',
              }}
            />
          ))}
        </button>
      </div>
    </div>
  )
}
