import { useEffect, useState } from 'react'

const R = 25
const C = 2 * Math.PI * R

/** 命中/意图占比环形指标，加载时描边填充动画 */
export function MetricRing({
  value,
  total,
  label,
  gold,
}: {
  value: number
  total: number
  label: string
  gold?: boolean
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0
  const [offset, setOffset] = useState(C)

  useEffect(() => {
    const id = window.setTimeout(() => setOffset(C * (1 - pct)), 60)
    return () => window.clearTimeout(id)
  }, [pct])

  return (
    <div className={`psa-ring${gold ? ' psa-ring--gold' : ''}`}>
      <div className="psa-ring__wrap">
        <svg width="58" height="58">
          <circle cx="29" cy="29" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
          <circle
            className="psa-ring__prog"
            cx="29"
            cy="29"
            r={R}
            fill="none"
            stroke={gold ? 'var(--gold)' : 'var(--cyan)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="psa-ring__val">
          <span>
            {value}
            <small>/{total}</small>
          </span>
        </div>
      </div>
      <div className="psa-ring__lab psa-mono">{label}</div>
    </div>
  )
}
