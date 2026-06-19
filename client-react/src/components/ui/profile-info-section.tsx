import { useNavigate } from 'react-router-dom'
import { certLabel, certColor } from '@/constants/cert'
import {
  Award,
  FileText,
  ShoppingBag,
  MessageCircle,
  Settings,
  Users,
  Star,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react'

interface Props {
  user: any
  isMe: boolean
  followCounts: { following: number; followers: number }
  certStatus: any
  onShowFollow: (mode: 'followers' | 'following') => void
}

export function ProfileInfoSection({
  user,
  isMe,
  followCounts,
  certStatus,
  onShowFollow,
}: Props) {
  const navigate = useNavigate()
  const level: string = user?.certificationLevel || 'NONE'
  const color = certColor[level as keyof typeof certColor] || '#6b7280'

  // 认证升级进度
  const promo = certStatus?.promotion
  const promoProgress = promo ? Math.round(promo.progress * 100) : 0
  const promoColor = promo
    ? certColor[promo.next as keyof typeof certColor] || '#f59e0b'
    : '#f59e0b'

  // SVG 环形进度
  const ringRadius = 38
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset =
    ringCircumference - (ringCircumference * promoProgress) / 100

  const menuItems = isMe
    ? [
        { icon: Award, label: '认证中心', path: '/cert-center' },
        { icon: FileText, label: '我的需求', path: '/my-demands' },
        { icon: ShoppingBag, label: '我的订单', path: '/orders' },
        { icon: MessageCircle, label: '消息', path: '/messages' },
        { icon: Settings, label: '设置', path: '/settings' },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* ===== 社交统计 + 认证环 ===== */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onShowFollow('following')}
          className="py-3.5 rounded-2xl bg-card border border-border hover:bg-bg-tertiary transition-colors text-center"
        >
          <p className="text-xl font-extrabold text-text-primary">
            {followCounts.following}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">关注</p>
        </button>
        <button
          onClick={() => onShowFollow('followers')}
          className="py-3.5 rounded-2xl bg-card border border-border hover:bg-bg-tertiary transition-colors text-center"
        >
          <p className="text-xl font-extrabold text-text-primary">
            {followCounts.followers}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">粉丝</p>
        </button>
        {/* 认证环 */}
        <div className="flex items-center justify-center py-2">
          <div className="relative w-[68px] h-[68px]">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="none"
                stroke="var(--bg-secondary)"
                strokeWidth="6"
              />
              {promo && (
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke={promoColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-[stroke-dashoffset_1s_ease] drop-shadow-[0_0_6px_currentColor]"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <ShieldCheck size={20} style={{ color }} />
              <span className="text-[10px] text-text-muted mt-0.5">
                {certLabel[level]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 升级进度条 ===== */}
      {promo && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] text-text-secondary">升级进度</span>
            <span className="text-sm font-bold" style={{ color: promoColor }}>
              {certLabel[promo.next as keyof typeof certLabel]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-[width_0.8s_ease]"
                style={{ width: `${promoProgress}%`, background: promoColor }}
              />
            </div>
            <span className="text-sm font-bold text-text-primary min-w-[36px] text-right">
              {promoProgress}%
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            还需完成{' '}
            <strong className="text-text-primary">
              {promo.needed - (certStatus?.completedOrders || 0)}
            </strong>{' '}
            次服务即可升级
          </p>
        </div>
      )}

      {/* ===== 服务数据 ===== */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Star,
            label: '信誉积分',
            value: user?.creditScore || certStatus?.creditScore || 60,
            color: '#10b981',
          },
          {
            icon: Zap,
            label: '本月抢单',
            value: `${user?.snatchCredits || certStatus?.snatchCredits || 0}/3`,
            color: '#ef4444',
          },
          {
            icon: Users,
            label: '关注/粉丝比',
            value:
              followCounts.followers > 0
                ? `${Math.round((followCounts.following / Math.max(followCounts.followers, 1)) * 100)}%`
                : '0%',
            color: '#a78bfa',
          },
          {
            icon: TrendingUp,
            label: '完成订单',
            value: user?.completedOrders || certStatus?.completedOrders || 0,
            color: color,
          },
        ].map((item, i) => (
          <div
            key={i}
            className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: item.color + '18', color: item.color }}
            >
              <item.icon size={16} />
            </div>
            <div>
              <p className="text-[11px] text-text-muted">{item.label}</p>
              <p className="text-base font-extrabold text-text-primary">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== 菜单 ===== */}
      {menuItems.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-card border border-border hover:bg-bg-tertiary hover:border-accent/30 transition-all"
            >
              <item.icon size={20} className="text-accent" />
              <span className="text-[11px] text-text-muted">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
