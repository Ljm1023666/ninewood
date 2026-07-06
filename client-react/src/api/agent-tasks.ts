/**
 * Task 10 · /api/agent/tasks 客户端封装
 *
 * 详见 docs/specs/TASK-10-agent-automation.md §6
 */
import api from './index'

export type AgentTaskFrequency = 'HOURLY' | 'DAILY' | 'WEEKLY'
export type DeliveryChannel = 'MESSAGE' | 'AGENT_INBOX'
export type AgentTaskRunStatus = 'SUCCESS' | 'EMPTY' | 'ERROR'

export interface AgentTask {
  id: string
  userId: string
  name: string
  type: string
  enabled: boolean
  frequency: AgentTaskFrequency
  atHour: number | null
  atMinute: number
  weekday: number | null
  filters: Record<string, unknown>
  deliveryChannels: DeliveryChannel[]
  lastRunAt: string | null
  nextRunAt: string
  lastSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentTaskRun {
  id: string
  taskId: string
  runAt: string
  status: AgentTaskRunStatus
  resultCount: number
  summary: string
  payload: unknown[] | null
  readAt: string | null
  createdAt: string
  task?: { id: string; name: string; type: string }
}

export interface CreateAgentTaskDto {
  name: string
  type: 'DEMAND_DIGEST'
  frequency: AgentTaskFrequency
  atHour?: number
  atMinute?: number
  weekday?: number
  filters: Record<string, unknown>
  deliveryChannels?: DeliveryChannel[]
}

export interface AgentTaskBuildStep {
  key: string
  label: string
}

export interface AgentTaskBuildResult {
  buildId: string
  ready: boolean
  name: string
  type: 'DEMAND_DIGEST'
  frequency: AgentTaskFrequency
  atHour: number | null
  atMinute: number
  weekday: number | null
  filters: Record<string, unknown>
  deliveryChannels: DeliveryChannel[]
  humanSchedule: string
  humanFilters: string
  summary: string
  revisionHint: string | null
  steps: AgentTaskBuildStep[]
  userDescription: string
  round: number
}

export interface BuildAgentTaskDto {
  description: string
  feedback?: string
  previousSummary?: string
  round?: number
}

export const agentTasksApi = {
  list: async (): Promise<AgentTask[]> => {
    const { data } = await api.get<{ tasks: AgentTask[] }>('/agent/tasks')
    return data.tasks
  },

  get: async (id: string): Promise<{ task: AgentTask; recentRuns: AgentTaskRun[] }> => {
    const { data } = await api.get<{ task: AgentTask; recentRuns: AgentTaskRun[] }>(
      `/agent/tasks/${id}`,
    )
    return data
  },

  create: async (dto: CreateAgentTaskDto): Promise<AgentTask> => {
    const { data } = await api.post<{ task: AgentTask }>('/agent/tasks', dto)
    return data.task
  },

  build: async (dto: BuildAgentTaskDto): Promise<AgentTaskBuildResult> => {
    const { data } = await api.post<{ build: AgentTaskBuildResult }>('/agent/tasks/build', dto)
    return data.build
  },

  patch: async (
    id: string,
    patch: Partial<{
      name: string
      enabled: boolean
      frequency: AgentTaskFrequency
      atHour: number | null
      atMinute: number
      weekday: number | null
      filters: Record<string, unknown>
      deliveryChannels: DeliveryChannel[]
    }>,
  ): Promise<AgentTask> => {
    const { data } = await api.patch<{ task: AgentTask }>(`/agent/tasks/${id}`, patch)
    return data.task
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/agent/tasks/${id}`)
  },

  runNow: async (id: string): Promise<AgentTaskRun> => {
    const { data } = await api.post<{ run: AgentTaskRun }>(`/agent/tasks/${id}/run-now`)
    return data.run
  },

  inbox: async (params: { limit?: number; offset?: number } = {}): Promise<{
    runs: AgentTaskRun[]
    total: number
  }> => {
    const { data } = await api.get<{ runs: AgentTaskRun[]; total: number }>(
      '/agent/tasks/inbox',
      { params },
    )
    return data
  },

  unreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/agent/tasks/inbox/unread-count')
    return data.count
  },

  markRead: async (runId: string): Promise<void> => {
    await api.post(`/agent/tasks/inbox/${runId}/read`)
  },
}