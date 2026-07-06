import { useState, useEffect } from 'react'
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
      setPref({ ...pref, excludeKeywords: [...(pref.excludeKeywords || []), kw.trim()] })
      setKw('')
    }
  }

  function removeKw(i: number) {
    setPref({
      ...pref,
      excludeKeywords: pref.excludeKeywords.filter((_: string, idx: number) => idx !== i),
    })
  }

  function addTag() {
    if (tag.trim()) {
      setPref({ ...pref, excludeTags: [...(pref.excludeTags || []), tag.trim()] })
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
      <DesktopPageShell title="推送设置">
        <LoadingState variant="internal" lines={2} />
      </DesktopPageShell>
    )
  }

  const receiveOn = pref.receivePushes !== false

  return (
    <DesktopPageShell title="推送设置" subtitle="管理需求推送频率与排除规则">
      <div className="dlp-split dlp-split--settings">
        <DlpGlass>
          <DlpGlassHead title="通知" subtitle="控制是否接收需求相关推送" />
          <DlpGlassBody className="!p-0">
            <DlpToggleRow
              label="接收需求推送"
              description="关闭后不再收到新需求相关通知"
              checked={receiveOn}
              onChange={(v) => setPref({ ...pref, receivePushes: v })}
            />
            <div className="dlp-toggle-row">
              <div>
                <p className="dlp-toggle-row__label">推送频率</p>
                <p className="dlp-toggle-row__desc">汇总推送可降低打扰</p>
              </div>
              <select
                className="dlp-select w-40"
                value={pref.pushFrequency || 'NORMAL'}
                onChange={(e) => setPref({ ...pref, pushFrequency: e.target.value })}
              >
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </DlpGlassBody>
        </DlpGlass>

        <DlpGlass>
          <DlpGlassHead title="排除规则" subtitle="含以下内容的推送将被过滤" />
          <DlpGlassBody>
            <div className="dlp-field">
              <label className="dlp-label">排除关键词</label>
              <div className="flex gap-2">
                <input
                  className="dlp-input flex-1"
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKw()}
                  placeholder="输入关键词"
                />
                <DlpBtnGhost onClick={addKw} disabled={!kw.trim()}>
                  添加
                </DlpBtnGhost>
              </div>
            </div>
            {(pref.excludeKeywords || []).length > 0 && (
              <div className="dlp-tag-grid mb-4">
                {(pref.excludeKeywords || []).map((k: string, i: number) => (
                  <span key={i} className="dlp-tag dlp-tag--on">
                    {k}
                    <button type="button" onClick={() => removeKw(i)} aria-label={`删除 ${k}`}>
                      <MsIcon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="dlp-field">
              <label className="dlp-label">排除标签</label>
              <div className="flex gap-2">
                <input
                  className="dlp-input flex-1"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="输入标签名"
                />
                <DlpBtnGhost onClick={addTag} disabled={!tag.trim()}>
                  添加
                </DlpBtnGhost>
              </div>
            </div>
            {(pref.excludeTags || []).length > 0 && (
              <div className="dlp-tag-grid">
                {(pref.excludeTags || []).map((t: string, i: number) => (
                  <span key={i} className="dlp-tag dlp-tag--on">
                    {t}
                    <button type="button" onClick={() => removeTag(i)} aria-label={`删除 ${t}`}>
                      <MsIcon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </DlpGlassBody>
        </DlpGlass>
      </div>

      <DlpBtnPrimary onClick={save} disabled={saving} className="mt-8 w-full max-w-xs">
        {saving ? '保存中…' : '保存设置'}
      </DlpBtnPrimary>
    </DesktopPageShell>
  )
}
