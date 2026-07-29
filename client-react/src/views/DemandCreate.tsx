import { useState, useRef, useCallback, useEffect } from 'react'
import '@/styles/demand-workspace.css'
import { useNavigate, NavLink, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { toast, ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AgentMarkdown } from '@/components/agent/agent-markdown'
import { PromptInputBox } from '@/components/ui/prompt-input-box'
import { WorkspaceSummary } from '@/components/demand/WorkspaceSummary'
import { WorkspaceFields } from '@/components/demand/WorkspaceFields'
import { WorkspaceTools } from '@/components/demand/WorkspaceTools'
import { DemandSessionHistory } from '@/components/demand/DemandSessionHistory'
import { useDemandWorkspaceStore } from '@/stores/demand-workspace'
import { useUserStore } from '@/stores/user'
import { InfoCard } from '@/components/ui/info-card'
import { DisplayCoverPicture } from '@/components/ui/display-cover-picture'
import {
  publisherUserCoverPreset,
  resolveDemandCardCoverDetailUrl,
  resolveProfileBackCoverUrl,
} from '@/utils/user-cover-presets'
import {
  createEmptyDemandSession,
  deleteDemandSession,
  getActiveSessionId,
  getDemandSession,
  listDemandSessions,
  migrateLegacyDraftIfNeeded,
  setActiveSessionId,
  upsertDemandSession,
  type DemandChatMessage,
  type DemandSessionSnapshot,
} from '@/utils/demand-session-history'
import { BackButton } from '@/components/ui/back-button'
import { flushSseBuffer, splitSseBuffer } from '@/utils/parse-sse'
import {
  isDemandReadyToPublish,
  validateDemandForPublish,
} from '@/utils/demand-publish'
import { serviceCardApi } from '@/api/service-card'
import { normalizeAnalyzePayload } from '@/types/demand-analyze'
import { extractDemandAnalyzeResult } from '@/utils/demand-extract'
import {
  Sparkles,
  Monitor,
  MapPin,
  Send,
  Brain,
  Check,
  Plus,
  ChevronDown,
} from 'lucide-react'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

let _msgId = 0
const newMsgId = () => `dc${++_msgId}`

type ChatMsg = DemandChatMessage

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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [text])

  if (!text) return null

  return (
    <div className="ws-thinking">
      <LiquidMetalButton
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
      </LiquidMetalButton>
      {!collapsed && (
        <div ref={scrollRef} className="ws-thinking-body whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  )
}

export default function DemandCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isServiceMode = searchParams.get('mode') === 'service'
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
  const [draftInput, setDraftInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSessionIdRef = useRef<string | null>(null)
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(
    null,
  )
  const [sessionsTick, setSessionsTick] = useState(0)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const workspaceFields = useDemandWorkspaceStore((s) => s.fields)
  const confidence = useDemandWorkspaceStore((s) => s.confidence)
  const speedMode = useDemandWorkspaceStore((s) => s.speedMode)
  const applyAgent = useDemandWorkspaceStore((s) => s.applyAgentResult)
  const applyAnalyze = useDemandWorkspaceStore((s) => s.applyAnalyzeResult)
  const resetWorkspace = useDemandWorkspaceStore((s) => s.reset)

  const bumpSessions = useCallback(() => {
    setSessionsTick((t) => t + 1)
  }, [])

  const applySessionSnapshot = useCallback((session: DemandSessionSnapshot) => {
    if (session.messages?.length) {
      setMessages(
        session.messages.map((m) => ({ ...m, isStreaming: false })),
      )
      _msgId = session.messages.length + 1
    } else {
      setMessages([])
      _msgId = 0
    }
    setDraftInput(session.input || '')
    useDemandWorkspaceStore.setState({
      fields: session.fields,
      fieldOverrides: new Set(session.fieldOverrides || []),
      lockedKeywords: new Set(session.lockedKeywords || []),
      missingInfo: session.missingInfo || [],
      missingQueue: session.missingQueue || [],
      answeredQueue: session.answeredQueue || [],
      resolvedQueue: session.resolvedQueue || [],
      missingAnswers: session.missingAnswers || {},
      confidence: session.confidence || 'low',
      readyToPublish: session.readyToPublish || false,
      speedMode: session.speedMode === true,
    })
  }, [])

  const persistActiveSession = useCallback(() => {
    const id = activeSessionIdRef.current
    if (!id) return
    const store = useDemandWorkspaceStore.getState()
    upsertDemandSession({
      id,
      messages: messagesRef.current.map((m) => ({ ...m, isStreaming: false })),
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
      speedMode: store.speedMode,
    })
    bumpSessions()
  }, [draftInput, bumpSessions])

  // ========== 会话持久化 ==========

  const saveDraft = useCallback(() => {
    persistActiveSession()
  }, [persistActiveSession])

  const loadSessionById = useCallback(
    (id: string) => {
      if (id === activeSessionIdRef.current) return
      persistActiveSession()
      const session = getDemandSession(id)
      if (!session) return
      abortRef.current?.abort()
      activeSessionIdRef.current = id
      setActiveSessionIdState(id)
      setActiveSessionId(id)
      applySessionSnapshot(session)
      bumpSessions()
    },
    [applySessionSnapshot, bumpSessions, persistActiveSession],
  )

  const handleDeleteSession = useCallback(
    (id: string) => {
      const nextActive = deleteDemandSession(id)
      if (id === activeSessionIdRef.current) {
        abortRef.current?.abort()
        if (nextActive) {
          const session = getDemandSession(nextActive)
          if (session) {
            activeSessionIdRef.current = nextActive
            setActiveSessionIdState(nextActive)
            setActiveSessionId(nextActive)
            applySessionSnapshot(session)
          }
        } else {
          const session = createEmptyDemandSession()
          activeSessionIdRef.current = session.id
          setActiveSessionIdState(session.id)
          applySessionSnapshot(session)
        }
      }
      bumpSessions()
    },
    [applySessionSnapshot, bumpSessions],
  )

  const clearDraft = useCallback(() => {
    persistActiveSession()
    abortRef.current?.abort()
    const session = createEmptyDemandSession()
    activeSessionIdRef.current = session.id
    setActiveSessionIdState(session.id)
    setMessages([])
    setDraftInput('')
    _msgId = 0
    resetWorkspace()
    useDemandWorkspaceStore.getState().setSpeedMode(false)
    bumpSessions()
    toast(isServiceMode ? '已清空，开始新的服务卡' : '已清空，开始新的需求', 'success')
  }, [isServiceMode, persistActiveSession, resetWorkspace, bumpSessions])

  // 挂载时恢复活跃会话
  useEffect(() => {
    if (isServiceMode) {
      activeSessionIdRef.current = null
      setActiveSessionIdState(null)
      setMessages([])
      setDraftInput('')
      resetWorkspace()
      return
    }
    migrateLegacyDraftIfNeeded()
    let activeId = getActiveSessionId()
    let session = activeId ? getDemandSession(activeId) : null
    if (!session) {
      const existing = listDemandSessions()
      if (existing.length > 0) {
        session = existing[0]
        activeId = session.id
        setActiveSessionId(activeId)
      } else {
        session = createEmptyDemandSession()
        activeId = session.id
      }
    }
    activeSessionIdRef.current = activeId
    setActiveSessionIdState(activeId)
    setActiveSessionId(activeId)
    applySessionSnapshot(session)
    if (session.messages.length > 0 || session.fields.title) {
      toast('已恢复上次未完成的草稿', 'success')
    }
  }, [isServiceMode, resetWorkspace]) // eslint-disable-line react-hooks/exhaustive-deps

  // 状态变化时自动保存（1s 防抖；卸载或依赖切换时立即落盘）
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(saveDraft, 1000)
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      saveDraft()
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
          content: `正在生成${isServiceMode ? '服务卡' : '需求'}草稿…`,
          isStreaming: true,
        },
      ])

      try {
        const res = await fetch('/api/ai/analyze-demand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND' }),
          signal,
        })
        if (!res.ok) throw new Error('分析失败')
        const json = await res.json()

        if (json.data) {
          analyzeAndLog(normalizeAnalyzePayload(json.data))
          const ready = isDemandReadyToPublish(
            useDemandWorkspaceStore.getState().fields,
          )
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: ready
                      ? `已生成${isServiceMode ? '服务卡' : '需求'}草稿，确认无误后发布`
                      : '已生成草稿，请先在右侧工作区补全必填项',
                    isStreaming: false,
                  }
                : m,
            ),
          )
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e
        // AI 不可用：本地规则兜底，保证仍能出草稿
        const local = extractDemandAnalyzeResult(text, {
          mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
        })
        analyzeAndLog(local)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'AI 暂不可用，已用本地规则整理草稿，请在右侧核对后发布',
                  isStreaming: false,
                }
              : m,
          ),
        )
      }
    },
    [analyzeAndLog, isServiceMode],
  )

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
          mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
        }),
        signal,
      })
      if (!res.ok || !res.body) {
        const local = extractDemandAnalyzeResult(text, {
          mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
        })
        analyzeAndLog(local)
        setMessages((prev) => [
          ...prev,
          {
            id: newMsgId(),
            role: 'assistant',
            content:
              'AI 暂不可用，已用本地规则整理草稿，请在右侧核对后发布',
          },
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

      const processResultEvent = (eventType: string, data: string) => {
        if (eventType !== 'result') return
        try {
          const r = normalizeAnalyzePayload(JSON.parse(data) as Record<string, unknown>)
          analyzeAndLog({
            ...r,
            missingInfo: r.missingInfo ?? [],
          })
          if (r.title) {
            const s = useDemandWorkspaceStore.getState()
            if (!s.fieldOverrides.has('title')) s.toggleLock('title')
          }
          const ready = isDemandReadyToPublish(
            useDemandWorkspaceStore.getState().fields,
          )
          ensure(
                            `${r.summary || `已分析${isServiceMode ? '服务卡' : '需求'}`}\n\n` +
              (r.missingInfo?.length
                ? `还需补充：${r.missingInfo.join('、')}`
                : ready
                  ? '信息完整，可以发布'
                  : '请先在右侧工作区补全必填项'),
          )
        } catch {
          /* skip */
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const { events, remainder } = splitSseBuffer(buf)
        buf = remainder
        for (const evt of events) {
          processResultEvent(evt.type, evt.data)
        }
      }
      for (const evt of flushSseBuffer(buf)) {
        processResultEvent(evt.type, evt.data)
      }

      if (!hasMsg) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '分析未完成，请重试',
            isStreaming: false,
          },
        ])
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        )
      }
    },
    [analyzeAndLog, isServiceMode],
  )

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
        body: JSON.stringify({ text: prompt, mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND' }),
      })
      if (!res.ok) {
        store.resolveAllAnswered() // 仍然清除 answeredQueue，避免卡住
        const local = extractDemandAnalyzeResult(
          `${qaPairs}\n${confirmed}`,
          { mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND' },
        )
        analyzeAndLog(local)
        setMessages((prev) => [
          ...prev,
          {
            id: newMsgId(),
            role: 'assistant',
            content: 'AI 暂不可用，已用本地规则更新工作区，请核对右侧字段',
          },
        ])
        return
      }
      const json = await res.json()
      if (json.data) {
        analyzeAndLog(normalizeAnalyzePayload(json.data))
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
      const local = extractDemandAnalyzeResult(prompt, {
        mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
      })
      analyzeAndLog(local)
      setMessages((prev) => [
        ...prev,
        {
          id: newMsgId(),
          role: 'assistant',
          content: '网络异常，已用本地规则更新工作区，请核对右侧字段',
        },
      ])
    }
  }, [analyzeAndLog, isServiceMode])

  /** 根据对话历史静默同步右侧工作区（默认 Agent 模式用，后台执行） */
  const syncWorkspaceFromConversation = useCallback(
    async (
      history: { role: string; content: string }[],
      signal?: AbortSignal,
    ) => {
      const userText = history
        .filter((m) => m.role === 'user' && m.content.trim())
        .map((m) => m.content.trim())
        .join('\n')
      if (!userText) return

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

      try {
        const res = await fetch('/api/ai/analyze-demand-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            requirementState,
            thinkMode: false,
            mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
          }),
          signal,
        })
        if (!res.ok || !res.body) {
          applyAnalyze(
            extractDemandAnalyzeResult(userText, {
              mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
            }),
          )
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        const applyResult = (data: string) => {
          try {
            const r = normalizeAnalyzePayload(
              JSON.parse(data) as Record<string, unknown>,
            )
            applyAnalyze(r)
          } catch {
            /* skip */
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const { events, remainder } = splitSseBuffer(buf)
          buf = remainder
          for (const evt of events) {
            if (evt.type === 'result') applyResult(evt.data)
          }
        }
        for (const evt of flushSseBuffer(buf)) {
          if (evt.type === 'result') applyResult(evt.data)
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e
        applyAnalyze(
          extractDemandAnalyzeResult(userText, {
            mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND',
          }),
        )
        toast('AI 同步失败，已用本地规则更新工作区', 'error')
      }
    },
    [applyAnalyze, isServiceMode],
  )

  /** 默认 / Think 模式：Agent 对话 */
  const handleDefaultMode = useCallback(
    async (
      history: { role: 'user' | 'assistant'; content: string }[],
      thinkMode: boolean,
      signal: AbortSignal,
    ) => {
      void syncWorkspaceFromConversation(history, signal).catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        toast('工作区同步失败，右侧字段可能未更新', 'error')
      })

      const res = await fetch('/api/ai/agent-demand-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, thinkMode, mode: isServiceMode ? 'SERVICE_CARD' : 'DEMAND' }),
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

      const pendingToolArgs: Record<string, string> = {}
      let toolName = ''

      const handleSseEvent = (eventType: string, data: string) => {
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
          return
        }
        if (eventType === 'text') {
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
          return
        }
        if (eventType === 'tool_call') {
          try {
            const parsed = JSON.parse(data)
            toolName = parsed.name || toolName
            Object.assign(pendingToolArgs, parsed.arguments ?? {})
          } catch {
            /* skip */
          }
          return
        }
        if (eventType === 'error') {
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const { events, remainder } = splitSseBuffer(buf)
        buf = remainder
        for (const evt of events) {
          handleSseEvent(evt.type, evt.data)
        }
      }
      for (const evt of flushSseBuffer(buf)) {
        handleSseEvent(evt.type, evt.data)
      }

      if (Object.keys(pendingToolArgs).length > 0) {
        applyAgent(pendingToolArgs)
        toolCall = {
          name: toolName || 'submit_demand',
          arguments: pendingToolArgs,
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
    [applyAgent, isServiceMode, syncWorkspaceFromConversation],
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

      const currentSpeedMode = useDemandWorkspaceStore.getState().speedMode

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

      const queuedMissing = useDemandWorkspaceStore.getState().missingQueue
      if (queuedMissing.length > 0) {
        const allDone = useDemandWorkspaceStore
          .getState()
          .recordAnswerAndAdvance(text)
        if (allDone) {
          await handleMissingInfoBatchAnalysis()
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
          await handleCanvasMode(text, ctrl.signal)
        } else if (isThink) {
          await handleDefaultMode(history, true, ctrl.signal)
        } else if (currentSpeedMode) {
          await handleAggressiveMode(text, ctrl.signal)
        } else {
          await handleDefaultMode(history, false, ctrl.signal)
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
    [
      handleAggressiveMode,
      handleCanvasMode,
      handleDefaultMode,
      handleMissingInfoBatchAnalysis,
    ],
  )

  const doPublish = useCallback(async () => {
    saveDraft()
    const f = useDemandWorkspaceStore.getState().fields
    if (isServiceMode) {
      if (!f.title.trim() || !f.description.trim() || !f.category.trim()) {
        toast('服务卡至少需要标题、服务说明和服务类别', 'error')
        return
      }
      const prices = (f.budget.match(/\d+(?:\.\d+)?/g) || []).map(Number)
      try {
        const card = await serviceCardApi.create({
          title: f.title.trim(),
          summary: f.description.trim().slice(0, 240),
          description: f.description.trim(),
          category: f.category.trim(),
          serviceType: f.serviceType || 'ONLINE',
          regionId: f.regionId,
          paths: f.scopeLabels,
          tags: [...new Set([...f.tags, ...f.aiTags, ...f.suggestedKeywords])],
          priceMin: prices[0],
          priceMax: prices[1] ?? prices[0],
          priceUnit: f.budget.includes('小时') ? '按小时' : f.budget.includes('次') ? '按次' : undefined,
          deliveryMode: f.schedule.trim() || '按双方约定',
          claims: f.scopeLabels.map((label) => ({ label })),
        })
        toast('服务卡草稿已保存', 'success')
        navigate(`/service-cards/${card.id}`)
      } catch (error: any) {
        toast(error?.response?.data?.message || '服务卡保存失败，请重试', 'error')
      }
      return
    }
    const issues = validateDemandForPublish(f)
    if (issues.length > 0) {
      toast(issues.map((i) => i.message).join('；'), 'error')
      return
    }
    navigate('/demands/create/paths')
  }, [isServiceMode, navigate, saveDraft])

  const handlePublishFromChat = useCallback(
    (toolCall: NonNullable<ChatMsg['toolCall']>) => {
      const store = useDemandWorkspaceStore.getState()
      if (isDemandReadyToPublish(store.fields)) {
        return doPublish()
      }
      applyAgent(toolCall.arguments)
      if (isDemandReadyToPublish(useDemandWorkspaceStore.getState().fields)) {
        doPublish()
      } else {
        toast('信息尚不完整，请先在右侧工作区补全必填项', 'error')
      }
    },
    [doPublish, applyAgent],
  )

  return (
    <div className="demand-workspace-codex ws-root internal-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="ws-header">
        <BackButton compact />
        <h1 className="ws-title">{isServiceMode ? '服务卡工作区' : '需求工作区'}</h1>
        <div className="ws-actions">
          <DemandSessionHistory
            activeId={activeSessionId}
            sessionsTick={sessionsTick}
            onSelect={loadSessionById}
            onDelete={handleDeleteSession}
          />
          <LiquidMetalButton
            type="button"
            className="ws-btn"
            onClick={() => {
              if (messages.length > 0 || workspaceFields.title) {
                setConfirmClearOpen(true)
                return
              }
              clearDraft()
            }}
          >
            <Plus className="size-3.5" />
            新建
          </LiquidMetalButton>
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
          <LiquidMetalButton
            type="button"
            className="ws-btn ws-btn--primary"
            onClick={() => doPublish()}
          >
            <Send className="size-3.5" />
            发布
          </LiquidMetalButton>
        </div>
      </header>

      {/* 次要入口：看看可直接使用的服务（自然回 offering，不改需求主路径 / 宪法 #5） */}
      <div className="mx-3 mb-2 flex items-center gap-1 text-[13px] text-[var(--text-secondary)]">
        <Sparkles className="size-3.5 text-[var(--accent-color)]" />
                    <span>{isServiceMode ? '想了解市场？看看' : '想更快解决？看看'}</span>
        <NavLink
          to="/services"
          className="font-medium text-[var(--accent-color)] hover:underline"
        >
          可直接使用的服务
        </NavLink>
      </div>

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
                    <h2 className="ws-empty-title">
                      {isServiceMode ? '你能提供什么样的服务？' : '你想找什么样的服务者？'}
                    </h2>
                    <p className="ws-empty-desc">
                      {isServiceMode
                        ? '用自然语言介绍你的服务，AI 会帮你整理范围、报价和交付方式'
                        : '用自然语言描述需求，AI 会帮你理清并追问细节'}
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
                        <LiquidMetalButton
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => new Set([...prev, msg.id]))
                          }
                          className="ws-collapsed"
                        >
                          {msg.content.slice(0, 80)}
                          {msg.content.length > 80 ? '…' : ''}
                        </LiquidMetalButton>
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
                        <LiquidMetalButton
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
                        </LiquidMetalButton>
                      )}
                      {msg.isStreaming && !msg.content ? (
                        <span className="ws-bubble-ai" style={{ fontStyle: 'italic', color: 'var(--ws-text-muted)' }}>
                          填写中...
                        </span>
                      ) : (
                        <div className="ws-bubble-ai">
                          <AgentMarkdown content={msg.content} />
                          {msg.isStreaming && (
                            <span className="ai-cursor" />
                          )}
                        </div>
                      )}

                      {msg.toolCall && (
                        <div className="ws-tool-confirm">
                          <div className="ws-tool-confirm-head">
                            <Check className="size-3.5" />
                            <span>
                              {(isServiceMode
                                ? Boolean(workspaceFields.title && workspaceFields.description && workspaceFields.category)
                                : isDemandReadyToPublish(workspaceFields))
                                ? `信息已齐备，可以发布${isServiceMode ? '服务卡' : ''}`
                                : 'AI 已提取部分信息，请补全后发布'}
                            </span>
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
                                <span>{isServiceMode ? '报价' : '预算'}</span>
                                <p>{msg.toolCall.arguments.budget}</p>
                              </div>
                            )}
                            {msg.toolCall.arguments.schedule && (
                              <div className="ws-kv">
                                <span>{isServiceMode ? '交付方式' : '时间'}</span>
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
                              <span>{isServiceMode ? '服务说明' : '详细描述'}</span>
                              <p>{msg.toolCall.arguments.description}</p>
                            </div>
                          )}
                          <LiquidMetalButton
                            type="button"
                            onClick={() => handlePublishFromChat(msg.toolCall!)}
                            className="ws-btn ws-btn--primary"
                          >
                            <Send className="size-3.5" />
                            确认发布
                          </LiquidMetalButton>
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
                placeholder={isServiceMode ? '介绍你能提供的服务…' : '说点什么？'}
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
                  {isServiceMode
                    ? '在左侧介绍你的服务，AI 会同步整理到这里'
                    : '在左侧描述你的需求，AI 会同步整理到这里'}
                </p>
              </div>
            ) : (
              <div className="ws-stack">
                <WorkspaceSummary />
                <WorkspaceFields mode={isServiceMode ? 'service' : 'demand'} />
                <WorkspaceTools />
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="新建需求"
        message="确定要清空当前所有内容吗？此操作不可撤销。"
        confirmLabel="清空并新建"
        onConfirm={() => {
          setConfirmClearOpen(false)
          clearDraft()
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
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
  const frontCoverSrc = resolveDemandCardCoverDetailUrl({
    userId: currentUser?.id,
  })
  const backCoverSrc = coverUrl.startsWith('/uploads/covers/')
    ? resolveProfileBackCoverUrl(coverUrl)
    : resolveDemandCardCoverDetailUrl({ userId: currentUser?.id })
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
          <DisplayCoverPicture
            sources={frontCoverSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            pictureClassName="absolute inset-0 block h-full w-full"
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
            image={backCoverSrc}
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
