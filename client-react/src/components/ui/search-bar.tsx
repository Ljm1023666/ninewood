import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  /** dark：叠在深色英雄上；light：浅色页面区 */
  tone?: 'dark' | 'light'
}

const SearchBar = ({
  placeholder = 'Search...',
  onSearch,
  tone = 'dark',
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const isLight = tone === 'light'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery)
    }
  }

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  return (
    <div className="relative flex w-full justify-center">
      <motion.form
        onSubmit={handleSubmit}
        className="relative flex items-center justify-center"
        initial={{ width: '260px' }}
        animate={{ width: isFocused ? '360px' : '260px' }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className={cn(
            'relative flex w-full items-center overflow-hidden rounded-full border transition-colors',
            isLight
              ? isFocused
                ? 'border-[var(--accent-color)]/50 bg-bg-card shadow-md'
                : 'border-border bg-bg-card'
              : isFocused
                ? 'border-white/50 bg-white/20 shadow-lg shadow-black/20'
                : 'border-white/40 bg-white/10 backdrop-blur-md',
          )}
        >
          <div className="py-2.5 pl-4">
            <Search
              className={cn(
                'size-4.5 transition-colors',
                isLight
                  ? isFocused
                    ? 'text-[var(--accent-color)]'
                    : 'text-text-muted'
                  : isFocused
                    ? 'text-white'
                    : 'text-white/50',
              )}
            />
          </div>

          <input
            ref={inputRef}
            type="text"
            aria-label="搜索方案"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className={cn(
              'relative z-10 w-full bg-transparent py-2.5 font-medium text-sm outline-none',
              isLight
                ? 'text-text-primary placeholder:text-text-muted'
                : isFocused
                  ? 'text-white placeholder:text-white/50'
                  : 'text-white/80 placeholder:text-white/50',
            )}
          />

          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                className={cn(
                  'mr-1.5 shrink-0 rounded-full px-4 py-1.5 text-xs font-medium shadow-lg',
                  isLight
                    ? 'bg-[var(--accent-color)] text-white'
                    : 'bg-white text-black',
                )}
              >
                搜索
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.form>
    </div>
  )
}

export { SearchBar }
