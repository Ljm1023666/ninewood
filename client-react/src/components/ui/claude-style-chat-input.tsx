import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus,
  ChevronDown,
  ArrowUp,
  X,
  FileText,
  Loader2,
  Check,
  Archive,
} from 'lucide-react'

const Icons = {
  Plus,
  Thinking: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      {...props}
    >
      <path d="M10.3857 2.50977C14.3486 2.71054 17.5 5.98724 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 9.72386 2.72386 9.5 3 9.5C3.27614 9.5 3.5 9.72386 3.5 10C3.5 13.5899 6.41015 16.5 10 16.5C13.5899 16.5 16.5 13.5899 16.5 10C16.5 6.5225 13.7691 3.68312 10.335 3.50879L10 3.5L9.89941 3.49023C9.67145 3.44371 9.5 3.24171 9.5 3C9.5 2.72386 9.72386 2.5 10 2.5L10.3857 2.50977ZM10 5.5C10.2761 5.5 10.5 5.72386 10.5 6V9.69043L13.2236 11.0527C13.4706 11.1762 13.5708 11.4766 13.4473 11.7236C13.3392 11.9397 13.0957 12.0435 12.8711 11.9834L12.7764 11.9473L9.77637 10.4473C9.60698 10.3626 9.5 10.1894 9.5 10V6C9.5 5.72386 9.72386 5.5 10 5.5ZM3.66211 6.94141C4.0273 6.94159 4.32303 7.23735 4.32324 7.60254C4.32324 7.96791 4.02743 8.26446 3.66211 8.26465C3.29663 8.26465 3 7.96802 3 7.60254C3.00021 7.23723 3.29676 6.94141 3.66211 6.94141ZM4.95605 4.29395C5.32146 4.29404 5.61719 4.59063 5.61719 4.95605C5.6171 5.3214 5.3214 5.61709 4.95605 5.61719C4.59063 5.61719 4.29403 5.32146 4.29395 4.95605C4.29395 4.59057 4.59057 4.29395 4.95605 4.29395ZM7.60254 3C7.96802 3 8.26465 3.29663 8.26465 3.66211C8.26446 4.02743 7.96791 4.32324 7.60254 4.32324C7.23736 4.32302 6.94159 4.0273 6.94141 3.66211C6.94141 3.29676 7.23724 3.00022 7.60254 3Z" />
    </svg>
  ),
  ArrowUp,
  X,
  FileText,
  Loader2,
  Check,
  Archive,
  SelectArrow: ChevronDown,
}

interface Model {
  id: string
  name: string
  description: string
  badge?: string
}

interface AttachedFile {
  id: string
  file: File
  type: string
  preview: string | null
  uploadStatus: string
  content?: string
}

function ModelSelector({
  models,
  selectedModel,
  onSelect,
}: {
  models: Model[]
  selectedModel: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cur = models.find((m) => m.id === selectedModel) || models[0]!
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center shrink-0 transition h-8 rounded-xl px-3 min-w-[4rem] active:scale-[0.98] whitespace-nowrap !text-xs gap-1 ${open ? 'bg-bg-200 text-text-100' : 'text-text-300 hover:text-text-200 hover:bg-bg-200'}`}
      >
        <span className="select-none font-medium">{cur.name}</span>
        <Icons.SelectArrow
          className={`shrink-0 opacity-75 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-[260px] bg-white dark:bg-[#212121] border border-[#DDDDDD] dark:border-[#30302E] rounded-2xl shadow-2xl z-50 p-1.5 animate-fade-in origin-bottom-right">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelect(m.id)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-bg-200 dark:hover:bg-[#30302E] transition-colors"
            >
              <span className="text-[13px] font-semibold text-text-100 dark:text-[#ECECEC]">
                {m.name}
              </span>
              <span className="text-[11px] text-text-300 dark:text-[#999999] block">
                {m.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  onSend: (message: string, files: AttachedFile[], model: string) => void
  onStop?: () => void
  loading?: boolean
  thinkMode: boolean
  onThinkModeChange: (v: boolean) => void
  webSearch: boolean
  onWebSearchChange: (v: boolean) => void
}

export default function ClaudeChatInput({
  onSend,
  onStop,
  loading,
  thinkMode,
  onThinkModeChange,
  webSearch,
  onWebSearchChange,
}: Props) {
  const [msg, setMsg] = useState('')
  const ta = useRef<HTMLTextAreaElement>(null)
  const fi = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [pasted, setPasted] = useState<
    { id: string; content: string; timestamp: Date }[]
  >([])
  const [drag, setDrag] = useState(false)
  const [model, setModel] = useState('deepseek-v4-pro')

  const MODELS: Model[] = [
    {
      id: 'deepseek-v4-pro',
      name: 'DeepSeek V4 Pro',
      description: '最强大，适合复杂分析',
    },
    {
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      description: '快速响应，日常对话',
    },
    { id: 'minimax', name: 'MiniMax', description: '创作与多模态能力' },
  ]

  useEffect(() => {
    if (ta.current) {
      ta.current.style.height = 'auto'
      ta.current.style.height = Math.min(ta.current.scrollHeight, 384) + 'px'
    }
  }, [msg])

  const handleFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).map((f) => ({
      id: Math.random().toString(36).slice(2, 11),
      file: f,
      type: f.type.startsWith('image/')
        ? 'image/unknown'
        : f.type || 'application/octet-stream',
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      uploadStatus: 'pending' as const,
    }))
    setFiles((p) => [...p, ...arr])
    arr.forEach((f) =>
      setTimeout(
        () =>
          setFiles((p) =>
            p.map((x) =>
              x.id === f.id ? { ...x, uploadStatus: 'complete' } : x,
            ),
          ),
        800 + Math.random() * 1000,
      ),
    )
  }, [])

  const go = () => {
    if (msg.trim() || files.length || pasted.length) {
      onSend(msg, files, model)
      setMsg('')
      setFiles([])
      setPasted([])
    }
  }

  const has = msg.trim() || files.length > 0 || pasted.length > 0

  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDrag(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
      }}
    >
      <div className="!box-content flex flex-col mx-2 md:mx-0 items-stretch rounded-2xl cursor-text border border-bg-300 dark:border-transparent shadow-[0_0_15px_rgba(0,0,0,0.08)] hover:shadow-[0_0_20px_rgba(0,0,0,0.12)] focus-within:shadow-[0_0_25px_rgba(0,0,0,0.15)] bg-white dark:bg-[#30302E] antialiased">
        <div className="flex flex-col px-3 pt-3 pb-2 gap-2">
          {(files.length > 0 || pasted.length > 0) && (
            <div className="flex gap-3 overflow-x-auto pb-2 px-1">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="relative group shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-bg-300 bg-bg-200 animate-fade-in"
                >
                  {f.preview ? (
                    <img
                      src={f.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full p-3 flex flex-col justify-between">
                      <Icons.FileText className="w-4 h-4 text-text-300" />
                      <p className="text-xs truncate">{f.file.name}</p>
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setFiles((p) => p.filter((x) => x.id !== f.id))
                    }
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100"
                  >
                    <Icons.X className="w-3 h-3" />
                  </button>
                  {f.uploadStatus === 'pending' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Icons.Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="relative mb-1">
            <div className="max-h-96 w-full overflow-y-auto min-h-[2.5rem] pl-1">
              <textarea
                ref={ta}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    go()
                  }
                }}
                placeholder="输入消息…"
                className="w-full bg-transparent border-0 outline-none text-text-100 text-[16px] placeholder:text-text-400 resize-none overflow-hidden py-0 leading-relaxed"
                rows={1}
                autoFocus
                style={{ minHeight: '1.5em' }}
              />
            </div>
          </div>
          <div className="flex gap-2 w-full items-center">
            <div className="flex-1 flex items-center gap-1">
              <button
                onClick={() => fi.current?.click()}
                className="h-8 w-8 rounded-lg active:scale-95 text-text-400 hover:text-text-200 hover:bg-bg-200 cursor-pointer"
              >
                <Icons.Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => onThinkModeChange(!thinkMode)}
                className={`h-8 w-8 rounded-lg active:scale-95 cursor-pointer ${thinkMode ? 'text-accent bg-accent/10' : 'text-text-400 hover:text-text-200 hover:bg-bg-200'}`}
                aria-pressed={thinkMode}
              >
                <Icons.Thinking className="w-5 h-5" />
              </button>
              <button
                onClick={() => onWebSearchChange(!webSearch)}
                className={`h-7 w-7 rounded-lg active:scale-95 cursor-pointer text-xs font-bold ${webSearch ? 'text-blue-400 bg-blue-500/10' : 'text-text-400 hover:text-text-200 hover:bg-bg-200'}`}
                aria-pressed={webSearch}
              >
                @
              </button>
            </div>
            <div className="flex items-center gap-1">
              <ModelSelector
                models={MODELS}
                selectedModel={model}
                onSelect={setModel}
              />
              {loading ? (
                <button
                  onClick={onStop}
                  className="h-8 w-8 rounded-xl active:scale-95 bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                >
                  <div className="size-3 bg-red-400 rounded-sm mx-auto" />
                </button>
              ) : (
                <button
                  onClick={go}
                  disabled={!has}
                  className={`h-8 w-8 rounded-xl active:scale-95 cursor-pointer ${has ? 'bg-accent text-bg-0 hover:bg-accent-hover shadow-md' : 'bg-accent/30 text-bg-0/60 cursor-default'}`}
                >
                  <Icons.ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {drag && (
        <div className="absolute inset-0 bg-bg-200/90 border-2 border-dashed border-accent rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Icons.Archive className="w-10 h-10 text-accent mb-2 animate-bounce" />
          <p className="text-accent font-medium">拖放文件以上传</p>
        </div>
      )}
      <input
        ref={fi}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="text-center mt-4">
        <p className="text-xs text-text-500">AI 可能出错，请核实重要信息</p>
      </div>
    </div>
  )
}
