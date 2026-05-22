import { useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, X, BrainCog, Send, Minimize2 } from 'lucide-react'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { PageHeader } from '@/components/layout/PageHeader'
import { toast } from '@/components/ui/confirm-dialog'
import {
  formatDiscoverFilterHint,
  parseDiscoverUrlParams,
} from '@/utils/discover-search'

// ====== Types ======

interface ClassifyResult {
  understood: string
  scopePath: string[]
  scopeNodeIds: string[]
  taxonomyNodeId: string | null
  classifiedNodeIds?: string[]
  matchCount: number
  total?: number
  keywords?: string[]
  demands?: {
    id: string
    title: string
    minPrice: number
    descriptionPreview?: string
  }[]
  hint?: string
  refineOptions: {
    label: string
    taxonomyNodeId: string
    scopePath: string[]
    count: number
  }[]
  tags: string[]
  refinePrompt: string
  preciseEnough: boolean
  serviceType: string | null
}

// ====== Think Overlay — 独立可拖拽浮层 ======

function ThinkOverlay({
  text,
  isLoading,
  visible,
  onClose,
}: {
  text: string
  isLoading: boolean
  visible: boolean
  onClose: () => void
}) {
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('ninewood-think-overlay-pos')
    if (saved) {
      try {
        return JSON.parse(saved) as { x: number; y: number }
      } catch {
        /* skip */
      }
    }
    return { x: Math.max(0, window.innerWidth - 420), y: 80 }
  })
  const [minimized, setMinimized] = useState(false)
  const drag = useRef({ active: false, startX: 0, startY: 0, elX: 0, elY: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const [charLen, setCharLen] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Persist position
  useEffect(() => {
    localStorage.setItem('ninewood-think-overlay-pos', JSON.stringify(pos))
  }, [pos])

  // Typing animation — character by character
  useEffect(() => {
    if (charLen < text.length) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setCharLen((prev) => {
            if (prev >= text.length) {
              if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
              }
              return prev
            }
            return prev + 1
          })
        }, 20)
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [charLen, text.length])

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [charLen])

  useEffect(() => {
    if (!text) setCharLen(0)
  }, [text])

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const panel = panelRef.current
    if (!panel) return
    e.preventDefault()
    panel.setPointerCapture(e.pointerId)
    const r = panel.getBoundingClientRect()
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      elX: r.left,
      elY: r.top,
    }
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return
      const vw = window.innerWidth,
        vh = window.innerHeight
      const w = minimized ? 220 : 360
      const h = minimized ? 40 : 320
      setPos({
        x: Math.max(
          0,
          Math.min(
            drag.current.elX + (e.clientX - drag.current.startX),
            vw - w,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            drag.current.elY + (e.clientY - drag.current.startY),
            vh - h,
          ),
        ),
      })
    },
    [minimized],
  )

  const onPointerUp = useCallback(() => {
    drag.current.active = false
  }, [])

  if (!visible || !text) return null

  const panelW = minimized ? 220 : 360
  const panelH = minimized ? 40 : 320

  return (
    <div
      ref={panelRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="fixed z-[9999] rounded-xl border border-purple-500/30 bg-[#1a1a2e] shadow-2xl overflow-hidden select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: panelW,
        height: panelH,
        transition: drag.current.active ? 'none' : 'left 0.1s, top 0.1s',
      }}
    >
      {/* Header — 拖拽区域 */}
      <div
        onPointerDown={onPointerDown}
        className="flex items-center justify-between px-3 py-2 bg-purple-500/10 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 text-sm text-purple-300">
          <BrainCog className="size-3.5" />
          <span>思考过程</span>
          {isLoading && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized(!minimized)}
            className="flex size-6 items-center justify-center rounded text-purple-400/50 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
            title={minimized ? '展开' : '最小化'}
          >
            <Minimize2 className="size-3" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded text-purple-400/50 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
            title="关闭"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

      {/* 内容 — 流式输出 */}
      {!minimized && (
        <div
          ref={scrollRef}
          className="p-3 text-sm text-purple-300/60 leading-relaxed whitespace-pre-wrap font-mono overflow-y-auto"
          style={{
            height: panelH - 36,
            scrollbarWidth: 'thin',
            scrollbarColor: '#444 transparent',
          }}
        >
          {text.slice(0, charLen)}
          {charLen < text.length && (
            <span className="inline-block w-0.5 h-3.5 bg-purple-400/60 ml-0.5 animate-pulse" />
          )}
        </div>
      )}
    </div>
  )
}

// ====== 悬浮球（含输入栏、Think 开关、发送按钮） ======

const SIDEBAR_W = 80
const BALL_SIZE = 48 // 折叠态直径
const EXPANDED_W = 400 // 展开态宽度
const BAR_H = 48 // 展开态高度
const MARGIN = 8

function FloatingBall({
  thinkMode,
  onThinkToggle,
  onSend,
  isLoading,
}: {
  thinkMode: boolean
  onThinkToggle: () => void
  onSend: (text: string, thinkMode: boolean) => void
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState('')
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('ninewood-float-bar-pos')
    if (saved) {
      try {
        return JSON.parse(saved) as { x: number; y: number }
      } catch {
        /* skip */
      }
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    return { x: vw - BALL_SIZE - MARGIN - 8, y: vh - 160 }
  })
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    elX: 0,
    elY: 0,
    moved: false,
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 持久化位置
  useEffect(() => {
    localStorage.setItem('ninewood-float-bar-pos', JSON.stringify(pos))
  }, [pos])

  // Resize 时 clamp
  useEffect(() => {
    const w = expanded ? EXPANDED_W : BALL_SIZE
    function clamp() {
      const vw = window.innerWidth,
        vh = window.innerHeight
      setPos((p) => {
        let x = p.x,
          y = p.y,
          ch = false
        if (x < SIDEBAR_W + MARGIN) {
          x = SIDEBAR_W + MARGIN
          ch = true
        }
        if (y < MARGIN) {
          y = MARGIN
          ch = true
        }
        if (x + w > vw - MARGIN) {
          x = vw - w - MARGIN
          ch = true
        }
        if (y + BAR_H > vh - MARGIN) {
          y = vh - BAR_H - MARGIN
          ch = true
        }
        return ch ? { x, y } : p
      })
    }
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [expanded])

  // 展开后自动聚焦输入框
  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus()
  }, [expanded])

  // 点击外部 → 折叠
  useEffect(() => {
    if (!expanded) return
    const raf = requestAnimationFrame(() => {
      const handler = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          setExpanded(false)
        }
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    })
    return () => cancelAnimationFrame(raf)
  }, [expanded])

  // --- 拖拽 ---
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // 输入框内不触发拖拽
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    const el = rootRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const r = el.getBoundingClientRect()
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      elX: r.left,
      elY: r.top,
      moved: false,
    }
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return
      const dx = e.clientX - drag.current.startX
      const dy = e.clientY - drag.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.current.moved = true
      const w = expanded ? EXPANDED_W : BALL_SIZE
      const vw = window.innerWidth,
        vh = window.innerHeight
      setPos({
        x: Math.max(
          SIDEBAR_W + MARGIN,
          Math.min(drag.current.elX + dx, vw - w - MARGIN),
        ),
        y: Math.max(
          MARGIN,
          Math.min(drag.current.elY + dy, vh - BAR_H - MARGIN),
        ),
      })
    },
    [expanded],
  )

  const onPointerUp = useCallback(() => {
    const d = drag.current
    d.active = false
    // 纯点击（无拖拽）且折叠态 → 展开
    if (!d.moved && !expanded) setExpanded(true)
  }, [expanded])

  // --- 发送 ---
  const send = useCallback(() => {
    const text = value.trim()
    if (!text || isLoading) return
    onSend(text, thinkMode)
    setValue('')
  }, [value, isLoading, onSend, thinkMode])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        send()
      }
    },
    [send],
  )

  const placeholder = thinkMode ? '深度思考模式...' : '描述你的能力'

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="fixed z-[9999] touch-none"
      style={{
        left: pos.x,
        top: pos.y,
        transition: drag.current.active ? 'none' : 'left 0.15s, top 0.15s',
      }}
    >
      {expanded ? (
        /* 展开态：输入栏 */
        <div
          className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#1a1a2e] shadow-2xl px-2.5 py-1.5"
          style={{ width: EXPANDED_W, height: BAR_H }}
        >
          {/* 🧠 Think 开关 — 参照 PromptInputBox 设计 */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onThinkToggle()
            }}
            className={`rounded-full transition-all duration-200 flex items-center gap-1 border shrink-0 ${
              thinkMode
                ? 'px-2.5 py-0 h-6 bg-[#8B5CF6]/15 border-[#8B5CF6]/30 text-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                : 'px-1.5 py-1 h-7 bg-transparent border-transparent text-white/30 hover:text-white/50'
            }`}
            title={thinkMode ? '关闭深度思考' : '开启深度思考'}
          >
            <BrainCog className="size-3.5 shrink-0" />
            <span
              className="text-xs whitespace-nowrap overflow-hidden transition-all duration-200"
              style={{
                maxWidth: thinkMode ? '40px' : '0px',
                opacity: thinkMode ? 1 : 0,
              }}
            >
              Think
            </span>
          </button>

          {/* 输入框 */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-white/85 outline-none placeholder:text-white/25 min-w-0"
          />

          {/* 发送按钮 */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              send()
            }}
            disabled={!value.trim() || isLoading}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
              value.trim() && !isLoading
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                : 'bg-white/5 text-white/20'
            }`}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </button>
        </div>
      ) : (
        /* 折叠态：圆形按钮 */
        <div
          className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-lg select-none transition-shadow duration-200"
          style={
            thinkMode
              ? { boxShadow: '0 0 20px rgba(139, 92, 246, 0.45)' }
              : undefined
          }
        >
          <BrainCog className="size-5" />
        </div>
      )}
    </div>
  )
}

// ====== 主页面 ======

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [isThinkMode, setIsThinkMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [thinkText, setThinkText] = useState('')
  const [thinkVisible, setThinkVisible] = useState(false)
  const [classifiedNodeIds, setClassifiedNodeIds] = useState<string[]>([])
  const thinkAcc = useRef('')

  const { keyword, serviceType, tags } = parseDiscoverUrlParams(searchParams)
  const filterHint = formatDiscoverFilterHint(keyword, serviceType)

  /** 发送用户输入 → 分类 API → 更新页面 URL params → DemandDiscoveryList 自动刷新 */
  const handleSend = useCallback(
    async (message: string, thinkMode: boolean) => {
      setAiLoading(true)
      setIsThinkMode(thinkMode)
      setThinkText('')
      setThinkVisible(!!thinkMode)
      thinkAcc.current = ''

      try {
        const res = await fetch('/api/ai/discover-classify-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history: [], thinkMode }),
        })
        if (!res.ok || !res.body) {
          toast('网络异常，请重试', 'error')
          setAiLoading(false)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let result: ClassifyResult | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const events = buf.split('\n\n')
          buf = events.pop() || ''
          for (const event of events) {
            const lines = event.split('\n')
            const eventType = lines[0].replace('event: ', '')
            const dataLine = lines.find((l) => l.startsWith('data: '))
            if (!dataLine) continue
            const data = dataLine.slice(6)

            if (eventType === 'think' && thinkMode) {
              try {
                const { line } = JSON.parse(data)
                if (line) {
                  thinkAcc.current += (thinkAcc.current ? '\n' : '') + line
                  setThinkText(thinkAcc.current)
                }
              } catch {
                /* skip */
              }
            } else if (eventType === 'result') {
              try {
                result = JSON.parse(data)
              } catch {
                /* skip */
              }
            } else if (eventType === 'error') {
              try {
                const { message: errMsg } = JSON.parse(data)
                toast(errMsg || 'AI 错误', 'error')
              } catch {
                /* skip */
              }
            }
            // 'done' — 无操作
          }
        }

        if (result) {
          // 将分类结果写入 URL params
          const params = new URLSearchParams()
          if (result.keywords?.length)
            params.set('keyword', result.keywords.join(' '))
          if (result.serviceType) params.set('serviceType', result.serviceType)
          if (result.tags?.length) params.set('tags', result.tags.join(','))
          setSearchParams(params, { replace: true })

          // 传递精确分类节点 ID 给列表 → 后端 taxonomyLeafIds 精确搜索
          setClassifiedNodeIds(result.classifiedNodeIds || [])

          const count = result.total ?? result.matchCount ?? 0
          toast(`找到 ${count} 条匹配需求`, 'success')
        } else {
          toast('未找到匹配，请换个方式描述', 'info')
        }
      } catch {
        toast('网络异常', 'error')
      } finally {
        setAiLoading(false)
      }
    },
    [setSearchParams],
  )

  return (
    <div
      ref={scrollRef}
      className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll thin-scroll">
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col self-center px-4 pb-4 pt-4 sm:px-6">
          <PageHeader title="需求搜索" subtitle={`当前：${filterHint}`} />
          <DemandDiscoveryList
            keyword={keyword}
            serviceType={serviceType}
            tags={tags}
            taxonomyLeafIds={classifiedNodeIds}
            scrollRootRef={scrollRef}
            paginationMode="paged"
            pageSize={6}
          />
        </div>
      </div>

      {/* 悬浮输入球 */}
      <FloatingBall
        thinkMode={isThinkMode}
        onThinkToggle={() => setIsThinkMode((v) => !v)}
        onSend={handleSend}
        isLoading={aiLoading}
      />

      {/* Think 浮层 — 仅 Think 模式开启且时有内容时显示 */}
      <ThinkOverlay
        text={thinkText}
        isLoading={aiLoading}
        visible={thinkVisible}
        onClose={() => setThinkVisible(false)}
      />
    </div>
  )
}
