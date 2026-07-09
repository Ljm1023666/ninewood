/** 路径展示：同值 kw+tag 合并为对角双色标签 */

export function pathType(raw: string): string {
  const i = raw.indexOf(':')
  return i >= 0 ? raw.slice(0, i) : ''
}

export function pathValue(raw: string): string {
  const i = raw.indexOf(':')
  return i >= 0 ? raw.slice(i + 1) : raw
}

export type PathDisplayEntry =
  | {
      kind: 'single'
      paths: [string]
      value: string
      dualKwTag: false
    }
  | {
      kind: 'merged'
      paths: [string, string]
      value: string
      dualKwTag: true
      dualKinds: ['kw', 'tag']
    }

/** 将同值的 kw:+tag: 合并为一条展示项，保持原 paths 顺序 */
export function groupPathsForDisplay(rawPaths: string[]): PathDisplayEntry[] {
  const byValue = new Map<string, string[]>()
  for (const p of rawPaths) {
    const v = pathValue(p)
    const list = byValue.get(v) ?? []
    list.push(p)
    byValue.set(v, list)
  }

  const consumed = new Set<string>()
  const out: PathDisplayEntry[] = []

  for (const p of rawPaths) {
    if (consumed.has(p)) continue
    const v = pathValue(p)
    const group = byValue.get(v) ?? [p]
    const kw = group.find((x) => pathType(x) === 'kw')
    const tag = group.find((x) => pathType(x) === 'tag')

    if (kw && tag) {
      consumed.add(kw)
      consumed.add(tag)
      out.push({
        kind: 'merged',
        paths: [kw, tag],
        value: v,
        dualKwTag: true,
        dualKinds: ['kw', 'tag'],
      })
    } else {
      consumed.add(p)
      out.push({ kind: 'single', paths: [p], value: v, dualKwTag: false })
    }
  }

  return out
}

export function entryHasIntent(entry: PathDisplayEntry, intentSet: Set<string>): boolean {
  return entry.paths.some((p) => intentSet.has(p))
}
