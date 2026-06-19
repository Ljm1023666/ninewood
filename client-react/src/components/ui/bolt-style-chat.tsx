import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Plus,
  Lightbulb,
  Paperclip,
  Image,
  FileCode,
  ChevronDown,
  Check,
  Sparkles,
  Zap,
  Brain,
  Bolt,
  SendHorizontal,
  Square,
} from 'lucide-react'

/* ── Model 选择器 ── */
interface Model {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  badge?: string
}

const DEFAULT_MODELS: Model[] = [
  {
    id: 'MiniMax-M2.7-highspeed',
    name: 'MiniMax M2.7',
    description: '默认 · 高速旗舰',
    icon: <Sparkles className="size-4 text-purple-400" />,
    badge: '默认',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    description: '轻量 · 极速响应 · 284B',
    icon: <Zap className="size-4 text-amber-400" />,
    badge: '高速',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    description: '最强 · 深度推理 · 1.6T',
    icon: <Brain className="size-4 text-emerald-400" />,
    badge: '最强',
  },
]

function ModelSelector({
  selectedModel,
  onModelChange,
  models = DEFAULT_MODELS,
  appearance = 'dark',
}: {
  selectedModel?: string
  onModelChange?: (model: Model) => void
  models?: Model[]
  appearance?: 'dark' | 'light'
}) {
  const isLight = appearance === 'light'
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(
    models.find((m) => m.id === selectedModel) || models[0],
  )

  const handleSelect = (model: Model) => {
    setSelected(model)
    setIsOpen(false)
    onModelChange?.(model)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95',
          isLight
            ? 'text-[#666] hover:bg-black/5 hover:text-[#111]'
            : 'text-[#8a8a8f] hover:bg-white/5 hover:text-white',
        )}
      >
        {selected.icon}
        <span>{selected.name}</span>
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              'absolute bottom-full left-0 z-50 mb-2 min-w-[220px] overflow-hidden rounded-xl border shadow-2xl animate-in fade-in duration-200',
              isLight
                ? 'border-black/10 bg-white shadow-black/10'
                : 'border-white/10 bg-[#1a1a1e]/95 shadow-black/50 backdrop-blur-xl',
            )}
          >
            <div className="p-1.5">
              <div
                className={cn(
                  'px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider',
                  isLight ? 'text-[#888]' : 'text-[#5a5a5f]',
                )}
              >
                选择模型
              </div>
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-150',
                    selected.id === model.id
                      ? isLight
                        ? 'bg-black/5 text-[#111]'
                        : 'bg-white/10 text-white'
                      : isLight
                        ? 'text-[#555] hover:bg-black/5 hover:text-[#111]'
                        : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white',
                  )}
                >
                  <div className="flex-shrink-0">{model.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model.name}</span>
                      {model.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            model.badge === 'Pro'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#6a6a6f]">
                      {model.description}
                    </span>
                  </div>
                  {selected.id === model.id && (
                    <Check className="size-4 text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── 附件类型 ── */
interface AttachedFile {
  name: string
  size: number
  type: string
}

/* ── Props ── */
interface BoltChatInputProps {
  onSend: (message: string, files: AttachedFile[], model: string) => void
  onStop?: () => void
  loading?: boolean
  thinkMode: boolean
  onThinkModeChange: (v: boolean) => void
  webSearch: boolean
  onWebSearchChange: (v: boolean) => void
  placeholder?: string
  models?: Model[]
  /** 浅色页面用 light，默认深色 Composer */
  appearance?: 'dark' | 'light'
  /** Codex 风格：大圆角 + 黑色方块发送/停止 */
  variant?: 'default' | 'codex'
}

export function BoltChatInput({
  onSend,
  onStop,
  loading,
  thinkMode,
  onThinkModeChange,
  webSearch,
  onWebSearchChange,
  models,
  placeholder = '输入你的问题...',
  appearance = 'dark',
  variant = 'default',
}: BoltChatInputProps) {
  const isLight = appearance === 'light'
  const isCodex = variant === 'codex' && isLight
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [selectedModel, setSelectedModel] = useState(
    models?.[0]?.id || DEFAULT_MODELS[0].id,
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 输入框自动增高
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  // 回复完成后自动聚焦输入框
  const prevLoading = useRef(loading)
  useEffect(() => {
    if (prevLoading.current && !loading) {
      textareaRef.current?.focus()
    }
    prevLoading.current = loading
  }, [loading])

  const handleSubmit = () => {
    if (message.trim() && !loading) {
      onSend(message, files, selectedModel)
      setMessage('')
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFilePick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    const newFiles: AttachedFile[] = picked.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }))
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5))
    setShowAttachMenu(false)
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="relative w-full">
      {/* 已选文件 */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {files.map((f, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                isLight
                  ? 'bg-black/5 text-[#333]'
                  : 'bg-white/10 text-white/80',
              )}
            >
              {f.name}
              <button
                onClick={() => removeFile(i)}
                className="hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {!isLight ? (
        <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent" />
      ) : null}
      <div
        className={cn(
          'relative',
          isCodex ? 'rounded-[28px]' : 'rounded-2xl',
          isLight
            ? isCodex
              ? 'border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
              : 'border border-black/[0.08] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]'
            : 'bg-[#1e1e22] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.08]',
        )}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-5 pt-5 pb-3 text-[15px] focus:outline-none',
              isLight
                ? 'text-[#111] placeholder-[#999]'
                : 'text-white placeholder-[#5a5a5f]',
            )}
            style={{ height: '56px' }}
            rows={1}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* 左侧：附件 + 模型 + 思考/搜索开关 */}
          <div className="flex items-center gap-1">
            {/* 附件 */}
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
                  isLight
                    ? 'bg-black/[0.04] text-[#666] hover:bg-black/[0.08] hover:text-[#111]'
                    : 'bg-white/[0.08] text-[#8a8a8f] hover:bg-white/[0.12] hover:text-white',
                )}
              >
                <Plus
                  className={`size-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`}
                />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              {showAttachMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAttachMenu(false)}
                  />
                  <div
                    className={cn(
                      'absolute bottom-full left-0 z-50 mb-2 min-w-[180px] overflow-hidden rounded-xl border shadow-2xl animate-in fade-in duration-200',
                      isLight
                        ? 'border-black/10 bg-white shadow-black/10'
                        : 'border-white/10 bg-[#1a1a1e]/95 shadow-black/50 backdrop-blur-xl',
                    )}
                  >
                    <div className="p-1.5">
                      {[
                        {
                          icon: <Paperclip className="size-4" />,
                          label: '上传文件',
                          action: handleFilePick,
                        },
                        {
                          icon: <Image className="size-4" />,
                          label: '添加图片',
                          action: handleFilePick,
                        },
                        {
                          icon: <FileCode className="size-4" />,
                          label: '导入代码',
                          action: handleFilePick,
                        },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150',
                            isLight
                              ? 'text-[#555] hover:bg-black/5 hover:text-[#111]'
                              : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white',
                          )}
                        >
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={(m) => setSelectedModel(m.id)}
              models={models}
              appearance={appearance}
            />
          </div>

          <div className="flex-1" />

          {/* 右侧：思考 + 搜索 + 发送/停止 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onThinkModeChange(!thinkMode)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                thinkMode
                  ? isLight
                    ? 'bg-purple-500/15 text-purple-700'
                    : 'bg-purple-500/20 text-purple-300'
                  : isLight
                    ? 'text-[#666] hover:bg-black/5 hover:text-[#111]'
                    : 'text-[#6a6a6f] hover:bg-white/5 hover:text-white',
              )}
            >
              <Lightbulb className="size-3.5" />
              <span>思考</span>
            </button>

            <button
              onClick={() => onWebSearchChange(!webSearch)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                webSearch
                  ? isLight
                    ? 'bg-blue-500/15 text-blue-700'
                    : 'bg-blue-500/20 text-blue-300'
                  : isLight
                    ? 'text-[#666] hover:bg-black/5 hover:text-[#111]'
                    : 'text-[#6a6a6f] hover:bg-white/5 hover:text-white',
              )}
            >
              <Bolt className="size-3.5" />
              <span>搜索</span>
            </button>

            {loading ? (
              <button
                onClick={onStop}
                className={cn(
                  'flex items-center justify-center transition-all duration-200 active:scale-95',
                  isCodex
                    ? 'size-9 rounded-xl bg-[#1a1a1a] text-white hover:bg-black'
                    : 'gap-1.5 rounded-full bg-red-500/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500',
                )}
                aria-label="停止"
              >
                <Square className={cn('fill-current', isCodex ? 'size-3.5' : 'size-3')} />
                {!isCodex ? <span>停止</span> : null}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className={cn(
                  'flex items-center justify-center text-white transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
                  isCodex
                    ? 'size-9 rounded-xl bg-[#1a1a1a] hover:bg-black'
                    : cn(
                        'gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                        isLight
                          ? 'bg-[#3388FF] shadow-[0_2px_12px_rgba(51,136,255,0.25)] hover:bg-[#2a7ae8]'
                          : 'bg-[#1488fc] shadow-[0_0_20px_rgba(20,136,252,0.3)] hover:bg-[#1a94ff]',
                      ),
                )}
                aria-label="发送"
              >
                {isCodex ? (
                  <SendHorizontal className="size-4" />
                ) : (
                  <>
                    <span>发送</span>
                    <SendHorizontal className="size-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Ray 背景 ── */
function RayBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-[#0f0f0f]" />
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: `radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.8) 0%, rgba(20, 136, 252, 0.35) 14%, rgba(20, 136, 252, 0.18) 18%, rgba(20, 136, 252, 0.08) 22%, rgba(17, 17, 20, 0.2) 25%)`,
        }}
      />
      <div
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        <div
          className="absolute w-full h-full rounded-full -mt-[13px]"
          style={{
            background:
              'radial-gradient(43.89% 25.74% at 50.02% 97.24%, #111114 0%, #0f0f0f 100%)',
            border: '16px solid white',
            transform: 'rotate(180deg)',
            zIndex: 5,
          }}
        />
        <div
          className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[11px]"
          style={{
            border: '23px solid #b7d7f6',
            transform: 'rotate(180deg)',
            zIndex: 4,
          }}
        />
        <div
          className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[8px]"
          style={{
            border: '23px solid #8fc1f2',
            transform: 'rotate(180deg)',
            zIndex: 3,
          }}
        />
        <div
          className="absolute w-full h-full rounded-full bg-[#0f0f0f] -mt-[4px]"
          style={{
            border: '23px solid #64acf6',
            transform: 'rotate(180deg)',
            zIndex: 2,
          }}
        />
        <div
          className="absolute w-full h-full rounded-full bg-[#0f0f0f]"
          style={{
            border: '20px solid #1172e2',
            boxShadow: '0 -15px 24.8px rgba(17, 114, 226, 0.6)',
            transform: 'rotate(180deg)',
            zIndex: 1,
          }}
        />
      </div>
    </div>
  )
}

/* ── 主页组件 ── */
interface BoltChatProps {
  title?: string
  subtitle?: string
  placeholder?: string
  onSend?: (message: string, files: AttachedFile[], model: string) => void
  onStop?: () => void
  loading?: boolean
  thinkMode?: boolean
  onThinkModeChange?: (v: boolean) => void
  webSearch?: boolean
  onWebSearchChange?: (v: boolean) => void
}

export function BoltStyleChat({
  title = 'What will you',
  subtitle = 'Create stunning apps & websites by chatting with AI.',
  placeholder = 'What do you want to build?',
  onSend,
  onStop,
  loading = false,
  thinkMode = false,
  onThinkModeChange,
  webSearch = false,
  onWebSearchChange,
}: BoltChatProps) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-[#0f0f0f]">
      <RayBackground />
      {/* 内容区 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full px-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-1">
            {title}{' '}
            <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
              build
            </span>{' '}
            today?
          </h1>
          <p className="text-base font-semibold sm:text-lg text-[#8a8a8f]">
            {subtitle}
          </p>
        </div>
        <div className="w-full max-w-[700px] mb-6 sm:mb-8 mt-2">
          <BoltChatInput
            placeholder={placeholder}
            onSend={onSend || (() => {})}
            onStop={onStop}
            loading={loading}
            thinkMode={thinkMode}
            onThinkModeChange={onThinkModeChange || (() => {})}
            webSearch={webSearch}
            onWebSearchChange={onWebSearchChange || (() => {})}
          />
        </div>
      </div>
    </div>
  )
}
