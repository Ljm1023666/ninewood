import { useState, useEffect, useRef, useCallback } from 'react'
import { BackButton } from '@/components/ui/back-button'
import { useNavigate } from 'react-router-dom'
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  streamMessage,
  type AgentConversation,
  type AgentMessage,
} from '@/api/agent'

interface ToolCallDisplay {
  name: string
  arguments: Record<string, unknown>
  result?: string
  success?: boolean
}

export default function AgentChat() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [thinkMode, setThinkMode] = useState(true)
  const [streamText, setStreamText] = useState('')
  const [thinkingLines, setThinkingLines] = useState<string[]>([])
  const [thinkingCollapsed, setThinkingCollapsed] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCallDisplay[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    try {
      const list = await getConversations()
      setConversations(list)
    } catch {
      // 未登录等，静默处理
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // 加载对话消息
  const loadMessages = useCallback(async (id: string) => {
    try {
      const conv = await getConversation(id)
      setMessages(conv.messages)
    } catch (e: any) {
      if (e.response?.status === 404) {
        setActiveId(null)
        setMessages([])
      }
    }
  }, [])

  // 选择对话
  const selectConversation = useCallback(
    (id: string) => {
      setActiveId(id)
      setStreamText('')
      setThinkingLines([])
      setToolCalls([])
      loadMessages(id)
    },
    [loadMessages],
  )

  // 创建新对话
  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation({
        thinkMode,
      })
      await loadConversations()
      setActiveId(conv.id)
      setMessages([])
      setStreamText('')
      setThinkingLines([])
      setToolCalls([])
    } catch (e: any) {
      if (e.response?.status === 401) {
        navigate('/login')
      }
    }
  }, [thinkMode, loadConversations, navigate])

  // 删除对话
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

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    let convId = activeId
    if (!convId) {
      try {
        const conv = await createConversation({ thinkMode })
        await loadConversations()
        convId = conv.id
        setActiveId(conv.id)
      } catch {
        return
      }
    }

    // 添加用户消息
    const userMsg: AgentMessage = {
      id: `temp-${crypto.randomUUID()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setStreamText('')
    setThinkingLines([])
    setToolCalls([])
    setThinking(true)

    const stream = streamMessage(convId, text, thinkMode)
    abortRef.current = stream.abort

    let currentThinkLines: string[] = []
    let currentToolCalls: ToolCallDisplay[] = []
    let fullStreamText = ''

    stream.onEvent('think', (data: unknown) => {
      const d = data as { line: string }
      currentThinkLines = [...currentThinkLines, d.line]
      setThinkingLines([...currentThinkLines])
    })

    stream.onEvent('text', (data: unknown) => {
      const d = data as { delta: string }
      fullStreamText += d.delta
      setStreamText((prev) => prev + d.delta)
    })

    stream.onEvent('tool_call', (data: unknown) => {
      const d = data as {
        name: string
        arguments: Record<string, unknown>
      }
      currentToolCalls = [
        ...currentToolCalls,
        { name: d.name, arguments: d.arguments },
      ]
      setToolCalls([...currentToolCalls])
    })

    stream.onEvent('tool_result', (data: unknown) => {
      const d = data as {
        name: string
        success: boolean
        message: string
      }
      currentToolCalls = currentToolCalls.map((tc) =>
        tc.name === d.name
          ? { ...tc, result: d.message, success: d.success }
          : tc,
      )
      setToolCalls([...currentToolCalls])
    })

    stream.onEvent('think-end', () => {
      setThinking(false)
    })

    stream.onEvent('done', () => {
      // 将流式文本添加到消息列表
      const finalText = fullStreamText || text
      if (finalText) {
        const assistantMsg: AgentMessage = {
          id: `temp-${crypto.randomUUID()}`,
          role: 'assistant',
          content: finalText,
          thinking:
            currentThinkLines.length > 0
              ? currentThinkLines.join('\n')
              : undefined,
          toolCalls:
            currentToolCalls.length > 0
              ? currentToolCalls.map((tc) => ({
                  name: tc.name,
                  arguments: tc.arguments,
                  result: tc.result,
                }))
              : undefined,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
      setStreamText('')
      setThinkingLines([])
      setToolCalls([])
      setLoading(false)
      setThinking(false)

      // 刷新对话列表以更新标题
      loadConversations()
    })

    stream.onError((err) => {
      console.error('Agent stream error:', err)
      setLoading(false)
      setThinking(false)
    })
  }, [input, loading, activeId, thinkMode, loadConversations])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // Enter 发送，Shift+Enter 换行
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 停止生成
  const handleStop = () => {
    abortRef.current?.()
    setLoading(false)
    setThinking(false)
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <BackButton />
      {/* 侧边栏 */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-200 overflow-hidden border-r border-zinc-800 flex flex-col`}
      >
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            + 新建对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`group flex items-center px-4 py-3 cursor-pointer transition-colors ${
                activeId === conv.id
                  ? 'bg-zinc-800 border-l-2 border-zinc-400'
                  : 'hover:bg-zinc-900 border-l-2 border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{conv.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {conv._count.messages} 条消息
                  {conv.thinkMode && ' · 思考'}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(conv.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-xs px-1.5 py-0.5 transition-all cursor-pointer"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 主对话区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-zinc-500 hover:text-zinc-300 text-lg cursor-pointer"
          >
            {sidebarOpen ? '◁' : '▷'}
          </button>
          <span className="text-sm text-zinc-400 font-medium">AI 助手</span>
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={thinkMode}
              onChange={(e) => setThinkMode(e.target.checked)}
              className="w-3.5 h-3.5 accent-zinc-500 cursor-pointer"
            />
            深度思考
          </label>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-600">
                <div className="text-4xl mb-4">九</div>
                <div className="text-sm">九木 AI 助手</div>
                <div className="text-xs mt-1">
                  输入你的问题，我能帮你搜索需求、管理订单等
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-6 ${msg.role === 'user' ? 'flex justify-end' : ''}`}
            >
              <div
                className={`max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 rounded-2xl rounded-br-md px-4 py-3'
                    : ''
                }`}
              >
                {/* 思考过程 */}
                {msg.thinking && (
                  <details className="mb-3">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                      思考过程 ({msg.thinking.split('\n').length} 行)
                    </summary>
                    <div className="mt-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {msg.thinking}
                    </div>
                  </details>
                )}

                {/* 消息内容 */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* 工具调用 */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.toolCalls.map((tc, i) => (
                      <div
                        key={i}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2"
                      >
                        <div className="text-xs font-medium text-zinc-400 mb-1">
                          🔧 {tc.name}
                        </div>
                        <div className="text-xs text-zinc-600">
                          {JSON.stringify(tc.arguments, null, 2)}
                        </div>
                        {tc.result && (
                          <div className="text-xs text-green-500/70 mt-1">
                            ✓ {String(tc.result)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 流式思考 */}
          {thinking && thinkingLines.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
                className="text-xs text-zinc-500 hover:text-zinc-400 cursor-pointer"
              >
                {thinkingCollapsed ? '▶' : '▼'} 正在思考... (
                {thinkingLines.join('').length} 字)
              </button>
              {!thinkingCollapsed && (
                <div className="mt-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {thinkingLines.join('')}
                </div>
              )}
            </div>
          )}

          {/* 流式工具调用 */}
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="mb-3 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 max-w-[75%]"
            >
              <div className="text-xs font-medium text-zinc-400">
                🔧 {tc.name}
                {tc.result ? (
                  <span className="text-green-500/70 ml-2">✓ 完成</span>
                ) : (
                  <span className="text-zinc-600 ml-2">执行中...</span>
                )}
              </div>
              {tc.result && (
                <div className="text-xs text-zinc-500 mt-1">{tc.result}</div>
              )}
            </div>
          ))}

          {/* 流式文本 */}
          {streamText && (
            <div className="mb-6">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {streamText}
              </div>
            </div>
          )}

          {/* 加载指示器 */}
          {loading && !streamText && !thinking && toolCalls.length === 0 && (
            <div className="flex gap-1.5 mb-6">
              <div className="w-2 h-2 bg-zinc-700 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-zinc-700 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-zinc-700 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              rows={1}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="px-4 py-3 bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                停止
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-100 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                发送
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
