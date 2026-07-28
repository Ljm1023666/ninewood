/**
 * 资金写请求的幂等键：同一意图复用，用户重发换新。
 * 生产环境后端强制 Idempotency-Key。
 */
const slots = new Map<string, { key: string; refs: number }>()

export function beginIdempotencyKey(scope: string, resourceId: string): string {
  const id = `${scope}:${resourceId}`
  const cur = slots.get(id)
  if (cur) {
    cur.refs += 1
    return cur.key
  }
  const key =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  slots.set(id, { key, refs: 1 })
  return key
}

export function endIdempotencyKey(scope: string, resourceId: string) {
  const id = `${scope}:${resourceId}`
  const cur = slots.get(id)
  if (!cur) return
  cur.refs -= 1
  if (cur.refs <= 0) slots.delete(id)
}

export function idempotencyHeaders(scope: string, resourceId: string): Record<string, string> {
  return { 'Idempotency-Key': beginIdempotencyKey(scope, resourceId) }
}
