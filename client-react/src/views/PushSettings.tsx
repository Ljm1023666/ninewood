import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/ui/loading-state'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpBtnPrimary,
  DlpBtnGhost,
  DlpToggleRow,
} from '@/components/layout/desktop-page'
import {
  notificationPolicyApi,
  type NotificationDelivery,
  type NotificationPolicy,
  type NotificationSubscription,
} from '@/api/notification-policy'

/**
 * 推送设置（时间主权 Phase 1B）
 * 文案禁止恐惧型；非必要默认关闭，须正向订阅。
 */
export default function PushSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [policy, setPolicy] = useState<NotificationPolicy | null>(null)
  const [subs, setSubs] = useState<NotificationSubscription[]>([])
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([])
  const [suggest, setSuggest] = useState<{
    excludeKeywords: string[]
    excludeTags: string[]
    excludeRegions: number[]
  } | null>(null)
  const [error, setError] = useState('')
  const [newTag, setNewTag] = useState('')
  const [quietStart, setQuietStart] = useState('')
  const [quietEnd, setQuietEnd] = useState('')

  async function reload() {
    setError('')
    const [p, s, d, legacy] = await Promise.all([
      notificationPolicyApi.getPolicy(),
      notificationPolicyApi.listSubscriptions(),
      notificationPolicyApi.listDeliveries(1),
      notificationPolicyApi.getLegacyPreferences().catch(() => null),
    ])
    const pol = p.data?.data as NotificationPolicy
    setPolicy(pol)
    setQuietStart(pol?.quietHoursStart || '')
    setQuietEnd(pol?.quietHoursEnd || '')
    setSubs((s.data?.data?.items || []) as NotificationSubscription[])
    setDeliveries((d.data?.data?.items || []) as NotificationDelivery[])
    const leg = legacy?.data?.data
    if (leg?.exists && leg.receivePushes === true) {
      setSuggest({
        excludeKeywords: leg.excludeKeywords || [],
        excludeTags: leg.excludeTags || [],
        excludeRegions: leg.excludeRegions || [],
      })
    } else {
      setSuggest(null)
    }
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(e?.response?.data?.message || e.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  async function savePolicy() {
    if (!policy) return
    setSaving(true)
    setError('')
    try {
      const body = {
        timezone: policy.timezone || 'Asia/Shanghai',
        dailyInterruptCap: policy.dailyInterruptCap,
        nonEssentialPaused: policy.nonEssentialPaused,
        quietHoursStart: quietStart.trim() ? quietStart.trim() : null,
        quietHoursEnd: quietEnd.trim() ? quietEnd.trim() : null,
      }
      const r = await notificationPolicyApi.updatePolicy(body)
      setPolicy(r.data.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function addDemandMatchSub() {
    const tag = newTag.trim()
    if (!tag) return
    setSaving(true)
    setError('')
    try {
      const filters: Record<string, unknown> = { tags: [tag] }
      if (suggest?.excludeKeywords?.length) {
        filters.excludeKeywords = suggest.excludeKeywords
      }
      if (suggest?.excludeTags?.length) {
        filters.excludeTags = suggest.excludeTags
      }
      if (suggest?.excludeRegions?.length) {
        filters.excludeRegions = suggest.excludeRegions
      }
      await notificationPolicyApi.createSubscription({
        eventType: 'DEMAND_MATCHED',
        mode: 'IMMEDIATE',
        channels: ['IN_APP'],
        filters,
        sourceRef: '',
      })
      setNewTag('')
      await reload()
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || '创建订阅失败')
    } finally {
      setSaving(false)
    }
  }

  async function setSubMode(id: string, mode: 'IMMEDIATE' | 'DIGEST' | 'OFF') {
    setSaving(true)
    try {
      await notificationPolicyApi.updateSubscription(id, { mode })
      await reload()
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || '更新失败')
    } finally {
      setSaving(false)
    }
  }

  async function removeSub(id: string) {
    setSaving(true)
    try {
      await notificationPolicyApi.deleteSubscription(id)
      await reload()
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || '删除失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DesktopPageShell title="推送设置">
        <LoadingState variant="internal" lines={3} />
      </DesktopPageShell>
    )
  }

  return (
    <DesktopPageShell
      title="推送设置"
      subtitle="只在你选择的事情出现时提醒你。未选择的内容不会主动打扰。"
    >
      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dlp-split dlp-split--settings">
        <DlpGlass>
          <DlpGlassHead title="必要通知" subtitle="交易、资金、争议与安全相关" />
          <DlpGlassBody>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              订单资金变化、争议处理与安全提醒默认通过站内消息送达，不受每日打扰上限影响。安静时段可延迟桌面弹窗，但不会丢失站内记录。
            </p>
          </DlpGlassBody>
        </DlpGlass>

        <DlpGlass>
          <DlpGlassHead title="非必要通知总开关" subtitle="一键暂停机会、摘要与关系提醒" />
          <DlpGlassBody className="!p-0">
            <DlpToggleRow
              label="暂停全部非必要通知"
              description="开启后停止需求匹配、摘要与关系类提醒；不影响交易必要通知"
              checked={!!policy?.nonEssentialPaused}
              onChange={(v) => setPolicy(policy ? { ...policy, nonEssentialPaused: v } : policy)}
            />
            <div className="dlp-toggle-row">
              <div>
                <p className="dlp-toggle-row__label">每日最大主动打扰</p>
                <p className="dlp-toggle-row__desc">仅统计非必要通知</p>
              </div>
              <input
                className="dlp-input w-20"
                type="number"
                min={0}
                max={50}
                value={policy?.dailyInterruptCap ?? 3}
                onChange={(e) =>
                  setPolicy(
                    policy
                      ? { ...policy, dailyInterruptCap: Number(e.target.value) || 0 }
                      : policy,
                  )
                }
              />
            </div>
            <div className="dlp-toggle-row">
              <div>
                <p className="dlp-toggle-row__label">安静时段（HH:mm）</p>
                <p className="dlp-toggle-row__desc">即时机会改为摘要；Windows 弹窗延迟</p>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  className="dlp-input w-24"
                  placeholder="22:00"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
                <span className="text-sm text-[var(--text-secondary)]">–</span>
                <input
                  className="dlp-input w-24"
                  placeholder="07:00"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4">
              <DlpBtnPrimary onClick={savePolicy} disabled={saving}>
                {saving ? '保存中…' : '保存策略'}
              </DlpBtnPrimary>
            </div>
          </DlpGlassBody>
        </DlpGlass>

        <DlpGlass>
          <DlpGlassHead
            title="我主动订阅的事项"
            subtitle="默认关闭；保存订阅后才会提醒"
          />
          <DlpGlassBody>
            {suggest ? (
              <p className="mb-3 text-xs text-[var(--text-secondary)]">
                检测到旧排除规则建议（关键词 {suggest.excludeKeywords.length} / 标签{' '}
                {suggest.excludeTags.length}）。不会自动开启通知；创建订阅时可一并带上排除条件。
              </p>
            ) : null}
            <div className="dlp-field mb-4">
              <label className="dlp-label">订阅需求匹配标签</label>
              <div className="flex gap-2">
                <input
                  className="dlp-input flex-1"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="例如：家电维修"
                  onKeyDown={(e) => e.key === 'Enter' && addDemandMatchSub()}
                />
                <DlpBtnGhost onClick={addDemandMatchSub} disabled={!newTag.trim() || saving}>
                  添加订阅
                </DlpBtnGhost>
              </div>
            </div>
            {subs.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">暂无订阅。未订阅的机会不会主动打扰。</p>
            ) : (
              <ul className="space-y-3">
                {subs.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.eventType}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.sourceRef || '通用'} · {s.mode} · {(s.channels || []).join(',')}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        filters: {JSON.stringify(s.filters || {})}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <select
                        className="dlp-select w-28"
                        value={s.mode}
                        onChange={(e) =>
                          setSubMode(s.id, e.target.value as 'IMMEDIATE' | 'DIGEST' | 'OFF')
                        }
                      >
                        <option value="IMMEDIATE">即时</option>
                        <option value="DIGEST">摘要</option>
                        <option value="OFF">关闭</option>
                      </select>
                      <button
                        type="button"
                        className="text-[var(--text-secondary)]"
                        aria-label="删除订阅"
                        onClick={() => removeSub(s.id)}
                      >
                        <MsIcon name="close" size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DlpGlassBody>
        </DlpGlass>

        <DlpGlass>
          <DlpGlassHead title="最近为什么通知我" subtitle="可解释的投递与抑制记录" />
          <DlpGlassBody>
            {deliveries.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">暂无投递记录。</p>
            ) : (
              <ul className="space-y-2">
                {deliveries.map((d) => (
                  <li key={d.id} className="text-sm border-b border-[var(--border-subtle)] pb-2">
                    <span className="font-medium">{d.status}</span>
                    <span className="text-[var(--text-secondary)]"> · {d.eventType}</span>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {d.reasonCode}: {d.reasonText}
                      {d.suppressionCode ? `（${d.suppressionCode}）` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DlpGlassBody>
        </DlpGlass>
      </div>
    </DesktopPageShell>
  )
}
