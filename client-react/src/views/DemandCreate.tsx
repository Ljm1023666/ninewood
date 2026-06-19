import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { demandApi } from '@/api/demand'
import { toast } from '@/components/ui/confirm-dialog'
import { PromptInputBox } from '@/components/ui/prompt-input-box'
import { WorkspaceSummary } from '@/components/demand/WorkspaceSummary'
import { WorkspaceFields } from '@/components/demand/WorkspaceFields'
import { WorkspaceTools } from '@/components/demand/WorkspaceTools'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'
import {
  Sparkles,
  ArrowLeft,
  Monitor,
  MapPin,
  Send,
  Brain,
  Check,
  Zap,
  Plus,
} from 'lucide-react'

let _msgId = 0
const newMsgId = () => `dc${++_msgId}`

const DRAFT_KEY = 'ninewood_demand_draft'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  toolCall?: { name: string; arguments: Record<string, string> } | null
}

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
              if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
              }
              return prev
            }
            return prev + 1
          })
        }, 25)
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
  }, [len, text.length])

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [len])

  useEffect(() => {
    if (!text) setLen(0)
  }, [text])

  if (!text) return null

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-purple-400/60">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 hover:text-purple-300 transition-colors"
        >
          <Brain className="size-3.5" />
          <span>思考过程</span>
          <span
            className={`inline-block transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          >
            ▼
          </span>
        </button>
        {isLoading && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
        )}
      </div>
      {!collapsed && (
        <div
          ref={scrollRef}
          className="px-4 pb-3 text-xs text-purple-300/50 leading-relaxed whitespace-pre-wrap font-mono max-h-[120px] overflow-y-scroll"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#444 transparent' }}
        >
          {text.slice(0, len)}
          {len < text.length && (
            <span className="inline-block w-0.5 h-3.5 bg-purple-400/60 ml-0.5 animate-pulse" />
          )}
        </div>
      )}
    </div>
  )
}

export default function DemandCreate() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const [loading, setLoading] = useState(false)
  const [thinkText, setThinkText] = useState('')
  const [thinkCollapsed, setThinkCollapsed] = useState(false)
  const [isThinkMode, setIsThinkMode] = useState(false)
  const thinkAccRef = useRef('')
  const [publishing, setPublishing] = useState(false)
  const [forcePublishing, setForcePublishing] = useState(false)
  const [draftInput, setDraftInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const workspaceFields = useDemandWorkspaceStore((s) => s.fields)
  const workspaceReady = useDemandWorkspaceStore((s) => s.readyToPublish)
  const applyAgent = useDemandWorkspaceStore((s) => s.applyAgentResult)
  const applyAnalyze = useDemandWorkspaceStore((s) => s.applyAnalyzeResult)
  const resetWorkspace = useDemandWorkspaceStore((s) => s.reset)

  // ========== 草稿持久化 ==========

  const saveDraft = useCallback(() => {
    const store = useDemandWorkspaceStore.getState()
    const draft = {
      messages: messagesRef.current,
      input: draftInput,
      fields: store.fields,
      fieldOverrides: [...store.fieldOverrides],
      lockedKeywords: [...store.lockedKeywords],
      missingInfo: store.missingInfo,
      missingQueue: store.missingQueue,
      answeredQueue: store.answeredQueue,
      resolvedQueue: store.resolvedQueue,
      missingAnswers: store.missingAnswers,
      confidence: store.confidence,
      readyToPublish: store.readyToPublish,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draftInput])

  const loadDraft = useCallback((): boolean => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    try {
      const draft = JSON.parse(raw)
      // 恢复消息
      if (draft.messages?.length) {
        setMessages(draft.messages)
        _msgId = draft.messages.length + 1
      }
      // 恢复输入
      if (draft.input) setDraftInput(draft.input)
      // 恢复 store
      useDemandWorkspaceStore.setState({
        fields: draft.fields || resetWorkspace,
        fieldOverrides: new Set(draft.fieldOverrides || []),
        lockedKeywords: new Set(draft.lockedKeywords || []),
        missingInfo: draft.missingInfo || [],
        missingQueue: draft.missingQueue || [],
        answeredQueue: draft.answeredQueue || [],
        resolvedQueue: draft.resolvedQueue || [],
        missingAnswers: draft.missingAnswers || {},
        confidence: draft.confidence || 'low',
        readyToPublish: draft.readyToPublish || false,
      })
      return true
    } catch {
      return false
    }
  }, [resetWorkspace])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    setMessages([])
    setDraftInput('')
    _msgId = 0
    resetWorkspace()
    toast('已清空，开始新的需求', 'success')
  }, [resetWorkspace])

  // 挂载时恢复草稿
  useEffect(() => {
    const restored = loadDraft()
    if (restored && messagesRef.current.length > 0) {
      toast('已恢复上次未完成的草稿', 'success')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 状态变化时自动保存（1s 防抖）
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(saveDraft, 1000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [messages, draftInput, workspaceFields, saveDraft])

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, thinkText])

  // Refs for handlers declared after sendMessage (avoids useBeforeDefine)
  const handleSearchModeRef = useRef<(text: string) => Promise<void>>(
    undefined as any,
  )
  const handleCanvasModeRef = useRef<(text: string) => Promise<void>>(
    undefined as any,
  )
  const handleDefaultModeRef = useRef<
    (
      history: { role: 'user' | 'assistant'; content: string }[],
      thinkMode: boolean,
    ) => Promise<void>
  >(undefined as any)
  const handleMissingInfoBatchAnalysisRef = useRef<() => Promise<void>>(
    undefined as any,
  )

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const isSearch = rawMessage.startsWith('[Search:')
      const isThink = rawMessage.startsWith('[Think:')
      const isCanvas = rawMessage.startsWith('[Canvas:')

      const text = rawMessage
        .replace(/^\[(Search|Think|Canvas):\s*/, '')
        .replace(/\]$/, '')
        .trim()
      if (!text) return

      setDraftInput('')
      setLoading(true)
      setIsThinkMode(isThink)
      setThinkText('')
      setThinkCollapsed(false)
      thinkAccRef.current = ''

      const confirmedCtx = useDemandWorkspaceStore
        .getState()
        .getConfirmedContext()
      const augmentedText = confirmedCtx ? `${confirmedCtx}\n${text}` : text

      const currentMsg = { role: 'user' as const, content: augmentedText }

      setMessages((prev) => [
        ...prev,
        { id: newMsgId(), role: 'user', content: text },
      ])

      const history = [
        ...messagesRef.current.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        currentMsg,
      ]

      // 并行：非流式分析（所有模式下都更新工作区）
      fetch('/api/ai/analyze-demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: history
            .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
            .join('\n'),
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.data) {
            applyAnalyze({
              title: json.data.title,
              summary: json.data.summary,
              missingInfo: json.data.missingInfo,
              confidence: json.data.confidence,
              suggestedKeywords: json.data.suggestedKeywords,
              scopeLabels: json.data.scopePath,
              serviceType: json.data.serviceType,
              budget: json.data.budget,
              schedule: json.data.schedule,
              category: json.data.category,
            })
          }
        })
        .catch(() => {})

      // 如果有勾选的缺失信息待回答，优先走缺失信息回答流程
      const queuedMissing = useDemandWorkspaceStore.getState().missingQueue
      if (queuedMissing.length > 0) {
        const allDone = useDemandWorkspaceStore
          .getState()
          .recordAnswerAndAdvance(text)
        if (allDone) {
          // 所有问题都已收集答案 → 统一调用 AI 分析
          await handleMissingInfoBatchAnalysisRef.current()
        } else {
          // 还有待答问题 → 提示用户继续
          const remaining =
            useDemandWorkspaceStore.getState().missingQueue.length
          setMessages((prev) => [
            ...prev,
            {
              id: newMsgId(),
              role: 'assistant',
              content: `📝 已记录答案。还有 ${remaining} 项待回答，请继续输入。`,
            },
          ])
        }
        setLoading(false)
        return
      }

      try {
        if (isSearch) {
          await handleSearchModeRef.current(text)
        } else if (isCanvas) {
          await handleCanvasModeRef.current(text)
        } else {
          await handleDefaultModeRef.current(history, isThink)
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: '网络异常' },
        ])
      } finally {
        setLoading(false)
      }
    },
    [applyAgent, applyAnalyze],
  )

  /** Search 模式：分类搜索 + 需求计数 */
  const handleSearchMode = useCallback(
    async (text: string) => {
      const res = await fetch('/api/ai/discover-classify-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, thinkMode: false }),
      })
      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: '搜索异常，请重试' },
        ])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      const assistantId = newMsgId()
      let hasMsg = false
      let result: Record<string, unknown> | null = null
      const ensure = (content: string) => {
        if (!hasMsg) {
          hasMsg = true
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content, isStreaming: true },
          ])
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
          )
        }
      }

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

          if (eventType === 'think') {
            try {
              const { line } = JSON.parse(data)
              if (line) {
                thinkAccRef.current += (thinkAccRef.current ? '\n' : '') + line
                setThinkText(thinkAccRef.current)
              }
            } catch {
              /* skip */
            }
          } else if (eventType === 'result') {
            try {
              result = JSON.parse(data)
              const r = result as {
                queryType?: string
                answer?: string
                understood?: string
                scopePath?: string[]
                matchCount?: number
                refineOptions?: { label: string; count: number }[]
                tags?: string[]
                refinePrompt?: string
                serviceType?: string
              }

              // 通用问答：直接显示答案
              if (r.queryType === 'general') {
                ensure(r.answer || '未能获取信息')
              } else {
                // 服务分类：结构化展示
                if (r.scopePath) {
                  applyAnalyze({
                    scopeLabels: r.scopePath,
                    serviceType: r.serviceType,
                  })
                }

                let content = `🔍 ${r.understood || '已理解搜索意图'}\n\n`
                if (r.scopePath && r.scopePath.length > 0) {
                  content += `📂 分类：${r.scopePath.join(' → ')}\n`
                }
                content += `📊 匹配需求数：**${r.matchCount ?? 0}**\n`
                if (r.tags && r.tags.length > 0) {
                  content += `🏷️ 标签：${r.tags.join('、')}\n`
                }
                if (r.refineOptions && r.refineOptions.length > 0) {
                  content += `\n📌 可选细分：\n${r.refineOptions
                    .map((o) => `  • ${o.label} (${o.count}条)`)
                    .join('\n')}\n`
                }
                if (r.refinePrompt) {
                  content += `\n💡 ${r.refinePrompt}`
                }
                ensure(content)
              }
            } catch {
              /* skip */
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m,
        ),
      )

      // 若没有结果，补一条默认消息
      if (!result) {
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: '未能解析搜索结果' },
        ])
      }
    },
    [applyAnalyze],
  )
  handleSearchModeRef.current = handleSearchMode

  /** Canvas 模式：直接提取结构化字段，减少对话 */
  const handleCanvasMode = useCallback(
    async (text: string) => {
      const store = useDemandWorkspaceStore.getState()
      const requirementState = {
        confirmed: Object.fromEntries(
          [...store.fieldOverrides].map((k) => [
            k,
            String((store.fields as Record<string, unknown>)[k] ?? ''),
          ]),
        ),
        pending: store.missingInfo,
      }

      const res = await fetch('/api/ai/analyze-demand-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          requirementState,
          thinkMode: false,
        }),
      })
      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: '分析异常，请重试' },
        ])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      const assistantId = newMsgId()
      let hasMsg = false

      const ensure = (content: string) => {
        if (!hasMsg) {
          hasMsg = true
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content, isStreaming: true },
          ])
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content } : m)),
          )
        }
      }

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

          if (eventType === 'result') {
            try {
              const r = JSON.parse(data)
              applyAnalyze({
                summary: r.summary,
                scopeLabels: r.scopeLabels,
                serviceType: r.serviceType,
                confidence: r.confidence,
                missingInfo: r.missingInfo,
                suggestedKeywords: r.suggestedKeywords,
                readyToPublish: r.readyToPublish,
              })
              ensure(
                `📝 ${r.summary || '已分析需求'}\n\n` +
                  (r.missingInfo?.length
                    ? `⚠️ 还需补充：${r.missingInfo.join('、')}`
                    : r.readyToPublish
                      ? '✅ 信息完整，可以发布'
                      : ''),
              )
            } catch {
              /* skip */
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m,
        ),
      )
    },
    [applyAnalyze],
  )
  handleCanvasModeRef.current = handleCanvasMode

  /** 所有缺失信息答案已收集完毕 → 统一调用 AI 分析 */
  const handleMissingInfoBatchAnalysis = useCallback(async () => {
    const store = useDemandWorkspaceStore.getState()
    const { answeredQueue, missingAnswers, getConfirmedContext } = store
    const confirmed = getConfirmedContext()

    // 构建问答对
    const qaPairs = answeredQueue
      .map((q) => `问：${q}\n答：${missingAnswers[q] || '(未提供)'}`)
      .join('\n\n')

    const prompt = `用户针对以下问题逐一提供了答案：\n\n${qaPairs}\n\n${confirmed ? `已确认的上下文：${confirmed}\n` : ''}请整合所有新信息，更新需求分析。`

    try {
      const res = await fetch('/api/ai/analyze-demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt }),
      })
      if (!res.ok) {
        store.resolveAllAnswered() // 仍然清除 answeredQueue，避免卡住
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: '分析异常，请重试' },
        ])
        return
      }
      const json = await res.json()
      if (json.data) {
        applyAnalyze({
          title: json.data.title,
          summary: json.data.summary,
          missingInfo: json.data.missingInfo,
          confidence: json.data.confidence,
          suggestedKeywords: json.data.suggestedKeywords,
          scopeLabels: json.data.scopePath,
          serviceType: json.data.serviceType,
          budget: json.data.budget,
          schedule: json.data.schedule,
          category: json.data.category,
        })
      }
      store.resolveAllAnswered()
      setMessages((prev) => [
        ...prev,
        {
          id: newMsgId(),
          role: 'assistant',
          content: '✅ 已综合所有回答更新工作区。',
        },
      ])
    } catch {
      store.resolveAllAnswered()
      setMessages((prev) => [
        ...prev,
        { id: newMsgId(), role: 'assistant', content: '网络异常' },
      ])
    }
  }, [applyAnalyze])
  handleMissingInfoBatchAnalysisRef.current = handleMissingInfoBatchAnalysis

  /** 默认 / Think 模式：Agent 对话 */
  const handleDefaultMode = useCallback(
    async (
      history: { role: 'user' | 'assistant'; content: string }[],
      thinkMode: boolean,
    ) => {
      const res = await fetch('/api/ai/agent-demand-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, thinkMode }),
      })
      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: '网络异常，请重试' },
        ])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      const assistantId = newMsgId()
      let assistantContent = ''
      let hasAssistantMsg = false
      let toolCall: ChatMsg['toolCall'] = null

      const ensureAssistant = () => {
        if (!hasAssistantMsg) {
          hasAssistantMsg = true
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content: '',
              isStreaming: true,
            },
          ])
        }
      }

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
                thinkAccRef.current += (thinkAccRef.current ? '\n' : '') + line
                setThinkText(thinkAccRef.current)
              }
            } catch {
              /* skip */
            }
          } else if (eventType === 'text') {
            try {
              const { delta } = JSON.parse(data)
              if (delta) {
                assistantContent += delta
                ensureAssistant()
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: assistantContent }
                      : m,
                  ),
                )
              }
            } catch {
              /* skip */
            }
          } else if (eventType === 'tool_call') {
            try {
              const parsed = JSON.parse(data)
              toolCall = { name: parsed.name, arguments: parsed.arguments }
              applyAgent(parsed.arguments)
            } catch {
              /* skip */
            }
          } else if (eventType === 'error') {
            try {
              const { message } = JSON.parse(data)
              setMessages((prev) => [
                ...prev,
                {
                  id: newMsgId(),
                  role: 'assistant',
                  content: message || 'AI 错误',
                },
              ])
            } catch {
              /* skip */
            }
          }
        }
      }

      if (toolCall) {
        if (hasAssistantMsg) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: assistantContent || '已收集完整信息，准备发布',
                    isStreaming: false,
                    toolCall,
                  }
                : m,
            ),
          )
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content: '已收集完整信息，准备发布',
              isStreaming: false,
              toolCall,
            },
          ])
        }
      } else if (hasAssistantMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        )
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '无法理解，请换个方式描述',
          },
        ])
      }
    },
    [applyAgent],
  )
  handleDefaultModeRef.current = handleDefaultMode

  const doPublish = useCallback(
    async (force = false) => {
      const f = useDemandWorkspaceStore.getState().fields
      if (!f.title.trim() && !force) {
        toast('请先填写需求标题', 'error')
        return
      }

      if (force) setForcePublishing(true)
      else setPublishing(true)

      try {
        const fd = new FormData()
        fd.append('title', f.title.trim() || '未命名需求')
        fd.append('description', f.description.trim() || f.title.trim())
        fd.append(
          'minPrice',
          f.budget ? String(extractMinPrice(f.budget)) : '1',
        )
        fd.append(
          'category',
          f.category ||
            (force
              ? '__force__'
              : f.serviceType === 'OFFLINE'
                ? 'of-move'
                : 'ol-game'),
        )
        if (f.taxonomyLeafId) fd.append('taxonomyLeafId', f.taxonomyLeafId)
        fd.append(
          'serviceType',
          f.serviceType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
        )
        fd.append('expireAt', new Date(Date.now() + 7 * 86400000).toISOString())
        await demandApi.create(fd)
        toast(force ? '已发布至无差别池' : '发布成功', 'success')
        resetWorkspace()
        navigate('/my-demands')
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } }
        toast(err.response?.data?.message || '发布失败', 'error')
      } finally {
        setPublishing(false)
        setForcePublishing(false)
      }
    },
    [navigate, resetWorkspace],
  )

  const handlePublishFromChat = useCallback(
    async (toolCall: NonNullable<ChatMsg['toolCall']>) => {
      // 如果工作区已有用户编辑过的内容，直接用工作区发布
      if (workspaceReady || workspaceFields.title) {
        return doPublish()
      }
      // 否则用 toolCall 的参数先填充再发布
      applyAgent(toolCall.arguments)
      setTimeout(() => doPublish(), 50)
    },
    [doPublish, workspaceReady, workspaceFields.title, applyAgent],
  )

  return (
    <div className="min-h-screen bg-[#0c0414] text-white flex flex-col relative overflow-x-hidden">
      {/* 渐变光效 */}
      <div className="flex gap-[10rem] rotate-[-20deg] absolute top-[-40rem] right-[-30rem] z-[0] blur-[5rem] skew-[-40deg] opacity-40">
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-purple-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-blue-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-violet-400" />
      </div>
      <div className="flex gap-[10rem] rotate-[-20deg] absolute top-[-50rem] right-[-50rem] z-[0] blur-[5rem] skew-[-40deg] opacity-30">
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-purple-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-blue-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-violet-400" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/40 tracking-wide">
            需求工作区
          </span>
          <button
            type="button"
            onClick={() => {
              if (messages.length > 0 || workspaceFields.title) {
                if (
                  !window.confirm('确定要清空当前所有内容吗？此操作不可撤销。')
                )
                  return
              }
              clearDraft()
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/30 hover:border-white/15 hover:text-white/50 transition-all"
          >
            <Plus className="size-3" />
            新建
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => doPublish(true)}
            disabled={forcePublishing || publishing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-xs font-medium text-red-300/70 hover:border-red-500/30 hover:bg-red-500/[0.10] disabled:opacity-30 transition-all"
          >
            {forcePublishing ? (
              <span className="inline-block size-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <Zap className="size-3" />
            )}
            强制发布
          </button>
          <button
            type="button"
            onClick={() => doPublish()}
            disabled={publishing || forcePublishing}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {publishing ? (
              <span className="inline-block size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            发布
          </button>
        </div>
      </header>

      {/* 双栏内容区 */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* 左栏：对话 */}
        <div className="flex w-[42%] min-w-0 shrink-0 flex-col border-r border-white/[0.04]">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto thin-scroll"
            style={{ padding: '0 1rem', scrollbarGutter: 'stable' }}
          >
            <div
              className={`w-full max-w-xl mx-auto space-y-4 ${messages.length === 0 ? 'flex flex-col justify-center h-full' : 'py-6'}`}
            >
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <Sparkles className="size-7 text-purple-400/60" />
                  </div>
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-white/85">
                      你想找什么样的服务者？
                    </h1>
                    <p className="text-sm text-white/25 mt-2">
                      用自然语言描述需求，AI 会帮你理清并追问细节
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-br-lg bg-accent/12 px-4 py-2.5">
                          <span className="text-sm text-white/80">
                            {msg.content}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <span className="text-sm text-white/70 whitespace-pre-wrap">
                          {msg.content}
                          {msg.isStreaming && (
                            <span className="inline-block w-0.5 h-4 bg-purple-400/60 ml-0.5 animate-pulse align-middle" />
                          )}
                        </span>

                        {/* 确认发布卡片 */}
                        {msg.toolCall && (
                          <div className="mt-3 pt-3 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 mb-3 text-xs text-emerald-400/80">
                              <Check className="size-3.5" />
                              <span>AI 已确认信息完整，可以发布</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                              {msg.toolCall.arguments.title && (
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <span className="text-white/25">标题</span>
                                  <p className="text-white/70 mt-0.5">
                                    {msg.toolCall.arguments.title}
                                  </p>
                                </div>
                              )}
                              {msg.toolCall.arguments.serviceType && (
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <span className="text-white/25">
                                    服务类型
                                  </span>
                                  <p className="text-white/70 mt-0.5 inline-flex items-center gap-1">
                                    {msg.toolCall.arguments.serviceType ===
                                    'ONLINE' ? (
                                      <Monitor className="size-3 text-blue-400/60" />
                                    ) : (
                                      <MapPin className="size-3 text-orange-400/60" />
                                    )}
                                    {msg.toolCall.arguments.serviceType ===
                                    'ONLINE'
                                      ? '线上'
                                      : '线下'}
                                  </p>
                                </div>
                              )}
                              {msg.toolCall.arguments.budget && (
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <span className="text-white/25">预算</span>
                                  <p className="text-white/70 mt-0.5">
                                    {msg.toolCall.arguments.budget}
                                  </p>
                                </div>
                              )}
                              {msg.toolCall.arguments.schedule && (
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <span className="text-white/25">时间</span>
                                  <p className="text-white/70 mt-0.5">
                                    {msg.toolCall.arguments.schedule}
                                  </p>
                                </div>
                              )}
                              {msg.toolCall.arguments.category && (
                                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <span className="text-white/25">分类</span>
                                  <p className="text-white/70 mt-0.5">
                                    {msg.toolCall.arguments.category}
                                  </p>
                                </div>
                              )}
                            </div>
                            {msg.toolCall.arguments.description && (
                              <div className="rounded-lg bg-white/[0.03] px-3 py-2 mb-3 text-xs">
                                <span className="text-white/25">详细描述</span>
                                <p className="text-white/60 mt-0.5">
                                  {msg.toolCall.arguments.description}
                                </p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handlePublishFromChat(msg.toolCall!)
                              }
                              disabled={publishing}
                              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                            >
                              {publishing ? (
                                <span className="inline-block size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Send className="size-3.5" />
                              )}
                              确认发布
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading &&
                !messages.some(
                  (m) => m.role === 'assistant' && m.isStreaming,
                ) && (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <span className="inline-block size-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <span className="text-sm text-white/35">AI 分析中…</span>
                  </div>
                )}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="shrink-0 border-t border-white/[0.04] px-4 py-3">
            <div className="w-full max-w-xl mx-auto">
              {isThinkMode && (
                <div className="mb-2">
                  <ThinkingPanel
                    text={thinkText}
                    isLoading={loading}
                    collapsed={thinkCollapsed}
                    onToggleCollapse={() => setThinkCollapsed(!thinkCollapsed)}
                  />
                </div>
              )}
              <PromptInputBox
                onSend={(message) => sendMessage(message)}
                isLoading={loading}
                placeholder="说点什么？"
                value={draftInput}
                onInputChange={setDraftInput}
              />
            </div>
          </div>
        </div>

        {/* 右栏：工作区 */}
        <div className="flex-1 min-w-0 overflow-y-auto thin-scroll">
          <div className="max-w-lg mx-auto space-y-6 py-6 px-6">
            {messages.length === 0 && !workspaceFields.title ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-4">
                  <Sparkles className="size-6 text-white/15" />
                </div>
                <p className="text-sm text-white/20 max-w-48 leading-relaxed">
                  在左侧描述你的需求，AI 会同步整理到这里
                </p>
              </div>
            ) : (
              <>
                <WorkspaceSummary />
                <WorkspaceFields />
                <WorkspaceTools />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 从预算字符串中提取最小价格数字 */
function extractMinPrice(budget: string): number {
  const nums = budget.match(/\d+/g)
  if (!nums || nums.length === 0) return 1
  return Math.min(...nums.map(Number))
}
