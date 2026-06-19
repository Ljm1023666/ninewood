'use client'

import { useCallback, useEffect, useState } from 'react'
import { Chip } from './chip'
import { LoadingState } from './loading-state'
import { cn } from '@/lib/utils'

interface TagSelectorProps {
  /** 所有可选标签 */
  tags: string[]
  /** 当前已选标签 */
  selected: string[]
  /** 选中变化回调 */
  onChange: (tags: string[]) => void
  /** 最多可选数量，默认 20 */
  max?: number
  /** 是否加载中 */
  loading?: boolean
  /** 错误信息 */
  error?: string | null
  className?: string
}

const MAX_DEFAULT = 20

function TagSelectorInner({
  tags,
  selected,
  onChange,
  max = MAX_DEFAULT,
  loading = false,
  error = null,
  compact = false,
  className,
}: TagSelectorProps & { compact?: boolean }) {
  const handleToggle = useCallback(
    (tag: string) => {
      if (selected.includes(tag)) {
        onChange(selected.filter((t) => t !== tag))
      } else if (selected.length < max) {
        onChange([...selected, tag])
      }
    },
    [selected, onChange, max],
  )

  const isAtMax = selected.length >= max

  // Loading
  if (loading) {
    return (
      <div className={className}>
        <LoadingState lines={2} />
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <p className={cn('text-sm text-red-400', className)}>
        标签加载失败：{error}
      </p>
    )
  }

  // Empty
  if (!tags || tags.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        暂无可用标签
      </p>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => {
        const isSelected = selected.includes(tag)
        const isDisabled = !isSelected && isAtMax

        return (
          <Chip
            key={tag}
            variant="outlined"
            selected={isSelected}
            disabled={isDisabled}
            onClick={() => handleToggle(tag)}
            className={cn(
              isDisabled && 'opacity-50 cursor-not-allowed',
              compact && 'h-6 px-2 text-xs',
            )}
          >
            {tag}
          </Chip>
        )
      })}
    </div>
  )
}

/**
 * 多选标签组件。
 * 使用 Chip 展示可选标签列表，支持 toggle 选中/取消和 max 上限。
 */
export function TagSelector(props: TagSelectorProps) {
  return <TagSelectorInner {...props} compact={false} />
}

/**
 * 紧凑版多选标签组件，用于内联/展示场景。
 */
export function TagSelectorCompact(props: TagSelectorProps) {
  return <TagSelectorInner {...props} compact={true} />
}

/**
 * 从 /api/tags 加载标签列表的 Hook。
 *
 * API 响应格式：
 * ```json
 * { "code": 200, "data": [{ "name": "出租车", "category": "service", "totalCompleted": 0 }] }
 * ```
 */
export function useTagLoader() {
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    fetch('/api/tags')
      .then((res) => {
        if (!res.ok) throw new Error(`请求失败 (${res.status})`)
        return res.json()
      })
      .then((d) => {
        if (cancelled) return
        if (d.code !== 200 && d.code !== undefined) {
          throw new Error(d.message ?? '未知错误')
        }
        const items: any[] = Array.isArray(d.data) ? d.data : []
        const names = items.map((t) => t.name).filter(Boolean)
        setTags(names)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { tags, loading, error }
}
