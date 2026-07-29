import { useState } from 'react'
import { PathChip } from '@/components/path/PathChip'
import { PATH_TYPE_LABEL } from '@/constants/path-search'
import { parsePath, normalizeValue, PATH_LIMITS } from '@/utils/path-codec'
import { cn } from '@/lib/utils'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

const PATH_TYPES = Object.keys(PATH_TYPE_LABEL)

export function PathEditorPanel({
  paths,
  onChange,
  autoPaths,
  className,
  compact,
}: {
  paths: string[]
  onChange: (paths: string[]) => void
  /** 自动派生路径（只读参考） */
  autoPaths?: string[]
  className?: string
  compact?: boolean
}) {
  const [draftType, setDraftType] = useState('tag')
  const [draftValue, setDraftValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addPath = () => {
    const v = draftValue.trim()
    if (!v) return
    const raw = `${draftType}:${normalizeValue(v)}`
    if (!parsePath(raw)) {
      setError('路径格式无效')
      return
    }
    if (paths.includes(raw)) return
    if (paths.length >= PATH_LIMITS.perDemand) {
      setError(`最多 ${PATH_LIMITS.perDemand} 条路径`)
      return
    }
    setError(null)
    onChange([...paths, raw])
    setDraftValue('')
  }

  const resetToAuto = () => {
    if (autoPaths) onChange([...autoPaths])
    setError(null)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <PathChip
            key={p}
            path={p}
            onRemove={() => onChange(paths.filter((x) => x !== p))}
          />
        ))}
        {paths.length === 0 ? (
          <span className="text-xs text-text-muted">暂无路径</span>
        ) : null}
      </div>

      {!compact ? (
        <p className="text-xs text-text-muted">
          路径决定需求如何被检索命中。胡乱修改可能导致无人问津，由市场自然淘汰。
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          类型
          <select
            className="dlp-input min-w-[6rem] text-sm"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value)}
          >
            {PATH_TYPES.map((t) => (
              <option key={t} value={t}>
                {PATH_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-text-muted">
          值
          <input
            className="dlp-input w-full text-sm"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPath()}
            placeholder="如 react、it技术"
          />
        </label>
        <LiquidMetalButton type="button" className="ws-tool-btn" onClick={addPath}>
          添加
        </LiquidMetalButton>
        {autoPaths && paths.join(',') !== autoPaths.join(',') ? (
          <LiquidMetalButton type="button" className="ws-tool-btn" onClick={resetToAuto}>
            恢复自动
          </LiquidMetalButton>
        ) : null}
      </div>

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  )
}
