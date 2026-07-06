/**
 * 自动化任务构建结果展示（执行流程）
 */
import { MsIcon } from '@/components/ui/ms-icon'
import { cn } from '@/lib/utils'
import type { AgentTaskBuildResult } from '@/api/agent-tasks'

interface Props {
  build: AgentTaskBuildResult
  className?: string
}

export function AgentTaskBuildFlow({ build, className }: Props) {
  return (
    <div className={cn('agent-task-build-flow', className)}>
      <div className="agent-task-build-flow__head">
        <span className="agent-task-build-flow__icon" aria-hidden>
          <MsIcon name="checklist" size={14} />
        </span>
        <div>
          <p className="agent-task-build-flow__title">执行流程</p>
          <p className="agent-task-build-flow__sub">
            第 {build.round} 轮构建 · {build.ready ? '可保存' : '建议继续补充'}
          </p>
        </div>
      </div>

      <p className="agent-task-build-flow__summary">{build.summary}</p>

      <div className="agent-task-build-flow__meta">
        <span>⏰ {build.humanSchedule}</span>
        <span>🔍 {build.humanFilters}</span>
        <span>
          📡{' '}
          {build.deliveryChannels
            .map(c => (c === 'MESSAGE' ? '消息中心' : '结果箱'))
            .join(' + ')}
        </span>
      </div>

      <ol className="agent-task-build-flow__steps">
        {build.steps.map((step, i) => (
          <li key={step.key} className="agent-task-build-flow__step">
            <span className="agent-task-build-flow__step-idx">{i + 1}</span>
            <span className="agent-task-build-flow__step-label">{step.label}</span>
          </li>
        ))}
      </ol>

      {build.revisionHint && (
        <p className="agent-task-build-flow__hint">💡 {build.revisionHint}</p>
      )}
    </div>
  )
}
