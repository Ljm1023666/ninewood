import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore, presets as themePresets } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import { certLabel } from '@/constants/cert'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { toast } from '@/components/ui/confirm-dialog'
import {
  AppearanceSegment,
  InternalContentBlock,
  InternalSection,
  SettingsAccountCard,
  SettingsActionButton,
  SettingsInput,
  SettingsLinkRow,
  SettingsPanel,
  SettingsProShell,
  SettingsRow,
  SettingsSectionIntro,
} from '@/components/layout/internal-ui'
import { MsIcon } from '@/components/ui/ms-icon'
import { userApi } from '@/api/user'
import { userTagApi } from '@/api/user-tag'

const themeNames: Record<string, string> = {
  'morning-mist': '薄雾晨光',
}

const darkPresetEntries = Object.keys(themeNames)

export default function Settings() {
  const navigate = useNavigate()
  const user = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const themeStore = useThemeStore()
  const current = themeStore.current
  // store 命名反直觉：darkMode=true 表示当前为浅色模式
  const isLightMode = themeStore.darkMode

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

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const level = user?.certificationLevel || 'NONE'
  const accountLabel =
    user?.phone || user?.email || user?.nickname || '当前账户'

  return (
    <SettingsProShell active="account">
      <InternalContentBlock>
        <InternalSection label="账户">
          <div className="settings-account-grid">
            <SettingsSectionIntro
              title="个人资料"
              description="管理核心身份凭证与公开资料。"
            />
            <SettingsAccountCard>
              <div className="settings-account-card__identity">
                <div className="settings-account-card__avatar">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" />
                  ) : (
                    <span>{(user?.nickname || '?')[0]}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="settings-account-card__email">{accountLabel}</p>
                  <p className="settings-account-card__role">
                    认证：{certLabel[level]}
                  </p>
                </div>
              </div>
              <div className="settings-account-card__actions flex shrink-0 flex-wrap gap-2">
                <SettingsActionButton onClick={() => navigate('/wallet')}>
                  点数钱包
                </SettingsActionButton>
                <SettingsActionButton onClick={() => navigate('/profile')}>
                  个人主页
                </SettingsActionButton>
                <SettingsActionButton onClick={() => navigate('/cert-center')}>
                  认证中心
                </SettingsActionButton>
                <SettingsActionButton variant="danger" onClick={handleLogout}>
                  <MsIcon name="logout" size={14} className="mr-1.5 inline" aria-hidden />
                  退出登录
                </SettingsActionButton>
              </div>
            </SettingsAccountCard>
          </div>
        </InternalSection>

        <InternalSection label="外观">
          <SettingsPanel>
            <SettingsRow label="显示模式" description="选择视觉环境密度">
              <AppearanceSegment
                options={[
                  { value: 'dark' as const, label: 'OLED' },
                  { value: 'light' as const, label: '浅色' },
                ]}
                value={isLightMode ? 'light' : 'dark'}
                onChange={(v) => {
                  if (v === 'dark' && isLightMode) themeStore.toggleDarkMode()
                  if (v === 'light' && !isLightMode) themeStore.toggleDarkMode()
                }}
              />
            </SettingsRow>
            <SettingsRow
              label="主题色"
              description="暗色环境下的强调色预设"
              last
            >
              <div className="flex flex-wrap justify-end gap-2">
                {darkPresetEntries.map((name) => {
                  const cfg = themePresets[name]
                  const active = current.name === name
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => themeStore.setTheme(name)}
                      className={cn(
                        'relative border px-3 py-2 text-center transition-colors',
                        active
                          ? 'border-[var(--internal-accent)]/50 bg-[var(--internal-accent)]/5'
                          : 'border-[var(--internal-hairline)] hover:border-white/15',
                      )}
                    >
                      <div
                        className="mx-auto mb-1.5 h-6 w-10"
                        style={{
                          background: `linear-gradient(135deg, ${cfg.primaryStart}, ${cfg.primaryEnd})`,
                        }}
                      />
                      <span className="text-base font-semibold text-text-primary">
                        {themeNames[name]}
                      </span>
                      {active ? (
                        <MsIcon
                          name="check"
                          size={12}
                          className="absolute right-1 top-1 text-[var(--internal-accent)]"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </SettingsRow>
          </SettingsPanel>
        </InternalSection>

        <InternalSection label="推送屏蔽">
          <SettingsPanel>
            <SettingsRow
              label="屏蔽关键词"
              description="匹配关键词的推送将不会通知你"
            >
              <div className="flex w-full min-w-[200px] max-w-xs flex-col gap-2 sm:items-end">
                <div className="flex w-full gap-2">
                  <SettingsInput
                    value={newKeyword}
                    onChange={setNewKeyword}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="输入关键词"
                  />
                  <SettingsActionButton
                    onClick={addKeyword}
                    disabled={!newKeyword.trim()}
                  >
                    <MsIcon name="add" size={12} className="mr-1 inline" />
                    添加
                  </SettingsActionButton>
                </div>
              </div>
            </SettingsRow>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-6 pb-4">
                {keywords.map((kw) => (
                  <span key={kw} className="settings-tag">
                    {kw}
                    <button
                      type="button"
                      className="settings-tag__remove"
                      onClick={() => removeKeyword(kw)}
                      aria-label={`删除 ${kw}`}
                    >
                      <MsIcon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <SettingsRow
              label="屏蔽标签"
              description="选择不想接收推送的标签"
              last={keywords.length === 0}
            >
              <div className="w-full min-w-[200px] max-w-sm">
                <TagSelector
                  tags={allTags}
                  selected={blockedTags}
                  onChange={setBlockedTags}
                  loading={tagLoading}
                  error={tagError}
                  max={20}
                  shape="rect"
                />
              </div>
            </SettingsRow>
            <div className="flex justify-end border-t border-[var(--internal-hairline)] px-6 py-4">
              <SettingsActionButton
                variant="primary"
                onClick={saveBlocklist}
                disabled={loadingBlocklist}
              >
                {savingBlocklist ? '保存中…' : '保存屏蔽设置'}
              </SettingsActionButton>
            </div>
          </SettingsPanel>
        </InternalSection>

        {/* 合规：举报与帮助中心（必设，24h 响应） */}
        <InternalSection label="举报与帮助">
          <SettingsPanel>
            <SettingsRow
              icon="report"
              title="举报违规内容"
              description="如发现违法违规或不良信息，请通过以下渠道举报。我们承诺 24 小时内响应。"
              last={false}
            >
              <div className="flex flex-col gap-2">
                <a
                  href="https://www.12377.cn"
                  target="_blank"
                  rel="noreferrer"
                  className="settings-link"
                >
                  12377 网络违法和不良信息举报
                </a>
                <a
                  href="https://www.12321.cn"
                  target="_blank"
                  rel="noreferrer"
                  className="settings-link"
                >
                  12321 网络不良与垃圾信息举报
                </a>
                <p className="text-xs text-text-muted">
                  平台内举报：通过站内"举报"按钮（每条内容旁）发起，平台运营 24h 内处理
                </p>
              </div>
            </SettingsRow>
            <SettingsRow
              icon="policy"
              title="我的数据"
              description="依据《个人信息保护法》，您可查阅、复制、导出或更正您的个人数据。"
              last={true}
            >
              <SettingsActionButton
                variant="secondary"
                onClick={() => {
                  window.location.href = '/settings/data'
                }}
              >
                管理我的数据
              </SettingsActionButton>
            </SettingsRow>
          </SettingsPanel>
        </InternalSection>

        <ServiceTagSection />

        <InternalSection label="法律">
          <SettingsPanel>
            <SettingsLinkRow
              label="隐私政策"
              onClick={() => navigate('/privacy')}
            />
            <SettingsLinkRow
              label="服务条款"
              onClick={() => navigate('/terms')}
              last
            />
          </SettingsPanel>
        </InternalSection>

        <p className="text-center text-base font-medium text-text-secondary">
          九木平台 v1.0.0
        </p>
      </InternalContentBlock>
    </SettingsProShell>
  )
}

function ServiceTagSection() {
  const [tags, setTags] = useState<
    {
      tagName: string
      status: string
      certified: boolean
      orderCount: number
      autoReceive?: boolean
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

  async function handleAutoReceive(t: { tagName: string; autoReceive?: boolean }) {
    setBusy((prev) => ({ ...prev, [t.tagName]: true }))
    try {
      const next = !t.autoReceive
      await userTagApi.setAutoReceive(t.tagName, next)
      setTags((prev) =>
        prev.map((row) => (row.tagName === t.tagName ? { ...row, autoReceive: next } : row)),
      )
      toast(next ? '已开启自动接单' : '已关闭自动接单', 'success')
    } catch (e: any) {
      toast(e?.response?.data?.message || '操作失败', 'error')
    } finally {
      setBusy((prev) => ({ ...prev, [t.tagName]: false }))
    }
  }

  if (loading || tags.length === 0) return null

  const statusLabel: Record<string, string> = {
    IDLE: '空闲',
    BUSY: '忙碌',
    HIDDEN: '下线',
  }

  return (
    <InternalSection label="服务标签">
      <SettingsPanel>
        {tags.map((t, i) => (
          <SettingsRow
            key={t.tagName}
            label={t.tagName}
            description={`状态：${statusLabel[t.status] || t.status}`}
            last={i === tags.length - 1}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">自动接单</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={!!t.autoReceive}
                  onChange={() => handleAutoReceive(t)}
                  disabled={busy[t.tagName]}
                />
                <span className="h-5 w-9 rounded-full bg-white/10 transition-colors peer-checked:bg-[var(--internal-accent)] peer-disabled:opacity-50" />
                <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
              <SettingsActionButton
                onClick={() => handleToggle(t.tagName)}
                disabled={busy[t.tagName] || t.status === 'BUSY'}
              >
                {t.status === 'HIDDEN' ? '上线' : '下线'}
              </SettingsActionButton>
            </div>
          </SettingsRow>
        ))}
      </SettingsPanel>
    </InternalSection>
  )
}
