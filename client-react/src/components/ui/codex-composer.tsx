import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  AGENT_ACCESS_MODES,
  type AgentAccessMode,
} from '@/types/agent-access'
import {
  FALLBACK_COMPOSER_MODELS,
  type ComposerModelOption,
} from '@/constants/llm-providers'
import {
  Plus,
  Paperclip,
  Image,
  FileCode,
  ChevronDown,
  Check,
  ArrowUp,
  Square,
  Hand,
} from 'lucide-react'

const REASONING_LEVELS = [
  { id: 'low', label: '低' },
  { id: 'mid', label: '中' },
  { id: 'high', label: '高' },
  { id: 'ultra', label: '超高' },
] as const

const ACCESS_MODES = AGENT_ACCESS_MODES

export interface CodexComposerProps {
  onSend: (message: string, files: AttachedFile[], model: string) => void
  onStop?: () => void
  loading?: boolean
  thinkMode: boolean
  onThinkModeChange: (v: boolean) => void
  accessMode: AgentAccessMode
  onAccessModeChange: (mode: AgentAccessMode) => void
  placeholder?: string
  appearance?: 'dark' | 'light'
  layout?: 'start' | 'docked'
  /** 来自 /api/agent/provider；未传时使用兜底列表 */
  models?: ComposerModelOption[]
  defaultModelId?: string
}

interface AttachedFile {
  name: string
  size: number
  type: string
}

/** Codex 像素级 Composer */
export function CodexComposer({
  onSend,
  onStop,
  loading,
  thinkMode,
  onThinkModeChange,
  accessMode,
  onAccessModeChange,
  placeholder = '随心输入',
  appearance = 'light',
  layout = 'docked',
  models: modelsProp,
  defaultModelId,
}: CodexComposerProps) {
  const models = modelsProp?.length ? modelsProp : FALLBACK_COMPOSER_MODELS
  const isLight = appearance === 'light'
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [selectedModelId, setSelectedModelId] = useState(
    () => defaultModelId ?? models[0]?.id ?? FALLBACK_COMPOSER_MODELS[0].id,
  )
  const [reasoning, setReasoning] =
    useState<(typeof REASONING_LEVELS)[number]['id']>('mid')
  const [attachOpen, setAttachOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [tierOpen, setTierOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const tierBtnRef = useRef<HTMLButtonElement>(null)
  const tierPanelRef = useRef<HTMLDivElement>(null)
  const [tierPanelStyle, setTierPanelStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
  })

  const selectedModel =
    models.find((m) => m.id === selectedModelId) ?? models[0]

  const reasoningLabel =
    REASONING_LEVELS.find((r) => r.id === reasoning)?.label ?? '中'

  useEffect(() => {
    if (!defaultModelId) return
    if (models.some((m) => m.id === defaultModelId)) {
      setSelectedModelId(defaultModelId)
    }
  }, [defaultModelId, models])

  const preventInputBlur = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const closeAllMenus = () => {
    setAttachOpen(false)
    setAccessOpen(false)
    setTierOpen(false)
  }

  useEffect(() => {
    setReasoning(thinkMode ? 'mid' : 'low')
  }, [thinkMode])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [message])

  const prevLoading = useRef(loading)
  useEffect(() => {
    if (prevLoading.current && !loading) textareaRef.current?.focus()
    prevLoading.current = loading
  }, [loading])

  useEffect(() => {
    if (!attachOpen && !accessOpen) return
    const onDown = (e: MouseEvent) => {
      const root = surfaceRef.current
      if (root && !root.contains(e.target as Node)) closeAllMenus()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [attachOpen, accessOpen])

  useLayoutEffect(() => {
    if (!tierOpen) {
      setTierPanelStyle({ visibility: 'hidden' })
      return
    }

    const updatePosition = () => {
      const anchor = tierBtnRef.current
      const panel = tierPanelRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const gap = 8
      const panelWidth = panel?.offsetWidth ?? 280
      const panelHeight = panel?.offsetHeight ?? 220
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 12

      const rightSideLeft = rect.right + gap
      const fitsRight =
        rightSideLeft + panelWidth <= viewportWidth - margin

      if (fitsRight) {
        setTierPanelStyle({
          position: 'fixed',
          top: Math.max(margin, rect.bottom - panelHeight),
          left: rightSideLeft,
          zIndex: 10000,
          visibility: 'visible',
        })
        return
      }

      const left = Math.min(
        Math.max(margin, rect.right - panelWidth),
        viewportWidth - panelWidth - margin,
      )
      const top = Math.max(margin, rect.top - gap - panelHeight)

      setTierPanelStyle({
        position: 'fixed',
        top: Math.min(top, viewportHeight - panelHeight - margin),
        left,
        zIndex: 10000,
        visibility: 'visible',
      })
    }

    updatePosition()
    const panel = tierPanelRef.current
    const observer = panel ? new ResizeObserver(updatePosition) : null
    if (panel) observer?.observe(panel)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [tierOpen, reasoning, selectedModelId])

  useEffect(() => {
    if (!tierOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        tierBtnRef.current?.contains(target) ||
        tierPanelRef.current?.contains(target)
      ) {
        return
      }
      setTierOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [tierOpen])

  const handleReasoningChange = (id: (typeof REASONING_LEVELS)[number]['id']) => {
    setReasoning(id)
    onThinkModeChange(id !== 'low')
  }

  const handleAccessChange = (id: AgentAccessMode) => {
    onAccessModeChange(id)
    setAccessOpen(false)
  }

  const handleSubmit = () => {
    if (!message.trim() || loading) return
    onSend(message, files, selectedModelId)
    setMessage('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    setFiles((prev) =>
      [
        ...prev,
        ...picked.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      ].slice(0, 5),
    )
    setAttachOpen(false)
  }

  return (
    <div
      className={cn(
        'codex-composer',
        isLight ? 'codex-composer--light' : 'codex-composer--dark',
        layout === 'start' && 'codex-composer--start',
      )}
    >
      {files.length > 0 ? (
        <div className="codex-composer__files">
          {files.map((f, i) => (
            <span key={i} className="codex-composer__file-chip">
              {f.name}
              <button
                type="button"
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div ref={surfaceRef} className="codex-composer__surface">
        <div className="codex-composer__input-row">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="codex-composer__input"
            rows={1}
          />
          {loading ? (
            <button
              type="button"
              className="codex-composer__submit codex-composer__submit--inline"
              onClick={onStop}
              aria-label="停止"
            >
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              className="codex-composer__submit codex-composer__submit--inline"
              onClick={handleSubmit}
              disabled={!message.trim()}
              aria-label="发送"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="codex-composer__toolbar">
          <div className="codex-composer__toolbar-left">
            <div className="codex-composer__dropdown-anchor">
              <button
                type="button"
                className="codex-composer__icon-btn"
                onClick={() => {
                  setAttachOpen(!attachOpen)
                  setAccessOpen(false)
                  setTierOpen(false)
                }}
                aria-label="添加附件"
              >
                <Plus
                  className={cn('size-4', attachOpen && 'rotate-45 transition-transform')}
                />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              {attachOpen ? (
                <div className="codex-composer__menu-panel codex-composer__menu-panel--up">
                  {[
                    { icon: <Paperclip className="size-4" />, label: '上传文件' },
                    { icon: <Image className="size-4" />, label: '添加图片' },
                    { icon: <FileCode className="size-4" />, label: '导入代码' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="codex-composer__menu-item"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="codex-composer__dropdown-anchor">
              <button
                type="button"
                className={cn(
                  'codex-composer__pill-btn',
                  accessOpen && 'codex-composer__pill-btn--open',
                )}
                onClick={() => {
                  setAccessOpen(!accessOpen)
                  setAttachOpen(false)
                  setTierOpen(false)
                }}
              >
                <Hand className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="codex-composer__pill-text">
                  {ACCESS_MODES.find((m) => m.id === accessMode)?.label}
                </span>
                <ChevronDown
                  className={cn('size-3.5 opacity-60', accessOpen && 'rotate-180')}
                />
              </button>
              {accessOpen ? (
                <div className="codex-composer__menu-panel codex-composer__menu-panel--up">
                  {ACCESS_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      title={mode.hint}
                      className="codex-composer__menu-item codex-composer__menu-item--check"
                      onClick={() => handleAccessChange(mode.id)}
                    >
                      <span>{mode.label}</span>
                      {accessMode === mode.id ? (
                        <Check className="size-4 shrink-0" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="codex-composer__toolbar-right">
            <div className="codex-composer__dropdown-anchor codex-composer__dropdown-anchor--tier">
              <button
                ref={tierBtnRef}
                type="button"
                className={cn(
                  'codex-composer__pill-btn codex-composer__tier-btn',
                  tierOpen && 'codex-composer__tier-btn--open',
                )}
                onMouseDown={preventInputBlur}
                onClick={() => {
                  setTierOpen(!tierOpen)
                  setAttachOpen(false)
                  setAccessOpen(false)
                }}
                aria-expanded={tierOpen}
                aria-haspopup="listbox"
              >
                <span>
                  {selectedModel?.short ?? '模型'} {reasoningLabel}
                </span>
                <ChevronDown
                  className={cn('size-3.5 opacity-60', tierOpen && 'rotate-180')}
                />
              </button>

              {tierOpen
                ? createPortal(
                    <div
                      ref={tierPanelRef}
                      className={cn(
                        'codex-composer__tier-panel codex-composer__tier-panel--portal',
                        isLight
                          ? 'codex-composer--light'
                          : 'codex-composer--dark',
                      )}
                      style={tierPanelStyle}
                      role="listbox"
                      aria-label="推理与模型"
                      onMouseDown={preventInputBlur}
                    >
                      <div className="codex-composer__tier-section">
                        <p className="codex-composer__tier-label">推理</p>
                        {REASONING_LEVELS.map((level) => (
                          <button
                            key={level.id}
                            type="button"
                            className="codex-composer__menu-item codex-composer__menu-item--check"
                            onClick={() => handleReasoningChange(level.id)}
                          >
                            <span>{level.label}</span>
                            {reasoning === level.id ? (
                              <Check className="size-4 shrink-0" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <div
                        className="codex-composer__tier-divider"
                        aria-hidden
                      />
                      <div className="codex-composer__tier-section">
                        <p className="codex-composer__tier-label">模型</p>
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            className="codex-composer__menu-item codex-composer__menu-item--check"
                            onClick={() => {
                              setSelectedModelId(model.id)
                              setTierOpen(false)
                            }}
                          >
                            <span>{model.name}</span>
                            {selectedModelId === model.id ? (
                              <Check className="size-4 shrink-0" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
