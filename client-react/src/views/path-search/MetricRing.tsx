import { useEffect, useState } from 'react'

/** 视口 58；半径略收，避免描边/圆角端点被 SVG overflow 裁切 */
const SIZE = 58
const CX = SIZE / 2
const R = 22
const STROKE = 4
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
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          overflow="visible"
          aria-hidden
        >
          <circle
            className="psa-ring__track"
            cx={CX}
            cy={CX}
            r={R}
            fill="none"
            strokeWidth={STROKE}
          />
          <circle
            className="psa-ring__prog"
            cx={CX}
            cy={CX}
            r={R}
            fill="none"
            stroke={gold ? 'var(--gold)' : 'var(--cyan)'}
            strokeWidth={STROKE}
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
