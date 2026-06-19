import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Tag {
  text: string
  onRemove: () => void
  variant?: 'pink' | 'purple'
}

const variantStyle: Record<string, string> = {
  pink: 'bg-pink-500/25 border border-pink-400/30',
  purple: 'bg-purple-500/25 border border-purple-400/30',
}

const Tag = ({ text, onRemove, variant }: Tag) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
      transition={{
        duration: 0.4,
        ease: "circInOut",
        type: "spring",
      }}
      className={cn(
        "px-2 py-1 rounded-xl text-sm flex items-center gap-1 backdrop-blur-sm text-white",
        variant ? variantStyle[variant] : "bg-white/10",
      )}
    >
      {text}
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          onClick={onRemove}
          className="bg-transparent text-xs h-fit flex items-center rounded-full justify-center text-white p-1 hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.span>
  )
}

interface InputWithTagsProps {
  placeholder?: string
  className?: string
  limit?: number
  onTagsChange?: (tags: string[]) => void
  initialTags?: string[]
  pinkTags?: string[]
  purpleTags?: string[]
}

const InputWithTags = ({
  placeholder,
  className,
  limit = 10,
  onTagsChange,
  initialTags,
  pinkTags,
  purpleTags,
}: InputWithTagsProps) => {
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [inputValue, setInputValue] = useState("")

  const addTag = (tag: string) => {
    const next = [...tags, tag]
    setTags(next)
    onTagsChange?.(next)
  }

  const removeTag = (indexToRemove: number) => {
    const next = tags.filter((_, index) => index !== indexToRemove)
    setTags(next)
    onTagsChange?.(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      if (!limit || tags.length < limit) {
        addTag(inputValue.trim())
        setInputValue("")
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-2 max-w-xl w-full mx-auto", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type something and press Enter..."}
          whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.12)" }}
          whileTap={{ scale: 0.99, backgroundColor: "rgba(255,255,255,0.08)" }}
          className="w-full px-4 py-2 bg-white/15 border border-white/10 rounded-xl backdrop-blur-md text-white placeholder:text-white/40 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ outline: 'none', boxShadow: 'none', WebkitAppearance: 'none' }}
          disabled={limit ? tags.length >= limit : false}
        />
      </motion.div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <Tag
              key={index}
              text={tag}
              onRemove={() => removeTag(index)}
              variant={pinkTags?.includes(tag) ? 'pink' : purpleTags?.includes(tag) ? 'purple' : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export { InputWithTags }
