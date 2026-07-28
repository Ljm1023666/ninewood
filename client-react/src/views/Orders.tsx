import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { orderApi } from '@/api/order'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import { LoadingState } from '@/components/ui/loading-state'
import { SegmentedFilter } from '@/components/layout/internal-ui'
import {
  DesktopPageShell,
  DlpGlass,
  DlpEmpty,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import '@/styles/orders-plaza.css'

const ROLE_TABS = [
  { value: '', label: '全部角色' },
  { value: 'requester', label: '我发布的' },
  { value: 'provider', label: '我接到的' },
] as const

const STATUS_TABS = [
  { value: '', label: '全部' },
  { value: 'PENDING', label: '待确认' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
] as const

type RoleValue = (typeof ROLE_TABS)[number]['value']
type StatusValue = (typeof STATUS_TABS)[number]['value']

type OrderRow = {
  id: string
  status: string
  agreedPrice: number
  createdAt?: string
  providerId: string
  requesterId: string
  provider?: { id: string; nickname?: string | null; avatarUrl?: string | null }
  requester?: { id: string; nickname?: string | null; avatarUrl?: string | null }
  demand?: { id: string; title?: string; category?: string | null }
}

function matchesStatusFilter(status: string, filter: StatusValue): boolean {
  if (!filter) return true
  if (filter === 'PENDING') return status === 'PENDING'
  if (filter === 'IN_PROGRESS') {
    return (
      status === 'IN_PROGRESS' ||
      status === 'WAITING_REVIEW' ||
      status === 'PARTIAL_PENDING'
    )
  }
  if (filter === 'COMPLETED') return status === 'COMPLETED'
  if (filter === 'CANCELLED') {
    return status === 'CANCELLED' || status === 'REFUNDED'
  }
  return status === filter
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待确认',
    IN_PROGRESS: '进行中',
    WAITING_REVIEW: '待验收',
    PARTIAL_PENDING: '部分完成待确认',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REFUNDED: '已退款',
    DISPUTED: '争议中',
  }
  return map[status] || status
}

function statusPillClass(status: string): string {
  if (status === 'COMPLETED') return 'orders-plaza__pill--done'
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'orders-plaza__pill--cancel'
  if (status === 'DISPUTED') return 'orders-plaza__pill--dispute'
  if (
    status === 'IN_PROGRESS' ||
    status === 'WAITING_REVIEW' ||
    status === 'PARTIAL_PENDING'
  ) {
    return 'orders-plaza__pill--progress'
  }
  return 'orders-plaza__pill--pending'
}

function orderIcon(o: OrderRow): string {
  const t = `${o.demand?.title || ''} ${o.demand?.category || ''}`.toLowerCase()
  if (t.includes('设计') || t.includes('ui')) return 'palette'
  if (t.includes('云') || t.includes('运维')) return 'cloud'
  if (o.status === 'CANCELLED' || o.status === 'REFUNDED') return 'block'
  if (o.status === 'DISPUTED') return 'gavel'
  return 'receipt_long'
}

function formatMoney(n: number): string {
  const num = Number(n || 0)
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function activityLevel(total: number) {
  if (total >= 30) return { level: 'A', pct: 100, label: '优秀' }
  if (total >= 10) return { level: 'B', pct: 66, label: '良好' }
  if (total >= 3) return { level: 'C', pct: 33, label: '初级' }
  return { level: 'D', pct: 10, label: '新人' }
}

export default function Orders() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const userId = useUserStore((s) => s.user?.id)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [statsOrders, setStatsOrders] = useState<OrderRow[]>([])
  const [role, setRole] = useState<RoleValue>(
    (searchParams.get('role') as RoleValue) || '',
  )
  const [statusFilter, setStatusFilter] = useState<StatusValue>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [roleRes, allRes] = await Promise.all([
        orderApi.list({ role: role || undefined, page: 1 }),
        orderApi.list({ page: 1 }),
      ])
      setOrders((roleRes.data.data?.orders || []) as OrderRow[])
      setStatsOrders((allRes.data.data?.orders || []) as OrderRow[])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  const statsSource = useMemo(() => {
    if (!userId) return statsOrders
    if (role === 'provider') {
      return statsOrders.filter((o) => o.providerId === userId)
    }
    if (role === 'requester') {
      return statsOrders.filter((o) => o.requesterId === userId)
    }
    return statsOrders
  }, [statsOrders, role, userId])

  const completedCount = statsSource.filter((o) => o.status === 'COMPLETED').length
  const pendingCount = statsSource.filter((o) => o.status === 'PENDING').length
  const progressCount = statsSource.filter((o) =>
    matchesStatusFilter(o.status, 'IN_PROGRESS'),
  ).length
  const level = activityLevel(statsOrders.length)

  const statsLabel =
    role === 'requester'
      ? '我发布的 · '
      : role === 'provider'
        ? '我接到的 · '
        : ''

  const list = useMemo(
    () => orders.filter((o) => matchesStatusFilter(o.status, statusFilter)),
    [orders, statusFilter],
  )

  return (
    <DesktopPageShell
      title="我的订单"
      subtitle="管理您发布与承接的订单进度"
      actions={
        <LiquidMetalButton
          viewMode="icon"
          icon={
            <MsIcon
              name="refresh"
              size={16}
              className={cn(loading && 'animate-spin')}
              aria-hidden
            />
          }
          aria-label="刷新"
          disabled={loading}
          onClick={() => void fetchOrders()}
        />
      }
    >
      <div className="orders-plaza">
        <div className="orders-plaza__stats">
          <section className="orders-plaza__stat-card">
            <div className="orders-plaza__stat-main">
              <div>
                <p className="orders-plaza__stat-label">
                  <MsIcon name="task_alt" size={16} aria-hidden />
                  {statsLabel}完成订单
                </p>
                <p className="orders-plaza__stat-value">{completedCount}</p>
                <p className="orders-plaza__stat-hint">
                  <MsIcon name="trending_up" size={14} aria-hidden />
                  基于当前角色实时统计
                </p>
              </div>
              <div className="orders-plaza__stat-side">
                <div>
                  <p className="orders-plaza__stat-side-label">待确认</p>
                  <p className="orders-plaza__stat-side-value">
                    {pad2(pendingCount)}
                  </p>
                </div>
                <div>
                  <p className="orders-plaza__stat-side-label">进行中</p>
                  <p className="orders-plaza__stat-side-value">
                    {pad2(progressCount)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="orders-plaza__stat-card">
            <p className="orders-plaza__stat-label">
              <MsIcon name="military_tech" size={16} aria-hidden />
              活跃需求等级
            </p>
            <div className="orders-plaza__level-row">
              <span className="orders-plaza__level">{level.level}</span>
              <span className="orders-plaza__level-badge">{level.label}</span>
            </div>
            <div className="orders-plaza__level-bar" aria-hidden>
              <div
                className="orders-plaza__level-fill"
                style={{ width: `${level.pct}%` }}
              />
            </div>
          </section>
        </div>

        <div className="orders-plaza__filters">
          <div className="orders-plaza__status-tabs" role="tablist" aria-label="订单状态">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value || 'all'}
                type="button"
                role="tab"
                aria-selected={statusFilter === t.value}
                className={cn(
                  'orders-plaza__status-tab',
                  statusFilter === t.value && 'orders-plaza__status-tab--active',
                )}
                onClick={() => setStatusFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <SegmentedFilter
            size="large"
            options={[...ROLE_TABS]}
            value={role}
            onChange={setRole}
          />
        </div>

        {error ? (
          <DlpGlass>
            <DlpEmpty
              icon={<MsIcon name="error_outline" size={48} />}
              title="加载失败"
              description={error}
              action={
                <DlpBtnPrimary onClick={() => void fetchOrders()}>重试</DlpBtnPrimary>
              }
            />
          </DlpGlass>
        ) : null}

        {loading && !error ? <LoadingState variant="internal" lines={4} /> : null}

        {!loading && !error && list.length === 0 ? (
          <DlpGlass>
            <DlpEmpty
              icon={<MsIcon name="receipt_long" size={48} />}
              title="暂无订单"
              description="当前筛选条件下没有订单记录"
              action={
                statusFilter || role ? (
                  <LiquidMetalButton
                    label="清除筛选"
                    onClick={() => {
                      setStatusFilter('')
                      setRole('')
                    }}
                  />
                ) : (
                  <LiquidMetalButton
                    label="去卡池看看"
                    onClick={() => navigate('/card-pool')}
                  />
                )
              }
            />
          </DlpGlass>
        ) : null}

        {!loading && !error && list.length > 0 ? (
          <>
            <div className="orders-plaza__list">
              {list.map((o) => {
                const isRequester = userId ? o.requesterId === userId : false
                const counterpart = isRequester ? o.provider : o.requester
                return (
                  <button
                    key={o.id}
                    type="button"
                    className="orders-plaza__card"
                    onClick={() => navigate(`/orders/${o.id}`)}
                  >
                    <div className="orders-plaza__icon" aria-hidden>
                      <MsIcon name={orderIcon(o)} size={24} />
                    </div>
                    <div className="orders-plaza__body">
                      <div className="orders-plaza__title-row">
                        <h3 className="orders-plaza__title">
                          {o.demand?.title || '订单'}
                        </h3>
                        <span
                          className={cn(
                            'orders-plaza__role',
                            isRequester
                              ? 'orders-plaza__role--requester'
                              : 'orders-plaza__role--provider',
                          )}
                        >
                          {isRequester ? '我发布的' : '我接单的'}
                        </span>
                      </div>
                      <div className="orders-plaza__meta">
                        <span className="inline-flex items-center gap-1">
                          <MsIcon name="tag" size={13} aria-hidden />
                          单号 #{o.id.slice(0, 8)}
                        </span>
                        <span className="orders-plaza__meta-dot" aria-hidden />
                        <span className="orders-plaza__price">
                          <MsIcon name="payments" size={13} aria-hidden />¥
                          {formatMoney(o.agreedPrice)}
                        </span>
                        {o.createdAt ? (
                          <>
                            <span className="orders-plaza__meta-dot" aria-hidden />
                            <span>
                              {new Date(o.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="orders-plaza__party">
                      <p className="orders-plaza__party-label">
                        {isRequester ? '对接方' : '需求方'}
                      </p>
                      <p className="orders-plaza__party-name">
                        {counterpart?.nickname || '用户'}
                      </p>
                    </div>
                    <span
                      className={cn('orders-plaza__pill', statusPillClass(o.status))}
                    >
                      {statusLabel(o.status)}
                    </span>
                    <MsIcon
                      name="chevron_right"
                      size={20}
                      className="orders-plaza__chevron"
                      aria-hidden
                    />
                  </button>
                )
              })}
            </div>
            <div className="orders-plaza__foot">
              <p>共 {list.length} 条记录</p>
            </div>
          </>
        ) : null}
      </div>
    </DesktopPageShell>
  )
}
