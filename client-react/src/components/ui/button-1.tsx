'use client'

import React, { useState, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

let uidCounter = 0
function nextUid() {
  return `lg${++uidCounter}`
}

// ============ Types ============

type ColorKey =
  | 'color1'
  | 'color2'
  | 'color3'
  | 'color4'
  | 'color5'
  | 'color6'
  | 'color7'
  | 'color8'
  | 'color9'
  | 'color10'
  | 'color11'
  | 'color12'
  | 'color13'
  | 'color14'
  | 'color15'
  | 'color16'
  | 'color17'

export type Colors = Record<ColorKey, string>

const svgOrder = [
  'svg1',
  'svg2',
  'svg3',
  'svg4',
  'svg3',
  'svg2',
  'svg1',
] as const
type SvgKey = (typeof svgOrder)[number]

type Stop = { offset: number; stopColor: string }
type SvgState = { gradientTransform: string; stops: Stop[] }
type SvgStates = Record<SvgKey, SvgState>

// ============ Helpers ============

function createStopsArray(
  svgStates: SvgStates,
  svgOrder: readonly SvgKey[],
  maxStops: number,
): Stop[][] {
  const stopsArray: Stop[][] = []
  for (let i = 0; i < maxStops; i++) {
    stopsArray.push(
      svgOrder.map((key) => {
        const svg = svgStates[key]
        return svg.stops[i] || svg.stops[svg.stops.length - 1]
      }),
    )
  }
  return stopsArray
}

// ============ Colors ============

const DEFAULT_COLORS: Colors = {
  color1: '#FFFFFF',
  color2: '#1E10C5',
  color3: '#9089E2',
  color4: '#FCFCFE',
  color5: '#F9F9FD',
  color6: '#B2B8E7',
  color7: '#0E2DCB',
  color8: '#0017E9',
  color9: '#4743EF',
  color10: '#7D7BF4',
  color11: '#0B06FC',
  color12: '#C5C1EA',
  color13: '#1403DE',
  color14: '#B6BAF6',
  color15: '#C1BEEB',
  color16: '#290ECB',
  color17: '#3F4CC0',
}

// ============ GradientSvg ============

type GradientSvgProps = {
  className: string
  isHovered: boolean
  colors: Colors
  id: string
}

const GradientSvg: React.FC<GradientSvgProps> = ({
  className,
  isHovered,
  colors,
  id,
}) => {
  const svgStates: SvgStates = {
    svg1: {
      gradientTransform:
        'translate(287.5 280) rotate(-29.0546) scale(689.807 1000)',
      stops: [
        { offset: 0, stopColor: colors.color1 },
        { offset: 0.188423, stopColor: colors.color2 },
        { offset: 0.260417, stopColor: colors.color3 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.328992, stopColor: colors.color1 },
        { offset: 0.442708, stopColor: colors.color6 },
        { offset: 0.537556, stopColor: colors.color7 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.725645, stopColor: colors.color8 },
        { offset: 0.817779, stopColor: colors.color9 },
        { offset: 0.84375, stopColor: colors.color10 },
        { offset: 0.90569, stopColor: colors.color1 },
        { offset: 1, stopColor: colors.color11 },
      ],
    },
    svg2: {
      gradientTransform:
        'translate(126.5 418.5) rotate(-64.756) scale(533.444 773.324)',
      stops: [
        { offset: 0, stopColor: colors.color1 },
        { offset: 0.104167, stopColor: colors.color12 },
        { offset: 0.182292, stopColor: colors.color13 },
        { offset: 0.28125, stopColor: colors.color1 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.453125, stopColor: colors.color6 },
        { offset: 0.515625, stopColor: colors.color7 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.692708, stopColor: colors.color8 },
        { offset: 0.75, stopColor: colors.color14 },
        { offset: 0.817708, stopColor: colors.color9 },
        { offset: 0.869792, stopColor: colors.color10 },
        { offset: 1, stopColor: colors.color1 },
      ],
    },
    svg3: {
      gradientTransform:
        'translate(264.5 339.5) rotate(-42.3022) scale(946.451 1372.05)',
      stops: [
        { offset: 0, stopColor: colors.color1 },
        { offset: 0.188423, stopColor: colors.color2 },
        { offset: 0.307292, stopColor: colors.color1 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.442708, stopColor: colors.color15 },
        { offset: 0.537556, stopColor: colors.color16 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.725645, stopColor: colors.color17 },
        { offset: 0.817779, stopColor: colors.color9 },
        { offset: 0.84375, stopColor: colors.color10 },
        { offset: 0.90569, stopColor: colors.color1 },
        { offset: 1, stopColor: colors.color11 },
      ],
    },
    svg4: {
      gradientTransform:
        'translate(860.5 420) rotate(-153.984) scale(957.528 1388.11)',
      stops: [
        { offset: 0.109375, stopColor: colors.color11 },
        { offset: 0.171875, stopColor: colors.color2 },
        { offset: 0.260417, stopColor: colors.color13 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.328992, stopColor: colors.color1 },
        { offset: 0.442708, stopColor: colors.color6 },
        { offset: 0.515625, stopColor: colors.color7 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.692708, stopColor: colors.color8 },
        { offset: 0.817708, stopColor: colors.color9 },
        { offset: 0.869792, stopColor: colors.color10 },
        { offset: 1, stopColor: colors.color11 },
      ],
    },
  }

  const maxStops = Math.max(
    ...Object.values(svgStates).map((s) => s.stops.length),
  )
  const stopsAnimationArray = createStopsArray(svgStates, svgOrder, maxStops)
  const gradientTransform = svgOrder.map(
    (key) => svgStates[key].gradientTransform,
  )

  const variants = {
    hovered: {
      gradientTransform,
      transition: { duration: 50, repeat: Infinity, ease: 'linear' as const },
    },
    notHovered: {
      gradientTransform,
      transition: { duration: 10, repeat: Infinity, ease: 'linear' as const },
    },
  }

  return (
    <svg
      className={className}
      width="1030"
      height="280"
      viewBox="0 0 1030 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="1030" height="280" rx="140" fill={`url(#${id})`} />
      <defs>
        <motion.radialGradient
          id={id}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          animate={isHovered ? variants.hovered : variants.notHovered}
        >
          {stopsAnimationArray.map((stopConfigs, i) => (
            <AnimatePresence key={i}>
              <motion.stop
                initial={{
                  offset: stopConfigs[0].offset,
                  stopColor: stopConfigs[0].stopColor,
                }}
                animate={{
                  offset: stopConfigs.map((c) => c.offset),
                  stopColor: stopConfigs.map((c) => c.stopColor),
                }}
                transition={{
                  duration: 0,
                  ease: 'linear' as const,
                  repeat: Infinity,
                }}
              />
            </AnimatePresence>
          ))}
        </motion.radialGradient>
      </defs>
    </svg>
  )
}

// ============ Liquid ============

type LiquidProps = { isHovered: boolean; colors: Colors }

const LIQUID_LAYERS = [
  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-difference',
  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[164.971deg] mix-blend-difference',
  'top-1/2 left-1/2 -translate-x-[53%] -translate-y-[53%] rotate-[-11.61deg] mix-blend-difference',
  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-[57%] rotate-[-179.012deg] mix-blend-difference',
  'top-1/2 left-1/2 -translate-x-[57%] -translate-y-1/2 rotate-[-29.722deg] mix-blend-difference',
  'top-1/2 left-1/2 -translate-x-[62%] -translate-y-[24%] rotate-[160.227deg] mix-blend-difference',
  'top-1/2 left-1/2 -translate-x-[67%] -translate-y-[29%] rotate-180 mix-blend-hard-light',
] as const

export const Liquid: React.FC<LiquidProps> = ({ isHovered, colors }) => {
  const prefixRef = useRef('')
  if (!prefixRef.current) prefixRef.current = nextUid()
  const prefix = prefixRef.current
  return (
    <>
      {LIQUID_LAYERS.map((cls, i) => (
        <div
          key={i}
          className={`absolute ${i < 3 ? 'w-[443px] h-[121px]' : 'w-[756px] h-[207px]'} ${cls}`}
        >
          <GradientSvg
            className="w-full h-full"
            isHovered={isHovered}
            colors={colors}
            id={`${prefix}-${i}`}
          />
        </div>
      ))}
    </>
  )
}

// ============ LiquidNavButton — 导航栏专用 ============

interface LiquidNavButtonProps {
  to: string
  icon: React.ReactNode
  label: string
  badge?: React.ReactNode
}

export function LiquidNavButton({
  to,
  icon,
  label,
  badge,
}: LiquidNavButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex min-h-[48px] w-12 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl transition-[color,background-color,box-shadow] duration-300"
    >
      {({ isActive }) => (
        <>
          {/* Liquid gradient background */}
          <div
            className="absolute inset-0 overflow-hidden rounded-xl transition-opacity duration-500"
            style={{ opacity: isHovered || isActive ? 1 : 0 }}
          >
            <div className="absolute w-[112.81%] h-[128.57%] top-[8.57%] left-1/2 -translate-x-1/2">
              <Liquid isHovered={isHovered} colors={DEFAULT_COLORS} />
            </div>
          </div>

          {/* Glass overlay for readability */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl transition-colors duration-300',
              isHovered
                ? 'bg-white/70'
                : isActive
                  ? 'bg-white/60'
                  : 'bg-white/30',
            )}
          />

          {/* Content */}
          <div
            className={cn(
              'relative z-10 flex flex-col items-center gap-0.5',
              isActive ? 'text-gray-900' : 'text-gray-500',
            )}
          >
            <div
              className={cn(
                'transition-[filter,opacity] duration-300',
                isActive && 'drop-shadow-[0_0_6px_rgba(0,0,0,0.15)]',
              )}
            >
              {icon}
            </div>
            {badge}
            <span
              className={cn(
                'text-[11px] font-semibold leading-none tracking-wide',
                isActive && 'font-extrabold',
              )}
            >
              {label}
            </span>
          </div>
        </>
      )}
    </NavLink>
  )
}

export default LiquidNavButton
