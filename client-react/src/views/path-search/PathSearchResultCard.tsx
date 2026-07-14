import { MsIcon } from '@/components/ui/ms-icon'
import type { PathSearchItem } from '@/api/path-search'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/utils/time'
import { PathDualLabel } from './PathDualLabel'
import { MetricRing } from './MetricRing'
import {
  entryHasIntent,
  groupPathsForDisplay,
  type PathDisplayEntry,
} from '@/utils/path-display'

const CERT_AVATAR_CLASS: Record<string, string> = {
  NONE: 'psa-timeline__avatar--none',
  BASIC: 'psa-timeline__avatar--basic',
  INTERMEDIATE: 'psa-timeline__avatar--intermediate',
  ADVANCED: 'psa-timeline__avatar--advanced',
  MASTER: 'psa-timeline__avatar--master',
}

type PathSearchResultCardProps = {
  item: PathSearchItem
  index: number
  queryPathCount: number
  intentPaths: string[]
  intentSet: Set<string>
  isTop: boolean
  isDim: boolean
  onOpen: () => void
  tagHitTitle: (entry: { dualKwTag: boolean }, intent: boolean) => string
}

export function PathSearchResultCard({
  item: d,
  index,
  queryPathCount,
  intentPaths,
  intentSet,
  isTop,
  isDim,
  onOpen,
  tagHitTitle,
}: PathSearchResultCardProps) {
  const matchedGroups = groupPathsForDisplay(d.matchedPaths)
  const missingIntentGroups = groupPathsForDisplay(
    intentPaths.filter((p) => !d.matchedPaths.includes(p)),
  )
  const certLevel = d.user.certificationLevel ?? 'NONE'
  const avatarClass = CERT_AVATAR_CLASS[certLevel] ?? CERT_AVATAR_CLASS.NONE
  const timeLabel = formatRelativeTime(d.createdAt)

  let statusLabel = `${d.hitCount}/${queryPathCount} 命中`
  if (intentPaths.length > 0 && d.intentHitCount === intentPaths.length)
    statusLabel = '意图全中'
  else if (intentPaths.length > 0)
    statusLabel = `${d.intentHitCount}/${intentPaths.length} 意图`

  const metaParts = [
    timeLabel,
    d.category,
    `¥${d.minPrice.toLocaleString('zh-CN')}`,
    d.user.nickname,
    `信用 ${d.user.creditScore}`,
  ].filter(Boolean)

  return (
    <div
      className={cn(
        'psa-timeline__item',
        isTop && 'psa-timeline__item--top',
        isDim && 'psa-timeline__item--dim',
      )}
    >
      <div className={cn('psa-timeline__avatar', avatarClass)} aria-hidden>
        {d.user.avatarUrl ? (
          <img src={d.user.avatarUrl} alt="" />
        ) : (
          (d.user.nickname || '?').charAt(0)
        )}
      </div>

      <button
        type="button"
        className={cn(
          'psa-card',
          'psa-card--timeline',
          `psa-rise psa-d${Math.min(6, index + 4)}`,
          isTop && 'psa-card--top',
          isDim && 'psa-card--dim',
        )}
        onClick={onOpen}
      >
        <div className="psa-card__main">
          <div className="psa-card__head">
            <h3 className="psa-card__title">{d.title}</h3>
            <div className="psa-card__badges">
              {isTop ? (
                <span className="psa-ribbon">
                  <MsIcon name="workspace_premium" size={13} />
                  同分优先
                </span>
              ) : null}
              <span
                className={cn(
                  'psa-card__status',
                  isTop && 'psa-card__status--top',
                  statusLabel === '意图全中' && 'psa-card__status--intent',
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <p className="psa-meta">
            {metaParts.map((part, i) => (
              <span key={`${i}-${part}`}>
                {i > 0 ? ' · ' : null}
                {part.startsWith('¥') ? <span className="psa-price">{part}</span> : part}
              </span>
            ))}
          </p>

          {(matchedGroups.length > 0 || missingIntentGroups.length > 0) ? (
            <div className="psa-tags">
              {matchedGroups.map((entry: PathDisplayEntry) => {
                const intent = entryHasIntent(entry, intentSet)
                return (
                  <span
                    key={entry.paths.join('|')}
                    className={cn(
                      'psa-tag',
                      entry.dualKwTag && 'psa-tag--dual-kw-tag',
                      intent ? 'psa-tag--intent' : 'psa-tag--hit',
                    )}
                    title={tagHitTitle(entry, intent)}
                  >
                    <MsIcon
                      name={entry.dualKwTag ? 'style' : intent ? 'bolt' : 'check_circle'}
                      size={14}
                      className={cn('psa-tag__icon', entry.dualKwTag && 'psa-tag__icon--kw-tag')}
                    />
                    <PathDualLabel
                      value={entry.value}
                      dualKwTag={entry.dualKwTag}
                      className="psa-tag__label"
                    />
                  </span>
                )
              })}
              {missingIntentGroups.map((entry: PathDisplayEntry) => (
                <span
                  key={entry.paths.join('|')}
                  className={cn('psa-tag psa-tag--miss', entry.dualKwTag && 'psa-tag--dual-kw-tag')}
                  title="意图未命中：属于意图路径，但这条需求没挂上"
                >
                  <MsIcon
                    name={entry.dualKwTag ? 'style' : 'remove_circle_outline'}
                    size={14}
                    className={cn('psa-tag__icon', entry.dualKwTag && 'psa-tag__icon--kw-tag')}
                  />
                  <PathDualLabel
                    value={entry.value}
                    dualKwTag={entry.dualKwTag}
                    className="psa-tag__label"
                  />
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="psa-rings">
          <MetricRing value={d.hitCount} total={queryPathCount} label="命中" />
          {intentPaths.length > 0 ? (
            <MetricRing value={d.intentHitCount} total={intentPaths.length} label="意图" gold />
          ) : null}
        </div>
      </button>
    </div>
  )
}
