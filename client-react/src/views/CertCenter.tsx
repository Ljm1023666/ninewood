import { useState, useEffect } from 'react'
import { userApi } from '@/api/user'
import { certLabel, certColor } from '@/constants/cert'
import { AcetBorderMagicButton } from '@/components/ui/tailwindcss-buttons-variants'

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
  const currentColor =
    (certColor as any)[certStatus?.certificationLevel] || '#6b7280'

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll bg-bg-primary">
      <div className="relative z-10 box-border flex w-full max-w-4xl shrink-0 flex-col self-center px-5 pb-12 md:px-10">
        <section className="border-b border-border pb-4 pt-4 mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            认证
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            认证中心
          </h1>
        </section>

        {certStatus && (
          <section className="relative mb-8 overflow-hidden rounded-[20px] border border-border bg-card p-7">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${currentColor}18 0%, transparent 60%)`,
              }}
            />
            <div className="relative z-[1]">
              <div
                className="inline-block px-6 py-3 rounded-full text-[15px] font-extrabold text-white tracking-[3px] mb-6"
                style={{ background: currentColor }}
              >
                {(certLabel as any)[certStatus.certificationLevel]}
              </div>
              <div className="flex">
                {[
                  { n: certStatus.completedOrders, l: '已完成' },
                  { n: certStatus.snatchCredits, l: '本月抢单' },
                  { n: certStatus.creditScore, l: '信誉分' },
                ].map((s, i) => (
                  <div key={s.l} className="flex-1 text-center flex">
                    {i > 0 && <div className="w-px self-stretch bg-border" />}
                    <div className="flex-1">
                      <span className="block text-[28px] font-bold leading-none tabular-nums">
                        {s.n}
                      </span>
                      <span className="block mt-2 text-sm text-text-muted tracking-[1px]">
                        {s.l}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hasPromotion ? (
              <div className="relative z-[1] mt-6 pt-6 border-t border-border">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[13px] text-text-secondary">
                    升级进度
                  </span>
                  <span
                    className="text-sm font-bold tracking-[1px]"
                    style={{
                      color: (certColor as any)[certStatus.promotion.next],
                    }}
                  >
                    {(certLabel as any)[certStatus.promotion.next]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-[3px] bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-[3px] transition-[width_0.6s]"
                      style={{
                        width: `${Math.round(certStatus.promotion.progress * 100)}%`,
                        background: (certColor as any)[
                          certStatus.promotion.next
                        ],
                      }}
                    />
                  </div>
                  <span className="text-[13px] font-bold min-w-[36px] text-right">
                    {Math.round(certStatus.promotion.progress * 100)}%
                  </span>
                </div>
                <p className="my-3 text-[13px] text-text-muted">
                  还需完成{' '}
                  <strong className="text-text-primary">
                    {certStatus.promotion.needed - certStatus.completedOrders}
                  </strong>{' '}
                  次服务即可升级
                </p>
                <AcetBorderMagicButton
                  type="button"
                  onClick={upgrade}
                  disabled={certStatus.promotion.progress < 1 || upgrading}
                  className="w-full !rounded-xl disabled:!cursor-not-allowed disabled:!opacity-35"
                >
                  {upgrading ? '升级中...' : '申请升级'}
                </AcetBorderMagicButton>
              </div>
            ) : (
              <div className="relative z-[1] mt-6 pt-5 border-t border-border text-center">
                <span className="text-sm text-text-muted font-semibold tracking-[2px]">
                  已达成最高等级
                </span>
              </div>
            )}
          </section>
        )}

        <section className="pb-8">
          <h2 className="text-lg font-extrabold tracking-[2px] mb-5">
            认证路径
          </h2>
          <div className="flex flex-col">
            {steps.map((step, idx) => {
              const done = idx <= currentIdx
              const current = idx === currentIdx
              const color = (certColor as any)[step.level]
              return (
                <div key={step.level} className="flex gap-4 items-start py-4">
                  <div className="relative w-5 flex-shrink-0 flex flex-col items-center">
                    <div
                      className="rounded-full border-2 transition-[width,height,border-color] duration-300 flex-shrink-0"
                      style={{
                        width: current ? 18 : 14,
                        height: current ? 18 : 14,
                        marginTop: current ? 0 : 2,
                        borderColor: done ? color : 'var(--border-color)',
                        background:
                          done && !current
                            ? color
                            : current
                              ? 'transparent'
                              : 'var(--bg-primary)',
                        boxShadow: current
                          ? `0 0 16px ${color}`
                          : done
                            ? `0 0 8px ${color}`
                            : '',
                      }}
                    />
                    {idx < steps.length - 1 && (
                      <div
                        className="flex-1 w-0.5 min-h-5 mt-1"
                        style={{
                          background:
                            idx < currentIdx ? color : 'var(--border-color)',
                        }}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-[15px] font-bold"
                      style={{
                        color: done || current ? color : 'var(--text-muted)',
                      }}
                    >
                      {step.label}
                    </span>
                    <span className="text-[13px] text-text-muted">
                      {step.desc}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
