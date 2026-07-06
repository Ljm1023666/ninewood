/** Agent 访问模式（对齐主流 Agent：Ask / Agent+Approval / Full） */
export type AgentAccessMode = 'readonly' | 'approval' | 'full'

export function normalizeAccessMode(value: unknown): AgentAccessMode {
  if (value === 'readonly' || value === 'approval' || value === 'full') {
    return value
  }
  return 'approval'
}

/** 是否允许直接执行写操作工具 */
export function canAutoExecuteWrites(accessMode: AgentAccessMode): boolean {
  return accessMode === 'full'
}

/** 是否允许联网搜索 */
export function canUseWebSearch(accessMode: AgentAccessMode): boolean {
  return accessMode === 'full'
}
