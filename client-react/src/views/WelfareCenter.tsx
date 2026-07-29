import { useState, useEffect, useCallback } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpStat,
  DlpBtnPrimary,
  DlpBadge,
} from '@/components/layout/desktop-page'
import { Link } from 'react-router-dom'
import { welfareApi } from '@/api/welfare'
import { useUserStore } from '@/stores/user'
import { toast } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

/**
 * 激励中心（原"公益中心"内测占位页）
 *
 * 监管说明（内测期 v0.1）：
 * - 本功能为内测期占位页面，所展示的"激励点数"为模拟数据，不构成任何形式的
 *   公益捐赠、慈善募捐或有奖销售承诺。
 * - 根据《慈善法》《广告法》《反不正当竞争法》要求，本平台不在内测期开展任何
 *   公开募捐、抽奖式有奖销售或公益资金拨付活动。
 * - 商业化合规需在接入真实支付 / 真实资金流前完成（对接持牌慈善组织、
 *   EDI 证、市场监管报备等），详见 docs/COMPLIANCE/。
 */
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
      /* axios */
    }
  }, [])

  const loadRewards = useCallback(async () => {
    try {
      const r = await welfareApi.rewards()
      setRewards(r.data?.data?.items || [])
      setTotalEarned(r.data?.data?.totalEarned || 0)
      setBadges(r.data?.data?.badges || [])
    } catch {
      /* axios */
    }
  }, [])

  const loadWelfareDemands = useCallback(async () => {
    try {
      const r = await welfareApi.list()
      setWelfareDemands(r.data?.data?.items || [])
    } catch {
      /* axios */
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
      setForm({ title: '', description: '', expectedOutcome: '', minPrice: 100, regionId: '' })
      toast('激励任务已发布（内测）', 'success')
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
        if (reward.type === 'monetary') toast(`模拟奖励到账 ¥${reward.amount.toFixed(2)}（测试数据）`, 'success')
        else if (reward.type === 'spiritual') toast(`获得精神奖励：${reward.badge}`, 'success')
        else toast(`选奖成功：${reward.badge}`, 'success')
      } else {
        toast('任务已完成', 'success')
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
    <DesktopPageShell
      title="激励中心（内测）"
      subtitle="内测期激励功能占位：所有点数为模拟数据，不构成公益捐赠、慈善募捐或有奖销售承诺。"
      density="compact"
    >
      <div className="dlp-stat-grid">
        {pool && (
          <DlpStat
            label="激励池余额（模拟）"
            value={`¥${pool.balance?.toFixed(2) || '0.00'}`}
            gold
            icon={<MsIcon name="volunteer_activism" size={40} />}
          />
        )}
        <DlpStat
          label="我的累计（模拟）"
          value={totalEarned > 0 ? `¥${totalEarned.toFixed(2)}` : '—'}
          icon={<MsIcon name="workspace_premium" size={40} />}
        />
        <DlpStat
          label="可认领任务"
          value={String(welfareDemands.length)}
          suffix="条"
          icon={<MsIcon name="redeem" size={40} />}
        />
      </div>

      {badges.length > 0 && (
        <div className="dlp-tag-grid mb-6">
          {[...new Set(badges)].map((b) => (
            <DlpBadge key={b} tone="gold">{b}</DlpBadge>
          ))}
        </div>
      )}

      <div className="dlp-split dlp-split--60-40">
        <DlpGlass>
          <DlpGlassHead title="可认领激励任务" subtitle="内测演示：服务者点击「认领」后走两段式接单流程" />
          {welfareDemands.length === 0 ? (
            <DlpGlassBody>
              <p className="text-center text-sm text-text-muted">当前没有可认领的激励任务</p>
            </DlpGlassBody>
          ) : (
            <div className="dlp-table-wrap">
              <table className="dlp-table">
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>预期效果</th>
                    <th>最低报酬（模拟）</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareDemands.map((d: any) => {
                    const isOwner = me?.id === d.user?.id
                    const claimed = claimedIds.has(d.id)
                    return (
                      <tr key={d.id}>
                        <td>
                          <p className="dlp-table__primary truncate max-w-[240px]">{d.title}</p>
                          <p className="dlp-table__muted mt-1 line-clamp-2 max-w-[280px]">{d.description}</p>
                        </td>
                        <td className="max-w-[160px]">
                          <span className="line-clamp-2">{d.expectedOutcome}</span>
                        </td>
                        <td className="dlp-table__gold whitespace-nowrap">¥{d.minPrice}</td>
                        <td className="whitespace-nowrap">
                          {isOwner ? (
                            <DlpBtnPrimary
                              onClick={() => {
                                setCompletingFor(d)
                                setCompleteForm((prev) => ({ ...prev, finalPrice: d.minPrice }))
                              }}
                            >
                              完成
                            </DlpBtnPrimary>
                          ) : claimed ? (
                            <span className="text-sm text-text-muted">已认领</span>
                          ) : (
                            <DlpBtnPrimary
                              onClick={() => claim(d.id)}
                              disabled={claimingId === d.id}
                            >
                              {claimingId === d.id ? '认领中…' : '认领'}
                            </DlpBtnPrimary>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DlpGlass>

        <DlpGlass gold>
          <DlpGlassHead title="发布激励任务（内测）" />
          <DlpGlassBody>
            <div className="dlp-field">
              <label className="dlp-label">标题</label>
              <input
                className="dlp-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="如：示例任务标题"
              />
            </div>
            <div className="dlp-field">
              <label className="dlp-label">详细描述</label>
              <textarea
                className="dlp-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="详细描述…"
              />
            </div>
            <div className="dlp-field">
              <label className="dlp-label">预期效果</label>
              <input
                className="dlp-input"
                value={form.expectedOutcome}
                onChange={(e) => setForm({ ...form, expectedOutcome: e.target.value })}
                placeholder="预期效果"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="dlp-field !mb-0">
                <label className="dlp-label">最低报酬 (¥, 模拟)</label>
                <input
                  className="dlp-input"
                  value={String(form.minPrice)}
                  onChange={(e) => setForm({ ...form, minPrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="dlp-field !mb-0">
                <label className="dlp-label">区域 ID</label>
                <input
                  className="dlp-input"
                  value={form.regionId}
                  onChange={(e) => setForm({ ...form, regionId: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-text-muted">
              <MsIcon name="schedule" size={12} />
              内测占位：仅用于演示两段式接单流程，不产生真实交易
            </p>
            <DlpBtnPrimary onClick={createDemand} disabled={creating} className="mt-4 w-full">
              <MsIcon name={STITCH_PAGE_ICONS.welfare} size={16} />
              {creating ? '发布中…' : '发布激励任务（内测）'}
            </DlpBtnPrimary>
          </DlpGlassBody>
        </DlpGlass>
      </div>

      {rewards.length > 0 && (
        <DlpGlass className="mt-6">
          <DlpGlassHead title="最近激励记录（模拟）" />
          <div className="dlp-table-wrap">
            <table className="dlp-table">
              <thead>
                <tr>
                  <th>奖励（模拟）</th>
                  <th>日期</th>
                </tr>
              </thead>
              <tbody>
                {rewards.slice(0, 8).map((r: any) => (
                  <tr key={r.id}>
                    <td className="dlp-table__primary">
                      {r.isSpiritual
                        ? r.badge
                        : r.rewardType === 'choice'
                          ? `选奖：${r.choiceLabel}`
                          : `¥${r.amount.toFixed(2)}`}
                    </td>
                    <td className="dlp-table__muted whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--wallet-divider)] px-5 py-3">
            <Link to="/transactions" className="dlp-link flex items-center gap-1">
              <MsIcon name={STITCH_PAGE_ICONS.transactions} size={12} />
              查看全部交易记录
              <MsIcon name="open_in_new" size={12} />
            </Link>
          </div>
        </DlpGlass>
      )}

      {completingFor && (
        <div className="dlp-modal-backdrop" onClick={() => setCompletingFor(null)}>
          <div className="dlp-glass dlp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>完成任务（内测）</h3>
            <div className="dlp-field">
              <label className="dlp-label">最终价格（模拟）</label>
              <input
                className="dlp-input"
                value={String(completeForm.finalPrice)}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, finalPrice: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="dlp-field">
              <label className="dlp-label">奖励模式（仅内测演示）</label>
              <div className="flex gap-2">
                {(['random', 'choice'] as const).map((mode) => (
                  <LiquidMetalButton
                    key={mode}
                    type="button"
                    onClick={() => setCompleteForm({ ...completeForm, rewardMode: mode })}
                    className={cn(
                      'dlp-tag flex-1 justify-center',
                      completeForm.rewardMode === mode && 'dlp-tag--on',
                    )}
                  >
                    {mode === 'random' ? '随机' : '选奖'}
                  </LiquidMetalButton>
                ))}
              </div>
            </div>
            {completeForm.rewardMode === 'choice' && (
              <div className="dlp-field">
                <label className="dlp-label">奖项名称（测试）</label>
                <input
                  className="dlp-input"
                  value={completeForm.choiceLabel}
                  onChange={(e) => setCompleteForm({ ...completeForm, choiceLabel: e.target.value })}
                />
              </div>
            )}
            <DlpBtnPrimary onClick={completeDemand} className="w-full">
              提交完成
            </DlpBtnPrimary>
          </div>
        </div>
      )}
    </DesktopPageShell>
  )
}
