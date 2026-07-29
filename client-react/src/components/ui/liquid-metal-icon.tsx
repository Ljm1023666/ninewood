import {
  defaultObjectSizing,
  getShaderColorFromString,
  liquidMetalFragmentShader,
  LiquidMetalShapes,
  ShaderFitOptions,
  ShaderMount,
} from '@paper-design/shaders'
import type { LucideIcon } from 'lucide-react'
import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme'

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

function lucideMaskUrl(Icon: LucideIcon, size: number): string {
  const markup = renderToStaticMarkup(
    createElement(Icon, {
      size,
      color: '#ffffff',
      strokeWidth: 2,
      absoluteStrokeWidth: false,
    }),
  )
  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`
}

export interface LiquidMetalIconProps {
  /** Lucide 图标：用 SVG 作 mask，金属只出现在线条上 */
  icon: LucideIcon
  size?: number
  className?: string
  /** 为 true 时挂载金属 shader；默认 false 显示平面图标 */
  metal?: boolean
  /** 金属开启时：流光加快（如固定态持续强调） */
  emphasized?: boolean
}

/**
 * 金标准金属质感画在图标线条上，不包按钮外框。
 * 平时平面；仅 metal=true 时进入金属动效。
 */
export function LiquidMetalIcon({
  icon: Icon,
  size = 26,
  className,
  metal = false,
  emphasized = false,
}: LiquidMetalIconProps) {
  const isLight = useThemeStore((state) => !state.current.dark)
  const shaderRef = useRef<HTMLDivElement>(null)
  const shaderMount = useRef<ShaderMount | null>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(false)
  const uniforms = useMemo(() => buildShaderUniforms(isLight), [isLight])
  const maskImage = useMemo(() => lucideMaskUrl(Icon, size), [Icon, size])

  useEffect(() => {
    const styleId = 'shader-canvas-style-liquid-metal-button'
    if (document.getElementById(styleId)) return
    const sheet = document.createElement('style')
    sheet.id = styleId
    sheet.textContent = `
      .shader-container-liquid-metal canvas{width:100%!important;height:100%!important;display:block!important;position:absolute!important;inset:0!important;border-radius:inherit!important}
    `
    document.head.appendChild(sheet)
  }, [])

  useEffect(() => {
    const node = rootRef.current
    if (!node || !metal) return
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry?.isIntersecting ?? false),
      { rootMargin: '80px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [metal])

  useEffect(() => {
    if (!metal || !near || !shaderRef.current || size <= 0) {
      shaderMount.current?.dispose()
      shaderMount.current = null
      return
    }
    shaderMount.current?.dispose()
    shaderMount.current = new ShaderMount(
      shaderRef.current,
      liquidMetalFragmentShader,
      uniforms,
      undefined,
      1,
    )
    return () => {
      shaderMount.current?.dispose()
      shaderMount.current = null
    }
  }, [metal, near, size, uniforms])

  useEffect(() => {
    if (!metal) return
    shaderMount.current?.setUniforms(uniforms)
    shaderMount.current?.setSpeed(emphasized ? 1.2 : 0.75)
  }, [emphasized, metal, uniforms])

  if (!metal) {
    return (
      <span
        className={cn(
          'liquid-metal-icon liquid-metal-icon--flat inline-flex shrink-0 items-center justify-center',
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Icon size={size} strokeWidth={2} className="opacity-70" />
      </span>
    )
  }

  return (
    <span
      ref={rootRef}
      className={cn(
        'liquid-metal-icon relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        ref={shaderRef}
        className="shader-container-liquid-metal absolute inset-0 block"
        style={{
          WebkitMaskImage: maskImage,
          maskImage: maskImage,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    </span>
  )
}
