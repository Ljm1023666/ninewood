export type AgentAccessMode = 'readonly' | 'approval' | 'full'

export const AGENT_ACCESS_STORAGE_KEY = 'ninewood-agent-access-mode'

export const AGENT_ACCESS_MODES = [
  {
    id: 'approval' as const,
    label: '请求批准',
    hint: '查询可直接执行，写操作需你批准',
  },
  {
    id: 'full' as const,
    label: '完全访问',
    hint: '可直接执行全部工具并联网搜索',
  },
  {
    id: 'readonly' as const,
    label: '只读建议',
    hint: '仅文字建议，不调用任何工具',
  },
]

export function normalizeAccessMode(value: unknown): AgentAccessMode {
  if (value === 'readonly' || value === 'approval' || value === 'full') {
    return value
  }
  return 'approval'
}

export function readStoredAccessMode(): AgentAccessMode {
  try {
    return normalizeAccessMode(
      localStorage.getItem(AGENT_ACCESS_STORAGE_KEY),
    )
  } catch {
    return 'approval'
  }
}

export const AGENT_TOOL_LABELS: Record<string, string> = {
  search_demands: '搜索需求',
  create_demand: '发布需求',
  get_demand_detail: '查看需求详情',
  update_demand: '更新需求',
  withdraw_demand: '下架需求',
  list_my_demands: '我的需求列表',
  apply_for_demand: '申请接单',
  list_applicants: '查看申请人',
  accept_applicant: '接受申请人',
  reject_applicant: '拒绝申请人',
  list_my_applications: '我的申请',
  list_my_orders: '我的订单',
  get_user_profile: '查看用户资料',
  search_users: '搜索用户',
  read_knowledge: '查阅知识库',
  navigate_to: '页面跳转',
}
