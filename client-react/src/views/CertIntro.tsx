import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ContainerScroll, CardSticky } from '@/components/ui/sticky-scroll'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { useThemeStore } from '@/stores/theme'
import { certLabel, certColor, certGlow } from '@/constants/cert'
import { cn } from '@/lib/utils'
import { AcetGradientButton } from '@/components/ui/tailwindcss-buttons-variants'
import { BackButton } from '@/components/ui/back-button'
import { ShieldCheck, Star, Zap, Users, Award, ArrowRight } from 'lucide-react'

const levels = ['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTER'] as const

const levelInfo: Record<
  string,
  { req: string; perks: string[]; desc: string }
> = {
  NONE: {
    req: '注册即获得',
    desc: '新用户的起点，可以浏览需求和发布需求，开始你的服务平台之旅。',
    perks: ['浏览所有需求', '发布服务需求', '查看用户主页'],
  },
  BASIC: {
    req: '完成 5 笔订单 + 信誉 ≥ 60',
    desc: '迈出接单第一步。获得基础的抢单能力，开始积累你的服务口碑。',
    perks: ['申请接单', '积分兑换', '基础搜索曝光'],
  },
  INTERMEDIATE: {
    req: '完成 20 笔订单 + 信誉 ≥ 70',
    desc: '中级服务者，解锁抢单权限。可以主动抢占心仪的需求，更快获取订单。',
    perks: ['抢单权限（每月3次）', '优先搜索排名', '创建私有圈子'],
  },
  ADVANCED: {
    req: '完成 50 笔订单 + 信誉 ≥ 80',
    desc: '高级服务者，获得平台信任背书。享受更高的曝光率和更多特权。',
    perks: [
      '抢单额度提升（每月5次）',
      '首页推荐位',
      '申请公开圈子',
      '高级认证标识',
    ],
  },
  MASTER: {
    req: '完成 100 笔订单 + 信誉 ≥ 90',
    desc: '平台顶级服务者，行业标杆。享有全平台最高权重和最完整的权限体系。',
    perks: [
      '无限抢单次数',
      '全站置顶推荐',
      '创建公开圈子免审核',
      '专属客服通道',
      '大师徽章展示',
    ],
  },
}

export default function CertIntro() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.current.dark)
  const tPrimary = isDark ? 'text-white' : 'text-text-primary'
  const tSecondary = isDark ? 'text-white/70' : 'text-text-secondary'
  const tMuted = isDark ? 'text-white/50' : 'text-text-muted'
  return (
    <motion.div className="relative min-h-full w-full overflow-y-auto thin-scroll bg-background">
      <BackButton />
      <motion.div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-6 pb-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <p
            className={cn(
              'flex items-center gap-2 text-sm font-semibold uppercase tracking-wider',
              tMuted,
            )}
          >
            <ShieldCheck className="text-foreground size-3.5" aria-hidden />
            认证体系
          </p>
          <h1
            className={cn(
              'text-balance text-2xl font-bold tracking-tight sm:text-3xl',
              tPrimary,
            )}
          >
            层层进阶，<span className="text-accent">解锁更多能力</span>
          </h1>
          <p className={cn('max-w-xl text-sm leading-relaxed', tMuted)}>
            从新手到大师，5 个认证等级，每升一级解锁更强权限。
          </p>
        </motion.div>
      </motion.div>

      {/* 等级说明（保留叠卡展示，不改动卡片本体） */}
      <ContainerScroll className="mx-auto w-full max-w-2xl px-4 pb-40">
        {levels.map((level, i) => {
          const color = certColor[level]
          const info = levelInfo[level]
          const targetScale = 1 - (levels.length - i) * 0.03

          return (
            <CardSticky
              key={level}
              index={i}
              incrementY={20}
              incrementZ={15 - i * 2}
            >
              <div
                style={{
                  transform: `scale(${targetScale})`,
                  transformOrigin: 'center top',
                }}
              >
                <LiquidGlassCard
                  draggable
                  shadowIntensity="sm"
                  glowIntensity={
                    level === 'MASTER'
                      ? 'lg'
                      : level === 'ADVANCED'
                        ? 'md'
                        : 'sm'
                  }
                  borderRadius="24px"
                  className={`relative overflow-visible p-6 ${tPrimary}`}
                >
                  {/* 电光边框 */}
                  <div
                    className="pointer-events-none absolute -inset-[2px] rounded-[26px]"
                    style={{
                      background: `conic-gradient(from 0deg, transparent 0deg, ${color} 60deg, ${color}88 120deg, transparent 180deg, ${color}44 240deg, transparent 360deg)`,
                      zIndex: -1,
                      opacity: 0.7,
                    }}
                  />

                  {/* 等级徽章 */}
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold"
                      style={{
                        background: `${color}22`,
                        boxShadow: certGlow[level],
                        color,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold" style={{ color }}>
                        {certLabel[level]}
                      </h2>
                      <p
                        className={cn(
                          'text-sm',
                          isDark ? 'text-white/40' : 'text-text-muted',
                        )}
                      >
                        {info.req}
                      </p>
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className={`mb-5 text-sm leading-relaxed ${tSecondary}`}>
                    {info.desc}
                  </p>

                  {/* 权限列表 */}
                  <div className="space-y-2">
                    {info.perks.map((perk, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: j * 0.1 }}
                        viewport={{ once: true }}
                        className={cn(
                          'flex items-center gap-3 rounded-xl p-3',
                          isDark ? 'bg-white/[0.04]' : 'bg-bg-secondary/35',
                        )}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `${color}18`, color }}
                        >
                          {j === 0 ? (
                            <Zap className="size-3" />
                          ) : j === 1 ? (
                            <Star className="size-3" />
                          ) : j === 2 ? (
                            <Users className="size-3" />
                          ) : (
                            <Award className="size-3" />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-sm',
                            isDark ? 'text-white/80' : 'text-text-primary',
                          )}
                        >
                          {perk}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </LiquidGlassCard>
              </div>
            </CardSticky>
          )
        })}

        {/* 底部：前往认证中心 */}
        <CardSticky index={levels.length} incrementY={20} incrementZ={0}>
          <LiquidGlassCard
            draggable
            shadowIntensity="sm"
            glowIntensity="md"
            borderRadius="24px"
            className={`p-8 text-center ${tPrimary}`}
          >
            <Award className="mx-auto mb-4 text-foreground size-10" />
            <h2 className="mb-2 text-xl font-bold">准备好了吗？</h2>
            <p className={`mb-6 text-sm ${tMuted}`}>
              前往认证中心查看你的当前进度
            </p>
            <AcetGradientButton
              type="button"
              onClick={() => navigate('/cert-center')}
              className="inline-flex items-center gap-2 !rounded-xl !px-6 !py-3 !text-sm font-semibold"
            >
              进入认证中心
              <ArrowRight className="size-4" />
            </AcetGradientButton>
          </LiquidGlassCard>
        </CardSticky>
      </ContainerScroll>
    </motion.div>
  )
}
