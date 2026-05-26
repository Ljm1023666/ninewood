import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore, presets as themePresets } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import { ThemeToggleButton } from '@/components/ui/theme-toggle'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { Chip } from '@/components/ui/chip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/confirm-dialog'
import { BackButton } from '@/components/ui/back-button'
import { userApi } from '@/api/user'
import { userTagApi } from '@/api/user-tag'
import {
  Palette,
  Check,
  ChevronRight,
  LogOut,
  Award,
  UserRound,
  BellOff,
  Plus,
  X,
} from 'lucide-react'

const themeNames: Record<string, string> = {
  'morning-mist': '薄雾晨光',
}

/** 暗色预设列表（排除 light） */
const darkPresetEntries = Object.keys(themeNames)

export default function Settings() {
  const navigate = useNavigate()
  const logout = useUserStore((s) => s.logout)
  const themeStore = useThemeStore()
  const current = themeStore.current

  // ── 推送屏蔽 ──
  const { tags: allTags, loading: tagLoading, error: tagError } = useTagLoader()
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [blockedTags, setBlockedTags] = useState<string[]>([])
  const [loadingBlocklist, setLoadingBlocklist] = useState(false)
  const [savingBlocklist, setSavingBlocklist] = useState(false)

  const loadBlocklist = useCallback(async () => {
    setLoadingBlocklist(true)
    try {
      const res = await userApi.getBlocklist()
      const data = res.data.data || { tags: [], keywords: [], ageRanges: [] }
      setBlockedTags(data.tags || [])
      setKeywords(data.keywords || [])
    } catch {
      toast('加载屏蔽列表失败', 'error')
    } finally {
      setLoadingBlocklist(false)
    }
  }, [])

  useEffect(() => {
    loadBlocklist()
  }, [loadBlocklist])

  function addKeyword() {
    const kw = newKeyword.trim()
    if (!kw) return
    if (keywords.includes(kw)) {
      toast('该关键词已存在', 'info')
      return
    }
    setKeywords((prev) => [...prev, kw])
    setNewKeyword('')
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  async function saveBlocklist() {
    setSavingBlocklist(true)
    try {
      await userApi.updateBlocklist({
        tags: blockedTags,
        keywords,
        ageRanges: [],
      })
      toast('屏蔽设置已保存', 'success')
    } catch {
      toast('保存失败，请重试', 'error')
    } finally {
      setSavingBlocklist(false)
    }
  }

  function handleSetTheme(name: string) {
    themeStore.setTheme(name)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto my-auto w-full max-w-2xl shrink-0 px-4 py-8 md:px-6">
        {/* ── Header ── */}
        <header className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-muted">
            账户
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">
            设置
          </h1>
          <p className="mt-1 text-sm text-text-secondary">外观与常用入口</p>
        </header>

        {/* ── 外观 ── */}
        <section
          className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5"
          aria-labelledby="appearance-heading"
        >
          <div className="mb-4 flex items-center gap-2 text-text-secondary">
            <Palette className="size-4 shrink-0" aria-hidden />
            <h2
              id="appearance-heading"
              className="text-sm font-bold uppercase tracking-wider"
            >
              外观
            </h2>
          </div>

          {/* 显示模式 */}
          <p className="mb-2 text-sm text-text-muted" id="display-mode-label">
            显示模式
          </p>
          <div
            className="mb-6"
            role="group"
            aria-labelledby="display-mode-label"
          >
            <ThemeToggleButton />
          </div>

          {/* 主题色 */}
          <p className="mb-2 text-sm text-text-muted" id="theme-color-label">
            主题色
          </p>
          <div
            className="grid grid-cols-3 gap-2 sm:gap-3"
            role="radiogroup"
            aria-labelledby="theme-color-label"
          >
            {darkPresetEntries.map((name) => {
              const cfg = themePresets[name]
              const active = current.name === name && !themeStore.darkMode
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleSetTheme(name)}
                  className={cn(
                    'relative rounded-xl border p-3 text-center transition-[background-color,border-color,box-shadow]',
                    'border-border bg-bg-card/40 hover:border-accent/50 hover:bg-accent/6',
                    active &&
                      'border-accent/60 bg-accent/6 ring-1 ring-accent/30',
                  )}
                >
                  <div
                    className="mb-2 h-9 rounded-lg shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${cfg.primaryStart}, ${cfg.primaryEnd})`,
                    }}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {themeNames[name]}
                  </span>
                  {active && (
                    <span
                      className={cn(
                        'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full',
                        'bg-accent text-white',
                      )}
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 快捷入口 ── */}
        <section
          className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5"
          aria-labelledby="shortcuts-heading"
        >
          <h2
            id="shortcuts-heading"
            className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted"
          >
            快捷入口
          </h2>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/6"
            aria-label="前往个人主页"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card">
              <UserRound className="size-5 text-text-primary" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold text-text-primary">
              个人主页
            </span>
            <ChevronRight className="size-4 text-text-muted" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => navigate('/cert-center')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/6"
            aria-label="前往认证中心"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card">
              <Award className="size-5 text-text-primary" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold text-text-primary">
              认证中心
            </span>
            <ChevronRight className="size-4 text-text-muted" aria-hidden />
          </button>
        </section>

        {/* ── 推送屏蔽 ── */}
        <section className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5">
          <div className="mb-4 flex items-center gap-2 text-text-secondary">
            <BellOff className="size-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              推送屏蔽
            </h2>
          </div>
          <p className="mb-4 text-sm text-text-muted">
            设置屏蔽条件后，匹配的推送将不会通知你
          </p>

          {/* 关键词屏蔽 */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              屏蔽关键词
            </label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="输入关键词"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyword}
                disabled={!newKeyword.trim()}
                className="gap-1"
              >
                <Plus className="size-3.5" />
                添加
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <Chip
                    key={kw}
                    variant="outlined"
                    className="gap-1"
                    tabIndex={-1}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
                      aria-label={`删除关键词 ${kw}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {/* 标签屏蔽 */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              屏蔽标签
            </label>
            <TagSelector
              tags={allTags}
              selected={blockedTags}
              onChange={setBlockedTags}
              loading={tagLoading}
              error={tagError}
              max={20}
            />
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              loading={savingBlocklist}
              disabled={loadingBlocklist}
              onClick={saveBlocklist}
            >
              保存屏蔽设置
            </Button>
          </div>
        </section>

        {/* ── 服务标签（AI 2.5 标签状态机）── */}
        <ServiceTagSection />

        {/* ── 法律信息 ── */}
        <section className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted">
            法律
          </h2>
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/6"
          >
            <span className="flex-1 text-sm font-semibold text-text-primary">
              隐私政策
            </span>
            <ChevronRight className="size-4 text-text-muted" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/terms')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/6"
          >
            <span className="flex-1 text-sm font-semibold text-text-primary">
              服务条款
            </span>
            <ChevronRight className="size-4 text-text-muted" />
          </button>
        </section>

        {/* ── 退出登录 ── */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-[14px] border px-8 py-4 text-sm font-semibold transition-colors',
            'border-error/30 bg-error/10 text-error hover:bg-error/20',
            'focus-visible:ring-[3px] focus-visible:ring-error/35',
          )}
          aria-label="退出当前账户"
        >
          <LogOut className="size-4" aria-hidden />
          退出登录
        </button>

        {/* ── 版本 ── */}
        <p className="mt-8 text-center text-sm text-text-muted">
          九木平台 v1.0.0
        </p>
      </div>
    </div>
  )
}

/** AI 2.5 服务者标签状态机 */
function ServiceTagSection() {
  const [tags, setTags] = useState<
    {
      tagName: string
      status: string
      certified: boolean
      orderCount: number
    }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const res = await userTagApi.list()
      const data = (res.data as any).data || (res.data as any) || []
      setTags(Array.isArray(data) ? data : [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggle(tagName: string) {
    setBusy((prev) => ({ ...prev, [tagName]: true }))
    try {
      await userTagApi.toggle(tagName)
      setTags((prev) =>
        prev.map((t) =>
          t.tagName === tagName
            ? { ...t, status: t.status === 'HIDDEN' ? 'IDLE' : 'HIDDEN' }
            : t,
        ),
      )
    } catch (e: any) {
      toast(e?.response?.data?.message || '操作失败', 'error')
    } finally {
      setBusy((prev) => ({ ...prev, [tagName]: false }))
    }
  }

  if (loading) return null
  if (tags.length === 0) return null

  const statusLabel: Record<string, string> = {
    IDLE: '空闲',
    BUSY: '忙碌',
    HIDDEN: '下线',
  }
  const statusColor: Record<string, string> = {
    IDLE: 'bg-emerald-500',
    BUSY: 'bg-amber-500',
    HIDDEN: 'bg-zinc-500',
  }

  return (
    <section className="mb-4 rounded-[14px] border border-border bg-bg-card/60 p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted">
        服务标签状态
      </h2>
      <div className="space-y-2">
        {tags.map((t) => (
          <div
            key={t.tagName}
            className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`size-2 shrink-0 rounded-full ${statusColor[t.status] || 'bg-zinc-500'}`}
              />
              <span className="text-sm font-medium text-text-primary truncate">
                {t.tagName}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-text-muted">
                {statusLabel[t.status] || t.status}
              </span>
              <button
                type="button"
                disabled={busy[t.tagName] || t.status === 'BUSY'}
                onClick={() => handleToggle(t.tagName)}
                className="rounded px-2 py-0.5 text-xs border border-border hover:bg-accent/10 disabled:opacity-30 transition-colors"
              >
                {t.status === 'HIDDEN' ? '上线' : '下线'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
