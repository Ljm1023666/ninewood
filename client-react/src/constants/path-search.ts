/** 路径 type 中文标签（与 server path-codec 对齐） */
import { splitQueryInputs } from '@/utils/path-codec'

export const PATH_TYPE_LABEL: Record<string, string> = {
  tx: '分类',
  cat: '类目',
  tag: '标签',
  attr: '属性',
  bkt: '预算',
  rgn: '地区',
  kw: '关键词',
}

export { SCORING_PATH_TYPES, FACET_PATH_TYPES, isScoringPath, isFacetPath } from '@/utils/path-codec'
export { splitQueryInputs } from '@/utils/path-codec'

export const PATH_QUERY_MAX = 8
export const FACET_QUERY_MAX = 6

export type PathMatchMode = 'any' | 'majority' | 'all' | 'custom'
export type IntentMatchMode = 'off' | 'any' | 'all'
export type PathSortMode =
  | 'cross_hit'
  | 'intent_first'
  | 'hit_rate'
  | 'credit'
  | 'newest'
  | 'price_asc'
  | 'price_desc'

export const PATH_MATCH_OPTIONS: { value: PathMatchMode; label: string }[] = [
  { value: 'any', label: '任意命中' },
  { value: 'majority', label: '多数命中' },
  { value: 'all', label: '全部命中' },
  { value: 'custom', label: '至少 N 条' },
]

export const INTENT_MATCH_OPTIONS: { value: IntentMatchMode; label: string }[] = [
  { value: 'off', label: '不限' },
  { value: 'any', label: '含意图' },
  { value: 'all', label: '意图全中' },
]

export const PATH_SORT_OPTIONS: { value: PathSortMode; label: string }[] = [
  { value: 'cross_hit', label: '交叉命中' },
  { value: 'intent_first', label: '意图优先' },
  { value: 'hit_rate', label: '命中率' },
  { value: 'credit', label: '信用优先' },
  { value: 'newest', label: '最新发布' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
]

export const DEFAULT_PATH_MATCH: PathMatchMode = 'any'
export const DEFAULT_INTENT_MATCH: IntentMatchMode = 'off'
export const DEFAULT_PATH_SORT: PathSortMode = 'cross_hit'

export function pathSortLabel(sort: PathSortMode): string {
  return PATH_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort
}

export function parseMatchParam(raw: string | null): PathMatchMode {
  const v = raw as PathMatchMode
  return PATH_MATCH_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_PATH_MATCH
}

export function parseIntentMatchParam(raw: string | null): IntentMatchMode {
  const v = raw as IntentMatchMode
  return INTENT_MATCH_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_INTENT_MATCH
}

export function parseSortParam(raw: string | null): PathSortMode {
  const v = raw as PathSortMode
  return PATH_SORT_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_PATH_SORT
}

export function parseMinHitParam(raw: string | null, pathCount: number): number {
  const n = raw ? Number(raw) : 2
  if (!Number.isFinite(n)) return 2
  return Math.max(1, Math.min(pathCount, Math.floor(n)))
}

/** chip 变更后校正 match/minHit，避免 minHit 超过路径数 */
export function clampMatchForPathCount(
  match: PathMatchMode,
  minHit: number,
  pathCount: number,
): { match: PathMatchMode; minHit: number } {
  if (pathCount < 1) return { match: 'any', minHit: 1 }
  if (match === 'custom' && minHit > pathCount) {
    return { match: 'any', minHit: 1 }
  }
  if (match === 'all' && pathCount > 0) {
    return { match, minHit: pathCount }
  }
  return { match, minHit: Math.max(1, Math.min(minHit, pathCount)) }
}

export function formatPathDisplay(raw: string): string {
  const i = raw.indexOf(':')
  if (i <= 0) return raw
  const type = raw.slice(0, i)
  const value = raw.slice(i + 1)
  const label = PATH_TYPE_LABEL[type] ?? type
  if (type === 'rgn') {
    const id = Number(value)
    const name = Number.isFinite(id) ? REGION_ID_LABEL[id] ?? value : value
    return `${label} · ${name}`
  }
  if (type === 'bkt') {
    const key = value.startsWith('price=') ? value.slice('price='.length) : value
    return `${label} · ${formatPriceBucketLabel(key)}`
  }
  return `${label} · ${value}`
}

export function parsePathsParam(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function serializePathsParam(paths: string[]): string {
  return paths.join(',')
}

export function parseFacetsParam(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function serializeFacetsParam(facets: string[]): string {
  return facets.join(',')
}

/** 受控排除路径（如 打车 排除 出租车/包车）序列化/反序列化 */
export function serializeExcludePathsParam(excludePaths: string[]): string | undefined {
  return excludePaths.length ? excludePaths.join(',') : undefined
}

export function parseExcludePathsParam(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

/** 解析状态：hit=全部命中 / partial=部分片段未挂路径 / miss=零命中 */
export type ResolveStatus = 'hit' | 'partial' | 'miss'

export const RESOLVE_STATUS_LABEL: Record<ResolveStatus, string> = {
  hit: '已匹配',
  partial: '部分匹配',
  miss: '未匹配',
}

export const RESOLVE_STATUS_HINT: Record<ResolveStatus, string> = {
  hit: '查询词已全部映射到检索池路径',
  partial: '部分查询词未能映射，结果可能不全',
  miss: '未在检索池中找到匹配路径，试试下方推荐',
}

/** 从 URL 合并 paths + facets，并从 paths 中剥离 facet（兼容旧链接） */
export function parseSearchUrlInputs(
  pathsRaw: string | null,
  facetsRaw: string | null,
): { scoringPaths: string[]; facets: string[] } {
  const merged = [...parsePathsParam(pathsRaw), ...parseFacetsParam(facetsRaw)]
  return splitQueryInputs(merged)
}

const PRICE_BUCKET_LABEL: Record<string, string> = {
  '0_100': '¥0–100',
  '100_500': '¥100–500',
  '500_1000': '¥500–1000',
  '1000_5000': '¥1,000–5,000',
  '5000_20000': '¥5,000–2万',
  '20000_plus': '¥2万+',
}

export function formatPriceBucketLabel(key: string): string {
  return PRICE_BUCKET_LABEL[key] ?? key
}

/** 筛选 UI：服务方式 */
export const SERVICE_TYPE_FACET_OPTIONS = [
  { label: '不限', value: null as string | null },
  { label: '线上', value: 'attr:servicetype=online' },
  { label: '线下', value: 'attr:servicetype=offline' },
] as const

/** 筛选 UI：价格档（value 为 bkt:price=*） */
export const PRICE_FACET_OPTIONS = [
  { label: '不限', value: null as string | null },
  { label: formatPriceBucketLabel('0_100'), value: 'bkt:price=0_100' },
  { label: formatPriceBucketLabel('100_500'), value: 'bkt:price=100_500' },
  { label: formatPriceBucketLabel('500_1000'), value: 'bkt:price=500_1000' },
  { label: formatPriceBucketLabel('1000_5000'), value: 'bkt:price=1000_5000' },
  { label: formatPriceBucketLabel('5000_20000'), value: 'bkt:price=5000_20000' },
  { label: formatPriceBucketLabel('20000_plus'), value: 'bkt:price=20000_plus' },
] as const

/** 地区下拉选项（复制自 server/src/services/region-aliases.ts 的 REGION_ENTRIES，id→rgn:<id>） */
const REGION_OPTIONS: { id: number; label: string }[] = [
  // 直辖市
  { id: 110000, label: '北京' },
  { id: 120000, label: '天津' },
  { id: 310000, label: '上海' },
  { id: 500000, label: '重庆' },
  // 省份
  { id: 320000, label: '江苏' },
  { id: 330000, label: '浙江' },
  { id: 350000, label: '福建' },
  { id: 420000, label: '湖北' },
  { id: 440000, label: '广东' },
  { id: 510000, label: '四川' },
  { id: 530000, label: '云南' },
  { id: 610000, label: '陕西' },
  { id: 340000, label: '安徽' },
  { id: 370000, label: '山东' },
  { id: 360000, label: '江西' },
  { id: 410000, label: '河南' },
  { id: 430000, label: '湖南' },
  { id: 210000, label: '辽宁' },
  { id: 230000, label: '黑龙江' },
  { id: 520000, label: '贵州' },
  { id: 460000, label: '海南' },
  { id: 640000, label: '宁夏' },
  { id: 630000, label: '青海' },
  { id: 540000, label: '西藏' },
  // 重点城市
  { id: 440100, label: '广州' },
  { id: 440300, label: '深圳' },
  { id: 330100, label: '杭州' },
  { id: 510100, label: '成都' },
  { id: 420100, label: '武汉' },
  { id: 610100, label: '西安' },
  { id: 320100, label: '南京' },
  { id: 530100, label: '昆明' },
  { id: 350200, label: '厦门' },
  { id: 430100, label: '长沙' },
  { id: 410100, label: '郑州' },
  { id: 370200, label: '青岛' },
  { id: 320500, label: '苏州' },
  { id: 350100, label: '福州' },
  { id: 210100, label: '沈阳' },
  { id: 230100, label: '哈尔滨' },
  { id: 520100, label: '贵阳' },
  { id: 460100, label: '海口' },
  { id: 640100, label: '银川' },
  { id: 630100, label: '西宁' },
  { id: 320200, label: '无锡' },
  { id: 330200, label: '宁波' },
  { id: 340100, label: '合肥' },
  { id: 360100, label: '南昌' },
  { id: 370100, label: '济南' },
  { id: 440600, label: '佛山' },
  { id: 441900, label: '东莞' },
  { id: 540100, label: '拉萨' },
  // 市辖区
  { id: 110101, label: '东城区' },
  { id: 110105, label: '朝阳区' },
  { id: 110108, label: '海淀区' },
  { id: 310104, label: '徐汇区' },
  { id: 310106, label: '静安区' },
  { id: 310115, label: '浦东新区' },
  { id: 440104, label: '越秀区' },
  { id: 440106, label: '天河区' },
  { id: 440304, label: '福田区' },
  { id: 440305, label: '南山区' },
  { id: 330106, label: '西湖区' },
  { id: 330108, label: '滨江区' },
  { id: 510107, label: '武侯区' },
  { id: 510109, label: '高新区' },
  { id: 420106, label: '武昌区' },
  { id: 420111, label: '洪山区' },
  { id: 610103, label: '碑林区' },
  { id: 610113, label: '雁塔区' },
  { id: 320102, label: '玄武区' },
  { id: 320106, label: '鼓楼区' },
  { id: 350203, label: '思明区' },
  { id: 350206, label: '湖里区' },
]

/** 筛选 UI：地区（value 为 rgn:<id>） */
export const REGION_FACET_OPTIONS: { label: string; value: string | null }[] = [
  { label: '不限', value: null },
  ...REGION_OPTIONS.map((r) => ({ label: r.label, value: `rgn:${r.id}` })),
]

/** regionId → 中文名（供 chip 显示，如 rgn:110000 → 北京） */
export const REGION_ID_LABEL: Record<number, string> = Object.fromEntries(
  REGION_OPTIONS.map((r) => [r.id, r.label]),
)

/** 替换同 type 的 facet（attr / bkt / rgn 各保留一条） */
export function replaceFacetOfType(
  facets: string[],
  type: 'attr' | 'bkt' | 'rgn',
  next: string | null,
): string[] {
  const kept = facets.filter((f) => {
    const i = f.indexOf(':')
    return i <= 0 || f.slice(0, i) !== type
  })
  if (!next) return kept
  if (kept.includes(next)) return kept
  if (kept.length >= FACET_QUERY_MAX) return kept
  return [...kept, next]
}

export function facetType(raw: string): string {
  const i = raw.indexOf(':')
  return i >= 0 ? raw.slice(0, i) : ''
}
