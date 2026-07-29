/**
 * 常见疑问 FAQ · 手风琴动画
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

export interface Faq {
  q: string
  a: string
}

interface CommonQuestionsProps {
  faqs: Faq[]
  title?: string
}

export function CommonQuestions({ faqs, title = '常见疑问' }: CommonQuestionsProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </div>
      <div className="tax-viz-faq flex flex-col gap-1.5">
        {faqs.map((f, i) => {
          const isOpen = openIdx === i
          return (
            <div
              key={f.q}
              className={cn(
                'tax-viz-faq__item overflow-hidden rounded-xl border border-white/6',
                isOpen && 'tax-viz-faq__item--open',
              )}
            >
              <LiquidMetalButton
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0 text-muted-foreground"
                >
                  <ChevronDown className="size-4" />
                </motion.span>
                <span className="text-sm font-medium text-foreground">{f.q}</span>
              </LiquidMetalButton>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/8 px-4 py-3 pl-10 text-sm leading-relaxed text-foreground/80">
                      {f.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
