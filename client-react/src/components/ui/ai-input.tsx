'use client'

import React, { useReducer, useMemo, useRef, useEffect, useCallback } from 'react'
import { cx } from 'class-variance-authority'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { BrainCog, Zap } from 'lucide-react'

interface OrbProps {
  dimension?: string
  className?: string
  tones?: {
    base?: string
    accent1?: string
    accent2?: string
    accent3?: string
  }
  spinDuration?: number
}

const ColorOrb: React.FC<OrbProps> = ({
  dimension = '192px',
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: '#E8F0FE',
    accent1: '#FF6B9D',
    accent2: '#4DD0E1',
    accent3: '#B388FF',
  }

  const palette = { ...fallbackTones, ...tones }
  const dimValue = parseInt(dimension.replace('px', ''), 10)
  const blurStrength =
    dimValue < 50
      ? Math.max(dimValue * 0.008, 1)
      : Math.max(dimValue * 0.015, 4)
  const contrastStrength =
    dimValue < 50
      ? Math.max(dimValue * 0.004, 1.2)
      : Math.max(dimValue * 0.008, 1.5)
  const pixelDot =
    dimValue < 50
      ? Math.max(dimValue * 0.004, 0.05)
      : Math.max(dimValue * 0.008, 0.1)
  const shadowRange =
    dimValue < 50
      ? Math.max(dimValue * 0.004, 0.5)
      : Math.max(dimValue * 0.008, 2)
  const maskRadius =
    dimValue < 30 ? '0%' : dimValue < 50 ? '5%' : dimValue < 100 ? '15%' : '25%'
  const adjustedContrast =
    dimValue < 30
      ? 1.1
      : dimValue < 50
        ? Math.max(contrastStrength * 1.2, 1.3)
        : contrastStrength

  return (
    <div
      className={cn('color-orb', className)}
      style={
        {
          width: dimension,
          height: dimension,
          '--base': palette.base,
          '--accent1': palette.accent1,
          '--accent2': palette.accent2,
          '--accent3': palette.accent3,
          '--spin-duration': `${spinDuration}s`,
          '--blur': `${blurStrength}px`,
          '--contrast': adjustedContrast,
          '--dot': `${pixelDot}px`,
          '--shadow': `${shadowRange}px`,
          '--mask': maskRadius,
        } as React.CSSProperties
      }
    >
      <style>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.0);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        .color-orb[style*="--mask: 0%"]::after {
          mask-image: none;
        }

        .color-orb:not([style*="--mask: 0%"])::after {
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

const SPEED_FACTOR = 1
const FORM_WIDTH = 360
const FORM_HEIGHT = 200

interface ContextShape {
  showForm: boolean
  triggerOpen: () => void
  triggerClose: () => void
}

const FormContext = React.createContext({} as ContextShape)
const useFormContext = () => React.useContext(FormContext)

export interface MorphPanelProps {
  onSend?: (text: string) => void
  isLoading?: boolean
  placeholder?: string
  thinkMode?: boolean
  onThinkToggle?: () => void
  speedMode?: boolean
  onSpeedToggle?: () => void
}

export function MorphPanel({
  onSend,
  isLoading,
  placeholder = 'Ask me anything...',
  thinkMode,
  onThinkToggle,
  speedMode,
  onSpeedToggle,
}: MorphPanelProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ── 状态机 ──
  type PanelState = 'idle' | 'open'
  type Action = { type: 'OPEN' } | { type: 'CLOSE' }

  const [panel, dispatch] = useReducer(
    (state: PanelState, action: Action): PanelState => {
      switch (action.type) {
        case 'OPEN':
          return 'open'
        case 'CLOSE':
          return 'idle'
        default:
          return state
      }
    },
    'idle',
  )

  const isOpen = panel === 'open'

  // 展开后聚焦 textarea
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => {
        textareaRef.current?.focus()
      }, 350)
      return () => clearTimeout(id)
    }
  }, [isOpen])

  // 点击外部关闭
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        isOpenRef.current
      ) {
        dispatch({ type: 'CLOSE' })
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSubmit() {
    const text = textareaRef.current?.value?.trim()
    if (text && onSend) {
      onSend(text)
      if (textareaRef.current) textareaRef.current.value = ''
    }
    dispatch({ type: 'CLOSE' })
  }

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') dispatch({ type: 'CLOSE' })
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const ctx = useMemo(
    () => ({
      showForm: isOpen,
      triggerOpen: () => dispatch({ type: 'OPEN' }),
      triggerClose: () => dispatch({ type: 'CLOSE' }),
    }),
    [isOpen],
  )

  return (
    <div
      className="fixed right-6 bottom-6 z-[9999]"
      style={{ width: FORM_WIDTH, height: isOpen ? FORM_HEIGHT + 44 : 44 }}
    >
      <motion.div
        ref={wrapperRef}
        data-panel
        className={cx(
          'bg-background flex flex-col items-center absolute bottom-0 right-0',
          !isOpen && 'overflow-hidden',
        )}
        style={{ border: '0.5px solid var(--border-color)' }}
        initial={false}
        animate={{
          width: isOpen ? FORM_WIDTH : 200,
          height: isOpen ? FORM_HEIGHT + 44 : 44,
          borderRadius: isOpen ? 14 : 20,
        }}
        transition={{
          type: 'spring',
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          {isOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
              className="flex h-full w-full flex-col p-1"
              style={{ width: FORM_WIDTH, height: FORM_HEIGHT }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 550 / SPEED_FACTOR,
                  damping: 45,
                  mass: 0.7,
                }}
                className="flex h-full flex-col"
              >
                <div className="flex items-center justify-between py-1">
                  <p className="text-foreground ml-[38px] flex items-center gap-[6px] text-sm select-none">
                    Ask AI
                  </p>
                  <div className="flex items-center gap-1">
                    {onThinkToggle && (
                      <motion.button
                        type="button"
                        onClick={onThinkToggle}
                        className={cx(
                          'relative flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium overflow-hidden',
                        )}
                        animate={{
                          backgroundColor: thinkMode
                            ? 'rgba(139,92,246,0.15)'
                            : 'transparent',
                          borderColor: thinkMode
                            ? 'rgba(139,92,246,0.3)'
                            : 'transparent',
                          color: thinkMode ? '#8B5CF6' : undefined,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {thinkMode && (
                          <motion.div
                            className="absolute inset-0 rounded-md"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.15, 0] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            style={{
                              background:
                                'radial-gradient(circle at center, #8B5CF6, transparent 70%)',
                            }}
                          />
                        )}
                        <motion.span
                          animate={{ rotate: thinkMode ? 360 : 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 200,
                            damping: 20,
                          }}
                        >
                          <BrainCog className="size-3 shrink-0" />
                        </motion.span>
                        <span className="relative z-10">Think</span>
                      </motion.button>
                    )}
                    {onSpeedToggle && (
                      <motion.button
                        type="button"
                        onClick={onSpeedToggle}
                        className={cx(
                          'relative flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium overflow-hidden',
                        )}
                        animate={{
                          backgroundColor: speedMode
                            ? 'rgba(245,158,11,0.12)'
                            : 'transparent',
                          borderColor: speedMode
                            ? 'rgba(245,158,11,0.25)'
                            : 'transparent',
                          color: speedMode ? '#F59E0B' : undefined,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {speedMode && (
                          <motion.div
                            className="absolute inset-0 rounded-md"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.12, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            style={{
                              background:
                                'radial-gradient(circle at center, #F59E0B, transparent 70%)',
                            }}
                          />
                        )}
                        <Zap className="size-3 shrink-0" />
                        <span className="relative z-10">Speed</span>
                      </motion.button>
                    )}
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  placeholder={placeholder}
                  name="message"
                  disabled={isLoading}
                  className="h-full w-full resize-none scroll-py-2 rounded-md pl-[38px] pr-4 pb-4 text-white placeholder:text-white/25"
                  style={{ caretColor: '#ffffff' }}
                  required
                  onKeyDown={handleKeys}
                  spellCheck={false}
                />
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-2 left-3"
                  >
                    <ColorOrb dimension="24px" tones={{ base: '#222222' }} />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </form>
          )}
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext()
  return (
    <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
      <div className="flex items-center justify-center gap-2 px-3">
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="blank"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              className="h-5 w-5"
            />
          ) : (
            <motion.div
              key="orb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ColorOrb dimension="24px" tones={{ base: '#222222' }} />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          tabIndex={-1}
          className="flex h-fit flex-1 justify-end rounded-full px-2 py-0.5 text-sm text-foreground/60 hover:text-foreground transition-colors cursor-text"
          onClick={triggerOpen}
        >
          <span className="truncate">Ask AI</span>
        </button>
      </div>
    </footer>
  )
}

export default MorphPanel
