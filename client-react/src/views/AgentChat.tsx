import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Wrench,
  Check,
  ChevronRight,
  ChevronDown,
  Bot,
  Sparkles,
  Brain,
  Search,
  FileText,
  ShoppingBag,
  Edit3,
  Globe,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { BoltChatInput } from '@/components/ui/bolt-style-chat'
import { useNavigate } from 'react-router-dom'
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  streamMessage,
  getQuota,
  type AgentConversation,
  type AgentMessage,
} from '@/api/agent'
import { classifyIntent } from '@/services/intent-classifier'

/** 预加载目标路由的页面组件，1 秒等待期间提前拉取 JS chunk */
function preloadRoute(path: string) {
  const map: Record<string, () => Promise<unknown>> = {
    '/discover': () => import('@/views/Discover'),
    '/demands/create': () => import('@/views/DemandCreate'),
    '/my-demands': () => import('@/views/MyDemands'),
    '/orders': () => import('@/views/Orders'),
    '/settings': () => import('@/views/Settings'),
    '/help': () => import('@/views/Help'),
    '/messages': () => import('@/views/MessagesLayout'),
    '/card-pool': () => import('@/views/CardPoolResourceExplorer'),
    '/card-pool/dead': () => import('@/views/CardPoolResourceExplorer'),
    '/cert-center': () => import('@/views/CertCenter'),
    '/circles': () => import('@/views/CircleList'),
    '/welfare': () => import('@/views/WelfareCenter'),
    '/tag-stats': () => import('@/views/TagStatsDashboard'),
    '/transactions': () => import('@/views/TransactionHistory'),
    '/search': () => import('@/views/Search'),
    '/profile': () => import('@/views/Profile'),
    '/dashboard': () => import('@/views/Dashboard'),
  }
  const match = Object.entries(map).find(([key]) => path.startsWith(key))
  match?.[1]()?.catch(() => {})
}

interface ToolCallDisplay {
  name: string
  arguments: Record<string, unknown>
  result?: string
  data?: Record<string, unknown>
  success?: boolean
}

export default function AgentChat() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [thinkMode, setThinkMode] = useState(true)
  const [webSearch, setWebSearch] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [thinkingLines, setThinkingLines] = useState<string[]>([])
  const [thinkingCollapsed, setThinkingCollapsed] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCallDisplay[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [quota, setQuota] = useState<{
    remaining: { daily: number; hourly: number }
    dailyLimit: number
    hourlyLimit: number
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  const VISIBLE_RECENT = 4 // 始终显示最近 4 条

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await getConversations())
    } catch {
      /* ignore */
    }
  }, [])

  const loadMessages = useCallback(async (id: string) => {
    try {
      setMessages((await getConversation(id)).messages)
    } catch {
      /* ignore */
    }
  }, [])

  const loadQuota = useCallback(async () => {
    try {
      setQuota(await getQuota())
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadQuota()
  }, [loadQuota])

  useEffect(() => {
    loadConversations().then(() => {
      getConversations()
        .then((list) => {
          if (list.length > 0) {
            const firstId = list[0].id
            setActiveId(firstId)
            setStreamText('')
            setThinkingLines([])
            setToolCalls([])
            setHistoryExpanded(false)
            loadMessages(firstId)
          }
        })
        .catch(() => {
          /* ignore */
        })
    })
  }, [loadConversations, loadMessages])

  const selectConversation = useCallback(
    (id: string) => {
      setActiveId(id)
      setStreamText('')
      setThinkingLines([])
      setToolCalls([])
      setHistoryExpanded(false)
      loadMessages(id)
    },
    [loadMessages],
  )

  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation({ thinkMode })
      await loadConversations()
      setActiveId(conv.id)
      setMessages([])
      setStreamText('')
      setThinkingLines([])
      setToolCalls([])
    } catch {
      /* ignore */
    }
  }, [thinkMode, loadConversations])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id)
      await loadConversations()
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
    },
    [activeId, loadConversations],
  )

  const navigateWithDelay = useCallback(
    async (path: string, title: string, userText?: string) => {
      if (userText) {
        setMessages((prev) => [
          ...prev,
          {
            id: `u-${Date.now().toString(36)}`,
            role: 'user',
            content: userText,
            createdAt: new Date().toISOString(),
          },
        ])
      }
      const aiMsgId = `a-${Date.now().toString(36)}`
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: 'assistant',
          content: `正在前往${title}...`,
          createdAt: new Date().toISOString(),
        },
      ])
      setLoading(true)
      if (path !== '__reload__') preloadRoute(path)
      await new Promise((r) => setTimeout(r, 1000))
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: `已到达${title}` } : m,
        ),
      )
      setLoading(false)
      if (path === '__reload__') window.location.reload()
      else navigate(path)
    },
    [navigate],
  )

  const handleSend = useCallback(
    async (text: string, _files?: unknown[], model?: string) => {
      if (!text.trim() || loading) return

      const trimmed = text.trim()

      // ── L0 拦截：正则 → 语义模型 → LLM 三级降级 ──
      const intent = classifyIntent(trimmed)
      if (intent.level === 'L0') {
        navigateWithDelay(intent.intent.path, intent.intent.title, trimmed)
        return
      }

      // 正则未命中，尝试本地语义模型（8001 端口）
      const semanticMatch = await semanticNavigate(trimmed).catch(() => null)
      if (semanticMatch?.match?.path) {
        navigateWithDelay(
          semanticMatch.match.path,
          semanticMatch.match.title,
          trimmed,
        )
        return
      }

      // L2/L3 → 走 LLM（L1 暂时也走 LLM，后续可优化为本地搜索）
      let convId = activeId
      if (!convId) {
        try {
          const conv = await createConversation({ thinkMode })
          await loadConversations()
          convId = conv.id
          setActiveId(conv.id)
        } catch (e) {
          console.error('[Agent] 创建对话失败:', e)
          setLoading(false)
          setThinking(false)
          return
        }
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now().toString(36) + Math.random().toString(36).slice(2, 11)}`,
          role: 'user',
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ])
      setLoading(true)
      setStreamText('')
      setThinkingLines([])
      setToolCalls([])
      setThinking(false)
      const stream = streamMessage(
        convId,
        trimmed,
        thinkMode,
        undefined,
        webSearch,
        model,
      )
      abortRef.current = stream.abort
      let ct: string[] = [],
        tc: ToolCallDisplay[] = [],
        ft = ''
      let hasReceivedThink = false
      stream.onEvent('think', (d: unknown) => {
        if (!hasReceivedThink) {
          hasReceivedThink = true
          setThinking(true)
        }
        ct = [...ct, (d as any).line]
        setThinkingLines([...ct])
      })
      stream.onEvent('text', (d: unknown) => {
        ft += (d as any).delta
        setStreamText((p) => p + (d as any).delta)
      })
      stream.onEvent('tool_call', (d: unknown) => {
        const x = d as any
        tc = [...tc, { name: x.name, arguments: x.arguments }]
        setToolCalls([...tc])
      })
      stream.onEvent('tool_result', (d: unknown) => {
        const x = d as any
        tc = tc.map((t) =>
          t.name === x.name
            ? { ...t, result: x.message, data: x.data, success: x.success }
            : t,
        )
        setToolCalls([...tc])
        // navigate_to 工具：自动跳转
        if (x.name === 'navigate_to' && x.success && x.data?.path) {
          preloadRoute(x.data.path)
          setTimeout(() => navigate(x.data.path), 1000)
        }
      })
      stream.onEvent('think-end', () => setThinking(false))
      stream.onDone(() => {
        if (ft)
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now().toString(36) + Math.random().toString(36).slice(2, 11)}`,
              role: 'assistant',
              content: ft,
              thinking: ct.length ? ct.join('\n') : undefined,
              toolCalls: tc.length
                ? tc.map((t) => ({
                    name: t.name,
                    arguments: t.arguments,
                    result: t.result,
                    data: t.data,
                  }))
                : undefined,
              createdAt: new Date().toISOString(),
            },
          ])
        setStreamText('')
        setThinkingLines([])
        setToolCalls([])
        setLoading(false)
        setThinking(false)
        loadConversations()
        loadQuota()
      })
      stream.onError((err) => {
        console.error('[Agent] 流式错误:', err)
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now().toString(36)}`,
            role: 'assistant' as const,
            content: `⚠️ 请求失败: ${err?.message || '未知错误'}，请稍后重试。`,
            createdAt: new Date().toISOString(),
          },
        ])
        setLoading(false)
        setThinking(false)
        loadQuota()
      })
    },
    [
      loading,
      activeId,
      thinkMode,
      webSearch,
      loadConversations,
      loadQuota,
      navigateWithDelay,
      navigate,
    ],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  const handleStop = () => {
    abortRef.current?.()
    setLoading(false)
    setThinking(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <div className="flex h-full min-h-0 bg-white dark:bg-[#212121] text-text-100 dark:text-[#ECECEC]">
      <div
        className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-200 overflow-hidden border-r border-bg-300 dark:border-[#30302E] flex flex-col shrink-0 bg-bg-secondary/30 dark:bg-[#1a1a1a]/50`}
      >
        <div className="p-3 border-b border-bg-300 dark:border-[#30302E]">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <span className="text-base leading-none">+</span> 新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto thin-scroll">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group relative ${activeId === conv.id ? 'bg-accent/5 dark:bg-accent/10' : ''}`}
            >
              <div
                onClick={() => selectConversation(conv.id)}
                className={`flex flex-col px-3 py-2.5 cursor-pointer transition-colors hover:bg-bg-200 dark:hover:bg-[#252525] ${activeId === conv.id ? 'border-l-2 border-accent' : 'border-l-2 border-transparent'}`}
              >
                {editingId === conv.id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingId(null)
                    }}
                    className="text-sm font-medium bg-bg-200 dark:bg-[#30302E] px-2 py-0.5 rounded outline-none text-text-100 w-full"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="text-sm font-medium truncate text-text-100 dark:text-[#ECECEC]">
                    {conv.title}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-xs text-text-300">
                  <span>{conv._count.messages} 条消息</span>
                </div>
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(conv.id)
                    setEditTitle(conv.title)
                  }}
                  className="p-1 text-text-300 hover:text-text-100 transition-colors cursor-pointer"
                >
                  <Edit3 className="size-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(conv.id)
                  }}
                  className="p-1 text-text-300 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-300 dark:border-[#30302E] bg-bg-secondary/30 dark:bg-[#1a1a1a]/30">
          <BackButton />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-text-300 hover:text-text-100 text-base cursor-pointer transition-colors"
          >
            {sidebarOpen ? '◁' : '▷'}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Bot className="size-4 text-accent" />
            </div>
            <span className="text-sm font-medium text-text-200 dark:text-[#E1E1E0] truncate">
              {activeId
                ? conversations.find((c) => c.id === activeId)?.title || '对话'
                : 'AI 助手'}
            </span>
          </div>
          <div className="flex-1" />
          {quota && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                quota.remaining.daily <= 25
                  ? 'bg-red-500/10 text-red-400'
                  : quota.remaining.daily <= 50
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-accent/10 text-accent'
              }`}
            >
              🤖 {quota.remaining.daily}/{quota.dailyLimit}
            </span>
          )}
          {activeId && (
            <span className="text-xs text-text-300">
              {conversations.find((c) => c.id === activeId)?._count.messages ||
                0}{' '}
              条消息
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="w-full max-w-3xl mb-10 text-center">
                <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center rounded-2xl bg-accent/10">
                  <Sparkles className="size-7 text-accent" />
                </div>
                <h1 className="text-2xl font-semibold text-text-200 dark:text-[#E1E1E0] mb-2 tracking-tight">
                  {greeting}，有什么可以帮你？
                </h1>
                <p className="text-sm text-text-300 mb-8">
                  搜索需求、发布订单、管理交易 — 我都能帮你
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {[
                  { icon: Search, label: '搜索需求', prompt: '帮我搜索需求' },
                  { icon: FileText, label: '发布需求', prompt: '我要发布需求' },
                  {
                    icon: ShoppingBag,
                    label: '查看订单',
                    prompt: '查看我的订单',
                  },
                  { icon: Globe, label: '浏览卡池', prompt: '打开卡池' },
                ].map((b) => (
                  <button
                    key={b.label}
                    onClick={() => handleSend(b.prompt)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-200 dark:bg-[#252525] hover:bg-bg-300 dark:hover:bg-[#30302E] text-text-200 dark:text-[#E1E1E0] text-sm transition-colors cursor-pointer"
                  >
                    <b.icon className="size-4 text-accent shrink-0" />
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6">
              {(() => {
                const hiddenCount = messages.length - VISIBLE_RECENT
                const shouldFold = hiddenCount > 1 && !historyExpanded
                const visible = shouldFold
                  ? messages.slice(-VISIBLE_RECENT)
                  : messages

                return (
                  <>
                    {shouldFold && (
                      <button
                        onClick={() => setHistoryExpanded(true)}
                        className="w-full text-center text-xs text-text-300 hover:text-accent py-2 mb-4 transition-colors cursor-pointer"
                      >
                        —— 展开历史消息（{hiddenCount} 条）——
                      </button>
                    )}
                    {visible.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-6 ${msg.role === 'user' ? 'flex justify-end' : ''}`}
                      >
                        <div
                          className={`max-w-[75%] ${msg.role === 'user' ? 'bg-bg-200 dark:bg-[#30302E] rounded-2xl rounded-br-md px-4 py-3' : ''}`}
                        >
                          {msg.thinking && (
                            <details className="mb-3 rounded-lg border border-purple-500/20 bg-purple-500/[0.03] overflow-hidden group">
                              <summary className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-600/60 dark:text-purple-400/50 cursor-pointer hover:text-purple-600 dark:hover:text-purple-300 transition-colors marker:content-none">
                                <Brain className="size-3" />
                                <span>思考过程</span>
                                <span className="ml-auto text-purple-400/40">
                                  {msg.thinking.split('\n').length} 行
                                </span>
                              </summary>
                              <div className="px-3 pb-2 text-xs text-purple-600/40 dark:text-purple-300/40 leading-relaxed font-mono max-h-36 overflow-y-auto thin-scroll whitespace-pre-wrap">
                                {msg.thinking}
                              </div>
                            </details>
                          )}
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          {msg.toolCalls?.map((tc, i) => (
                            <div
                              key={i}
                              className="mt-3 bg-bg-200 dark:bg-[#30302E] border border-bg-300 dark:border-[#454540] rounded-lg px-3 py-2"
                            >
                              <div className="text-xs font-medium text-text-200">
                                <Wrench className="size-3 inline mr-1" />
                                {tc.name}
                              </div>
                              {tc.result && (
                                <div className="text-xs text-green-500/70 mt-1">
                                  <Check className="size-3 inline mr-1" />
                                  {String(tc.result)}
                                </div>
                              )}
                              {(tc.name === 'create_demand' ||
                                tc.name === 'get_demand_detail') &&
                                tc.data?.id && (
                                  <button
                                    onClick={() =>
                                      navigate(`/demands/${tc.data!.id}`)
                                    }
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                                  >
                                    查看需求卡片{' '}
                                    <ChevronRight className="size-3" />
                                  </button>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )
              })()}
              {thinking && thinkingLines.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400/60">
                    <button
                      type="button"
                      onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
                      className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      <Brain className="size-3.5" />
                      <span>思考过程</span>
                      <span
                        className={`inline-block transition-transform duration-200 ${thinkingCollapsed ? '' : 'rotate-180'}`}
                      >
                        <ChevronDown className="size-3.5" />
                      </span>
                    </button>
                    <span className="text-purple-600 dark:text-purple-300 text-xs font-medium animate-pulse">
                      正在思考…
                    </span>
                  </div>
                  {!thinkingCollapsed && (
                    <div className="px-4 pb-3 text-sm text-purple-600/60 dark:text-purple-300/50 leading-relaxed whitespace-pre-wrap font-mono max-h-48 overflow-y-auto thin-scroll">
                      {thinkingLines.join('')}
                    </div>
                  )}
                </div>
              )}
              {toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="mb-3 rounded-xl border border-accent/20 bg-accent/[0.03] overflow-hidden max-w-[75%]"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="size-5 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                      <Wrench className="size-3 text-accent" />
                    </div>
                    <span className="text-xs font-medium text-text-200">
                      {tc.name}
                    </span>
                    <span className="flex-1" />
                    {tc.result ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-500">
                        <Check className="size-3" />
                        完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-300">
                        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                        执行中
                      </span>
                    )}
                  </div>
                  {tc.result && (
                    <div className="px-3 pb-2.5 pt-0 border-t border-accent/10">
                      <div className="text-xs text-text-300/80 leading-relaxed mt-1.5">
                        {tc.result}
                      </div>
                    </div>
                  )}
                  {(tc.name === 'create_demand' ||
                    tc.name === 'get_demand_detail') &&
                    tc.data?.id && (
                      <div className="px-3 pb-2.5">
                        <button
                          onClick={() => navigate(`/demands/${tc.data!.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          查看详情 <ChevronRight className="size-3" />
                        </button>
                      </div>
                    )}
                </div>
              ))}
              {loading && !streamText && toolCalls.length === 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-300 text-sm font-medium animate-pulse">
                    正在思考…
                  </span>
                </div>
              )}
              {streamText && (
                <div className="mb-6">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {streamText}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-bg-300 dark:border-[#30302E] p-4">
          <BoltChatInput
            onSend={(msg, files, model) => {
              handleSend(msg, files, model)
            }}
            onStop={handleStop}
            loading={loading}
            thinkMode={thinkMode}
            onThinkModeChange={setThinkMode}
            webSearch={webSearch}
            onWebSearchChange={setWebSearch}
          />
        </div>
      </div>
    </div>
  )
}
