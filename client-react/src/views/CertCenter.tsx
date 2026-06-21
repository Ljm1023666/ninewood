import { useState, useEffect } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { userApi } from '@/api/user'
import { certificationApi } from '@/api/certification'
import { certLabel } from '@/constants/cert'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  InternalSection,
  SettingsPanel,
  SettingsRow,
  SettingsActionButton,
  SettingsInput,
  StatusChip,
} from '@/components/layout/internal-ui'
import { toast } from '@/components/ui/confirm-dialog'

const steps = [
  { level: 'NONE', label: '未认证', desc: '初始状态' },
  { level: 'BASIC', label: '初级认证', desc: '完成 5 次服务' },
  { level: 'INTERMEDIATE', label: '中级认证', desc: '完成 20 次服务' },
  { level: 'ADVANCED', label: '高级认证', desc: '完成 50 次服务' },
]

export default function CertCenter() {
  const [certStatus, setCertStatus] = useState<any>(null)
  const [upgrading, setUpgrading] = useState(false)

  async function fetchStatus() {
    try {
      const r = await userApi.certStatus()
      setCertStatus(r.data.data)
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '操作失败', 'error')
    }
  }

  async function upgrade() {
    setUpgrading(true)
    try {
      await userApi.upgradeCert()
      await fetchStatus()
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || '操作失败', 'error')
    } finally {
      setUpgrading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const currentIdx = steps.findIndex(
    (s) => s.level === certStatus?.certificationLevel,
  )
  const hasPromotion = certStatus?.promotion
  const progressPct = hasPromotion
    ? Math.round(certStatus.promotion.progress * 100)
    : 0

  return (
    <InternalPageShell width="wide" contentClassName="pb-12 pt-2">
      <PageHeader title="认证中心" onBack="back" divider={false} className="mb-6" />

      {certStatus && (
        <InternalContentBlock>
          <SettingsPanel className="flex items-center gap-6 p-6">
            <div className="flex size-20 shrink-0 items-center justify-center border-2 border-[var(--internal-accent)]/40">
              <MsIcon name="verified_user" size={40} className="text-[var(--internal-accent)]" />
            </div>
            <div>
              <p className="internal-eyebrow-label">当前等级</p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                {certLabel[certStatus.certificationLevel] ||
                  certStatus.certificationLevel}
              </h2>
              <p className="settings-section-intro__desc mt-2">
                信誉积分 {certStatus.creditScore} · 完成订单{' '}
                {certStatus.completedOrders}
              </p>
            </div>
          </SettingsPanel>

          <SettingsPanel>
            {hasPromotion ? (
              <>
                <SettingsRow
                  label="升级进度"
                  description={`距离${
                    certLabel[certStatus.promotion.next] || certStatus.promotion.next
                  }还需 ${
                    certStatus.promotion.needed - certStatus.completedOrders
                  } 单`}
                >
                  <span className="font-mono text-[var(--internal-accent)]">
                    {progressPct}%
                  </span>
                </SettingsRow>
                <SettingsRow
                  label="本月抢单额度"
                  description={`已用 ${certStatus.snatchCredits ?? 0} 次（仅展示）`}
                >
                  <span className="font-mono text-sm text-text-primary">
                    {certStatus.snatchCredits ?? 0}
                  </span>
                </SettingsRow>
                <SettingsRow
                  label="认证材料"
                  description="当前状态"
                  last
                >
                  <StatusChip
                    label={certStatus.certificationLevel === 'NONE' ? '未提交' : '已认证'}
                    className="border-[var(--internal-hairline)] bg-white/[0.03] text-text-muted"
                  />
                </SettingsRow>
              </>
            ) : (
              <SettingsRow
                label="认证等级"
                description="已达成最高等级"
                last
              >
                <StatusChip
                  label="已满级"
                  className="border-[var(--internal-hairline)] bg-white/[0.03] text-text-muted"
                />
              </SettingsRow>
            )}
          </SettingsPanel>

          {hasPromotion && (
            <SettingsActionButton
              onClick={upgrade}
              disabled={certStatus.promotion.progress < 1 || upgrading}
              variant="primary"
              className="w-full"
            >
              {upgrading ? '升级中…' : '申请升级'}
            </SettingsActionButton>
          )}

    
        {certStatus?.certificationLevel === 'NONE' && (
          <RegisterProviderSection onRegistered={fetchStatus} />
        )}

      <InternalSection label="认证路径">
            <SettingsPanel>
              {steps.map((step, idx) => {
                const done = idx <= currentIdx
                const current = idx === currentIdx
                return (
                  <SettingsRow
                    key={step.level}
                    label={step.label}
                    description={step.desc}
                    last={idx === steps.length - 1}
                  >
                    <StatusChip
                      label={current ? '当前' : done ? '已达成' : '未达成'}
                      className={
                        current
                          ? 'border-[var(--internal-accent)]/30 bg-[var(--internal-accent)]/10 text-[var(--internal-accent)]'
                          : 'border-[var(--internal-hairline)] bg-white/[0.03] text-text-muted'
                      }
                    />
                  </SettingsRow>
                )
              })}
            </SettingsPanel>
          </InternalSection>
        </InternalContentBlock>
      )}
    </InternalPageShell>
  )
}


function RegisterProviderSection({ onRegistered }: { onRegistered: () => void }) {
  const [tags, setTags] = useState('')
  const [regionId, setRegionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const list = tags.split(/[,,\s]+/).map((s) => s.trim()).filter(Boolean)
    if (list.length === 0) {
      toast('请至少输入一个服务标签', 'error')
      return
    }
    setSubmitting(true)
    try {
      await certificationApi.register({
        tags: list,
        regionId: regionId ? Number(regionId) : undefined,
      })
      toast('认证注册已提交，请等待审核', 'success')
      setTags('')
      setRegionId('')
      onRegistered()
    } catch (e: any) {
      toast(e?.response?.data?.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsPanel>
      <div className="border-b border-[var(--internal-hairline)] px-6 py-4">
        <h3 className="font-semibold text-text-primary">注册为认证服务者</h3>
        <p className="mt-1 text-xs text-text-muted">提交习想服务的标签后，平台审核通过即可享受抢单、推送优先等权益。</p>
      </div>
      <div className="flex flex-col gap-3 px-6 py-5">
        <SettingsInput
          value={tags}
          onChange={setTags}
          placeholder="服务标签（多个用逗号或者逗号分隔）"
        />
        <SettingsInput
          value={regionId}
          onChange={setRegionId}
          placeholder="服务区域ID（可选）"
        />
        <SettingsActionButton onClick={submit} disabled={submitting} variant="primary" className="w-full">
          {submitting ? '提交中…' : '提交认证申请'}
        </SettingsActionButton>
      </div>
    </SettingsPanel>
  )
}
