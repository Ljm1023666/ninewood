import { useState, useEffect, useCallback } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  InternalStatCard,
  SettingsPanel,
  SettingsInput,
  SettingsActionButton,
  StatusChip,
} from '@/components/layout/internal-ui'
import { Link } from 'react-router-dom'
import { welfareApi } from '@/api/welfare'
import { useUserStore } from '@/stores/user'
import { toast } from '@/components/ui/confirm-dialog'

export default function WelfareCenter() {
  const me = useUserStore((s) => s.user)
  const [pool, setPool] = useState<any>(null)
  const [rewards, setRewards] = useState<any[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [badges, setBadges] = useState<string[]>([])
  const [welfareDemands, setWelfareDemands] = useState<any[]>([])
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    expectedOutcome: '',
    minPrice: 100,
    regionId: '',
  })
  const [completingFor, setCompletingFor] = useState<any | null>(null)
  const [completeForm, setCompleteForm] = useState({
    finalPrice: 100,
    rewardMode: 'random' as 'random' | 'choice',
    choiceLabel: '',
  })

  const loadPool = useCallback(async () => {
    try {
      const r = await welfareApi.fundPool(0)
      setPool(r.data?.data || {})
    } catch {
      /* toast handled by axios */
    }
  }, [])

  const loadRewards = useCallback(async () => {
    try {
      const r = await welfareApi.rewards()
      setRewards(r.data?.data?.items || [])
      setTotalEarned(r.data?.data?.totalEarned || 0)
      setBadges(r.data?.data?.badges || [])
    } catch {
      /* toast handled by axios */
    }
  }, [])

  const loadWelfareDemands = useCallback(async () => {
    try {
      const r = await welfareApi.list()
      setWelfareDemands(r.data?.data?.items || [])
    } catch {
      /* toast handled by axios */
    }
  }, [])

  useEffect(() => {
    loadPool()
    loadRewards()
    loadWelfareDemands()
  }, [loadPool, loadRewards, loadWelfareDemands])

  async function createDemand() {
    if (!form.title || !form.description || !form.expectedOutcome) {
      toast('请填写完整信息', 'error')
      return
    }
    setCreating(true)
    try {
      await welfareApi.createDemand({
        ...form,
        regionId: form.regionId ? Number(form.regionId) : undefined,
      })
      setForm({
        title: '',
        description: '',
        expectedOutcome: '',
        minPrice: 100,
        regionId: '',
      })
      toast('公益需求已发布', 'success')
      loadWelfareDemands()
    } catch (e: any) {
      toast(e.response?.data?.message || '发布失败', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function claim(demandId: string) {
    setClaimingId(demandId)
    try {
      await welfareApi.claim(demandId)
      setClaimedIds((prev) => new Set(prev).add(demandId))
      toast('已认领，请与发布者沟通', 'success')
    } catch (e: any) {
      toast(e.response?.data?.message || '认领失败', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  async function completeDemand() {
    if (!completingFor) return
    if (completeForm.rewardMode === 'choice' && !completeForm.choiceLabel.trim()) {
      toast('选奖模式必须填写奖项', 'error')
      return
    }
    try {
      const res = await welfareApi.complete(completingFor.id, completeForm)
      const reward = (res.data as any)?.data?.reward
      if (reward) {
        if (reward.type === 'monetary') {
          toast(`公益奖励到账 ¥${reward.amount.toFixed(2)}`, 'success')
        } else if (reward.type === 'spiritual') {
          toast(`获得精神奖励：${reward.badge}`, 'success')
        } else {
          toast(`选奖成功：${reward.badge}`, 'success')
        }
      } else {
        toast('公益需求已完成', 'success')
      }
      setCompletingFor(null)
      setCompleteForm({ finalPrice: 100, rewardMode: 'random', choiceLabel: '' })
      loadWelfareDemands()
      loadRewards()
    } catch (e: any) {
      toast(e.response?.data?.message || '完成失败', 'error')
    }
  }

  return (
    <InternalPageShell width="narrow">
      <PageHeader
        title="公益中心"
        subtitle="发布公益需求，帮助需要帮助的人。平台抽成 10% 全额投入公益资金池。"
        onBack="back"
      />

      <InternalContentBlock>
        <div className="grid grid-cols-2 gap-4">
          {pool && (
            <InternalStatCard
              icon={<MsIcon name="volunteer_activism" size={24} />}
              title="公益资金池"
              description={`累计流入 ¥${pool.totalInflow?.toFixed(2) || '0.00'} · 累计支出 ¥${pool.totalOutflow?.toFixed(2) || '0.00'}`}
              value={`¥${pool.balance?.toFixed(2) || '0.00'}`}
            />
          )}
          <InternalStatCard
            icon={<MsIcon name="workspace_premium" size={24} />}
            title="我的贡献"
            description={
              totalEarned > 0
                ? `累计奖励 ¥${totalEarned.toFixed(2)}`
                : '参与公益服务，积累贡献记录'
            }
            value={totalEarned > 0 ? `¥${totalEarned.toFixed(2)}` : '—'}
          />
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...new Set(badges)].map((b) => (
              <StatusChip
                key={b}
                label={b}
                className="border-[var(--internal-hairline)] bg-white/[0.03] text-text-muted"
              />
            ))}
          </div>
        )}

        <SettingsPanel>
          <div className="border-b border-[var(--internal-hairline)] px-6 py-4">
            <p className="flex items-center gap-1.5 font-semibold text-text-primary">
              <MsIcon name="redeem" size={14} />
              可认领公益需求
            </p>
            <p className="mt-1 text-xs text-text-muted">服务者可点击「认领」加入，后续走两段式接单。</p>
          </div>
          {welfareDemands.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-text-muted">
              当前没有可认领的公益需求
            </div>
          ) : (
            <div className="flex flex-col">
              {welfareDemands.map((d: any) => {
                const isOwner = me?.id === d.user?.id
                const claimed = claimedIds.has(d.id)
                return (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-3 border-b border-[var(--internal-hairline)] px-6 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{d.title}</p>
                      <p className="mt-1 text-xs text-text-muted line-clamp-2">{d.description}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        预期效果：{d.expectedOutcome} · 最低报酬 ¥{d.minPrice}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {isOwner ? (
                        <SettingsActionButton
                          variant="primary"
                          onClick={() => {
                            setCompletingFor(d)
                            setCompleteForm((prev) => ({ ...prev, finalPrice: d.minPrice }))
                          }}
                        >
                          完成
                        </SettingsActionButton>
                      ) : claimed ? (
                        <span className="text-xs text-text-muted">已认领</span>
                      ) : (
                        <SettingsActionButton
                          variant="primary"
                          onClick={() => claim(d.id)}
                          disabled={claimingId === d.id}
                        >
                          {claimingId === d.id ? '认领中...' : '认领'}
                        </SettingsActionButton>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SettingsPanel>

        {rewards.length > 0 && (
          <SettingsPanel>
            <div className="border-b border-[var(--internal-hairline)] px-6 py-4">
              <p className="flex items-center gap-1.5 font-semibold text-text-primary">
                <MsIcon name="redeem" size={14} />
                最近奖励
              </p>
            </div>
            <div className="flex flex-col px-6 py-2">
              {rewards.slice(0, 5).map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-[var(--internal-hairline)] py-3 font-mono text-xs last:border-b-0"
                >
                  <span className="text-text-secondary">
                    {r.isSpiritual
                      ? r.badge
                      : r.rewardType === 'choice'
                        ? `选奖：${r.choiceLabel}`
                        : `¥${r.amount.toFixed(2)}`}
                  </span>
                  <span className="text-text-muted">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--internal-hairline)] px-6 py-3">
              <Link
                to="/transactions"
                className="flex items-center gap-1 font-mono text-xs text-[var(--internal-accent)] hover:underline"
              >
                <MsIcon name={STITCH_PAGE_ICONS.transactions} size={12} />
                查看全部交易记录
                <MsIcon name="open_in_new" size={12} />
              </Link>
            </div>
          </SettingsPanel>
        )}

        <SettingsPanel>
          <div className="border-b border-[var(--internal-hairline)] px-6 py-4">
            <h2 className="font-semibold text-text-primary">发布公益需求</h2>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5">
            <SettingsInput
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="标题（如：走失儿童寻找）"
            />
            <textarea
              className="settings-input min-h-24 resize-none"
              placeholder="详细描述..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <SettingsInput
              value={form.expectedOutcome}
              onChange={(v) => setForm({ ...form, expectedOutcome: v })}
              placeholder="预期效果"
            />
            <div className="flex gap-2">
              <SettingsInput
                value={String(form.minPrice)}
                onChange={(v) => setForm({ ...form, minPrice: Number(v) || 0 })}
                placeholder="最低报酬 (¥)"
                className="flex-1"
              />
              <SettingsInput
                value={form.regionId}
                onChange={(v) => setForm({ ...form, regionId: v })}
                placeholder="区域ID"
                className="w-28"
              />
            </div>
            <p className="flex items-center gap-1 font-mono text-xs text-text-muted">
              <MsIcon name="schedule" size={12} />
              公益需求有 15 天公开期
            </p>
            <SettingsActionButton
              onClick={createDemand}
              disabled={creating}
              variant="primary"
              className="w-full"
            >
              <MsIcon name={STITCH_PAGE_ICONS.welfare} size={16} className="mr-1 inline" />
              {creating ? '发布中…' : '发布公益需求'}
            </SettingsActionButton>
          </div>
        </SettingsPanel>
      </InternalContentBlock>

      {completingFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setCompletingFor(null)}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-[var(--internal-hairline)] bg-bg-secondary p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-text-primary">完成公益需求</h3>
            <div className="flex flex-col gap-3">
              <label className="text-xs text-text-muted">最终价格</label>
              <SettingsInput
                value={String(completeForm.finalPrice)}
                onChange={(v) => setCompleteForm({ ...completeForm, finalPrice: Number(v) || 0 })}
                placeholder="最终价格"
              />
              <label className="text-xs text-text-muted">奖励模式</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompleteForm({ ...completeForm, rewardMode: 'random' })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${completeForm.rewardMode === 'random' ? 'border-[var(--internal-accent)] bg-[var(--internal-accent)]/10 text-[var(--internal-accent)]' : 'border-[var(--internal-hairline)] text-text-secondary'}`}
                >
                  随机红包
                </button>
                <button
                  type="button"
                  onClick={() => setCompleteForm({ ...completeForm, rewardMode: 'choice' })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${completeForm.rewardMode === 'choice' ? 'border-[var(--internal-accent)] bg-[var(--internal-accent)]/10 text-[var(--internal-accent)]' : 'border-[var(--internal-hairline)] text-text-secondary'}`}
                >
                  选奖
                </button>
              </div>
              {completeForm.rewardMode === 'choice' && (
                <SettingsInput
                  value={completeForm.choiceLabel}
                  onChange={(v) => setCompleteForm({ ...completeForm, choiceLabel: v })}
                  placeholder="奖项名称"
                />
              )}
              <SettingsActionButton
                onClick={completeDemand}
                variant="primary"
                className="w-full"
              >
                提交完成
              </SettingsActionButton>
            </div>
          </div>
        </div>
      )}
    </InternalPageShell>
  )
}
