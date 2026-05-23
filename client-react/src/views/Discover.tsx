import { useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, BrainCog, Minimize2 } from 'lucide-react'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { PageHeader } from '@/components/layout/PageHeader'
import { toast } from '@/components/ui/confirm-dialog'
import { MorphPanel } from '@/components/ui/ai-input'
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
                  thinkAcc.current += line
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
            renderMode="timeline"
          />
        </div>
      </div>

      {/* AI 输入面板（可拖拽） */}
      <MorphPanel
        onSend={(text) => handleSend(text, isThinkMode)}
        isLoading={aiLoading}
        placeholder={isThinkMode ? '深度思考模式...' : '描述你的能力'}
        thinkMode={isThinkMode}
        onThinkToggle={() => setIsThinkMode((v) => !v)}
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
