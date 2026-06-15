/** Agent 访问模式（对齐 Codex Composer） */
export type AgentAccessMode = 'readonly' | 'approval' | 'full'

export function normalizeAccessMode(value: unknown): AgentAccessMode {
  if (value === 'readonly' || value === 'approval' || value === 'full') {
    return value
  }
  return 'approval'
}
