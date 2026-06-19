import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface TaxonomyNode {
  label: string
  parent: string | null
  childIds: string[]
}

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'taxonomy-data.json'), 'utf-8'),
) as Record<string, TaxonomyNode>
const TAXONOMY: Record<string, TaxonomyNode> = raw

/** 获取某节点下的所有叶子节点 ID（含自身，如果自身无子节点） */
export function getDescendantLeafIds(nodeId: string): string[] {
  const node: TaxonomyNode | undefined = TAXONOMY[nodeId]
  if (!node) return []
  if (node.childIds.length === 0) return [nodeId]
  const leaves: string[] = []
  for (const childId of node.childIds) {
    leaves.push(...getDescendantLeafIds(childId))
  }
  return leaves
}

/** 获取某节点的直接子节点 */
export function getChildNodes(nodeId: string): { id: string; label: string }[] {
  const node: TaxonomyNode | undefined = TAXONOMY[nodeId]
  if (!node) return []
  return node.childIds.map((id) => ({ id, label: TAXONOMY[id]?.label ?? id }))
}

/** 从根到指定节点的路径 */
export function getAncestorPath(nodeId: string): { id: string; label: string }[] {
  const parts: { id: string; label: string }[] = []
  let current: string | null = nodeId
  while (current) {
    const node: TaxonomyNode | undefined = TAXONOMY[current]
    if (!node) break
    parts.unshift({ id: current, label: node.label })
    current = node.parent
  }
  return parts
}

/** 根据中文标签路径查找 taxonomy 节点 ID（从 root 开始逐层匹配） */
export function findNodeByLabels(labels: string[]): string | null {
  if (labels.length === 0) return null
  // 跳过 "全部" 开始
  const start = labels[0] === '全部' ? 1 : 0
  if (start >= labels.length) return 'root'

  let currentId = 'root'
  for (let i = start; i < labels.length; i++) {
    const targetLabel = labels[i]
    const node: TaxonomyNode | undefined = TAXONOMY[currentId]
    if (!node) return null
    const child = node.childIds.find(
      (cid) => TAXONOMY[cid]?.label === targetLabel,
    )
    if (!child) return null
    currentId = child
  }
  return currentId
}

/**
 * 生成一个用于 AI prompt 的分类树快照（仅包含前几层结构，控制 token）
 */
export function taxonomySnapshot(maxDepth = 3): string {
  const lines: string[] = []
  function walk(nodeId: string, depth: number): void {
    if (depth > maxDepth) return
    const node: TaxonomyNode | undefined = TAXONOMY[nodeId]
    if (!node) return
    const indent = '  '.repeat(depth)
    lines.push(`${indent}- ${node.label} (${nodeId})`)
    for (const childId of node.childIds) {
      walk(childId, depth + 1)
    }
  }
  walk('root', 0)
  return lines.join('\n')
}

/** 获取顶层（线上/线下）下的所有类目标签列表 */
export function getTopCategories(): string[] {
  const top: string[] = []
  for (const childId of TAXONOMY.root?.childIds ?? []) {
    const node: TaxonomyNode | undefined = TAXONOMY[childId]
    if (!node) continue
    for (const subId of node.childIds) {
      top.push(TAXONOMY[subId]?.label ?? subId)
    }
  }
  return top
}
