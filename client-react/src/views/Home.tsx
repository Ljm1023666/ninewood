import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Paperclip, Mic } from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { buildDiscoverSearchQuery } from '@/utils/discover-search'
import { cn } from '@/lib/utils'

const PLACEHOLDERS = [
  '输入「全部」「线上」「线下」或关键词',
  '我想接王者荣耀陪玩',
  '有没有跑腿代取的活',
  '我想接设计类的单子',
  '有没有线下的兼职',
  '我想接编程相关的项目',
]

export default function Home() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive || inputValue) return
    const interval = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
        setShowPlaceholder(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [isActive, inputValue])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (!inputValue) setIsActive(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputValue])

  function goDiscover() {
    const qs = buildDiscoverSearchQuery(inputValue.trim())
    navigate(qs ? `/discover?${qs}` : '/discover')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      goDiscover()
    }
  }

  const letterVariants = {
    initial: { opacity: 0, filter: 'blur(12px)', y: 10 },
    animate: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { duration: 0.35, ease: 'easeOut' },
      },
    },
    exit: {
      opacity: 0,
      filter: 'blur(12px)',
      y: -10,
      transition: {
        opacity: { duration: 0.2 },
        filter: { duration: 0.3 },
        y: { duration: 0.3, ease: 'easeIn' },
      },
    },
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center antialiased">
        <div className="relative z-10 mx-auto max-w-2xl p-4">
          <h1 className="relative z-10 text-center font-sans text-lg font-bold text-text-primary md:text-7xl">
            发现
          </h1>
          <p />
          <p className="relative z-10 mx-auto my-2 max-w-lg text-center text-sm text-[var(--text-secondary)]">
            浏览最新需求，接单赚钱；多一个人发布，就多一个机会。发布需求、搜索匹配、站内沟通与订单履约，都在九木完成。
          </p>

          <motion.div
            ref={wrapperRef}
            className="relative z-10 mx-auto mt-6 w-full max-w-xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
            animate={{
              height: isActive || inputValue ? 56 : 52,
              boxShadow:
                isActive || inputValue
                  ? '0 4px 24px rgba(0,0,0,0.2)'
                  : '0 1px 4px rgba(0,0,0,0.08)',
            }}
            initial={false}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => setIsActive(true)}
          >
            <div className="flex items-center gap-2 px-3 py-2 h-full">
              <button
                type="button"
                tabIndex={-1}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50 transition"
              >
                <Paperclip size={18} />
              </button>

              <div className="relative flex-1 h-full flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsActive(true)}
                  className="w-full border-0 outline-none bg-transparent py-2 text-sm text-[var(--text-primary)] placeholder-transparent [&:-webkit-autofill]:!bg-transparent [&:-webkit-autofill]:!shadow-[0_0_0_1000px_var(--bg-secondary)_inset] [&:-webkit-autofill]:![-webkit-text-fill-color:var(--text-primary)]"
                  style={{ position: 'relative', zIndex: 1 }}
                  autoComplete="off"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center px-1">
                  <AnimatePresence mode="wait">
                    {showPlaceholder && !isActive && !inputValue && (
                      <motion.span
                        key={placeholderIndex}
                        className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--text-muted)] select-none pointer-events-none text-sm truncate max-w-full"
                        style={{ zIndex: 0 }}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={{
                          initial: {},
                          animate: { transition: { staggerChildren: 0.025 } },
                          exit: {
                            transition: {
                              staggerChildren: 0.015,
                              staggerDirection: -1,
                            },
                          },
                        }}
                      >
                        {PLACEHOLDERS[placeholderIndex]
                          .split('')
                          .map((char, i) => (
                            <motion.span
                              key={i}
                              variants={letterVariants}
                              style={{ display: 'inline-block' }}
                            >
                              {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                          ))}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                type="button"
                tabIndex={-1}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50 transition"
              >
                <Mic size={18} />
              </button>

              <button
                type="button"
                onClick={goDiscover}
                disabled={!inputValue.trim()}
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full transition',
                  inputValue.trim()
                    ? 'bg-[var(--accent-color)] text-white hover:opacity-90'
                    : 'bg-[var(--bg-tertiary)]/30 text-[var(--text-muted)]',
                )}
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </motion.div>
        </div>
        <BackgroundBeams />
      </div>
    </div>
  )
}
