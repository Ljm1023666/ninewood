'use client'

import { useState, useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedInputProps {
  type?: string
  /** 空态提示文案；不传则不显示框内/浮层提示 */
  placeholder?: string
  /** 无可见 label 时用于无障碍 */
  'aria-label'?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: ReactNode
  showToggle?: boolean
  showPassword?: boolean
  onToggle?: () => void
  maxLength?: number
}

export function AnimatedInput({
  type = 'text',
  placeholder,
  'aria-label': ariaLabel,
  value,
  onChange,
  icon,
  showToggle,
  showPassword,
  onToggle,
  maxLength,
}: AnimatedInputProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)

  const hasValue = value.length > 0

  return (
    <div className="relative w-full group">
      {/* 外层发光边框 — 银灰色调 */}
      <div
        className={cn(
          'absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none',
          'bg-gradient-to-r from-neutral-400/20 via-white/10 to-neutral-400/20 blur-[1px]',
          focused && 'opacity-100',
        )}
      />

      {/* 输入容器 */}
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-card
          transition-all duration-300 ease-out
          group-focus-within:border-accent/50 group-focus-within:bg-bg-tertiary"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false)
          setMousePos({ x: 0, y: 0 })
        }}
      >
        {/* 鼠标追踪光晕 — 银白微光 */}
        {hovering && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              background: `radial-gradient(200px circle at ${mousePos.x}px ${mousePos.y}px, var(--accent-color) 0%, transparent 70%)`,
              opacity: 0.08,
            }}
          />
        )}

        {/* 顶部光标追踪发光条 — 银白 */}
        {hovering && (
          <div
            className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none z-10"
            style={{
              background: `radial-gradient(40px circle at ${mousePos.x}px 0px, var(--accent-color) 0%, transparent 70%)`,
            }}
          />
        )}

        {/* 底部光标追踪发光条 — 银白 */}
        {hovering && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none z-10"
            style={{
              background: `radial-gradient(40px circle at ${mousePos.x}px 1px, var(--accent-color) 0%, transparent 70%)`,
            }}
          />
        )}

        {/* 左侧图标 */}
        {icon && (
          <span
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10',
              focused ? 'text-neutral-300' : 'text-neutral-500',
            )}
          >
            {icon}
          </span>
        )}

        {/* 输入框 */}
        <input
          id={id}
          type={showPassword ? 'text' : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          aria-label={ariaLabel}
          placeholder=" "
          className={cn(
            'relative z-[1] w-full bg-transparent outline-none text-white text-sm transition-all duration-200',
            'py-3.5 pr-4',
            icon ? 'pl-12' : 'pl-5',
            (showToggle || type === 'password') && 'pr-12',
          )}
        />

        {/* 标签 — 有值或聚焦时隐藏；未传 placeholder 则不显示任何提示 */}
        {!focused && !hasValue && placeholder ? (
          <span
            className={cn(
              'absolute pointer-events-none transition-all duration-200 ease-out z-10',
              icon ? 'left-14' : 'left-5',
              'top-1/2 -translate-y-1/2 text-sm text-neutral-500',
            )}
          >
            {placeholder}
          </span>
        ) : null}

        {/* 密码可见性切换 */}
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10',
              showPassword
                ? 'text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-400',
            )}
          >
            {showPassword ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* 底部装饰线 — 银白 */}
      <motion.div
        className="absolute inset-x-1 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}
