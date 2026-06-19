import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { PageHeader } from '@/components/layout/PageHeader'
import { InternalPageShell } from '@/components/layout/internal-ui'
import { DynamicIslandTOC } from '@/components/ui/dynamic-island-toc'
import { cn } from '@/lib/utils'
import {
  FAQ,
  FAQ_CATEGORIES,
  type FaqEntry,
  type TipType,
} from '@/views/help-faq-data'

const BLOCKQUOTE_LABELS: Record<TipType, string> = {
  tip: '提示',
  warning: '注意',
  danger: '警告',
  info: '说明',
}

const BLOCKQUOTE_STYLES: Record<
  TipType,
  { border: string; bg: string; text: string; icon: string }
> = {
  tip: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'verified',
  },
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'notifications',
  },
  danger: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
    icon: 'gavel',
  },
  info: {
    border: 'border-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    text: 'text-sky-600 dark:text-sky-400',
    icon: 'visibility',
  },
}

function BlockquoteBlock({
  type,
  content,
}: {
  type: TipType
  content: string
}) {
  const style = BLOCKQUOTE_STYLES[type]
  return (
    <div
      className={cn('my-3 rounded-r-lg border-l-2 p-3', style.border, style.bg)}
    >
      <div className="mb-1 flex items-center gap-2">
        <MsIcon name={style.icon} size={14} className={style.text} />
        <span className={cn('text-[14px] font-semibold', style.text)}>
          {BLOCKQUOTE_LABELS[type]}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-foreground/70">
        {content}
      </p>
    </div>
  )
}

function FaqAnswerContent({ faq }: { faq: FaqEntry }) {
  return (
    <>
      <p className="mb-5 max-w-[72ch] text-[16px] leading-relaxed text-foreground/70">
        {faq.intro}
      </p>
      {faq.steps && faq.steps.length > 0 && (
        <div className="mb-6">
          <ol className="space-y-4">
            {faq.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[12px] font-bold text-accent">
                  {i + 1}
                </span>
                <div>
                  <h4 className="text-[16px] font-semibold text-foreground/85">
                    {step.title}
                  </h4>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-foreground/60">
                    {step.content}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {faq.tips && faq.tips.length > 0 && (
        <div className="mb-6">
          {faq.tips.map((tip, i) => (
            <BlockquoteBlock key={i} type={tip.type} content={tip.content} />
          ))}
        </div>
      )}
    </>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.querySelector(
      '.help-scroll-container',
    ) as HTMLElement | null
    if (!el) return
    containerRef.current = el
    const onScroll = () => setVisible(el.scrollTop > 400)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() =>
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
      className="fixed bottom-6 right-6 z-30 flex size-10 items-center justify-center rounded-full border border-border/50 bg-card/90 text-foreground/40 shadow-lg backdrop-blur-sm transition-all hover:border-accent/40 hover:text-accent hover:shadow-accent/10"
      aria-label="返回顶部"
    >
      <MsIcon name="keyboard_arrow_up" size={16} />
    </button>
  )
}

/** 帮助文档 — 独立页面，从帮助中心矩阵进入 */
export default function HelpDocs() {
  const location = useLocation()

  useEffect(() => {
    const hash = location.hash
    if (!hash.startsWith('#faq-')) return
    const id = hash.slice(1)
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [location.hash])

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const sc = document.querySelector(
      '.help-scroll-container',
    ) as HTMLElement | null
    const scrollTop = sc ? sc.scrollTop : window.scrollY
    const containerTop = sc ? sc.getBoundingClientRect().top : 0
    const y = el.getBoundingClientRect().top + scrollTop - containerTop - 80
    ;(sc || window).scrollTo({ top: y, behavior: 'smooth' })
  }

  const tocItems = useMemo(() => {
    const items: import('@/components/ui/dynamic-island-toc').TocItem[] = []
    for (const cat of FAQ_CATEGORIES) {
      const entries = FAQ.filter((f) => f.category === cat.id)
      if (entries.length === 0) continue
      items.push({
        id: `cat-${cat.id}`,
        text: cat.title,
        level: 1,
        onClick: () => scrollToAnchor(`cat-${cat.id}`),
      })
      for (const faq of entries) {
        items.push({
          id: `faq-${faq.id}`,
          text: faq.q,
          level: 2,
          onClick: () => scrollToAnchor(`faq-${faq.id}`),
        })
      }
    }
    return items
  }, [])

  return (
    <InternalPageShell
      width="wide"
      flush
      className="overflow-hidden bg-background text-foreground"
      contentClassName="flex h-full min-h-0 shrink flex-1 flex-col"
    >
      <PageHeader
        title="帮助文档"
        onBack="back"
        divider={false}
        className="mb-0 shrink-0 px-5 pt-3"
      />
      <article
        id="help-full-content"
        className="help-scroll-container flex min-h-0 flex-1 flex-col items-center overflow-y-auto scroll-smooth px-6 py-8 sm:px-12"
      >
        <div className="mx-auto max-w-3xl">
          {FAQ_CATEGORIES.map((cat) => {
            const entries = FAQ.filter((f) => f.category === cat.id)
            if (entries.length === 0) return null
            const CatIcon = cat.icon
            return (
              <section key={cat.id} className="mb-12">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <MsIcon name={CatIcon} size={18} />
                  </div>
                  <h2
                    id={`cat-${cat.id}`}
                    className="text-xl font-bold text-foreground"
                  >
                    {cat.title}
                  </h2>
                </div>
                <div className="space-y-8">
                  {entries.map((faq) => (
                    <div key={faq.id}>
                      <h3
                        id={`faq-${faq.id}`}
                        className="mb-3 text-lg font-semibold text-foreground"
                      >
                        {faq.q}
                      </h3>
                      <FaqAnswerContent faq={faq} />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </article>
      <DynamicIslandTOC items={tocItems} />
      <BackToTop />
    </InternalPageShell>
  )
}
