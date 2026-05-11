import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const tiers = [
  { level: 'NONE', title: '未认证', subtitle: '从这里出发', desc: '注册即享基础服务，浏览需求、发布需求，开启你的九木之旅。', color: '#6b7280', tag: '起步' },
  { level: 'BASIC', title: '初级认证', subtitle: '完成 5 次服务', desc: '解锁抢单功能，获得优先展示权，让更多人看到你的专业能力。', color: '#3b82f6', tag: '入门' },
  { level: 'INTERMEDIATE', title: '中级认证', subtitle: '完成 20 次服务', desc: '专属接单特权，更高的曝光权重，社区影响力持续提升。', color: '#8b5cf6', tag: '进阶' },
  { level: 'ADVANCED', title: '高级认证', subtitle: '完成 50 次服务', desc: '最高优先级展示，自由选择心仪需求，成为平台核心力量。', color: '#f59e0b', tag: '巅峰' },
]

export default function Intro() {
  const navigate = useNavigate()
  const [activeTier, setActiveTier] = useState(0)
  const t = tiers[activeTier]

  return (
    <div className="fixed inset-0 overflow-y-auto bg-bg-primary text-text-primary">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="fixed top-3 left-3 z-[100] w-10 h-10 flex items-center justify-center bg-black/35 border border-white/10 rounded-full text-white backdrop-blur-lg hover:bg-white/10">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      {/* Hero */}
      <section className="px-7 pt-20 pb-10 md:px-10 md:pt-[100px] md:pb-[60px]">
        <span className="text-xs font-bold tracking-[6px] text-text-muted block mb-5">NINEWOOD</span>
        <h1 className="text-[38px] font-black tracking-[-0.5px] leading-[1.18] mb-4 md:text-[52px]">每一份技能<br />都值得被看见</h1>
        <p className="text-base text-text-secondary">认证体系带你从起步走向巅峰</p>
      </section>

      {/* Tier Showcase */}
      <section className="px-5 pb-8 max-w-[680px] mx-auto">
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-border mb-6">
          {tiers.map((tier, idx) => (
            <button key={tier.level} onClick={() => setActiveTier(idx)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 border-none text-[13px] font-semibold tracking-[1px] transition-all duration-[0.25s] ${activeTier === idx ? 'bg-card text-white' : 'bg-transparent text-text-muted'}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: tier.color }} />{tier.tag}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-[20px] overflow-hidden bg-card border border-border transition-all duration-[0.35s]">
          <div className="relative h-[180px] flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${t.color}22, ${t.color}06)` }}>
            <div className="relative z-[1] px-7 py-2.5 rounded-full text-base font-extrabold text-white tracking-[6px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]" style={{ background: t.color }}>{t.tag}</div>
          </div>
          <div className="px-6 py-6">
            <span className="inline-block px-3 py-1 rounded text-[11px] font-bold tracking-[2px] border mb-3" style={{ color: t.color, borderColor: t.color }}>{t.subtitle}</span>
            <h2 className="text-[26px] font-black mb-2.5" style={{ color: t.color }}>{t.title}</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{t.desc}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="relative flex justify-between items-center mt-7 px-1 h-5">
          <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-border -translate-y-1/2 rounded-sm" />
          <div className="absolute top-1/2 left-2 h-0.5 bg-[var(--primary-gradient)] -translate-y-1/2 rounded-sm transition-[width_0.35s]" style={{ width: `${(activeTier / (tiers.length - 1)) * 100}%` }} />
          {tiers.map((tier, idx) => (
            <div key={tier.level} onClick={() => setActiveTier(idx)} className="relative z-[1] w-7 h-7 flex items-center justify-center cursor-pointer rounded-full hover:bg-bg-tertiary">
              <div className="rounded-full transition-all duration-[0.35s]" style={{
                width: idx === activeTier ? 14 : 10, height: idx === activeTier ? 14 : 10,
                background: idx <= activeTier ? tier.color : 'var(--border-color)',
                boxShadow: idx <= activeTier ? `0 0 ${idx === activeTier ? 12 : 8}px ${tier.color}` : 'none',
              }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
