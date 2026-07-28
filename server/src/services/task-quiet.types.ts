/**
 * 任务 Quiet / CompletionSummary 类型（Phase 2）
 * FeeBreakdown 属 Phase 3，此处仅可选占位。
 */

export type QuietResourceType = 'LOOP_RUN' | 'ORDER' | 'AGENT_TASK' | 'DEMAND'

export type QuietOutcomeStatus =
  | 'SUCCEEDED'
  | 'FAILED'
  | 'INCONCLUSIVE'
  | 'CANCELLED'
  | 'WITHDRAWN'
  | 'EXPIRED'

export type CompletionSummary = {
  resourceType: QuietResourceType
  resourceId: string
  outcomeStatus: QuietOutcomeStatus
  outcomeSummary: string
  evidenceSummary?: string[]
  feeBreakdown?: unknown
  activeTimeEstimateMs?: number
  nextRequiredAction: null | {
    label: string
    action: string
  }
  notificationsStopped: string[]
  quietedAt?: string
  alreadyQuiet?: boolean
}

export type QuietInput = {
  resourceType: QuietResourceType
  resourceId: string
  outcomeStatus: QuietOutcomeStatus
  outcomeSummary: string
  userId?: string | null
  /** 需停止的订阅 sourceRef 列表 */
  sourceRefs?: string[]
  evidenceSummary?: string[]
  nextRequiredAction?: CompletionSummary['nextRequiredAction']
}

export function defaultSourceRefsFor(
  resourceType: QuietResourceType,
  resourceId: string,
): string[] {
  switch (resourceType) {
    case 'LOOP_RUN':
      return [`loop_run:${resourceId}`]
    case 'ORDER':
      return [`order:${resourceId}`]
    case 'AGENT_TASK':
      return [`agent_task:${resourceId}`]
    case 'DEMAND':
      return [`demand:${resourceId}`]
    default:
      return []
  }
}

export function mapLoopStatusToOutcome(
  status: string,
): QuietOutcomeStatus {
  if (status === 'SUCCEEDED' || status === 'CLOSED') return 'SUCCEEDED'
  if (status === 'FAILED') return 'FAILED'
  if (status === 'INCONCLUSIVE') return 'INCONCLUSIVE'
  return 'CANCELLED'
}

export function mapOrderStatusToOutcome(status: string): QuietOutcomeStatus {
  if (status === 'COMPLETED') return 'SUCCEEDED'
  if (status === 'CANCELLED') return 'CANCELLED'
  if (status === 'REFUNDED') return 'CANCELLED'
  return 'INCONCLUSIVE'
}
