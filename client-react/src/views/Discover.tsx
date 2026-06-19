import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Loader2, Search, X, Brain, ChevronRight, Hand } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { DemandDiscoveryList } from '@/components/demand/DemandDiscoveryList'
import { PageHeader } from '@/components/layout/PageHeader'
import { PromptInputBox } from '@/components/ui/prompt-input-box'
import { usePersistedGlobalHand } from '@/components/card-pool/usePersistedGlobalHand'
import { toast } from '@/components/ui/confirm-dialog'
import {
  formatDiscoverFilterHint,
  parseDiscoverUrlParams,
} from '@/utils/discover-search'

/** 思考面板 — 独立组件，逐字动画状态不触发父组件重渲染 */
function ThinkingPanel({
  text,
  isLoading,
  collapsed,
  onToggleCollapse,
}: {
  text: string
  isLoading: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const [len, setLen] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (len < text.length) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setLen((prev) => {
            if (prev >= text.length) {
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
              return prev
            }
            return prev + 1
          })
        }, 25)
      }
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [len, text.length])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [len])

  useEffect(() => {
    if (!text) setLen(0)
  }, [text])

  if (!text) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-purple-400/60">
        <button type="button" onClick={onToggleCollapse} className="flex items-center gap-1.5 hover:text-purple-300 transition-colors">
          <Brain className="size-3.5" />
          <span>思考过程</span>
          <span className={`inline-block transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
        </button>
        {isLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
      </div>
      {!collapsed && (
        <div ref={scrollRef} className="px-4 pb-3 text-xs text-purple-300/50 leading-relaxed whitespace-pre-wrap font-mono max-h-[120px] overflow-y-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#444 transparent' }}>
          {text.slice(0, len)}
          {len < text.length && (
            <span className="inline-block w-0.5 h-3.5 bg-purple-400/60 ml-0.5 animate-pulse" />
          )}
        </div>
      )}
    </div>
  )
}

interface ClassifyResult {
  understood: string
  scopePath: string[]
  scopeNodeIds: string[]
  taxonomyNodeId: string | null
  matchCount: number
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

let _msgId = 0
const newMsgId = () => `m${++_msgId}`

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  result?: ClassifyResult | null
}

export default function Discover() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { addToHand } = usePersistedGlobalHand()

  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [thinkText, setThinkText] = useState('')
  const [thinkCollapsed, setThinkCollapsed] = useState(false)
  const [isThinkMode, setIsThinkMode] = useState(false)
  const thinkAccRef = useRef('')

  // 悬浮球拖拽
  const SIDEBAR_W = 80
  const BTN_SIZE = 48
  const MARGIN = 8
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('ninewood-ai-float-pos')
    if (saved) {
      try {
        const p = JSON.parse(saved) as { x: number; y: number }
        if (p.x < SIDEBAR_W && p.y < 60) throw 'stale'
        return p
      } catch {}
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    return { x: vw - BTN_SIZE - MARGIN - 8, y: vh - BTN_SIZE - MARGIN - 60 }
  })
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, elX: 0, elY: 0, moved: false })
  const floatRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    localStorage.setItem('ninewood-ai-float-pos', JSON.stringify(pos))
  }, [pos])

  function handlePointerDown(e: React.PointerEvent) {
    const btn = floatRef.current
    if (!btn) return
    btn.setPointerCapture(e.pointerId)
    const rect = btn.getBoundingClientRect()
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, elX: rect.left, elY: rect.top, moved: false }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d.dragging) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true
    let nx = d.elX + dx, ny = d.elY + dy
    const vw = window.innerWidth, vh = window.innerHeight
    if (nx < SIDEBAR_W + MARGIN) nx = SIDEBAR_W + MARGIN
    if (ny < MARGIN) ny = MARGIN
    if (nx + BTN_SIZE > vw - MARGIN) nx = vw - BTN_SIZE - MARGIN
    if (ny + BTN_SIZE > vh - MARGIN) ny = vh - BTN_SIZE - MARGIN
    setPos({ x: nx, y: ny })
  }

  function handlePointerUp(_e: React.PointerEvent) {
    const d = dragRef.current
    d.dragging = false
    if (!d.moved) {
      setChatMessages([])
      setThinkText('')
      setThinkCollapsed(false)
      thinkAccRef.current = ''
      setIsThinkMode(false)
      setAiOpen(true)
    }
    const vw = window.innerWidth, vh = window.innerHeight
    let nx = pos.x, ny = pos.y
    if (nx < SIDEBAR_W + MARGIN) nx = SIDEBAR_W + MARGIN
    if (ny < MARGIN) ny = MARGIN
    if (nx + BTN_SIZE > vw - MARGIN) nx = vw - BTN_SIZE - MARGIN
    if (ny + BTN_SIZE > vh - MARGIN) ny = vh - BTN_SIZE - MARGIN
    setPos({ x: nx, y: ny })
  }

  const { keyword, serviceType, tags } = parseDiscoverUrlParams(searchParams)
  const filterHint = formatDiscoverFilterHint(keyword, serviceType)

  const buildHistory = useCallback((): { role: 'user' | 'assistant'; content: string }[] => {
    return chatMessages
      .filter(m => m.role === 'user' || (m.role === 'assistant' && m.result))
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.role === 'assistant' && m.result
          ? `[分类结果] 路径: ${m.result.scopePath.join(' › ')} | 匹配: ${m.result.matchCount} 条 | ${m.result.refinePrompt}`
          : m.content,
      }))
  }, [chatMessages])

  const sendClassifyRequest = useCallback(async (message: string, thinkMode: boolean) => {
    setAiLoading(true)
    setIsThinkMode(thinkMode)
    setThinkText('')
    setThinkCollapsed(false)
    thinkAccRef.current = ''

    setChatMessages(prev => [...prev, { id: newMsgId(), role: 'user' as const, content: message }])

    const history = buildHistory()

    try {
      const res = await fetch('/api/ai/discover-classify-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, thinkMode }),
      })
      if (!res.ok || !res.body) {
        setChatMessages(prev => [...prev, { id: newMsgId(), role: 'assistant' as const, content: '网络异常，请重试' }])
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
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!dataLine) continue
          const data = dataLine.slice(6)
          if (eventType === 'think' && thinkMode) {
            try {
              const { line } = JSON.parse(data)
              if (line) {
                thinkAccRef.current += (thinkAccRef.current ? '\n' : '') + line
                setThinkText(thinkAccRef.current)
              }
            } catch { /* skip */ }
          } else if (eventType === 'result') {
            try { result = JSON.parse(data) } catch { /* skip */ }
          } else if (eventType === 'done') {
            if (result) {
              setChatMessages(prev => [...prev, { id: newMsgId(), role: 'assistant' as const, content: result!.understood, result }])
            } else {
              setChatMessages(prev => [...prev, { id: newMsgId(), role: 'assistant' as const, content: '无法理解，请换个方式描述' }])
            }
          } else if (eventType === 'error') {
            try {
              const { message } = JSON.parse(data)
              setChatMessages(prev => [...prev, { id: newMsgId(), role: 'assistant' as const, content: message || 'AI 错误' }])
            } catch { /* skip */ }
          }
        }
      }
      if (!result) {
        setChatMessages(prev => [...prev, { id: newMsgId(), role: 'assistant' as const, content: '无法理解，请换个方式描述' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { id: newMsgId(), role: 'assistant' as const, content: '网络异常' }])
    } finally {
      setAiLoading(false)
    }
  }, [buildHistory])

  const handleAISend = useCallback(async (message: string) => {
    const thinkMode = message.startsWith('[Think:')
    const text = message.replace(/^\[(Search|Think|Canvas):\s*/, '').replace(/\]$/, '').trim()
    if (!text) return
    await sendClassifyRequest(text, thinkMode)
  }, [sendClassifyRequest])

  const handleRefineClick = useCallback(async (optionLabel: string) => {
    await sendClassifyRequest(optionLabel, false)
  }, [sendClassifyRequest])

  const handleAddToHand = useCallback((result: ClassifyResult) => {
    if (result.scopeNodeIds.length === 0) return
    const scope = { path: result.scopeNodeIds, leafFilter: null as string[] | null }
    const added = addToHand(scope)
    if (added) toast('已加入手牌', 'success')
    else toast('该范围已在手牌中', 'info')
  }, [addToHand])

  function handleClose() {
    setAiOpen(false)
    setTimeout(() => {
      setChatMessages([])
      setThinkText('')
      setThinkCollapsed(false)
      setIsThinkMode(false)
      thinkAccRef.current = ''
    }, 200)
  }

  return (
    <div ref={scrollRef} className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll thin-scroll">
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col self-center px-4 pb-4 pt-4 sm:px-6">
          <PageHeader title="需求搜索" subtitle={`当前：${filterHint}`} />
          <DemandDiscoveryList
            keyword={keyword}
            serviceType={serviceType}
            tags={tags}
            scrollRootRef={scrollRef}
            paginationMode="paged"
            pageSize={6}
          />
        </div>
      </div>

      {/* AI 悬浮球 */}
      <button
        ref={floatRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-[9999] flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-lg touch-none select-none"
        style={{ left: pos.x, top: pos.y, transition: dragRef.current.dragging ? 'none' : 'left 0.15s ease, top 0.15s ease' }}
        aria-label="AI 匹配"
      >
        <Sparkles className="size-5" />
      </button>

      {/* AI 弹窗 */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) handleClose() }}
          >
            <motion.div
              className="relative mx-4 flex w-full max-w-xl flex-col rounded-2xl border border-[#333] bg-[#1F2023] shadow-2xl overflow-hidden"
              style={{ maxHeight: '85vh' }}
              initial={{ scale: 0.92, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 40 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
                    <Sparkles className="size-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">AI 匹配</span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex size-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/80 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* 对话内容 */}
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-scroll thin-scroll px-5 pt-3 pb-2">
                {chatMessages.length === 0 && !aiLoading && (
                  <div className="flex flex-1 items-center justify-center py-12">
                    <div className="text-center text-white/25">
                      <Sparkles className="size-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">描述你能提供什么服务</p>
                      <p className="text-xs mt-1">AI 会自动分类并显示匹配需求数量</p>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {msg.role === 'user' ? (
                        <div className="flex justify-end mb-2">
                          <div className="max-w-[80%] rounded-2xl rounded-br-lg bg-accent/15 px-4 py-2.5">
                            <span className="text-sm text-white/85">{msg.content}</span>
                          </div>
                        </div>
                      ) : msg.result ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-2">
                          <div className="px-4 pt-3 pb-1">
                            <span className="text-sm text-white/75">{msg.result.understood}</span>
                          </div>

                          {msg.result.scopePath.length > 0 && (
                            <div className="flex flex-wrap items-center gap-0 px-4 py-1.5">
                              <Search className="size-3 text-accent/50 shrink-0 mr-1" />
                              {msg.result.scopePath.map((seg, j) => {
                                const isLeaf = j === msg.result!.scopePath.length - 1
                                return (
                                <span key={j} className="flex items-center text-xs">
                                  {j > 0 && <ChevronRight className="size-3 text-white/12" />}
                                  <span className={isLeaf ? 'text-white/85 font-medium' : 'text-white/30'}>
                                    {seg}
                                  </span>
                                </span>
                              )})}
                            </div>
                          )}

                          <div className="px-4 py-1">
                            <span className="text-xs text-accent/65">
                              匹配 <span className="text-accent font-semibold">{msg.result.matchCount}</span> 条需求
                            </span>
                          </div>

                          {msg.result.refineOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-4 py-2">
                              {msg.result.refineOptions.map((opt, k) => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => handleRefineClick(opt.label)}
                                  disabled={aiLoading}
                                  className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/65 hover:border-accent/35 hover:bg-accent/8 hover:text-white transition-colors disabled:opacity-40"
                                >
                                  <span>{opt.label}</span>
                                  <span className="text-[10px] tabular-nums text-accent/55">({opt.count})</span>
                                  <ChevronRight className="size-3 text-white/20" />
                                </button>
                              ))}
                            </div>
                          )}

                          {msg.result.refinePrompt && (
                            <div className="px-4 pb-2">
                              <span className="text-xs text-white/35 italic">{msg.result.refinePrompt}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                            {msg.result.preciseEnough && (
                              <button
                                type="button"
                                onClick={() => handleAddToHand(msg.result!)}
                                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                              >
                                <Hand className="size-3.5" />
                                加入手牌
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const leaf = msg.result?.scopePath?.[msg.result.scopePath.length - 1]
                                const type = msg.result?.serviceType
                                const q = leaf ? `keyword=${encodeURIComponent(leaf)}${type ? `&type=${type}` : ''}` : ''
                                if (q) {
                                  navigate(`/discover?${q}`)
                                  setAiOpen(false)
                                }
                              }}
                              className="flex items-center gap-1.5 rounded-xl bg-white/8 px-4 py-1.5 text-xs text-white/65 hover:bg-white/15 transition-colors"
                            >
                              <Search className="size-3" />
                              搜索
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start mb-2">
                          <div className="max-w-[80%] rounded-2xl rounded-bl-lg bg-white/5 px-4 py-2.5">
                            <span className="text-sm text-white/65">{msg.content}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {aiLoading && !chatMessages.some(m => m.role === 'assistant' && !m.result) && (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Loader2 className="size-4 animate-spin text-accent" />
                    <span className="text-sm text-white/50">AI 分析中...</span>
                  </div>
                )}

              </div>

              {/* 输入框 + 思考卡片 */}
              <div className="shrink-0 border-t border-white/5 px-5 pt-3 pb-4 relative">
                <PromptInputBox onSend={handleAISend} isLoading={aiLoading} placeholder="描述你想接什么单..." />
                {isThinkMode && (
                  <ThinkingPanel
                    text={thinkText}
                    isLoading={aiLoading}
                    collapsed={thinkCollapsed}
                    onToggleCollapse={() => setThinkCollapsed(!thinkCollapsed)}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
