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
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')

  // 按双换行分段
  const paragraphs = html.split(/\n\n+/)
  return paragraphs
    .map((p) => {
      const trimmed = p.trim()
      if (!trimmed) return ''

      // 检测有序列表（每行以数字+点号开头）
      const lines = trimmed.split('\n')
      const isOrderedList = lines.every((l) => /^\d+[\.\)]\s/.test(l.trim()))
      if (isOrderedList && lines.length > 1) {
        const items = lines
          .map((l) => `<li>${l.trim().replace(/^\d+[\.\)]\s*/, '')}</li>`)
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
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400/60">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
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
          className="px-4 pb-3 text-sm text-purple-600/60 dark:text-purple-300/50 leading-relaxed whitespace-pre-wrap font-mono max-h-[80px] overflow-y-auto"
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
  const [canvasMode, setCanvasMode] = useState(false)
  const thinkAccRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [publishing, setPublishing] = useState(false)
  const [forcePublishing, setForcePublishing] = useState(false)
  const [draftInput, setDraftInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 注入 AI 光标动画样式
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .ai-cursor {
        display: inline-block;
        width: 2px;
        height: 1.1em;
        background: #a78bfa;
        margin-left: 1px;
        vertical-align: text-bottom;
        animation: ai-cursor-blink 1s step-end infinite;
      }
      @keyframes ai-cursor-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

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
  const handleAggressiveModeRef = useRef<(text: string, signal: AbortSignal) => Promise<void>>(
    undefined as any,
  )
  const handleCanvasModeRef = useRef<(text: string, signal: AbortSignal) => Promise<void>>(
    undefined as any,
  )
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
              content: `📝 已记录答案。还有 ${remaining} 项待回答，请继续输入。`,
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
      if (data.serviceType) parts.push(`类型：${data.serviceType === 'ONLINE' ? '线上' : '线下'}`)
      if (data.budget) parts.push(`预算：${data.budget}`)
      if (data.schedule) parts.push(`时间：${data.schedule}`)
      if (data.category) parts.push(`分类：${data.category}`)
      if (data.summary && !data.title) parts.push(data.summary)
      if (parts.length > 0) {
        setMessages((prev) => [
          ...prev,
          { id: newMsgId(), role: 'assistant', content: `📋 ${parts.join(' · ')}` },
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
          content: '⚡ 正在生成需求草稿…',
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
                    content: '⚡ 已生成需求草稿，确认无误后发布',
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
              ? { ...m, content: '⚡ 分析异常，请重试', isStreaming: false }
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
        if (f.amountEstimate) fd.append('amountEstimate', String(f.amountEstimate))
        if (f.pushConfig) fd.append('pushConfig', JSON.stringify(f.pushConfig))
        if (f.coverImage) fd.append('coverImage', f.coverImage)
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
    <div className="demand-create-root min-h-screen flex flex-col relative overflow-x-hidden">
      <div className="hidden gap-[10rem] rotate-[-20deg] absolute top-[-40rem] right-[-30rem] z-[0] blur-[5rem] skew-[-40deg] opacity-40">
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-purple-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-blue-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-violet-400" />
      </div>
      <div className="hidden gap-[10rem] rotate-[-20deg] absolute top-[-50rem] right-[-50rem] z-[0] blur-[5rem] skew-[-40deg] opacity-30">
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-purple-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-blue-400" />
        <div className="w-[10rem] h-[20rem] bg-linear-90 from-white to-violet-400" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-bg-card text-text-muted hover:border-border hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-muted tracking-wide">
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
              abortRef.current?.abort()
              clearDraft()
              useDemandWorkspaceStore.getState().setSpeedMode(true)
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-card px-2.5 py-1 text-sm text-text-muted hover:border-border hover:text-text-secondary transition-all"
          >
            <Plus className="size-3" />
            新建
          </button>
        </div>
        <div className="flex items-center gap-2">
          {workspaceFields.title && (
            <span
              className={`rounded-full px-2.5 py-1 text-sm font-medium ${
                confidence === 'high'
                  ? 'bg-emerald-500/10 text-emerald-400/70'
                  : confidence === 'medium'
                    ? 'bg-amber-500/10 text-amber-400/70'
                    : 'bg-red-500/10 text-red-400/70'
              }`}
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
            onClick={() => doPublish(true)}
            disabled={forcePublishing || publishing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-sm font-medium text-red-600 dark:text-red-300/70 hover:border-red-500/30 hover:bg-red-500/[0.10] disabled:opacity-30 transition-all"
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
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
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
        <div className="flex w-[42%] min-w-0 shrink-0 flex-col border-r border-border">
          <motion.div
            ref={scrollRef}
            animate={{ opacity: canvasMode && speedMode ? 0 : 1 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex-1 overflow-y-auto thin-scroll"
            style={{ padding: '0 1rem', scrollbarGutter: 'stable' }}
          >
            <div
              className={`w-full max-w-xl mx-auto space-y-4 ${messages.length === 0 ? 'flex flex-col justify-center h-full' : 'py-6'}`}
            >
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-bg-card border border-border">
                    <Sparkles className="size-7 text-purple-500 dark:text-purple-400/60" />
                  </div>
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-text-primary">
                      你想找什么样的服务者？
                    </h1>
                    <p className="text-sm text-text-muted mt-2">
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex justify-end">
                          <div className="max-w-[99%] rounded-sm border border-border bg-bg-card px-4 py-3">
                            <span className="text-sm text-text-primary">
                              {msg.content}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  }

                  // AI 消息折叠
                  const isCollapsed = !msg.isStreaming && !isLastMsg && !expandedIds.has(msg.id)
                  if (isCollapsed) {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedIds((prev) => new Set([...prev, msg.id]))}
                          className="py-1 text-left w-full hover:bg-bg-secondary/30 rounded-sm px-1 -mx-1 transition-colors"
                        >
                          <span className="text-sm text-text-muted line-clamp-1">
                            {msg.content.slice(0, 80)}
                            {msg.content.length > 80 ? '…' : ''}
                          </span>
                        </button>
                      </motion.div>
                    )
                  }

                  // AI 消息展开
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="py-1">
                        {!isLastMsg && !msg.isStreaming && (
                          <div className="flex justify-end mb-1">
                            <button
                              type="button"
                              onClick={() => setExpandedIds((prev) => {
                                const next = new Set(prev)
                                next.delete(msg.id)
                                return next
                              })}
                              className="text-xs text-text-muted hover:text-text-secondary"
                            >
                              收起 ↑
                            </button>
                          </div>
                        )}
                        {msg.isStreaming && !msg.content ? (
                          <span className="text-sm text-text-muted italic">
                            填写中...
                          </span>
                        ) : (
                          <div
                            className={`text-sm text-text-primary`}
                            dangerouslySetInnerHTML={{
                              __html:
                                formatAIText(msg.content) +
                                (msg.isStreaming
                                  ? '<span class="ai-cursor"></span>'
                                  : ''),
                            }}
                          />
                        )}

                        {msg.toolCall && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 mb-3 text-sm text-emerald-400/80">
                              <Check className="size-3.5" />
                              <span>AI 已确认信息完整，可以发布</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                              {msg.toolCall.arguments.title && (
                                <div className="rounded-lg bg-bg-secondary px-3 py-2">
                                  <span className="text-text-muted">标题</span>
                                  <p className="text-text-secondary mt-0.5">
                                    {msg.toolCall.arguments.title}
                                  </p>
                                </div>
                              )}
                              {msg.toolCall.arguments.serviceType && (
                                <div className="rounded-lg bg-bg-secondary px-3 py-2">
                                  <span className="text-text-muted">服务类型</span>
                                  <p className="text-text-secondary mt-0.5 inline-flex items-center gap-1">
                                    {msg.toolCall.arguments.serviceType === 'ONLINE' ? (
                                      <Monitor className="size-3 text-blue-400/60" />
                                    ) : (
                                      <MapPin className="size-3 text-orange-400/60" />
                                    )}
                                    {msg.toolCall.arguments.serviceType === 'ONLINE' ? '线上' : '线下'}
                                  </p>
                                </div>
                              )}
                              {msg.toolCall.arguments.budget && (
                                <div className="rounded-lg bg-bg-secondary px-3 py-2">
                                  <span className="text-text-muted">预算</span>
                                  <p className="text-text-secondary mt-0.5">{msg.toolCall.arguments.budget}</p>
                                </div>
                              )}
                              {msg.toolCall.arguments.schedule && (
                                <div className="rounded-lg bg-bg-secondary px-3 py-2">
                                  <span className="text-text-muted">时间</span>
                                  <p className="text-text-secondary mt-0.5">{msg.toolCall.arguments.schedule}</p>
                                </div>
                              )}
                              {msg.toolCall.arguments.category && (
                                <div className="rounded-lg bg-bg-secondary px-3 py-2">
                                  <span className="text-text-muted">分类</span>
                                  <p className="text-text-secondary mt-0.5">{msg.toolCall.arguments.category}</p>
                                </div>
                              )}
                            </div>
                            {msg.toolCall.arguments.description && (
                              <div className="rounded-lg bg-bg-secondary px-3 py-2 mb-3 text-sm">
                                <span className="text-text-muted">详细描述</span>
                                <p className="text-text-secondary mt-0.5">{msg.toolCall.arguments.description}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePublishFromChat(msg.toolCall!)}
                              disabled={publishing}
                              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
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
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {loading &&
                !messages.some(
                  (m) => m.role === 'assistant' && m.isStreaming,
                ) && (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <span className="inline-block size-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <span className="text-sm text-text-muted">AI 分析中…</span>
                  </div>
                )}
            </div>
          </motion.div>

          {/* 输入区域 */}
          <div className="shrink-0 px-4 py-3">
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
        </div>

        {/* 右栏：工作区 / Canvas 卡牌背面 */}
        <div className="flex-1 min-w-0 overflow-y-auto thin-scroll">
          <div className="w-full max-w-lg mx-auto py-6 px-6">
            {canvasMode ? (
                <div className="flex items-start justify-center pt-12">
                  <CanvasCardBack fields={workspaceFields} />
                </div>
              ) : messages.length === 0 && !workspaceFields.title ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-bg-card border border-border mb-4">
                    <Sparkles className="size-6 text-text-muted/60" />
                  </div>
                  <p className="text-sm text-text-muted max-w-48 leading-relaxed">
                    在左侧描述你的需求，AI 会同步整理到这里
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <WorkspaceSummary />
                  <WorkspaceFields />
                  <WorkspaceTools />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Canvas 模式卡牌 —— 3D 翻转：正面封面 + 背面 InfoCard */
function CanvasCardBack({ fields }: { fields: ReturnType<typeof useDemandWorkspaceStore.getState>['fields'] }) {
  const [flipped, setFlipped] = useState(true)
  const manualRef = useRef(false)
  const currentUser = useUserStore((s) => s.user)
  const coverUrl = currentUser?.coverUrl || publisherUserCoverPreset(currentUser?.id)
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
      className="relative aspect-[9/16] w-[min(440px,90%)] max-w-full shrink-0 cursor-pointer select-none rounded-3xl"
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
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg) translateZ(0)' }}
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
                  ? budgetNum > 10000 ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--rainbow'
                  : budgetNum > 3000 ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--gold'
                  : budgetNum > 1000 ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--red'
                  : budgetNum > 500 ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--orange'
                  : budgetNum > 100 ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--violet'
                  : budgetNum > 10 ? 'flip-card-title-bar-shimmer flip-card-title-bar-shimmer--blue'
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
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(2px)' }}
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
