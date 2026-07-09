/**
 * TASK-11 · P1 受控查询扩展（白名单）
 *
 * 解决「短词无法靠子串/同义词挂到正确池内路径」的精度问题：
 *   - 打车 / 叫车 → 网约车 + 叫车（即时单趟），并排除出租车/包车/租车/自驾租车
 *   - 租车 / 自驾租车 → 自驾类，并排除出租车/包车/网约车/叫车
 *   - 出租车 → 带司机出行，并排除租车/网约车/叫车
 *   - 外包 → 财务外包 / 客服外包 / 人事外包（复合 tag 拆挂）
 *
 * 设计原则：
 *   1. 扩展是「追加」而非「替换」——不跳过既有模糊计分，只确保白名单 tag 一定挂上。
 *   2. expandTags 仅当池内真实存在该 tag 时才挂载（避免挂空路径）。
 *   3. excludeTags 转为 excludePaths，在检索层 SQL 用 NOT (paths && exclude) 过滤。
 *   4. 触发词经 normalizeValue 归一化后精确匹配，不做模糊扩散（受控）。
 */
import { normalizeValue } from './path-codec.js'

export interface QueryExpansionRule {
  /** 触发词（归一化后精确匹配；含常见口语变体） */
  triggers: string[]
  /** 命中后强制挂上的 tag 值（白名单；仅当池内存在时挂载） */
  expandTags: string[]
  /** 命中后从检索结果排除的 tag 值（语义不相邻，如 打车≠出租车包车） */
  excludeTags: string[]
  note?: string
}

/** 受控扩展白名单——新增品类在此声明，不要散落到同义词表 */
export const QUERY_PATH_EXPANSIONS: QueryExpansionRule[] = [
  {
    triggers: ['打车', '叫车', '网约车', '滴滴', '打车出行', '网上叫车', '网约车接送'],
    expandTags: ['网约车', '叫车'],
    excludeTags: ['出租车', '包车', '租车', '自驾租车'],
    note: '打车=即时叫车（网约车/叫车），区别于出租车包车与自驾租车',
  },
  {
    triggers: ['租车', '自驾租车', '自驾'],
    expandTags: ['租车', '自驾租车'],
    excludeTags: ['出租车', '包车', '网约车', '叫车'],
    note: '自驾租车，排除出租车包车与网约车叫车',
  },
  {
    triggers: ['出租车', '出租'],
    expandTags: ['出租车'],
    excludeTags: ['租车', '自驾租车', '网约车', '叫车'],
    note: '出租车/包车类，排除自驾租车与网约车',
  },
  {
    triggers: ['外包'],
    expandTags: ['财务外包', '客服外包', '人事外包'],
    excludeTags: [],
    note: '外包→三类外包服务（财务/客服/人事），复合 tag 拆挂',
  },
]

/** 触发词 → 规则 的倒排索引（归一化 key） */
const TRIGGER_INDEX: Map<string, QueryExpansionRule> = new Map()
for (const rule of QUERY_PATH_EXPANSIONS) {
  for (const t of rule.triggers) {
    TRIGGER_INDEX.set(normalizeValue(t), rule)
  }
}

/** 判断某片段是否命中受控扩展规则 */
export function matchExpansionRule(segment: string): QueryExpansionRule | null {
  return TRIGGER_INDEX.get(normalizeValue(segment)) ?? null
}

/** 池内是否存在某 tag（用于决定 expandTags 是否挂载） */
function buildTagValueSet(tags: Iterable<string>): Set<string> {
  const out = new Set<string>()
  for (const t of tags) out.add(normalizeValue(t))
  return out
}

/**
 * 对一组片段应用受控扩展，返回：
 *   - expandPaths: 应追加的 tag 路径（仅池内存在的）
 *   - excludePaths: 应排除的 tag 路径
 */
export function applyQueryExpansions(
  segments: string[],
  poolTagValues: Iterable<string>,
): { expandPaths: string[]; excludePaths: string[] } {
  const tagSet = buildTagValueSet(poolTagValues)
  const expandPaths: string[] = []
  const excludePaths: string[] = []
  const seenExpand = new Set<string>()
  const seenExclude = new Set<string>()

  for (const seg of segments) {
    const rule = matchExpansionRule(seg)
    if (!rule) continue
    for (const tag of rule.expandTags) {
      const norm = normalizeValue(tag)
      if (!tagSet.has(norm)) continue
      const raw = `tag:${norm}`
      if (seenExpand.has(raw)) continue
      seenExpand.add(raw)
      expandPaths.push(raw)
    }
    for (const tag of rule.excludeTags) {
      const norm = normalizeValue(tag)
      const raw = `tag:${norm}`
      if (seenExclude.has(raw)) continue
      seenExclude.add(raw)
      excludePaths.push(raw)
    }
  }

  return { expandPaths, excludePaths }
}
