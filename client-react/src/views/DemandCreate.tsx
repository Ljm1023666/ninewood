import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { demandApi } from '@/api/demand'
import { toast } from '@/components/ui/confirm-dialog'
import { PromptInputBox } from '@/components/ui/prompt-input-box'
import { WorkspaceSummary } from '@/components/demand/WorkspaceSummary'
import { WorkspaceFields } from '@/components/demand/WorkspaceFields'
import { WorkspaceTools } from '@/components/demand/WorkspaceTools'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'
import { useUserStore } from '@/stores/user'
import { InfoCard } from '@/components/ui/info-card'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'
import { BackButton } from '@/components/ui/back-button'
import {
  Sparkles,
  Monitor,
  MapPin,
  Send,
  Brain,
  Check,
  Zap,
  Plus,
  ChevronDown,
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
  /** 思考模式下的 reasoning_content，有 tool_call 的轮次必须回传 */
  reasoningContent?: string
}

/** 简单排版：加粗、列表、段落间距 */
function formatAIText(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 加粗 **text**
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold">$1</strong>',
  )

  // 按双换行分段
  const paragraphs = html.split(/\n\n+/)
  return paragraphs
    .map((p) => {
      const trimmed = p.trim()
      if (!trimmed) return ''

      // 检测有序列表（每行以数字+点号开头）
      const lines = trimmed.split('\n')
      const isOrderedList = lines.every((l) => /^\d+[.)]\s/.test(l.trim()))
      if (isOrderedList && lines.length > 1) {
        const items = lines
          .map((l) => `<li>${l.trim().replace(/^\d+[.)]\s*/, '')}</li>`)
          .join('')
        return `<ol class="list-decimal pl-5 my-2 space-y-1">${items}</ol>`
      }

      // 检测无序列表
      const isUnorderedList = lines.every((l) => /^[-•*]\s/.test(l.trim()))
      if (isUnorderedList && lines.length > 1) {
        const items = lines
          .map((l) => `<li>${l.trim().replace(/^[-•*]\s*/, '')}</li>`)
          .join('')
        return `<ul class="list-disc pl-5 my-2 space-y-1">${items}</ul>`
      }

      // 普通段落
      const withBreaks = trimmed.replace(/\n/g, '<br/>')
      return `<p class="my-1">${withBreaks}</p>`
    })
    .join('')
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
    <div className="ws-thinking">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="ws-thinking-head"
      >
        <Brain className="size-3.5" />
        <span>思考过程</span>
        <ChevronDown
          className={cn('size-3.5 ml-auto transition-transform', !collapsed && 'rotate-180')}
        />
        {isLoading && <span className="ws-spinner" style={{ width: 6, height: 6, borderWidth: 1.5 }} />}
      </button>
      {!collapsed && (
        <div ref={scrollRef} className="ws-thinking-body">
          {text.slice(0, len)}
          {len < text.length && (
            <span className="ai-cursor" style={{ display: 'inline-block', width: 2, height: '1em' }} />
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
  const [canvasMode, setCanvasMode] = useState(false)
  const thinkAccRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)
  const [forcePublishing, setForcePublishing] = useState(false)
  const [draftInput, setDraftInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const workspaceFields = useDemandWorkspaceStore((s) => s.fields)
  const workspaceReady = useDemandWorkspaceStore((s) => s.readyToPublish)
  const confidence = useDemandWorkspaceStore((s) => s.confidence)
  const speedMode = useDemandWorkspaceStore((s) => s.speedMode)
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

  // 消息变化前记录用户是否在底部
  const wasAtBottomRef = useRef(true)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, thinkText])

  // 监听用户手动滚动，更新是否在底部的标记
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      wasAtBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 40
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Refs for handlers declared after sendMessage (avoids useBeforeDefine)
  const handleAggressiveModeRef = useRef<
    (text: string, signal: AbortSignal) => Promise<void>
  >(undefined as any)
  const handleCanvasModeRef = useRef<
    (text: string, signal: AbortSignal) => Promise<void>
  >(undefined as any)
  const handleDefaultModeRef = useRef<
    (
      history: { role: 'user' | 'assistant'; content: string }[],
      thinkMode: boolean,
      signal: AbortSignal,
    ) => Promise<void>
  >(undefined as any)
  const handleMissingInfoBatchAnalysisRef = useRef<() => Promise<void>>(
    undefined as any,
  )

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const isThink = rawMessage.startsWith('[Think:')
      const isCanvas = rawMessage.startsWith('[Canvas:')

      const text = rawMessage
        .replace(/^\[(Think|Canvas):\s*/, '')
        .replace(/\]$/, '')
        .trim()
      if (!text) return

      setDraftInput('')
      setExpandedIds(new Set())
      setLoading(true)
      setIsThinkMode(isThink)
      setThinkText('')
      setThinkCollapsed(false)
      if (isThink) setCanvasMode(false)
      thinkAccRef.current = ''

      const speedMode = useDemandWorkspaceStore.getState().speedMode

      // Speed 模式：每次从头开始，清空旧消息和工作区
      if (speedMode) {
        setMessages([])
        resetWorkspace()
      }

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
          ...(m.reasoningContent
            ? { reasoning_content: m.reasoningContent }
            : {}),
        })),
        currentMsg,
      ]

      // 如果有勾选的缺失信息待回答，优先走缺失信息回答流程
      const queuedMissing = useDemandWorkspaceStore.getState().missingQueue
      if (queuedMissing.length > 0) {
        const allDone = useDemandWorkspaceStore
          .getState()
          .recordAnswerAndAdvance(text)
        if (allDone) {
          await handleMissingInfoBatchAnalysisRef.current()
        } else {
          const remaining =
            useDemandWorkspaceStore.getState().missingQueue.length
          setMessages((prev) => [
            ...prev,
            {
              id: newMsgId(),
              role: 'assistant',
              content: `已记录答案。还有 ${remaining} 项待回答，请继续输入。`,
            },
          ])
        }
        abortRef.current = null
        setLoading(false)
        return
      }

      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        if (isCanvas) {
          await handleCanvasModeRef.current(text, ctrl.signal)
        } else if (isThink) {
          await handleDefaultModeRef.current(history, true, ctrl.signal)
        } else if (speedMode) {
          await handleAggressiveModeRef.current(text, ctrl.signal)
        } else {
          await handleDefaultModeRef.current(history, false, ctrl.signal)
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          setThinkText('')
          thinkAccRef.current = ''
          setIsThinkMode(false)
          setMessages((prev) => [
            ...prev,
            { id: newMsgId(), role: 'assistant', content: '⏹ 已中断' },
          ])
          return
        }
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: '网络异常' },
        ])
      } finally {
        abortRef.current = null
        setLoading(false)
      }
    },
    [applyAgent, applyAnalyze],
  )

  // 包装 applyAnalyze，同步在左边栏显示 AI 行为
  const analyzeAndLog = useCallback(
    (data: Parameters<typeof applyAnalyze>[0]) => {
      applyAnalyze(data)
      const parts: string[] = []
      if (data.title) parts.push(`标题：${data.title}`)
      if (data.serviceType)
        parts.push(`类型：${data.serviceType === 'ONLINE' ? '线上' : '线下'}`)
      if (data.budget) parts.push(`预算：${data.budget}`)
      if (data.schedule) parts.push(`时间：${data.schedule}`)
      if (data.category) parts.push(`分类：${data.category}`)
      if (data.summary && !data.title) parts.push(data.summary)
      if (parts.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: newMsgId(),
            role: 'assistant',
            content: `${parts.join(' · ')}`,
          },
        ])
      }
    },
    [applyAnalyze],
  )

  /** 激进模式：一句话直接生成草稿，不追问 */
  const handleAggressiveMode = useCallback(
    async (text: string, signal: AbortSignal) => {
      const assistantId = newMsgId()
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '正在生成需求草稿…',
          isStreaming: true,
        },
      ])

      try {
        const res = await fetch('/api/ai/analyze-demand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal,
        })
        if (!res.ok) throw new Error('分析失败')
        const json = await res.json()

        if (json.data) {
          analyzeAndLog({
            title: json.data.title,
            summary: json.data.summary,
            missingInfo: [],
            confidence: json.data.confidence,
            suggestedKeywords: json.data.suggestedKeywords,
            scopeLabels: json.data.scopePath,
            serviceType: json.data.serviceType,
            budget: json.data.budget,
            schedule: json.data.schedule,
            category: json.data.category,
            taxonomyLeafId: json.data.taxonomyLeafId,
          })
          // 强制 readyToPublish
          useDemandWorkspaceStore.setState({ readyToPublish: true })

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: '已生成需求草稿，确认无误后发布',
                    isStreaming: false,
                  }
                : m,
            ),
          )
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: '分析异常，请重试', isStreaming: false }
              : m,
          ),
        )
      }
    },
    [applyAnalyze],
  )
  handleAggressiveModeRef.current = handleAggressiveMode

  /** Canvas 模式：直接提取结构化字段，减少对话 */
  const handleCanvasMode = useCallback(
    async (text: string, signal: AbortSignal) => {
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
        signal,
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
              analyzeAndLog({
                title: r.title,
                summary: r.summary,
                budget: r.budget,
                category: r.category,
                scopeLabels: r.scopeLabels,
                serviceType: r.serviceType,
                confidence: r.confidence,
                missingInfo: r.missingInfo,
                suggestedKeywords: r.suggestedKeywords,
                readyToPublish: r.readyToPublish,
                taxonomyLeafId: r.taxonomyLeafId,
              })
              if (r.title) {
                const s = useDemandWorkspaceStore.getState()
                if (!s.fieldOverrides.has('title')) s.toggleLock('title')
              }
              ensure(
                `${r.summary || '已分析需求'}\n\n` +
                  (r.missingInfo?.length
                    ? `还需补充：${r.missingInfo.join('、')}`
                    : r.readyToPublish
                      ? '信息完整，可以发布'
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
        analyzeAndLog({
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
          content: '已综合所有回答更新工作区。',
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
      signal: AbortSignal,
    ) => {
      const res = await fetch('/api/ai/agent-demand-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, thinkMode }),
        signal,
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
                thinkAccRef.current += line
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

      const reasoningContent = thinkMode
        ? thinkAccRef.current || undefined
        : undefined

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
                    reasoningContent,
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
              reasoningContent,
            },
          ])
        }
      } else if (hasAssistantMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, reasoningContent }
              : m,
          ),
        )
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '无法理解，请换个方式描述',
            reasoningContent,
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
        // 新字段
        if (f.regionId) fd.append('regionId', String(f.regionId))
        if (f.tagName) fd.append('tagName', f.tagName)
        if (f.isCertifiedOnly) fd.append('isCertifiedOnly', 'true')
        if (f.amountEstimate)
          fd.append('amountEstimate', String(f.amountEstimate))
        if (f.pushConfig) fd.append('pushConfig', JSON.stringify(f.pushConfig))
        if (f.coverImage) fd.append('coverImage', f.coverImage)
        // AI 2.5 新字段
        if (f.expectedOutcome) fd.append('expectedOutcome', f.expectedOutcome)
        if (f.visibilityWindow !== 15)
          fd.append('visibilityWindow', String(f.visibilityWindow))
        if (f.maxApplicants !== 10)
          fd.append('maxApplicants', String(f.maxApplicants))
        if (f.tags.length > 0) fd.append('tags', f.tags.join(','))
        if (f.tagsConfirmed) fd.append('tagsConfirmed', 'true')
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
    <div className="demand-workspace-codex ws-root internal-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="ws-header">
        <BackButton compact />
        <h1 className="ws-title">需求工作区</h1>
        <div className="ws-actions">
          <button
            type="button"
            className="ws-btn"
            onClick={() => {
              if (messages.length > 0 || workspaceFields.title) {
                if (
                  !window.confirm('确定要清空当前所有内容吗？此操作不可撤销。')
                )
                  return
              }
              abortRef.current?.abort()
              clearDraft()
              useDemandWorkspaceStore.getState().setSpeedMode(true)
            }}
          >
            <Plus className="size-3.5" />
            新建
          </button>
          {workspaceFields.title && (
            <span
              className={cn(
                'ws-chip',
                confidence === 'medium' && 'ws-chip--medium',
                confidence === 'low' && 'ws-chip--low',
              )}
            >
              {confidence === 'high'
                ? '高置信度'
                : confidence === 'medium'
                  ? '中置信度'
                  : '低置信度'}
            </span>
          )}
          <button
            type="button"
            className="ws-btn ws-btn--danger"
            onClick={() => doPublish(true)}
            disabled={forcePublishing || publishing}
          >
            {forcePublishing ? (
              <span className="ws-spinner" style={{ width: 12, height: 12 }} />
            ) : (
              <Zap className="size-3.5" />
            )}
            强制发布
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--primary"
            onClick={() => doPublish()}
            disabled={publishing || forcePublishing}
          >
            {publishing ? (
              <span className="ws-spinner" style={{ width: 12, height: 12, borderTopColor: 'currentColor' }} />
            ) : (
              <Send className="size-3.5" />
            )}
            发布
          </button>
        </div>
      </header>

      <div className="ws-body">
        <section className="ws-chat">
          <motion.div
            ref={scrollRef}
            animate={{ opacity: canvasMode && speedMode ? 0 : 1 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="ws-chat-scroll thin-scroll"
          >
            <div
              className={cn(
                'ws-chat-inner',
                messages.length === 0 && !loading && 'ws-chat-inner--center',
              )}
            >
              {messages.length === 0 && !loading && (
                <div className="ws-empty-hero">
                  <div className="ws-empty-icon">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2 className="ws-empty-title">你想找什么样的服务者？</h2>
                    <p className="ws-empty-desc">
                      用自然语言描述需求，AI 会帮你理清并追问细节
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg, i) => {
                  const isLastMsg = i === messages.length - 1

                  // 用户消息
                  if (msg.role === 'user') {
                    return (
                      <motion.div
                        key={msg.id}
                        className="ws-msg ws-msg--user"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="ws-bubble-user">{msg.content}</div>
                      </motion.div>
                    )
                  }

                  // AI 消息折叠
                  const isCollapsed =
                    !msg.isStreaming && !isLastMsg && !expandedIds.has(msg.id)
                  if (isCollapsed) {
                    return (
                      <motion.div
                        key={msg.id}
                        className="ws-msg"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => new Set([...prev, msg.id]))
                          }
                          className="ws-collapsed"
                        >
                          {msg.content.slice(0, 80)}
                          {msg.content.length > 80 ? '…' : ''}
                        </button>
                      </motion.div>
                    )
                  }

                  // AI 消息展开
                  return (
                    <motion.div
                      key={msg.id}
                      className="ws-msg"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {!isLastMsg && !msg.isStreaming && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => {
                              const next = new Set(prev)
                              next.delete(msg.id)
                              return next
                            })
                          }
                          className="ws-collapse-toggle"
                        >
                          收起 ↑
                        </button>
                      )}
                      {msg.isStreaming && !msg.content ? (
                        <span className="ws-bubble-ai" style={{ fontStyle: 'italic', color: 'var(--ws-text-muted)' }}>
                          填写中...
                        </span>
                      ) : (
                        <div
                          className="ws-bubble-ai"
                          dangerouslySetInnerHTML={{
                            __html:
                              formatAIText(msg.content) +
                              (msg.isStreaming ? '<span class="ai-cursor"></span>' : ''),
                          }}
                        />
                      )}

                      {msg.toolCall && (
                        <div className="ws-tool-confirm">
                          <div className="ws-tool-confirm-head">
                            <Check className="size-3.5" />
                            <span>AI 已确认信息完整，可以发布</span>
                          </div>
                          <div className="ws-kv-grid">
                            {msg.toolCall.arguments.title && (
                              <div className="ws-kv">
                                <span>标题</span>
                                <p>{msg.toolCall.arguments.title}</p>
                              </div>
                            )}
                            {msg.toolCall.arguments.serviceType && (
                              <div className="ws-kv">
                                <span>服务类型</span>
                                <p className="inline-flex items-center gap-1">
                                  {msg.toolCall.arguments.serviceType === 'ONLINE' ? (
                                    <Monitor className="size-3" />
                                  ) : (
                                    <MapPin className="size-3" />
                                  )}
                                  {msg.toolCall.arguments.serviceType === 'ONLINE' ? '线上' : '线下'}
                                </p>
                              </div>
                            )}
                            {msg.toolCall.arguments.budget && (
                              <div className="ws-kv">
                                <span>预算</span>
                                <p>{msg.toolCall.arguments.budget}</p>
                              </div>
                            )}
                            {msg.toolCall.arguments.schedule && (
                              <div className="ws-kv">
                                <span>时间</span>
                                <p>{msg.toolCall.arguments.schedule}</p>
                              </div>
                            )}
                            {msg.toolCall.arguments.category && (
                              <div className="ws-kv" style={{ gridColumn: 'span 2' }}>
                                <span>分类</span>
                                <p>{msg.toolCall.arguments.category}</p>
                              </div>
                            )}
                          </div>
                          {msg.toolCall.arguments.description && (
                            <div className="ws-kv" style={{ marginBottom: 12 }}>
                              <span>详细描述</span>
                              <p>{msg.toolCall.arguments.description}</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePublishFromChat(msg.toolCall!)}
                            disabled={publishing}
                            className="ws-btn ws-btn--primary"
                          >
                            {publishing ? (
                              <span className="ws-spinner" style={{ width: 12, height: 12, borderTopColor: 'currentColor' }} />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                            确认发布
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {loading &&
                !messages.some(
                  (m) => m.role === 'assistant' && m.isStreaming,
                ) && (
                  <div className="ws-loading">
                    <span className="ws-spinner" />
                    <span>AI 分析中…</span>
                  </div>
                )}
            </div>
          </motion.div>

          <div className="ws-composer-wrap">
            <div className="ws-composer-inner">
              {isThinkMode && (loading || thinkText) && (
                <ThinkingPanel
                  text={thinkText}
                  isLoading={loading}
                  collapsed={thinkCollapsed}
                  onToggleCollapse={() => setThinkCollapsed(!thinkCollapsed)}
                />
              )}
              <PromptInputBox
                variant="codex"
                onThinkChange={setIsThinkMode}
                onSend={(message) => sendMessage(message)}
                isLoading={loading}
                onAbort={() => abortRef.current?.abort()}
                enableSpeed
                speedMode={speedMode}
                onSpeedChange={(on) =>
                  useDemandWorkspaceStore.getState().setSpeedMode(on)
                }
                onCanvasChange={setCanvasMode}
                onPublish={doPublish}
                placeholder="说点什么？"
                value={draftInput}
                onInputChange={setDraftInput}
              />
            </div>
          </div>
        </section>

        <section
          className={cn(
            'ws-workspace thin-scroll',
            canvasMode && 'ws-workspace--canvas',
          )}
        >
          <div
            className={cn(
              'ws-workspace-inner',
              canvasMode && 'ws-workspace-inner--canvas',
            )}
          >
            {canvasMode ? (
              <div className="ws-canvas-wrap">
                <div className="ws-canvas-scaler">
                  <CanvasCardBack fields={workspaceFields} />
                </div>
              </div>
            ) : messages.length === 0 && !workspaceFields.title ? (
              <div className="ws-workspace-empty">
                <div className="ws-empty-icon ws-empty-icon--sm">
                  <Sparkles className="size-5" />
                </div>
                <p className="ws-empty-desc" style={{ marginTop: 16 }}>
                  在左侧描述你的需求，AI 会同步整理到这里
                </p>
              </div>
            ) : (
              <div className="ws-stack">
                <WorkspaceSummary />
                <WorkspaceFields />
                <WorkspaceTools />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

/** Canvas 模式卡牌 —— 3D 翻转：正面封面 + 背面 InfoCard */
function CanvasCardBack({
  fields,
}: {
  fields: ReturnType<typeof useDemandWorkspaceStore.getState>['fields']
}) {
  const [flipped, setFlipped] = useState(true)
  const manualRef = useRef(false)
  const currentUser = useUserStore((s) => s.user)
  const coverUrl =
    currentUser?.coverUrl || publisherUserCoverPreset(currentUser?.id)
  const title = fields.title || '标题待写入…'
  const description = fields.description || '描述内容将随输入同步写入卡牌背面…'
  const budgetNum = parseBudgetStr(fields.budget)
  const priceStr = budgetNum > 0 ? `¥${budgetNum.toLocaleString()}` : '¥?'

  const handleFlip = () => {
    manualRef.current = true
    setFlipped((v) => !v)
  }

  return (
    <div
      className="ws-canvas-card relative cursor-pointer select-none rounded-3xl"
      style={{ perspective: '1400px' }}
      onClick={handleFlip}
    >
      {/* 翻转层 */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transformOrigin: '50% 50%',
          transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 正面：封面图 + 标题色条（价格驱动 shimmer 颜色） */}
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg) translateZ(0)',
          }}
        >
          <img
            src={publisherUserCoverPreset(undefined)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 z-10 flex min-h-0 flex-col pt-16">
            <div
              className={cn(
                'relative shrink-0 flex w-full justify-center overflow-hidden px-4 backdrop-blur-sm [text-rendering:optimizeLegibility]',
                budgetNum > 0
                  ? budgetNum > 10000
                    ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--rainbow'
                    : budgetNum > 3000
                      ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--gold'
                      : budgetNum > 1000
                        ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--red'
                        : budgetNum > 500
                          ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--orange'
                          : budgetNum > 100
                            ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--violet'
                            : budgetNum > 10
                              ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--blue'
                              : 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--green'
                  : 'bg-black/40',
              )}
              style={{ paddingTop: 16, paddingBottom: 16 }}
            >
              <h3 className="relative z-10 m-0 w-full text-center text-[22px] font-bold leading-tight tracking-tight text-white [text-shadow:none]">
                {title}
              </h3>
            </div>
          </div>
        </div>

        {/* 背面：InfoCard */}
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(2px)',
          }}
        >
          <InfoCard
            fillContainer
            descriptionMode="scroll"
            shellBorderRadius="1.5rem"
            image={coverUrl || publisherUserCoverPreset(undefined)}
            imageAlt={title}
            title={title}
            description={description}
            borderColor="var(--ic-border-1)"
            borderBgColor="var(--ic-border-bg)"
            cardBgColor="var(--ic-card-bg)"
            textColor="var(--ic-text)"
            hoverTextColor="var(--ic-hover-text-1)"
            fontFamily="var(--font-family)"
            rtlFontFamily="var(--font-family)"
            effectBgColor="var(--ic-border-1)"
            patternColor1="var(--ic-pattern-1)"
            patternColor2="var(--ic-pattern-2)"
            contentPadding="14.3px 16px"
          />
          {/* 底部价格 */}
          <div className="pointer-events-none absolute bottom-5 left-4 z-20">
            <span className="flip-card-back-price text-3xl font-extrabold leading-none [text-shadow:none]">
              {priceStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseBudgetStr(budget: string): number {
  if (!budget) return 0
  const n = Number(budget.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 从预算字符串中提取最小价格数字 */
function extractMinPrice(budget: string): number {
  const nums = budget.match(/\d+/g)
  if (!nums || nums.length === 0) return 1
  return Math.min(...nums.map(Number))
}
