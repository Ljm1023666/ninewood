import { useState, useEffect } from 'react'
import {
  InternalContentBlock,
  InternalSection,
  SettingsActionButton,
  SettingsInput,
  SettingsPanel,
  SettingsProShell,
  SettingsRow,
  SettingsToggle,
} from '@/components/layout/internal-ui'
import { LoadingState } from '@/components/ui/loading-state'
import { MsIcon } from '@/components/ui/ms-icon'
import api from '@/api'

const FREQ_OPTIONS = [
  { value: 'HIGH', label: '实时推送' },
  { value: 'NORMAL', label: '每小时汇总' },
  { value: 'LOW', label: '每天汇总' },
  { value: 'OFF', label: '完全关闭' },
] as const

export default function PushSettings() {
  const [pref, setPref] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [kw, setKw] = useState('')
  const [tag, setTag] = useState('')

  useEffect(() => {
    api
      .get('/pushes/preferences')
      .then((r) => setPref(r.data?.data || {}))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    await api.put('/pushes/preferences', pref)
    setSaving(false)
  }

  function addKw() {
    if (kw.trim()) {
      setPref({
        ...pref,
        excludeKeywords: [...(pref.excludeKeywords || []), kw.trim()],
      })
      setKw('')
    }
  }

  function removeKw(i: number) {
    setPref({
      ...pref,
      excludeKeywords: pref.excludeKeywords.filter(
        (_: string, idx: number) => idx !== i,
      ),
    })
  }

  function addTag() {
    if (tag.trim()) {
      setPref({
        ...pref,
        excludeTags: [...(pref.excludeTags || []), tag.trim()],
      })
      setTag('')
    }
  }

  function removeTag(i: number) {
    setPref({
      ...pref,
      excludeTags: pref.excludeTags.filter((_: string, idx: number) => idx !== i),
    })
  }

  if (loading) {
    return (
      <SettingsProShell active="notifications" title="推送设置">
        <LoadingState variant="internal" lines={2} />
      </SettingsProShell>
    )
  }

  const receiveOn = pref.receivePushes !== false

  return (
    <SettingsProShell active="notifications" title="推送设置">

      <InternalContentBlock>
        <InternalSection label="通知">
          <SettingsPanel>
            <SettingsToggle
              label="接收需求推送"
              description="关闭后不再收到新需求相关通知"
              checked={receiveOn}
              onChange={(v) => setPref({ ...pref, receivePushes: v })}
            />
            <SettingsRow
              label="推送频率"
              description="汇总推送可降低打扰"
              last
            >
              <select
                className="settings-select"
                value={pref.pushFrequency || 'NORMAL'}
                onChange={(e) =>
                  setPref({ ...pref, pushFrequency: e.target.value })
                }
              >
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </SettingsRow>
          </SettingsPanel>
        </InternalSection>

        <InternalSection label="排除规则">
          <SettingsPanel>
            <SettingsRow
              label="排除关键词"
              description="含以下关键词的推送将被过滤"
            >
              <div className="flex w-full min-w-[200px] max-w-xs gap-2">
                <SettingsInput
                  value={kw}
                  onChange={setKw}
                  onKeyDown={(e) => e.key === 'Enter' && addKw()}
                  placeholder="输入关键词"
                />
                <SettingsActionButton onClick={addKw} disabled={!kw.trim()}>
                  添加
                </SettingsActionButton>
              </div>
            </SettingsRow>
            {(pref.excludeKeywords || []).length > 0 ? (
              <div className="flex flex-wrap gap-2 px-6 pb-4">
                {(pref.excludeKeywords || []).map((k: string, i: number) => (
                  <span key={i} className="settings-tag">
                    {k}
                    <button
                      type="button"
                      className="settings-tag__remove"
                      onClick={() => removeKw(i)}
                      aria-label={`删除 ${k}`}
                    >
                      <MsIcon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <SettingsRow
              label="排除标签"
              description="含以下标签的推送将被过滤"
              last={(pref.excludeTags || []).length === 0}
            >
              <div className="flex w-full min-w-[200px] max-w-xs gap-2">
                <SettingsInput
                  value={tag}
                  onChange={setTag}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="输入标签名"
                />
                <SettingsActionButton onClick={addTag} disabled={!tag.trim()}>
                  添加
                </SettingsActionButton>
              </div>
            </SettingsRow>
            {(pref.excludeTags || []).length > 0 ? (
              <div className="flex flex-wrap gap-2 px-6 pb-4">
                {(pref.excludeTags || []).map((t: string, i: number) => (
                  <span key={i} className="settings-tag">
                    {t}
                    <button
                      type="button"
                      className="settings-tag__remove"
                      onClick={() => removeTag(i)}
                      aria-label={`删除 ${t}`}
                    >
                      <MsIcon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </SettingsPanel>
        </InternalSection>

        <SettingsActionButton
          variant="primary"
          onClick={save}
          disabled={saving}
          className="w-full"
        >
          {saving ? '保存中…' : '保存设置'}
        </SettingsActionButton>
      </InternalContentBlock>
    </SettingsProShell>
  )
}
