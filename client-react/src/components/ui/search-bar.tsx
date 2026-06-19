import type React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
}

const SearchBar = ({ placeholder = 'Search...', onSearch }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
    <div className="relative flex justify-center w-full">
      <motion.form
        onSubmit={handleSubmit}
        className="relative flex items-center justify-center"
        initial={{ width: '260px' }}
        animate={{ width: isFocused ? '360px' : '260px' }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className={cn(
            'flex items-center w-full rounded-full border relative overflow-hidden transition-colors',
            isFocused
              ? 'border-purple-400/70 bg-white/20 shadow-lg shadow-purple-500/20'
              : 'border-white/40 bg-white/10 backdrop-blur-md',
          )}
        >
          <div className="pl-4 py-2.5">
            <Search
              className={cn(
                'transition-colors',
                isFocused ? 'text-purple-300' : 'text-white/50',
                'size-4.5',
              )}
            />
          </div>

          <input
            ref={inputRef}
            type="text"
            aria-label="搜索需求"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className={cn(
              'w-full py-2.5 bg-transparent outline-none placeholder:text-white/50 font-medium text-sm relative z-10',
              isFocused ? 'text-white' : 'text-white/80',
            )}
          />

          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                className="px-4 py-1.5 mr-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shrink-0"
              >
                Search
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.form>
    </div>
  )
}

export { SearchBar }
