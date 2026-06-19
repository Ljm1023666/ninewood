import { Fragment } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export type TestimonialItem = {
  text: string
  image: string
  name: string
  role: string
}

export interface TestimonialsColumnProps {
  className?: string
  testimonials: TestimonialItem[]
  duration?: number
}

/** 无限向上滚动的评价列（内容复制两份 + translateY -50% 循环） */
export function TestimonialsColumn({ className, testimonials, duration = 10 }: TestimonialsColumnProps) {
  return (
    <div className={cn('flex shrink-0 flex-col items-center overflow-hidden', className)}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        className="flex flex-col gap-6 bg-background pb-6"
      >
        {[0, 1].map((dup) => (
          <Fragment key={dup}>
            {testimonials.map((item, i) => (
              <div
                key={`${dup}-${i}-${item.name}`}
                className="w-full max-w-xs rounded-3xl border border-border bg-card/90 p-8 text-card-foreground shadow-lg shadow-primary/10"
              >
                <div className="text-sm leading-relaxed text-text-secondary">{item.text}</div>
                <div className="mt-5 flex items-center gap-2">
                  <img
                    width={40}
                    height={40}
                    src={item.image}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="flex min-w-0 flex-col">
                    <div className="truncate text-sm font-medium leading-5 tracking-tight text-text-primary">
                      {item.name}
                    </div>
                    <div className="truncate text-sm leading-5 tracking-tight text-text-muted">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </motion.div>
    </div>
  )
}
