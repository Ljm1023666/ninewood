'use client'

import React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

// ============ ContainerScroll ============

interface ContainerScrollProps {
  className?: string
  children: React.ReactNode
}

export const ContainerScroll = React.forwardRef<
  HTMLDivElement,
  ContainerScrollProps
>(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cn('relative w-full', className)}
    style={{ perspective: '1000px' }}
  >
    {children}
  </div>
))
ContainerScroll.displayName = 'ContainerScroll'

// ============ CardSticky ============

interface CardStickyProps {
  index: number
  incrementY?: number
  incrementZ?: number
  className?: string
  children: React.ReactNode
}

export const CardSticky = React.forwardRef<HTMLDivElement, CardStickyProps>(
  ({ index, incrementY = 80, incrementZ = 10, className, children }, ref) => {
    const top = index * incrementY
    const zIndex = 100 - index * incrementZ

    return (
      <motion.div
        ref={ref}
        layout="position"
        className={cn('sticky w-full', className)}
        style={{
          top: `${top}px`,
          zIndex,
        }}
      >
        {children}
      </motion.div>
    )
  },
)
CardSticky.displayName = 'CardSticky'
