import React, { useState, useRef, useLayoutEffect, cloneElement } from 'react'

// --- Internal Types and Defaults ---

const DefaultHomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
)
const DefaultCompassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
)
const DefaultBellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

export type NavItem = {
  id: string | number
  icon?: React.ReactElement
  label?: string
  onClick?: () => void
}

const defaultNavItems: NavItem[] = [
  { id: 'default-home', icon: <DefaultHomeIcon />, label: 'Home' },
  { id: 'default-explore', icon: <DefaultCompassIcon />, label: 'Explore' },
  {
    id: 'default-notifications',
    icon: <DefaultBellIcon />,
    label: 'Notifications',
  },
]

export type LimelightNavProps = {
  items?: NavItem[]
  defaultActiveIndex?: number
  activeIndex?: number
  onTabChange?: (index: number) => void
  className?: string
  limelightClassName?: string
  iconContainerClassName?: string
  iconClassName?: string
}

/**
 * 聚光灯导航栏 — 顶部发光指示器平滑跟随激活项
 */
export const LimelightNav = ({
  items = defaultNavItems,
  defaultActiveIndex = 0,
  activeIndex: controlledIndex,
  onTabChange,
  className,
  limelightClassName,
  iconContainerClassName,
  iconClassName,
}: LimelightNavProps) => {
  const [internalIndex, setInternalIndex] = useState(defaultActiveIndex)
  const activeIndex =
    controlledIndex !== undefined ? controlledIndex : internalIndex
  const [isReady, setIsReady] = useState(false)
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const limelightRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (items.length === 0) return

    const limelight = limelightRef.current
    const activeItem = navItemRefs.current[activeIndex]

    if (limelight && activeItem) {
      const newLeft =
        activeItem.offsetLeft +
        activeItem.offsetWidth / 2 -
        limelight.offsetWidth / 2
      limelight.style.left = `${newLeft}px`

      if (!isReady) {
        setTimeout(() => setIsReady(true), 50)
      }
    }
  }, [activeIndex, isReady, items])

  if (items.length === 0) {
    return null
  }

  const handleItemClick = (index: number, itemOnClick?: () => void) => {
    if (controlledIndex === undefined) {
      setInternalIndex(index)
    }
    onTabChange?.(index)
    itemOnClick?.()
  }

  return (
    <nav
      className={`relative inline-flex items-center h-16 gap-4 px-2 ${className}`}
    >
      {items.map(({ id, icon, label, onClick }, index) => (
        <a
          key={id}
          ref={(el) => (navItemRefs.current[index] = el)}
          className={`relative z-20 flex h-full cursor-pointer flex-col items-center justify-center gap-1.5 px-16 py-3 ${iconContainerClassName}`}
          onClick={() => handleItemClick(index, onClick)}
          aria-label={label}
        >
          {icon &&
            cloneElement(icon, {
              className: `w-6 h-6 transition-opacity duration-100 ease-in-out ${
                activeIndex === index ? 'opacity-100' : 'opacity-40'
              } ${icon.props.className || ''} ${iconClassName || ''}`,
            })}
          {label && (
            <span
              className={`text-base font-bold whitespace-nowrap transition-all duration-200 ease-in-out ${
                activeIndex === index ? 'text-foreground' : 'text-foreground/35'
              }`}
            >
              {label}
            </span>
          )}
        </a>
      ))}

      <div
        ref={limelightRef}
        className={`absolute top-0 z-10 w-16 h-[5px] rounded-full bg-primary shadow-[0_50px_15px_var(--color-primary)] ${
          isReady ? 'transition-[left] duration-400 ease-in-out' : ''
        } ${limelightClassName}`}
        style={{ left: '-999px' }}
      >
        <div className="absolute left-[-35%] top-[5px] w-[170%] h-20 [clip-path:polygon(8%_100%,22%_0,78%_0,92%_100%)] bg-gradient-to-b from-primary/30 to-transparent pointer-events-none" />
      </div>
    </nav>
  )
}
