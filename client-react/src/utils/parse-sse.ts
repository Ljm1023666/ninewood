export type SseEvent = { type: string; data: string }

/** 解析单条 SSE 事件块 */
export function parseSseEvent(chunk: string): SseEvent | null {
  const trimmed = chunk.trim()
  if (!trimmed) return null
  const lines = trimmed.split('\n')
  let type = 'message'
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('event:')) type = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (dataLines.length === 0) return null
  return { type, data: dataLines.join('\n') }
}

/** 从缓冲区拆出完整事件，remainder 留给下次拼接 */
export function splitSseBuffer(buf: string): { events: SseEvent[]; remainder: string } {
  const parts = buf.split('\n\n')
  const remainder = parts.pop() || ''
  const events: SseEvent[] = []
  for (const part of parts) {
    const parsed = parseSseEvent(part)
    if (parsed) events.push(parsed)
  }
  return { events, remainder }
}

/** 流结束时尝试解析尾部残留 */
export function flushSseBuffer(buf: string): SseEvent[] {
  const parsed = parseSseEvent(buf)
  return parsed ? [parsed] : []
}
