import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface IndexEntry {
  nodeId: string
  words: string[]       // 触发词（如 "王者荣耀", "陪玩"）
  score: number         // 匹配权重
  isLeaf: boolean       // 叶子节点可搜需求
}

interface ClassifyResult {
  nodeId: string
  label: string
  path: string[]        // 从根到当前节点的 label 路径
  score: number
  matchedWords: string[]
}

let _index: IndexEntry[] | null = null

/** 从 taxonomy-data.json 构建关键词索引 */
function buildIndex(): IndexEntry[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'taxonomy-data.json'), 'utf-8'),
  ) as Record<string, { label: string; parent: string | null; childIds: string[] }>

  const entries: IndexEntry[] = []
  const leafSet = new Set<string>()

  // 先标记叶子节点
  for (const [id, node] of Object.entries(raw)) {
    if (node.childIds.length === 0) leafSet.add(id)
  }

  for (const [id, node] of Object.entries(raw)) {
    if (id === 'root') continue
    const label = node.label
    const parent = node.parent ? raw[node.parent] : null
    const grandparent = parent?.parent ? raw[parent.parent] : null
    const isLeaf = leafSet.has(id)

    // --- 生成触发词 ---

    const words: string[] = []
    // 自身标签
    words.push(label)
    // 父+子组合（如 "游戏陪玩教学"）
    if (parent) words.push(parent.label + label)
    // 爷+父+子（如 "线上服务游戏陪玩教学"）
    if (parent && grandparent) words.push(grandparent.label + parent.label + label)
    // 如果父节点是 "游戏"，父标签本身也是强信号（"游戏" → 游戏大类）
    if (parent?.label === '游戏') words.push('游戏')

    // --- 别名/常见说法 ---
    const aliases = getAliases(label, parent?.label)
    words.push(...aliases)

    // 去重
    const unique = [...new Set(words.filter(Boolean))]

    // 基础分：叶子节点更高（可搜索）
    const baseScore = isLeaf ? 10 : 5
    // 层级加分：越深越精确
    const depth = (node.parent ? 1 : 0) + (parent?.parent ? 1 : 0)
    const depthBonus = depth * 2

    entries.push({
      nodeId: id,
      words: unique,
      score: baseScore + depthBonus,
      isLeaf,
    })
  }

  return entries
}

/** 为特定 label+parent 生成常见别名 */
function getAliases(label: string, parentLabel?: string): string[] {
  const aliases: string[] = []
  const labelLower = label.toLowerCase()

  // 游戏大类别名（服务类型词）
  if (label === '代练上分' || label.includes('代练') || label.includes('代打')) {
    aliases.push('代练', '代打', '上分', '冲分', '上段位', '上星')
  }
  if (label === '陪玩教学' || label.includes('陪玩')) {
    aliases.push('陪玩', '陪练', '教学', '带玩', '带飞')
  }
  if (label === '账号交易' || label.includes('账号') || label.includes('号')) {
    aliases.push('买号', '卖号', '账号', '租号')
  }
  if (label === '道具代币' || label.includes('道具') || label.includes('代币') || label.includes('皮肤')) {
    aliases.push('皮肤', '点券', '道具', '代币')
  }
  if (label === '游戏直播') aliases.push('直播', '开播')

  // 游戏名称别名
  if (label === '王者荣耀' || label === '王者陪玩') aliases.push('王者', '王者荣耀')
  if (label.includes('英雄联盟') || label === 'LOL陪玩') aliases.push('lol', '英雄联盟', 'league')
  if (label.includes('PUBG') || label.includes('和平精英')) aliases.push('pubg', '吃鸡', '和平精英')

  // 通用能力词
  if (label === '陪玩教学' || parentLabel === '陪玩教学') {
    aliases.push('陪玩', '陪练', '带玩')
  }

  return aliases
}

/** 获取节点从根开始的路径标签 */
function getNodePath(nodeId: string): string[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'taxonomy-data.json'), 'utf-8'),
  ) as Record<string, { label: string; parent: string | null }>

  const labels: string[] = []
  let current: string | null = nodeId
  while (current && current !== 'root') {
    const node: { label: string; parent: string | null } | undefined = raw[current]
    if (!node) break
    labels.unshift(node.label)
    current = node.parent
  }
  return labels
}

/**
 * 核心分类函数：接收关键词数组，返回按匹配度排序的分类节点
 */
export function classifyKeywords(keywords: string[]): ClassifyResult[] {
  if (!_index) _index = buildIndex()
  if (!keywords || keywords.length === 0) return []

  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'taxonomy-data.json'), 'utf-8'),
  ) as Record<string, { label: string }>

  const scoreMap = new Map<string, { score: number; matchedWords: string[] }>()

  for (const kw of keywords) {
    const lowerKw = kw.toLowerCase()
    for (const entry of _index) {
      for (const word of entry.words) {
        // 触发词包含关键词 或 关键词包含触发词
        if (word.includes(lowerKw) || lowerKw.includes(word)) {
          const existing = scoreMap.get(entry.nodeId)
          const bonus = word === lowerKw ? 3 : 1 // 完全匹配加分
          if (existing) {
            existing.score += entry.score + bonus
            if (!existing.matchedWords.includes(kw)) existing.matchedWords.push(kw)
          } else {
            scoreMap.set(entry.nodeId, {
              score: entry.score + bonus,
              matchedWords: [kw],
            })
          }
        }
      }
    }
  }

  // 排序取 Top
  const sorted = [...scoreMap.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)

  return sorted.map(([nodeId, info]) => ({
    nodeId,
    label: raw[nodeId]?.label || nodeId,
    path: getNodePath(nodeId),
    score: info.score,
    matchedWords: info.matchedWords,
  }))
}

/**
 * 从关键词中提取分类，返回最适合搜索的分类节点 ID 列表
 * 策略：将叶子节点分数累加到父节点，取最佳中层节点，用其全部叶子搜索
 */
export function classifyForSearch(keywords: string[]): {
  nodeIds: string[]
  labels: string[]
  matchCount: number
} {
  const results = classifyKeywords(keywords)
  if (results.length === 0) return { nodeIds: [], labels: [], matchCount: 0 }

  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'taxonomy-data.json'), 'utf-8'),
  ) as Record<string, { label: string; parent: string | null; childIds: string[] }>

  // 将分数向上传播：叶子节点分数加到父节点上
  const parentScores = new Map<string, { score: number; label: string }>()
  for (const r of results) {
    // 当前节点加分
    const cur = parentScores.get(r.nodeId) || { score: 0, label: r.label }
    cur.score += r.score
    parentScores.set(r.nodeId, cur)

    // 父节点加分（累积叶子孩子的分数）
    const parentId = raw[r.nodeId]?.parent
    if (parentId && parentId !== 'root') {
      const parent = raw[parentId]
      const p = parentScores.get(parentId) || { score: 0, label: parent?.label || parentId }
      p.score += r.score
      parentScores.set(parentId, p)
    }
  }

  // 取父节点中分最高的，要求有子节点（不是叶子）
  const candidates = [...parentScores.entries()]
    .filter(([id]) => raw[id]?.childIds?.length > 0) // 有子节点
    .sort((a, b) => b[1].score - a[1].score)

  if (candidates.length === 0) return { nodeIds: [], labels: [], matchCount: 0 }

  const [bestId] = candidates[0]!

  // 用最佳节点的全部叶子节点搜索
  function getLeafIds(nodeId: string): string[] {
    const node = raw[nodeId]
    if (!node) return []
    if (node.childIds.length === 0) return [nodeId]
    return node.childIds.flatMap(cid => getLeafIds(cid))
  }

  const leafIds = getLeafIds(bestId)

  return {
    nodeIds: leafIds,
    labels: [raw[bestId]?.label || bestId],
    matchCount: results[0]!.score,
  }
}
