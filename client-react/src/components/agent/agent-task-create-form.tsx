/**
 * 自然语言构建定时任务（Codex 式：描述 → AI 构建流程 → 多轮迭代 → 保存）
 */
import { useState } from 'react'
import {
  agentTasksApi,
  type AgentTaskBuildResult,
} from '@/api/agent-tasks'
import { AgentTaskBuildFlow } from '@/components/agent/agent-task-build-flow'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { cn } from '@/lib/utils'

interface Props {
  onCreated?: (taskId: string) => void
  onCancel?: () => void
  disabled?: boolean
  className?: string
}

export function AgentTaskCreateForm({ onCreated, onCancel, disabled, className }: Props) {
  const [description, setDescription] = useState('')
  const [feedback, setFeedback] = useState('')
  const [build, setBuild] = useState<AgentTaskBuildResult | null>(null)
  const [building, setBuilding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuild() {
    if (disabled || building) return
    const desc = description.trim()
    if (!desc) {
      setError('请先用自然语言描述你想定时执行的任务')
      return
    }

    setBuilding(true)
    setError(null)
    try {
      const result = await agentTasksApi.build({
        description: desc,
        feedback: feedback.trim() || undefined,
        previousSummary: build?.summary,
        round: build?.round,
      })
      setBuild(result)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string }
      setError(ax.response?.data?.message || ax.message || '构建失败，请重试')
    } finally {
      setBuilding(false)
    }
  }

  async function handleSave() {
    if (!build || saving || disabled) return

    setSaving(true)
    setError(null)
    try {
      const task = await agentTasksApi.create({
        name: build.name,
        type: build.type,
        frequency: build.frequency,
        atHour: build.atHour ?? undefined,
        atMinute: build.atMinute,
        weekday: build.weekday ?? undefined,
        filters: build.filters,
        deliveryChannels: build.deliveryChannels,
      })
      setDescription('')
      setFeedback('')
      setBuild(null)
      onCreated?.(task.id)
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string }
      setError(ax.response?.data?.message || ax.message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('agent-task-builder', className)}>
      <div className="agent-task-form__head">
        <div>
          <h2 className="agent-task-form__title">描述你的定时任务</h2>
          <p className="agent-task-form__subtitle">
            用一句话说明「什么时候、筛什么、推送到哪」；复杂条件都写在描述里即可
          </p>
        </div>
        {onCancel && (
          <LiquidMetalButton
            type="button"
            className="agent-btn agent-btn--ghost agent-btn--xs"
            onClick={onCancel}
          >
            收起
          </LiquidMetalButton>
        )}
      </div>

      <div className="agent-task-builder__composer">
        <textarea
          className="agent-task-builder__textarea"
          rows={4}
          value={description}
          onChange={e => {
            setDescription(e.target.value)
            setError(null)
          }}
          placeholder="例如：每天早上 9 点，帮我筛含「王者荣耀」标签、近 24 小时内发布的新需求，推到消息中心和结果箱"
          disabled={disabled || building}
        />
        <p className="agent-task-form__hint">
          可包含：频率（每小时/每天/每周）、时刻、标签/关键词、价格、近 N 小时等
        </p>
      </div>

      {build && (
        <div className="agent-task-builder__refine">
          <label className="agent-task-form__label" htmlFor="agent-task-feedback">
            继续补充（可选，多轮构建）
          </label>
          <textarea
            id="agent-task-feedback"
            className="agent-task-builder__textarea agent-task-builder__textarea--sm"
            rows={2}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="例如：改成每周一早上 8 点，只要线上服务"
            disabled={disabled || building}
          />
        </div>
      )}

      {build && <AgentTaskBuildFlow build={build} className="agent-task-builder__flow" />}

      {error && <div className="agent-tasks-page__error">{error}</div>}

      <div className="agent-task-form__actions">
        <LiquidMetalButton
          label={building ? '构建中…' : build ? '再次构建' : '构建任务'}
          onClick={handleBuild}
          disabled={disabled || building || saving || !description.trim()}
        />

        {build && (
          <LiquidMetalButton
            label={saving ? '保存中…' : '保存并开始自动化'}
            onClick={handleSave}
            disabled={disabled || building || saving}
          />
        )}

        {onCancel && (
          <LiquidMetalButton
            type="button"
            className="agent-btn agent-btn--ghost"
            onClick={onCancel}
            disabled={building || saving}
          >
            取消
          </LiquidMetalButton>
        )}
      </div>

      <p className="agent-task-builder__constitution">
        平台宪法：自动化只读 + 只推送，调度器永不调用写工具
      </p>
    </div>
  )
}
