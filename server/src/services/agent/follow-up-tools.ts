import type { ToolResult } from './tool-registry.js'

export type ExecutedTool = {
  name: string
  arguments: Record<string, unknown>
  result: ToolResult
}

/** 用户是否要求打开搜索结果中的第一条 */
export function userWantsOpenFirstDemand(message: string): boolean {
  const m = message.replace(/\s/g, '')
  if (/打开第一个|并打开第一个|打开第1|打开首个|打开第一条/.test(m)) {
    return true
  }
  if (/打开/.test(m) && /第一个|首个|第1|第一条/.test(m)) {
    return true
  }
  if (/并打开/.test(m) && /第一个|首个|那条|那个|结果/.test(m)) {
    return true
  }
  return false
}

function firstDemandIdFromSearch(data: unknown): string | null {
  if (!Array.isArray(data) || data.length === 0) return null
  const first = data[0] as { id?: unknown }
  return typeof first?.id === 'string' ? first.id : null
}

/** 根据用户意图 + 已执行工具，推断还需自动执行的只读工具 */
export function inferFollowUpTools(
  userMessage: string,
  executed: ExecutedTool[],
): Array<{ name: string; arguments: Record<string, unknown> }> {
  const followUps: Array<{ name: string; arguments: Record<string, unknown> }> = []

  const alreadyNavigated = executed.some(
    (e) =>
      e.name === 'navigate_to' &&
      e.result.success &&
      typeof (e.result.data as { path?: string })?.path === 'string',
  )
  if (alreadyNavigated) return followUps

  const search = executed.find(
    (e) => e.name === 'search_demands' && e.result.success,
  )
  if (search && userWantsOpenFirstDemand(userMessage)) {
    const demandId = firstDemandIdFromSearch(search.result.data)
    if (demandId) {
      followUps.push({
        name: 'navigate_to',
        arguments: { path: `/demands/${demandId}` },
      })
    }
  }

  return followUps
}

export function extractNavigatePath(result: ToolResult): string | null {
  if (!result.success || !result.data || typeof result.data !== 'object') {
    return null
  }
  const path = (result.data as { path?: unknown }).path
  return typeof path === 'string' && path.startsWith('/') ? path : null
}
