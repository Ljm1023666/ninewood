import type { RegisteredTool } from './tool-registry.js'
import { toolRegistry } from './tool-registry.js'

/** 工具调用记录（持久化到 AgentMessage.toolCalls） */
export type StoredToolCall = {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: 'running' | 'pending' | 'executed' | 'rejected'
  steps: string[]
  result?: string
  data?: unknown
  success?: boolean
}

const TOOL_START_LABELS: Record<string, (args: Record<string, unknown>) => string> = {
  search_demands: (a) => {
    const kw = a.keyword || a.tagName || a.category
    return kw ? `正在搜索公开需求：${kw}` : '正在搜索平台公开需求'
  },
  get_demand_detail: () => '正在读取需求详情',
  list_my_demands: () => '正在获取你的需求列表',
  list_my_applications: () => '正在获取你的申请记录',
  list_my_orders: () => '正在获取你的订单',
  list_applicants: () => '正在查看申请人列表',
  get_user_profile: () => '正在查看用户公开资料',
  search_users: (a) =>
    a.keyword ? `正在搜索用户：${a.keyword}` : '正在搜索用户',
  read_knowledge: (a) =>
    a.query ? `正在查阅知识库：${a.query}` : '正在查阅平台知识库',
  navigate_to: (a) => {
    const path = String(a.path || '').trim()
    if (path.startsWith('/')) return `正在打开${path}`
    const page = String(a.page || '')
    return page ? `正在跳转到「${page}」` : '正在跳转页面'
  },
  create_demand: () => '准备发布需求（需你批准）',
  update_demand: () => '准备更新需求（需你批准）',
  withdraw_demand: () => '准备下架需求（需你批准）',
  apply_for_demand: () => '准备申请接单（需你批准）',
  accept_applicant: () => '准备接受申请人（需你批准）',
  reject_applicant: () => '准备拒绝申请人（需你批准）',
}

export function describeToolStart(
  name: string,
  args: Record<string, unknown>,
): string {
  const fn = TOOL_START_LABELS[name]
  if (fn) return fn(args)
  const tool = toolRegistry.get(name)
  return tool
    ? `正在执行：${tool.definition.description.slice(0, 40)}`
    : `正在执行：${name}`
}

export function describeToolDone(
  name: string,
  message: string,
  pending: boolean,
): string {
  if (pending) return message
  if (name === 'navigate_to') return message
  return message
}

export function isWriteTool(name: string): boolean {
  return toolRegistry.requiresConfirmation(name)
}

export function filterToolsForAccessMode(
  accessMode: 'readonly' | 'approval' | 'full',
): (tool: RegisteredTool) => boolean {
  if (accessMode === 'readonly') {
    return (t) => !t.requiresConfirmation
  }
  return () => true
}
