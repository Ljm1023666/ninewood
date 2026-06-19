import { useState, useEffect } from 'react'
import {
  Heart,
  Handshake,
  Clock,
  Gift,
  Award,
  Receipt,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
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
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <Heart className="size-5 text-error" />
          公益中心
        </h1>
        <p className="text-sm text-text-primary/40 mb-6">
          发布公益需求，帮助需要帮助的人。平台抽成 10% 全额投入公益资金池。
        </p>

        {/* 资金池 */}
        {pool && (
          <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-primary/40">本地公益资金池</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ¥{pool.balance?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-text-primary/30 mt-1">
                  累计流入 ¥{pool.totalInflow?.toFixed(2) || '0.00'} · 累计支出
                  ¥{pool.totalOutflow?.toFixed(2) || '0.00'}
                </p>
              </div>
              <Handshake className="size-10 text-emerald-400/30" />
            </CardContent>
          </Card>
        )}

        {/* 我的奖励 */}
        {totalEarned > 0 && (
          <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="size-4 text-amber-400" />
                <span className="text-sm font-medium text-text-primary">
                  我的公益奖励
                </span>
              </div>
              <p className="text-lg font-bold text-amber-400">
                累计 ¥{totalEarned.toFixed(2)}
              </p>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {[...new Set(badges)].map((b) => (
                    <Badge
                      key={b}
                      className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs"
                    >
                      <Gift className="size-3 mr-0.5" />
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 最近奖励 */}
        {rewards.length > 0 && (
          <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-text-primary text-sm flex items-center gap-1">
                <Gift className="size-3.5" />
                最近奖励
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {rewards.slice(0, 5).map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-text-primary/40">
                    {r.isSpiritual ? r.badge : `¥${r.amount.toFixed(2)}`}
                  </span>
                  <span className="text-text-primary/20">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))}
              <Link
                to="/transactions"
                className="text-xs text-amber-400/60 hover:text-amber-400 flex items-center gap-1 mt-1"
              >
                <Receipt className="size-3" />
                查看全部交易记录 <ExternalLink className="size-3" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 发布表单 */}
        <Card className="border-border bg-bg-secondary backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-text-primary text-base">
              发布公益需求
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30"
              placeholder="标题（如：走失儿童寻找）"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="border border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30 rounded-lg px-3 py-2 text-sm h-24 resize-none"
              placeholder="详细描述..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <Input
              className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30"
              placeholder="预期效果"
              value={form.expectedOutcome}
              onChange={(e) =>
                setForm({ ...form, expectedOutcome: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Input
                className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30 flex-1"
                type="number"
                placeholder="最低报酬 (¥)"
                value={form.minPrice}
                onChange={(e) =>
                  setForm({ ...form, minPrice: Number(e.target.value) })
                }
              />
              <Input
                className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30 w-24"
                placeholder="区域ID"
                value={form.regionId}
                onChange={(e) => setForm({ ...form, regionId: e.target.value })}
              />
            </div>
            <p className="text-xs text-text-primary/30 flex items-center gap-1">
              <Clock className="size-3" />
              公益需求有 15 天公开期
            </p>
            <Button
              onClick={createDemand}
              disabled={creating}
              className="bg-red-500 hover:bg-red-600"
            >
              <Heart className="size-4 mr-1" />{' '}
              {creating ? '发布中...' : '发布公益需求'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
