/**
 * 主体选择器 · Bento 身份卡片 / 方案 B 图标网格
 */
import type { CSSProperties } from 'react'
import {
  Briefcase,
  Building2,
  Check,
  Store,
  User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import {
  SUBJECTS,
  SUBJECT_BY_ID,
  type SubjectId,
} from '@/data/tax-rules/subjects'
import { SUBJECT_VISUAL } from '@/constants/tax-visualizer'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

const SUBJECT_ICON: Record<SubjectId, typeof User> = {
  'individual-salary': User,
  'individual-labor': Briefcase,
  'small-business': Store,
  'general-company': Building2,
}

const SUBJECT_SPLIT_META: Record<
  SubjectId,
  { shortName: string; shortDesc: string }
> = {
  'individual-salary': { shortName: '个人·工资薪金', shortDesc: '标准雇佣关系' },
  'individual-labor': {
    shortName: '个人·自由职业者',
    shortDesc: '劳务报酬 / 经营所得',
  },
  'small-business': { shortName: '小规模纳税人', shortDesc: '年营收<500万' },
  'general-company': { shortName: '一般企业', shortDesc: '查账征收主体' },
}

interface TaxSubjectPickerProps {
  layout?: 'card' | 'split'
}

export function TaxSubjectPicker({ layout = 'card' }: TaxSubjectPickerProps) {
  const currentSubject = useTaxVisualizerStore((s) => s.currentSubject)
  const compareSubject = useTaxVisualizerStore((s) => s.compareSubject)
  const setCurrentSubject = useTaxVisualizerStore((s) => s.setCurrentSubject)
  const setCompareSubject = useTaxVisualizerStore((s) => s.setCompareSubject)

  const toggleCompare = (id: SubjectId) => {
    if (id === currentSubject) return
    setCompareSubject(compareSubject === id ? null : id)
  }

  if (layout === 'split') {
    return (
      <div
        role="radiogroup"
        aria-label="纳税主体"
        className="tax-viz-subject-grid--b"
      >
        {SUBJECTS.map((s) => {
          const isCurrent = s.id === currentSubject
          const Icon = SUBJECT_ICON[s.id]
          const meta = SUBJECT_SPLIT_META[s.id]
          return (
            <LiquidMetalButton
              key={s.id}
              type="button"
              role="radio"
              aria-checked={isCurrent}
              onClick={() => setCurrentSubject(s.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                if (s.id !== currentSubject) toggleCompare(s.id)
              }}
              title={
                s.id !== currentSubject
                  ? `${s.name} · 右键加入对比`
                  : s.name
              }
              className={cn(
                'tax-viz-subject-b',
                isCurrent && 'tax-viz-subject-b--current',
              )}
            >
              {isCurrent && <div className="tax-viz-subject-b__corner" aria-hidden />}
              <div className="tax-viz-subject-b__icon">
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="tax-viz-subject-b__name">{meta.shortName}</div>
              <div className="tax-viz-subject-b__desc">{meta.shortDesc}</div>
            </LiquidMetalButton>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              纳税主体
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              点击卡片切换 · 右侧勾选对比
            </div>
          </div>
          {compareSubject && (
            <LiquidMetalButton
              type="button"
              onClick={() => setCompareSubject(null)}
              className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-amber-300/90 transition-colors hover:bg-white/5"
            >
              退出对比
            </LiquidMetalButton>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="纳税主体"
          className="grid grid-cols-2 gap-2.5"
        >
          {SUBJECTS.map((s) => {
            const isCurrent = s.id === currentSubject
            const isCompared = s.id === compareSubject
            const visual = SUBJECT_VISUAL[s.color]
            return (
              <div
                key={s.id}
                role="radio"
                aria-checked={isCurrent}
                tabIndex={isCurrent ? 0 : -1}
                onClick={() => setCurrentSubject(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setCurrentSubject(s.id)
                  }
                }}
                style={{ '--subject-accent': visual.hex } as CSSProperties}
                className={cn(
                  'tax-viz-subject group flex cursor-pointer flex-col gap-1.5 border px-3 py-2.5 pl-4 text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                  isCurrent || isCompared
                    ? visual.cardClass
                    : 'border-border/80 bg-white/[0.02] hover:border-white/15',
                  isCurrent && 'tax-viz-subject--current',
                  isCompared && 'tax-viz-subject--compare',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <div
                      className={cn('size-2 shrink-0 rounded-full', visual.dotClass)}
                      style={{
                        boxShadow: isCurrent ? `0 0 8px ${visual.hex}` : undefined,
                      }}
                    />
                    <span className="truncate text-xs font-semibold text-foreground">
                      {s.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-400">
                        <Check className="size-2.5" aria-hidden />
                        当前
                      </span>
                    )}
                  </div>

                  <label
                    className={cn(
                      'flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1 py-0.5',
                      'hover:bg-white/5',
                      s.id === currentSubject && 'cursor-not-allowed opacity-40',
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isCompared}
                      onCheckedChange={() => toggleCompare(s.id)}
                      disabled={s.id === currentSubject}
                      aria-label={
                        s.id === currentSubject
                          ? '当前主体,无法加入对比'
                          : `${s.name} 加入对比`
                      }
                      className="size-4"
                    />
                    <span className="text-[10px] text-muted-foreground select-none">
                      对比
                    </span>
                  </label>
                </div>

                <p className="text-xs leading-snug text-muted-foreground">
                  {s.description}
                </p>
              </div>
            )
          })}
        </div>

        {compareSubject && (
          <div className="mt-3 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
            VS · {SUBJECT_BY_ID[currentSubject]?.name ?? '?'} ↔{' '}
            {SUBJECT_BY_ID[compareSubject]?.name ?? '?'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
