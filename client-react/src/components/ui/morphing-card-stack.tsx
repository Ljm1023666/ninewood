"use client"

import { useState, type ReactNode } from "react"
import { motion, AnimatePresence, LayoutGroup, type PanInfo } from "framer-motion"
import { cn } from "@/lib/utils"
import { Grid3X3, Layers, LayoutList } from "lucide-react"

export type LayoutMode = "stack" | "grid" | "list"

export interface CardData {
  id: string
  title: string
  description: string
  icon?: ReactNode
  color?: string
  /** 价格色条 CSS 类名，仅 list 布局生效 */
  shimmerClass?: string
}

export interface MorphingCardStackProps {
  cards?: CardData[]
  className?: string
  defaultLayout?: LayoutMode
  layout?: LayoutMode
  onLayoutChange?: (mode: LayoutMode) => void
  onCardClick?: (card: CardData) => void
}

const layoutIcons = {
  stack: Layers,
  grid: Grid3X3,
  list: LayoutList,
}

const SWIPE_THRESHOLD = 50

export function MorphingCardStack({
  cards = [],
  className,
  defaultLayout = "stack",
  layout: controlledLayout,
  onLayoutChange,
  onCardClick,
}: MorphingCardStackProps) {
  const [internalLayout, setInternalLayout] = useState<LayoutMode>(defaultLayout)
  const layout = controlledLayout ?? internalLayout
  const setLayout = onLayoutChange ?? setInternalLayout
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  if (!cards || cards.length === 0) {
    return null
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const swipe = Math.abs(offset.x) * velocity.x

    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      setActiveIndex((prev) => (prev + 1) % cards.length)
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length)
    }
    setIsDragging(false)
  }

  const getStackOrder = () => {
    const reordered = []
    for (let i = 0; i < cards.length; i++) {
      const index = (activeIndex + i) % cards.length
      reordered.push({ ...cards[index], stackPosition: i })
    }
    return reordered.reverse()
  }

  const getLayoutStyles = (stackPosition: number) => {
    switch (layout) {
      case "stack":
        return {
          top: stackPosition * 8,
          left: stackPosition * 8,
          zIndex: cards.length - stackPosition,
          rotate: (stackPosition - 1) * 2,
        }
      case "grid":
        return {
          top: 0,
          left: 0,
          zIndex: 1,
          rotate: 0,
        }
      case "list":
        return {
          top: 0,
          left: 0,
          zIndex: 1,
          rotate: 0,
        }
    }
  }

  const containerStyles = {
    stack: "relative w-72 h-72",
    grid: "grid grid-cols-2 gap-4 w-[440px]",
    list: "flex flex-col gap-3 w-72",
  }

  const displayCards = layout === "stack" ? getStackOrder() : cards.map((c, i) => ({ ...c, stackPosition: i }))

  return (
    <div className={cn("relative flex flex-col items-center", layout === "grid" ? "h-[520px]" : "h-[420px]", className)}>
      <div className={cn("space-y-6 flex flex-col items-center flex-1", layout === "grid" ? "justify-start" : "justify-center")}>
      {/* 卡片容器 */}
      <LayoutGroup>
        <motion.div className={cn(containerStyles[layout], "mx-auto transition-all duration-300")}>
          <AnimatePresence mode="popLayout">
            {displayCards.map((card) => {
              const styles = getLayoutStyles(card.stackPosition)
              const isExpanded = expandedCard === card.id
              const isTopCard = layout === "stack" && card.stackPosition === 0

              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: isExpanded ? 1.05 : 1,
                    x: 0,
                    ...styles,
                  }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  drag={isTopCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                  onClick={() => {
                    if (isDragging) return
                    setExpandedCard(isExpanded ? null : card.id)
                    onCardClick?.(card)
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl border border-border p-4 relative overflow-hidden",
                    "hover:border-primary/50 transition-colors",
                    layout === "stack" && "absolute w-64 h-52 bg-card",
                    layout === "stack" && isTopCard && "cursor-grab active:cursor-grabbing",
                    layout === "grid" && "w-full aspect-square bg-card",
                    layout === "list" && !card.shimmerClass && "bg-card",
                    layout === "list" && card.shimmerClass && "bg-white dark:bg-black",
                    layout === "list" && "w-full",
                    isExpanded && "ring-2 ring-primary",
                    layout === "list" && card.shimmerClass && "border-l-[3px]",
                  )}
                  style={{
                    backgroundColor: (!card.shimmerClass && card.color) ? card.color : undefined,
                  }}
                >
                  {/* 流光色条 — 所有布局顶部 */}
                  {card.shimmerClass && (
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-1 rounded-t-xl",
                      card.shimmerClass,
                    )} />
                  )}
                  <div className="flex items-start gap-3">
                    {card.icon && (
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        card.shimmerClass
                          ? "bg-black/5 dark:bg-white/10 text-black dark:text-white"
                          : "bg-secondary text-foreground",
                      )}>
                        {card.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className={cn(
                        "font-semibold truncate",
                        card.shimmerClass ? "text-black dark:text-white" : "text-card-foreground",
                      )}>{card.title}</h3>
                      {layout !== "list" && (
                        <p
                          className={cn(
                            "text-sm mt-1",
                            card.shimmerClass ? "text-black/70 dark:text-white/70" : "text-muted-foreground",
                            layout === "stack" && "line-clamp-3",
                            layout === "grid" && "line-clamp-2",
                          )}
                        >
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isTopCard && (
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <span className="text-xs text-muted-foreground/50">滑动切换</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {layout === "stack" && cards.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              aria-label={`切换到卡片 ${index + 1}`}
            />
          ))}
        </div>
      )}


      </div>
    </div>
  )
}
