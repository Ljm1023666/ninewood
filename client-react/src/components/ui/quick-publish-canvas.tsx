import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Zap, Loader2, Send, X, Sparkles } from 'lucide-react'
import { demandApi } from '@/api/demand'
import { toast } from './confirm-dialog'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'
import { InfoCard } from '@/components/ui/info-card'
import { publisherUserCoverPreset } from '@/utils/user-cover-presets'

interface ParsedFields {
  title: string
  description: string
  minPrice: number
  category: string
  serviceType: 'ONLINE' | 'OFFLINE'
}

interface QuickPublishCanvasProps {
  open: boolean
  onClose: () => void
  speedMode: boolean
  regionId?: number
  onPublished: () => void
}

function parseBudget(budget?: string | null): number {
  if (!budget) return 0
  const num = Number(budget.replace(/[^0-9.]/g, ''))
  return isNaN(num) ? 0 : num
}

export function QuickPublishCanvas({
  open,
  onClose,
  speedMode,
  regionId,
  onPublished,
}: QuickPublishCanvasProps) {
  const isDark = useThemeStore((s) => s.current.dark)

  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedFields>(empty)

  const [form, setForm] = useState({
    title: '',
    description: '',
    minPrice: '',
    category: '',
    serviceType: 'ONLINE' as 'ONLINE' | 'OFFLINE',
  })

  const [isPublishing, setIsPublishing] = useState(false)
  const parseAbort = useRef<AbortController | null>(null)
  const parseTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (open) {
      setInputText('')
      setParsed(empty)
      setForm({
        title: '',
        description: '',
        minPrice: '',
        category: '',
        serviceType: 'ONLINE',
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      parseAbort.current?.abort()
      if (parseTimer.current) clearTimeout(parseTimer.current)
    }
  }, [open])

  const preview: ParsedFields = useMemo(
    () =>
      speedMode
        ? {
            title: form.title,
            description: form.description,
            minPrice: Number(form.minPrice) || 0,
            category: form.category,
            serviceType: form.serviceType,
          }
        : parsed,
    [speedMode, form, parsed],
  )

  // Plan A: AI 流式解析
  const handlePlanAInput = useCallback((text: string) => {
    setInputText(text)
    if (parseTimer.current) clearTimeout(parseTimer.current)
    if (text.trim().length < 2) return

    parseTimer.current = setTimeout(async () => {
      setIsParsing(true)
      parseAbort.current?.abort()
      const ctrl = new AbortController()
      parseAbort.current = ctrl

      try {
        const res = await fetch('/api/ai/analyze-demand-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            requirementState: { confirmed: {}, pending: [] },
            thinkMode: false,
          }),
          signal: ctrl.signal,
        })

        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const events = buf.split('\n\n')
          buf = events.pop() || ''
          for (const event of events) {
            const lines = event.split('\n')
            const dataLine = lines.find((l) => l.startsWith('data: '))
            if (!dataLine) continue
            try {
              const r = JSON.parse(dataLine.slice(6))
              setParsed((prev) => ({
                title: r.title || prev.title,
                description: r.summary || prev.description,
                minPrice: parseBudget(r.budget) || prev.minPrice,
                category: r.category || prev.category,
                serviceType:
                  r.serviceType === 'OFFLINE'
                    ? 'OFFLINE'
                    : r.serviceType === 'ONLINE'
                      ? 'ONLINE'
                      : prev.serviceType,
              }))
            } catch {
              /* skip */
            }
          }
        }
      } catch {
        /* aborted */
      } finally {
        if (ctrl === parseAbort.current) setIsParsing(false)
      }
    }, 800)
  }, [])

  const handlePublish = useCallback(async () => {
    const { title, description, minPrice, category, serviceType } = preview
    if (!title || !description || !minPrice || !category) {
      toast('请完善标题、描述、预算和分类', 'warning')
      return
    }

    setIsPublishing(true)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('description', description)
      fd.append('minPrice', String(minPrice))
      fd.append('category', category)
      fd.append('serviceType', serviceType)
      fd.append(
        'expireAt',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      if (regionId) fd.append('regionId', String(regionId))

      await demandApi.create(fd)
      toast('已进入未分类卡池', 'success')
      onPublished()
      onClose()
    } catch {
      toast('发布失败，请重试', 'error')
    } finally {
      setIsPublishing(false)
    }
  }, [preview, regionId, onPublished, onClose])

  const canPublish =
    preview.title &&
    preview.description &&
    preview.minPrice > 0 &&
    preview.category

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canPublish && !isPublishing) {
      e.preventDefault()
      handlePublish()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[400] flex bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="m-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-2xl"
      >
        {/* 头部 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="size-5" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary truncate flex items-center gap-2">
              {speedMode ? (
                <>
                  <Zap className="size-4 text-muted-foreground" />
                  快速填表
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-accent" />
                  AI 智能解析
                </>
              )}
            </h2>
          </div>
          <button
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
              canPublish && !isPublishing
                ? 'bg-[#3388FF] text-white hover:opacity-90 active:scale-95'
                : 'cursor-not-allowed bg-bg-tertiary text-text-muted',
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                发布中
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                发布到未分类
              </>
            )}
          </button>
        </div>

        {/* 主体 */}
        <div className="flex min-h-0 flex-1" onKeyDown={handleKeyDown}>
          {/* 左侧输入区 */}
          <div className="flex min-w-0 flex-1 flex-col border-r border-border">
            {speedMode ? (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
                <FieldGroup label="标题" required>
                  <input
                    placeholder="简短概括你的需求"
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-[#3388FF]/40"
                  />
                </FieldGroup>
                <FieldGroup label="描述" required>
                  <textarea
                    placeholder="详细描述需求内容"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    className="w-full resize-none rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-[#3388FF]/40"
                  />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <FieldGroup label="预算 ¥" required>
                    <input
                      placeholder="例如 3000"
                      value={form.minPrice}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, minPrice: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-[#3388FF]/40"
                    />
                  </FieldGroup>
                  <FieldGroup label="分类" required>
                    <input
                      placeholder="例如 开发"
                      value={form.category}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 outline-none transition-colors focus:border-[#3388FF]/40"
                    />
                  </FieldGroup>
                </div>
                <FieldGroup label="服务类型">
                  <div className="flex gap-2">
                    {(['ONLINE', 'OFFLINE'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setForm((p) => ({ ...p, serviceType: t }))
                        }
                        className={cn(
                          'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                          form.serviceType === t
                            ? 'bg-[#3388FF] text-white'
                            : 'bg-bg-secondary text-text-muted hover:text-text-primary',
                        )}
                      >
                        {t === 'ONLINE' ? '线上' : '线下'}
                      </button>
                    ))}
                  </div>
                </FieldGroup>
              </div>
            ) : (
              <div className="flex flex-1 flex-col p-6">
                <div className="relative flex-1">
                  <textarea
                    placeholder="用自然语言描述你的需求，AI 将自动解析字段\n\n例如：找人做一个微信小程序商城，预算 3000，线上交付"
                    value={inputText}
                    onChange={(e) => handlePlanAInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-full w-full resize-none rounded-xl border border-border bg-bg-secondary p-4 text-sm text-text-primary placeholder:text-text-muted/30 outline-none transition-colors focus:border-accent/30"
                  />
                  {isParsing && (
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-bg-tertiary px-2.5 py-1 text-xs text-accent">
                      <Loader2 className="size-3 animate-spin" />
                      AI 解析中
                    </div>
                  )}
                </div>
                {!inputText.trim() && (
                  <p className="mt-3 text-center text-xs text-text-muted/50">
                    输入需求描述，回车发布到未分类卡池
                  </p>
                )}
                {inputText.trim() && !isParsing && parsed.title && (
                  <p className="mt-2 text-center text-xs text-accent/70">
                    AI 已解析{parsed.title ? ' 标题' : ''}
                    {parsed.description ? ' 描述' : ''}
                    {parsed.minPrice > 0 ? ' 预算' : ''}
                    {parsed.category ? ' 分类' : ''} — 回车即可发布
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 右侧：卡牌背面（InteractiveProductCard 翻面后的 InfoCard） */}
          <div className="flex w-[420px] shrink-0 items-start justify-center overflow-y-auto p-8 pt-16">
            <DemandCardBack data={preview} isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldGroup({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  )
}

/**
 * 卡牌背面 —— 与 InteractiveProductCard flip 后的背面完全一致。
 * InfoCard 内嵌 + 底部价格。顶部图片区域叠加分类/类型/发布目标角标。
 */
function DemandCardBack({ data }: { data: ParsedFields; isDark: boolean }) {
  const { title, description, minPrice, category, serviceType } = data
  const priceStr = minPrice > 0 ? `¥${minPrice.toLocaleString()}` : '¥?'
  const displayTitle = title || '标题待写入…'
  const displayDesc = description || '描述内容将随输入同步写入卡牌背面…'

  return (
    <div className="relative aspect-[9/16] w-[min(332px,100%)] max-w-full shrink-0 overflow-hidden rounded-3xl shadow-lg">
      <InfoCard
        fillContainer
        descriptionMode="scroll"
        shellBorderRadius="1.5rem"
        image={publisherUserCoverPreset(undefined)}
        imageAlt={displayTitle}
        title={displayTitle}
        description={displayDesc}
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

      {/* 图片区叠加：分类 + 服务类型 + 发布目标 */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start justify-between p-4"
        style={{ height: '48%' }}
      >
        <div className="flex flex-col gap-1">
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
            {category || '待分类'}
          </span>
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
            {serviceType === 'ONLINE' ? '线上' : '线下'}
          </span>
        </div>
        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur-sm">
          未分类
        </span>
      </div>

      {/* 底部价格（与 InteractiveProductCard 背面一致的 flip-card-back-price） */}
      <div className="pointer-events-none absolute bottom-5 left-4 z-20 max-w-[calc(100%-2rem)] text-left">
        <span className="flip-card-back-price text-3xl font-extrabold leading-none [text-shadow:none]">
          {priceStr}
        </span>
      </div>
    </div>
  )
}

const empty: ParsedFields = {
  title: '',
  description: '',
  minPrice: 0,
  category: '',
  serviceType: 'ONLINE',
}
