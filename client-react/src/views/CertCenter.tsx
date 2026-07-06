import { useState, useEffect } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { userApi } from '@/api/user'
import { certificationApi } from '@/api/certification'
import { certLabel } from '@/constants/cert'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpStat,
  DlpBtnPrimary,
  DlpBadge,
} from '@/components/layout/desktop-page'
import { cn } from '@/lib/utils'
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

  const currentIdx = steps.findIndex((s) => s.level === certStatus?.certificationLevel)
  const hasPromotion = certStatus?.promotion
  const progressPct = hasPromotion ? Math.round(certStatus.promotion.progress * 100) : 0

  return (
    <DesktopPageShell
      title="认证中心"
      subtitle="查看等级进度、抢单额度与认证权益"
      density="compact"
    >
      {certStatus && (
        <div className="dlp-split dlp-split--3">
          <aside>
            <DlpGlass>
              <DlpGlassHead title="认证路径" subtitle="逐级解锁权益" />
              <DlpGlassBody className="!p-0">
                <div className="dlp-stepper !border-0 !pl-0">
                  {steps.map((step, idx) => {
                    const done = idx < currentIdx
                    const current = idx === currentIdx
                    return (
                      <div
                        key={step.level}
                        className={cn(
                          'dlp-step',
                          done && 'dlp-step--done',
                          current && 'dlp-step--current',
                        )}
                      >
                        <span className="dlp-step__dot" />
                        <p className="dlp-step__title">{step.label}</p>
                        <p className="dlp-step__desc">{step.desc}</p>
                        <div className="mt-2">
                          <DlpBadge tone={current ? 'gold' : done ? 'success' : 'default'}>
                            {current ? '当前' : done ? '已达成' : '未达成'}
                          </DlpBadge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </DlpGlassBody>
            </DlpGlass>
          </aside>

          <div className="dlp-stack">
            <div className="dlp-stat-grid dlp-stat-grid--3">
              <DlpStat
                label="当前等级"
                value={certLabel[certStatus.certificationLevel] || certStatus.certificationLevel}
                gold
                icon={<MsIcon name="verified_user" size={48} />}
              />
              <DlpStat label="信誉积分" value={certStatus.creditScore} />
              <DlpStat label="完成订单" value={certStatus.completedOrders} suffix="单" />
            </div>

            <DlpGlass gold>
              <DlpGlassHead
                title="升级进度"
                subtitle={
                  hasPromotion
                    ? `距离${certLabel[certStatus.promotion.next] || certStatus.promotion.next}还需 ${certStatus.promotion.needed - certStatus.completedOrders} 单`
                    : '已达成最高等级'
                }
              />
              <DlpGlassBody>
                {hasPromotion ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">完成度</span>
                      <span className="dlp-table__gold">{progressPct}%</span>
                    </div>
                    <div className="dlp-progress">
                      <div className="dlp-progress__bar" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="dlp-kpi">
                        <p className="dlp-kpi__label">本月抢单额度</p>
                        <p className="dlp-kpi__value">{certStatus.snatchCredits ?? 0}</p>
                      </div>
                      <div className="dlp-kpi">
                        <p className="dlp-kpi__label">认证材料</p>
                        <p className="dlp-kpi__value text-base">
                          {certStatus.certificationLevel === 'NONE' ? '未提交' : '已认证'}
                        </p>
                      </div>
                    </div>
                    <DlpBtnPrimary
                      onClick={upgrade}
                      disabled={certStatus.promotion.progress < 1 || upgrading}
                      className="mt-6"
                    >
                      {upgrading ? '升级中…' : '申请升级'}
                    </DlpBtnPrimary>
                  </>
                ) : (
                  <DlpBadge tone="gold">已满级</DlpBadge>
                )}
              </DlpGlassBody>
            </DlpGlass>

            {certStatus?.certificationLevel === 'NONE' && (
              <RegisterProviderSection onRegistered={fetchStatus} />
            )}
          </div>

          <aside>
            <DlpGlass>
              <DlpGlassHead title="认证权益" />
              <DlpGlassBody className="!p-0">
                {[
                  { t: '抢单额度', d: '中级起解锁月度抢单' },
                  { t: '搜索曝光', d: '等级越高排名越靠前' },
                  { t: '专属标识', d: '个人主页展示认证徽章' },
                  { t: '圈子权限', d: '高级可创建公开圈子' },
                ].map((item, i, arr) => (
                  <div
                    key={item.t}
                    className={cn('px-5 py-4', i < arr.length - 1 && 'border-b border-[var(--wallet-divider)]')}
                  >
                    <p className="text-sm font-semibold text-text-primary">{item.t}</p>
                    <p className="mt-1 text-sm text-text-muted">{item.d}</p>
                  </div>
                ))}
              </DlpGlassBody>
            </DlpGlass>
          </aside>
        </div>
      )}
    </DesktopPageShell>
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
    <DlpGlass>
      <DlpGlassHead
        title="注册为认证服务者"
        subtitle="提交服务标签后，平台审核通过即可享受抢单、推送优先等权益"
      />
      <DlpGlassBody>
        <div className="dlp-field">
          <label className="dlp-label">服务标签</label>
          <input
            className="dlp-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="多个标签用逗号分隔"
          />
        </div>
        <div className="dlp-field">
          <label className="dlp-label">服务区域 ID（可选）</label>
          <input
            className="dlp-input"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            placeholder="区域 ID"
          />
        </div>
        <DlpBtnPrimary onClick={submit} disabled={submitting} className="w-full">
          {submitting ? '提交中…' : '提交认证申请'}
        </DlpBtnPrimary>
      </DlpGlassBody>
    </DlpGlass>
  )
}
