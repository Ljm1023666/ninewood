'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Circle } from 'lucide-react'

export interface TimelineItem {
  title: string
  description: string
  date?: string
  image?: string
  status?: 'completed' | 'current' | 'upcoming'
  category?: string
  onClick?: () => void
  onAvatarClick?: () => void
}

export interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

const getStatusConfig = (status: TimelineItem['status']) => {
  const configs = {
    completed: {
      progressColor: 'bg-success',
      borderColor: 'border-success/20',
      badgeBg: 'bg-success/10',
      badgeText: 'text-success',
    },
    current: {
      progressColor: 'bg-accent',
      borderColor: 'border-accent/20',
      badgeBg: 'bg-accent/10',
      badgeText: 'text-accent',
    },
    upcoming: {
      progressColor: 'bg-warning',
      borderColor: 'border-warning/20',
      badgeBg: 'bg-warning/10',
      badgeText: 'text-warning',
    },
  }

  return configs[status || 'upcoming']
}

const statusLabel: Record<string, string> = {
  completed: '已完成',
  current: '进行中',
  upcoming: '待开始',
}

const getStatusIcon = (status: TimelineItem['status']) => {
  switch (status) {
    case 'completed':
      return CheckCircle
    case 'current':
      return Clock
    default:
      return Circle
  }
}

export function Timeline({ items, className }: TimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div
        className={cn('w-full max-w-4xl mx-auto px-4 sm:px-6 py-8', className)}
      >
        <p className="text-center text-foreground/50">暂无内容</p>
      </div>
    )
  }

  return (
    <section
      className={cn('w-full max-w-4xl mx-auto px-4 sm:px-6 py-8', className)}
      role="list"
      aria-label="时间线"
    >
      <div className="relative">
        <div
          className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-border"
          aria-hidden="true"
        />

        <motion.div
          className="absolute left-4 sm:left-6 top-0 w-px bg-primary origin-top"
          initial={{ scaleY: 0 }}
          whileInView={{
            scaleY: 1,
            transition: {
              duration: 1.2,
              ease: 'easeOut',
              delay: 0.2,
            },
          }}
          viewport={{ once: true }}
          aria-hidden="true"
        />

        <div className="space-y-8 sm:space-y-12 relative">
          {items.map((item, index) => {
            const config = getStatusConfig(item.status)
            const IconComponent = getStatusIcon(item.status)

            return (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  },
                }}
                viewport={{ once: true, margin: '-30px' }}
                role="listitem"
                aria-label={`Timeline item ${index + 1}: ${item.title}`}
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="relative flex-shrink-0">
                    <motion.div
                      className="relative cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      tabIndex={0}
                      role="img"
                      aria-label={`Avatar for ${item.title}`}
                      onClick={item.onAvatarClick}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-background shadow-lg relative z-10">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={`${item.title} avatar`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <IconComponent
                              className="w-5 h-5 sm:w-6 sm:h-6 text-foreground/40"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    className="flex-1 min-w-0"
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        'border transition-all duration-300 hover:shadow-md relative',
                        'bg-card/50 backdrop-blur-sm',
                        config.borderColor,
                        'group-hover:border-primary/30',
                        item.onClick && 'cursor-pointer',
                      )}
                      onClick={item.onClick}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <motion.h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1 group-hover:text-accent transition-colors duration-300">
                              {item.title}
                            </motion.h3>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/50">
                              {item.category && (
                                <span className="font-medium">
                                  {item.category}
                                </span>
                              )}
                              {item.category && item.date && (
                                <span
                                  className="w-1 h-1 bg-foreground/30 rounded-full"
                                  aria-hidden="true"
                                />
                              )}
                              {item.date && (
                                <time dateTime={item.date}>{item.date}</time>
                              )}
                            </div>
                          </div>

                          <Badge
                            className={cn(
                              'w-fit text-xs font-medium border',
                              config.badgeBg,
                              config.badgeText,
                              'border-current/20',
                            )}
                            aria-label={`状态: ${statusLabel[item.status || 'upcoming']}`}
                          >
                            {statusLabel[item.status || 'upcoming']}
                          </Badge>
                        </div>

                        <motion.p
                          className="text-sm sm:text-base text-foreground/65 leading-relaxed mb-4"
                          initial={{ opacity: 0.8 }}
                          whileHover={{ opacity: 1 }}
                        >
                          {item.description}
                        </motion.p>

                        <div
                          className="h-1 bg-muted rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={
                            item.status === 'completed'
                              ? 100
                              : item.status === 'current'
                                ? 65
                                : 25
                          }
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progress for ${item.title}`}
                        >
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              config.progressColor,
                            )}
                            initial={{ width: 0 }}
                            animate={{
                              width:
                                item.status === 'completed'
                                  ? '100%'
                                  : item.status === 'current'
                                    ? '65%'
                                    : '25%',
                            }}
                            transition={{
                              duration: 1.2,
                              delay: index * 0.2 + 0.8,
                              ease: 'easeOut',
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
