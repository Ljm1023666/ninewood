import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { CodexComposer } from '@/components/ui/codex-composer'
import { useNavigate } from 'react-router-dom'
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  streamMessage,
  getQuota,
  getProvider,
  semanticNavigate,
  approveAgentTool,
  type AgentConversation,
  type AgentMessage,
  type AgentProvider,
} from '@/api/agent'
import {
  buildComposerModels,
  formatActiveLlmLabel,
} from '@/constants/llm-providers'
import {
  readStoredAccessMode,
  AGENT_ACCESS_STORAGE_KEY,
  AGENT_TOOL_LABELS,
  type AgentAccessMode,
} from '@/types/agent-access'
import { classifyIntent } from '@/services/intent-classifier'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'

/** 预加载目标路由的页面组件，1 秒等待期间提前拉取 JS chunk */
function preloadRoute(path: string) {
  const map: Record<string, () => Promise<unknown>> = {
    '/discover': () => import('@/views/Discover'),
    '/demands/create': () => import('@/views/DemandCreate'),
    '/my-demands': () => import('@/views/MyDemands'),
    '/orders': () => import('@/views/Orders'),
    '/settings': () => import('@/views/Settings'),
    '/help': () => import('@/views/Help'),
    '/help/docs': () => import('@/views/HelpDocs'),
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
  pending?: boolean
}

export default function AgentChat() {
  const navigate = useNavigate()
  const isLightMode = useThemeStore((s) => s.darkMode)
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [thinkMode, setThinkMode] = useState(true)
  const [accessMode, setAccessMode] =
    useState<AgentAccessMode>(readStoredAccessMode)
  const [streamText, setStreamText] = useState('')
  const [thinkingLines, setThinkingLines] = useState<string[]>([])
  const [thinkingCollapsed, setThinkingCollapsed] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCallDisplay[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [threadSearch, setThreadSearch] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [quota, setQuota] = useState<{
    remaining: { daily: number; hourly: number }
    dailyLimit: number
    hourlyLimit: number
  } | null>(null)
  const [llmConfig, setLlmConfig] = useState<AgentProvider | null>(null)
  const composerModels = useMemo(
    () => (llmConfig ? buildComposerModels(llmConfig) : undefined),
    [llmConfig],
  )
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
    getProvider()
      .then(setLlmConfig)
      .catch(() => {
        /* ignore */
      })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(AGENT_ACCESS_STORAGE_KEY, accessMode)
    } catch {
      /* ignore */
    }
  }, [accessMode])

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
        accessMode,
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
        const x = d as {
          name: string
          message?: string
          data?: Record<string, unknown>
          success?: boolean
        }
        const idx = tc.findIndex((t) => t.name === x.name && !t.result)
        if (idx >= 0) {
          tc = tc.map((t, i) =>
            i === idx
              ? {
                  ...t,
                  result: x.message,
                  data: x.data,
                  success: x.success,
                  pending: x.data?.pending === true,
                }
              : t,
          )
          setToolCalls([...tc])
        }
        if (x.name === 'navigate_to' && x.success && x.data?.path) {
          preloadRoute(x.data.path as string)
          setTimeout(() => navigate(x.data.path as string), 1000)
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
      accessMode,
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

  const handleToolApproval = useCallback(
    async (convId: string, tool: ToolCallDisplay, approved: boolean) => {
      try {
        const res = await approveAgentTool(convId, {
          toolName: tool.name,
          arguments: tool.arguments,
          approved,
        })
        setToolCalls((prev) =>
          prev.map((t) =>
            t.name === tool.name && t.pending
              ? {
                  ...t,
                  pending: false,
                  result: res.message,
                  success: res.success,
                  data:
                    res.data && typeof res.data === 'object'
                      ? (res.data as Record<string, unknown>)
                      : t.data,
                }
              : t,
          ),
        )
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now().toString(36)}`,
            role: 'assistant',
            content: res.message,
            createdAt: new Date().toISOString(),
          },
        ])
        if (
          approved &&
          tool.name === 'navigate_to' &&
          res.data &&
          typeof res.data === 'object' &&
          'path' in res.data &&
          typeof (res.data as { path?: string }).path === 'string'
        ) {
          const path = (res.data as { path: string }).path
          preloadRoute(path)
          setTimeout(() => navigate(path), 1000)
        }
      } catch (e) {
        console.error('[Agent] 批准工具失败:', e)
      }
    },
    [navigate],
  )


  const activeTitle = activeId
    ? conversations.find((c) => c.id === activeId)?.title || '对话'
    : '新对话'

  const filteredConversations = threadSearch.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(threadSearch.trim().toLowerCase()),
      )
    : conversations

  const isSessionStart = messages.length === 0 && !streamText

  const composer = (
    <CodexComposer
      appearance={isLightMode ? 'light' : 'dark'}
      layout={isSessionStart ? 'start' : 'docked'}
      placeholder={loading ? '要求后续变更' : '随心输入'}
      models={composerModels}
      defaultModelId={llmConfig?.model}
      onSend={(msg, files, model) => {
        handleSend(msg, files, model)
      }}
      onStop={handleStop}
      loading={loading}
      thinkMode={thinkMode}
      onThinkModeChange={setThinkMode}
      accessMode={accessMode}
      onAccessModeChange={setAccessMode}
    />
  )

  return (
    <div
      className={cn(
        'agent-codex internal-shell',
        isLightMode ? 'agent-codex--light' : 'agent-codex--dark',
      )}
    >
      <aside
        className={`agent-codex-sidebar ${sidebarOpen ? '' : 'agent-codex-sidebar--collapsed'}`}
        aria-label="Codex 导航"
        aria-hidden={!sidebarOpen}
      >
        <div className="agent-codex-sidebar__inner">
        <div className="agent-codex-sidebar__nav">
          <button
            type="button"
            onClick={handleNewChat}
            className="agent-codex-sidebar__nav-item"
          >
            <MsIcon name="add" size={16} className="shrink-0 opacity-70" aria-hidden />
            新对话
          </button>
          <button type="button" className="agent-codex-sidebar__nav-item">
            <MsIcon name="search" size={16} className="shrink-0 opacity-70" aria-hidden />
            搜索
          </button>
          <button type="button" className="agent-codex-sidebar__nav-item">
            <MsIcon name="account_tree" size={16} className="shrink-0 opacity-70" aria-hidden />
            自动化
          </button>
        </div>

        <div className="agent-codex-sidebar__block">
          <p className="agent-codex-sidebar__section">项目</p>
          <button type="button" className="agent-codex-sidebar__nav-item agent-codex-sidebar__nav-item--active">
            <span className="agent-codex-sidebar__dot" aria-hidden />
            九木
          </button>
        </div>

        <div className="agent-codex-sidebar__block agent-codex-sidebar__block--grow">
          <label className="agent-codex-sidebar__search">
            <MsIcon name="search" size={14} className="shrink-0 opacity-40" aria-hidden />
            <input
              type="search"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="搜索对话"
              aria-label="搜索对话"
            />
          </label>
          <p className="agent-codex-sidebar__section">对话</p>
          <div className="agent-codex-sidebar__threads thin-scroll">
            {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`agent-codex-thread-item group ${activeId === conv.id ? 'agent-codex-thread-item--active' : ''}`}
            >
              <div
                onClick={() => selectConversation(conv.id)}
                className="agent-codex-thread-item__body"
              >
                {editingId === conv.id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingId(null)
                    }}
                    className="w-full border border-[var(--internal-hairline)] bg-[var(--internal-bg)] px-2 py-0.5 text-sm font-medium text-text-primary outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="agent-codex-thread-item__title pr-8">
                    {conv.title}
                  </div>
                )}
              </div>
              <div className="agent-codex-thread-item__actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(conv.id)
                    setEditTitle(conv.title)
                  }}
                  className="cursor-pointer p-1 text-text-muted transition-colors hover:text-text-primary"
                >
                  <MsIcon name="edit" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(conv.id)
                  }}
                  className="cursor-pointer p-1 text-text-muted transition-colors hover:text-red-500"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="agent-codex-sidebar__settings"
          onClick={() => navigate('/settings')}
        >
          <MsIcon name="settings" size={16} className="shrink-0 opacity-70" aria-hidden />
          设置
        </button>
        </div>
      </aside>

      <div className="agent-codex-canvas">
        <div className="agent-codex-workspace">
        <header
          className={cn(
            'agent-codex-main__bar',
            isSessionStart && 'agent-codex-main__bar--start',
          )}
        >
          <button
            type="button"
            className="agent-codex-icon-btn"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <MsIcon name="chevron_left" size={16} aria-hidden />
          </button>
          {!isSessionStart ? (
            <>
              {!sidebarOpen ? (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="agent-codex-icon-btn"
                  aria-label="展开侧栏"
                >
                  <MsIcon name="dock_to_left" size={16} aria-hidden />
                </button>
              ) : null}
              <h1 className="agent-codex-main__title">{activeTitle}</h1>
              {llmConfig ? (
                <span className="agent-codex-main__provider" title="当前默认模型">
                  {formatActiveLlmLabel(llmConfig)}
                </span>
              ) : null}
              {quota ? (
                <span
                  className={cn(
                    'agent-codex-main__quota',
                    quota.remaining.daily <= 25 && 'agent-codex-main__quota--low',
                    quota.remaining.daily <= 50 &&
                      quota.remaining.daily > 25 &&
                      'agent-codex-main__quota--warn',
                  )}
                >
                  {quota.remaining.daily}/{quota.dailyLimit}
                </span>
              ) : null}
            </>
          ) : null}
          <div className="agent-codex-main__bar-spacer" />
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="agent-codex-icon-btn"
            aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
          >
            <MsIcon name="dock_to_right" size={16} aria-hidden />
          </button>
        </header>

        {isSessionStart ? (
          <div className="agent-codex-start">
            <h1 className="agent-codex-start__prompt">
              我们应该在九木中构建什么？
            </h1>
            {llmConfig ? (
              <p className="agent-codex-start__provider">
                {formatActiveLlmLabel(llmConfig)}
              </p>
            ) : null}
            <div className="agent-codex-start__composer">{composer}</div>
          </div>
        ) : (
          <>
            <div className="agent-codex-thread thin-scroll">
              <div className="agent-codex-thread__inner flex flex-col gap-4">
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
                        type="button"
                        onClick={() => setHistoryExpanded(true)}
                        className="mb-4 w-full cursor-pointer py-2 text-center font-mono text-xs text-text-muted transition-colors hover:text-[var(--internal-accent)]"
                      >
                        —— 展开历史消息（{hiddenCount} 条）——
                      </button>
                    )}
                    {visible.map((msg) => (
                      <div
                        key={msg.id}
                        className={
                          msg.role === 'user'
                            ? 'flex justify-end'
                            : 'flex justify-start'
                        }
                      >
                        <div
                          className={
                            msg.role === 'user'
                              ? 'agent-codex-msg agent-codex-msg--user'
                              : 'agent-codex-msg agent-codex-msg--ai'
                          }
                        >
                          {msg.thinking ? (
                            <details className="agent-codex-think-details mb-3">
                              <summary>思考过程</summary>
                              <div className="agent-codex-think-details__body">
                                {msg.thinking}
                              </div>
                            </details>
                          ) : null}
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.content}
                          </div>
                          {msg.toolCalls?.map((tc, i) => (
                            <div
                              key={i}
                              className="agent-codex-tool-card mt-3"
                            >
                              <div className="text-xs font-medium text-text-primary">
                                <MsIcon name="build" size={12} className="mr-1 inline" />
                                {tc.name}
                              </div>
                              {tc.result && (
                                <div className="mt-1 text-xs text-emerald-400/80">
                                  <MsIcon name="check" size={12} className="mr-1 inline" />
                                  {String(tc.result)}
                                </div>
                              )}
                              {(tc.name === 'create_demand' ||
                                tc.name === 'get_demand_detail') &&
                                tc.data?.id && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/demands/${tc.data!.id}`)
                                    }
                                    className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--internal-accent)] transition-colors hover:opacity-80"
                                  >
                                    查看需求卡片{' '}
                                    <MsIcon name="chevron_right" size={12} />
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
              {thinking && thinkingLines.length > 0 ? (
                <div className="agent-codex-thinking">
                  <button
                    type="button"
                    onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
                    className="agent-codex-thinking__label"
                  >
                    正在思考
                    <MsIcon
                      name="expand_more"
                      size={14}
                      className={`transition-transform ${thinkingCollapsed ? '' : 'rotate-180'}`}
                      aria-hidden
                    />
                  </button>
                  {!thinkingCollapsed ? (
                    <div className="agent-codex-thinking__body thin-scroll">
                      {thinkingLines.join('')}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {toolCalls.map((tc, i) => (
                <div key={i} className="agent-codex-tool-card mb-3 max-w-[85%]">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <MsIcon name="build" size={14} className="shrink-0 text-[var(--internal-text-muted)]" />
                    <span className="text-xs font-medium text-text-primary">
                      {AGENT_TOOL_LABELS[tc.name] ?? tc.name}
                    </span>
                    <span className="flex-1" />
                    {tc.pending ? (
                      <span className="text-xs text-amber-500">待批准</span>
                    ) : tc.result ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <MsIcon name="check" size={12} />
                        完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <span className="size-1.5 animate-pulse rounded-full bg-[var(--internal-accent)]" />
                        执行中
                      </span>
                    )}
                  </div>
                  {tc.result ? (
                    <div className="border-t border-[var(--internal-hairline)] px-3 pb-2.5 pt-0">
                      <div className="mt-1.5 text-xs leading-relaxed text-text-muted">
                        {tc.result}
                      </div>
                    </div>
                  ) : null}
                  {tc.pending && activeId ? (
                    <div className="agent-codex-tool-approval">
                      <button
                        type="button"
                        className="agent-codex-tool-approval__btn agent-codex-tool-approval__btn--approve"
                        onClick={() => handleToolApproval(activeId, tc, true)}
                      >
                        批准
                      </button>
                      <button
                        type="button"
                        className="agent-codex-tool-approval__btn agent-codex-tool-approval__btn--reject"
                        onClick={() => handleToolApproval(activeId, tc, false)}
                      >
                        拒绝
                      </button>
                    </div>
                  ) : null}
                  {(tc.name === 'create_demand' ||
                    tc.name === 'get_demand_detail') &&
                    tc.data?.id && (
                      <div className="px-3 pb-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/demands/${tc.data!.id}`)}
                          className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--internal-accent)] transition-opacity hover:opacity-80"
                        >
                          查看详情 <MsIcon name="chevron_right" size={12} />
                        </button>
                      </div>
                    )}
                </div>
              ))}
              {loading && !streamText && toolCalls.length === 0 && !thinking ? (
                <p className="agent-codex-thinking__label">正在思考</p>
              ) : null}
              {streamText ? (
                <div className="flex justify-start">
                  <div className="agent-codex-msg agent-codex-msg--ai whitespace-pre-wrap">
                    {streamText}
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="agent-codex-composer agent-codex-composer--docked">
              <div className="agent-codex-composer__inner">{composer}</div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
