import { useState, useEffect } from 'react'
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
import api from '@/api'

export default function WelfareCenter() {
  const [pool, setPool] = useState<any>(null)
  const [rewards, setRewards] = useState<any[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [badges, setBadges] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    expectedOutcome: '',
    minPrice: 100,
    regionId: '',
  })

  async function loadPool() {
    try {
      const r = await api.get('/welfare/fund-pool/0')
      setPool(r.data?.data || {})
    } catch {
      /* noop */
    }
  }

  async function loadRewards() {
    try {
      const r = await api.get('/welfare/rewards')
      setRewards(r.data?.data?.items || [])
      setTotalEarned(r.data?.data?.totalEarned || 0)
      setBadges(r.data?.data?.badges || [])
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    loadPool()
    loadRewards()
  }, [])

  async function createDemand() {
    if (!form.title || !form.description || !form.expectedOutcome) return
    setCreating(true)
    try {
      await api.post('/welfare/demands', {
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
      alert('公益需求已发布')
    } catch (e: any) {
      alert(e.response?.data?.message || '发布失败')
    } finally {
      setCreating(false)
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
                    {r.isSpiritual ? r.badge : `¥${r.amount.toFixed(2)}`}
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
    </InternalPageShell>
  )
}
