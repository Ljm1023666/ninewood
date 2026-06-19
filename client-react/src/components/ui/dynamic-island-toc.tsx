"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { motion, AnimatePresence, type Transition } from "motion/react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type HeadingData = {
  id: string
  text: string
  level: number
  element: HTMLElement
}

export type TocItem = {
  id: string
  text: string
  level?: number
  href?: string
  onClick?: () => void
}

const islandTransition: Transition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.5,
}

function CircleProgress({ percentage }: { percentage: number }) {
  const size = 24
  const strokeWidth = 2.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-color, #333)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent-color, #3388FF)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
  )
}

type DynamicIslandTOCProps = {
  children?: ReactNode
  items?: TocItem[]
  activeId?: string | null
  selector?: string
}

export function DynamicIslandTOC({
  children,
  items,
  activeId: externalActiveId,
  selector = "article h1, article h2, article h3, .prose h1, .prose h2, .prose h3, [data-toc]",
}: DynamicIslandTOCProps) {
  const [headings, setHeadings] = useState<HeadingData[]>([])
  const [scrollActiveId, setScrollActiveId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [progress, setProgress] = useState(0)

  const activeId = externalActiveId ?? scrollActiveId

  const scanDOM = () => {
    const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    const valid = elements
      .filter((el) => !el.hasAttribute("data-toc-ignore"))
      .map((el, index) => {
        if (!el.id) {
          el.id = el.textContent?.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") || `toc-${index}`
        }
        const depth = el.getAttribute("data-toc-depth")
        let level = 2
        if (depth) level = parseInt(depth, 10)
        else {
          const t = el.tagName.toUpperCase()
          if (t.startsWith("H") && t.length === 2) level = parseInt(t[1], 10)
        }
        const text = el.getAttribute("data-toc-title") || el.textContent || ""
        return { id: el.id, text, level, element: el }
      })
    valid.sort((a, b) =>
      a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    setHeadings(valid)
  }

  // 初始扫描
  useEffect(() => {
    if (items && items.length > 0) return
    const t = setTimeout(scanDOM, 300)
    return () => clearTimeout(t)
  }, [selector, items])

  const entries: { id: string; text: string; level: number; onClick?: () => void; element?: HTMLElement }[] = useMemo(() =>
    items && items.length > 0
      ? items.map((it) => ({ id: it.id, text: it.text, level: it.level ?? 2, onClick: it.onClick }))
      : headings.map((h) => ({ id: h.id, text: h.text, level: h.level, element: h.element })),
    [items, headings])

  const getScrollEl = () => document.querySelector(".help-scroll-container") as HTMLElement | null

  useEffect(() => {
    const h = () => {
      const sc = getScrollEl()
      const scrollTop = sc ? sc.scrollTop : window.scrollY
      const total = sc ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - window.innerHeight
      setProgress(total > 0 ? Math.min(100, Math.max(0, (scrollTop / total) * 100)) : 0)
      let cur: string | null = null
      for (const t of entries) {
        const el = (t as any).element || document.getElementById(t.id)
        if (el && el.getBoundingClientRect().top <= 120) cur = t.id
        else if (el) break
      }
      setScrollActiveId(cur || entries[0]?.id || null)
    }
    window.addEventListener("scroll", h, { passive: true })
    const sc = getScrollEl()
    if (sc) sc.addEventListener("scroll", h, { passive: true })
    h()
    return () => {
      window.removeEventListener("scroll", h)
      if (sc) sc.removeEventListener("scroll", h)
    }
  }, [entries])

  const activeEntry = entries.find((e) => e.id === activeId)

  const minLevel = useMemo(() => {
    if (entries.length === 0) return 1
    return Math.min(...entries.map((e) => e.level))
  }, [entries])

  return (
    <>
      {children}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={islandTransition}
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[4px]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-[30px] left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center"
      >
        <motion.div
          onClick={() => {
            if (!isExpanded) {
              if (entries.length === 0) scanDOM()
              setIsExpanded(true)
            }
          }}
          initial={false}
          animate={{ width: isExpanded ? 340 : 280, height: isExpanded ? 400 : 52, borderRadius: isExpanded ? 24 : 26 }}
          transition={islandTransition}
          style={{ cursor: isExpanded ? "default" : "pointer" }}
          className="relative overflow-hidden border border-border bg-card text-foreground shadow-2xl"
        >
          {/* Closed pill */}
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 0 : 1, scale: isExpanded ? 0.95 : 1, filter: isExpanded ? "blur(4px)" : "blur(0px)" }}
            transition={{ ...islandTransition, delay: isExpanded ? 0 : 0.1 }}
            className={cn("absolute inset-0 flex items-center gap-4 px-5", isExpanded && "pointer-events-none")}
          >
            <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            <div className="relative flex h-full flex-1 items-center overflow-hidden text-left">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={activeId || "empty"}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium"
                >
                  {activeEntry?.text || "目录"}
                </motion.span>
              </AnimatePresence>
            </div>
            <CircleProgress percentage={progress} />
          </motion.div>

          {/* Expanded menu */}
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 1 : 0, scale: isExpanded ? 1 : 1.05 }}
            transition={{ ...islandTransition, delay: isExpanded ? 0.1 : 0 }}
            className={cn("absolute inset-0 flex flex-col", !isExpanded && "pointer-events-none")}
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-5">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-text-muted">文档目录</span>
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false) }} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
              <div className="flex flex-col gap-0.5">
                {entries.map((entry) => {
                  const isActive = activeId === entry.id
                  const isHovered = hoveredId === entry.id
                  const indentLevel = Math.max(0, entry.level - minLevel)
                  const paddingLeft = indentLevel * 14 + 12

                  return (
                    <button
                      key={entry.id}
                      onMouseEnter={() => setHoveredId(entry.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => {
                        if (entry.onClick) entry.onClick()
                        else if (entry.element) {
                          const sc = getScrollEl()
                          const scrollTop = sc ? sc.scrollTop : window.scrollY
                          const containerTop = sc ? sc.getBoundingClientRect().top : 0
                          const y = entry.element.getBoundingClientRect().top + scrollTop - containerTop - 80
                          ;(sc || window).scrollTo({ top: y, behavior: "smooth" })
                        }
                        setIsExpanded(false)
                      }}
                      style={{ paddingLeft: `${paddingLeft}px` }}
                      className={cn(
                        "group flex w-full shrink-0 cursor-pointer items-center rounded-lg border-none py-2 pr-3 text-left text-sm transition-all duration-300 ease-out",
                        isActive && "bg-accent/10 font-medium text-accent",
                        !isActive && isHovered && "bg-bg-secondary text-text-primary",
                        !isActive && !isHovered && "bg-transparent text-text-muted",
                      )}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-transform duration-300 group-hover:translate-x-1">
                        {entry.text}
                      </span>
                      <motion.div
                        initial={false}
                        animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="ml-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  )
}
