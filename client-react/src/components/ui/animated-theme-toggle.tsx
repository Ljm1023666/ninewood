import { cn } from '@/lib/utils'
import { motion, useMotionValue, useTransform } from 'framer-motion'

interface AnimatedThemeToggleProps {
  isDark: boolean
  onToggle: () => void
  className?: string
  /** 侧栏展开时显示的文案 */
  label?: string
  expanded?: boolean
}

/** 太阳-月亮形变（GitHub 式线标，不做液态金属/玻璃） */
export function AnimatedThemeToggle({
  isDark,
  onToggle,
  className,
  label,
  expanded = false,
}: AnimatedThemeToggleProps) {
  const rowClass = cn(
    'app-sidebar__row group relative flex h-11 w-full items-center rounded-lg border-0 bg-transparent text-left text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--accent-ghost)] hover:text-[var(--text-secondary)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
    className,
  )

  if (label) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={rowClass}
        aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
        aria-pressed={isDark}
      >
        <span className="app-sidebar__icon-slot relative flex shrink-0 flex-col items-center justify-center gap-0.5">
          <SolarSwitch isDark={isDark} />
          <span
            className="app-sidebar__stack-label text-[11px] font-medium leading-none"
            aria-hidden={expanded}
          >
            {label}
          </span>
        </span>
        <span
          className="app-sidebar__side-label text-[12px] font-medium"
          aria-hidden={!expanded}
        >
          {label}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-lg border-0 bg-transparent text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--accent-ghost)] hover:text-[var(--text-secondary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35',
        className,
      )}
      aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
      aria-pressed={isDark}
    >
      <SolarSwitch isDark={isDark} />
    </button>
  )
}

const SolarSwitch = ({ isDark }: { isDark: boolean }) => {
  const duration = 0.7

  const moonVariants = {
    checked: { scale: 1 },
    unchecked: { scale: 0 },
  }

  const sunVariants = {
    checked: { scale: 0 },
    unchecked: { scale: 1 },
  }

  const scaleMoon = useMotionValue(isDark ? 1 : 0)
  const scaleSun = useMotionValue(isDark ? 0 : 1)
  const pathLengthMoon = useTransform(scaleMoon, [0.6, 1], [0, 1])
  const pathLengthSun = useTransform(scaleSun, [0.6, 1], [0, 1])

  return (
    <motion.div
      className="text-current opacity-70 transition-opacity duration-200 group-hover:opacity-100"
      animate={isDark ? 'checked' : 'unchecked'}
    >
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 25 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <motion.path
          d="M12.4058 17.7625C15.1672 17.7625 17.4058 15.5239 17.4058 12.7625C17.4058 10.0011 15.1672 7.76251 12.4058 7.76251C9.64434 7.76251 7.40576 10.0011 7.40576 12.7625C7.40576 15.5239 9.64434 17.7625 12.4058 17.7625Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M12.4058 1.76251V3.76251"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M12.4058 21.7625V23.7625"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M4.62598 4.98248L6.04598 6.40248"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M18.7656 19.1225L20.1856 20.5425"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M1.40576 12.7625H3.40576"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M21.4058 12.7625H23.4058"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M4.62598 20.5425L6.04598 19.1225"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M18.7656 6.40248L20.1856 4.98248"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={sunVariants}
          custom={isDark}
          transition={{ duration }}
          style={{ pathLength: pathLengthSun, scale: scaleSun }}
        />
        <motion.path
          d="M21.1918 13.2013C21.0345 14.9035 20.3957 16.5257 19.35 17.8781C18.3044 19.2305 16.8953 20.2571 15.2875 20.8379C13.6797 21.4186 11.9398 21.5294 10.2713 21.1574C8.60281 20.7854 7.07479 19.9459 5.86602 18.7371C4.65725 17.5283 3.81774 16.0003 3.4457 14.3318C3.07367 12.6633 3.18451 10.9234 3.76526 9.31561C4.346 7.70783 5.37263 6.29868 6.72501 5.25307C8.07739 4.20746 9.69959 3.56862 11.4018 3.41132C10.4052 4.75958 9.92564 6.42077 10.0503 8.09273C10.175 9.76469 10.8957 11.3364 12.0812 12.5219C13.2667 13.7075 14.8384 14.4281 16.5104 14.5528C18.1823 14.6775 19.8435 14.1979 21.1918 13.2013Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          transition={{ duration }}
          variants={moonVariants}
          custom={isDark}
          style={{ pathLength: pathLengthMoon, scale: scaleMoon }}
        />
      </motion.svg>
    </motion.div>
  )
}
