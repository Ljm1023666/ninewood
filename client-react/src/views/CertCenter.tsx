import { useState, useEffect } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { userApi } from '@/api/user'
import { certLabel } from '@/constants/cert'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SettingsPanel,
  SettingsRow,
  SettingsActionButton,
  StatusChip,
} from '@/components/layout/internal-ui'

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
    } catch {
      /* noop */
    }
  }

  async function upgrade() {
    setUpgrading(true)
    try {
      await userApi.upgradeCert()
      await fetchStatus()
    } catch {
      /* noop */
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
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                当前等级
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-text-primary">
                {certLabel[certStatus.certificationLevel] ||
                  certStatus.certificationLevel}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
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
                  description={`已用 ${certStatus.snatchCredits ?? 0} 次`}
                >
                  <MsIcon name="chevron_right" size={16} className="text-text-muted" />
                </SettingsRow>
                <SettingsRow label="认证材料" description="查看已提交材料" last>
                  <MsIcon name="chevron_right" size={16} className="text-text-muted" />
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

          <section>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-text-muted">
              认证路径
            </h2>
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
          </section>
        </InternalContentBlock>
      )}
    </InternalPageShell>
  )
}
