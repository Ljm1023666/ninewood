/**
 * CompletionSummary 展示（Phase 2）
 * - nextRequiredAction=null 时主 CTA 为关闭/返回
 * - 禁止「你可能还喜欢 / 继续探索」类无关推荐
 */

import { useNavigate } from 'react-router-dom'
import type { CompletionSummary } from '@/api/notification-policy'
import { QuietConfirmation } from './QuietConfirmation'

const OUTCOME_LABEL: Record<string, string> = {
  SUCCEEDED: '已完成',
  FAILED: '未成功',
  INCONCLUSIVE: '结果不确定',
  CANCELLED: '已取消',
  WITHDRAWN: '已撤回',
  EXPIRED: '已过期',
}

type Props = {
  summary: CompletionSummary
  /** 次要：查看详情（不替代主 CTA） */
  onViewDetail?: () => void
  /** 主返回路径 */
  returnTo?: string
}

export function CompletionSummaryView({
  summary,
  onViewDetail,
  returnTo = '/',
}: Props) {
  const navigate = useNavigate()
  const primary =
    summary.nextRequiredAction == null
      ? {
          label: '完成并返回',
          onClick: () => navigate(returnTo),
        }
      : {
          label: summary.nextRequiredAction.label,
          onClick: () => {
            if (summary.nextRequiredAction?.action === 'VIEW_DETAIL' && onViewDetail) {
              onViewDetail()
              return
            }
            navigate(returnTo)
          },
        }

  return (
    <section
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
      data-testid="completion-summary"
    >
      <p className="text-xs uppercase tracking-wide text-text-muted">完成确认</p>
      <h2 className="mt-1 text-lg font-semibold text-text-primary">
        {OUTCOME_LABEL[summary.outcomeStatus] || summary.outcomeStatus}
      </h2>
      <p className="mt-2 text-sm text-text-secondary">{summary.outcomeSummary}</p>

      {summary.evidenceSummary && summary.evidenceSummary.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
          {summary.evidenceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {summary.notificationsStopped.length > 0 && (
        <p className="mt-3 text-xs text-text-muted">
          已停止相关机会通知（{summary.notificationsStopped.length} 项）
        </p>
      )}

      <QuietConfirmation
        primaryLabel={primary.label}
        onPrimary={primary.onClick}
        secondaryLabel={onViewDetail ? '查看详情' : undefined}
        onSecondary={onViewDetail}
      />
    </section>
  )
}
