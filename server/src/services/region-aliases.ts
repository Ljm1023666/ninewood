/**
 * 城市/区县名 → regionId（与 seed-regions、cityCode 对齐）
 * 供路径解析：地名优先走 rgn facet，而非 kw 计分
 */
import { normalizeValue } from './path-codec.js'

/** id + 可识别别名（含简称） */
const REGION_ENTRIES: { id: number; names: string[] }[] = [
  { id: 110000, names: ['北京市', '北京'] },
  { id: 120000, names: ['天津市', '天津'] },
  { id: 310000, names: ['上海市', '上海'] },
  { id: 500000, names: ['重庆市', '重庆'] },
  { id: 320000, names: ['江苏省', '江苏'] },
  { id: 330000, names: ['浙江省', '浙江'] },
  { id: 350000, names: ['福建省', '福建'] },
  { id: 420000, names: ['湖北省', '湖北'] },
  { id: 440000, names: ['广东省', '广东'] },
  { id: 510000, names: ['四川省', '四川'] },
  { id: 530000, names: ['云南省', '云南'] },
  { id: 610000, names: ['陕西省', '陕西'] },
  { id: 110101, names: ['东城区', '东城'] },
  { id: 110105, names: ['朝阳区', '朝阳'] },
  { id: 110108, names: ['海淀区', '海淀'] },
  { id: 310104, names: ['徐汇区', '徐汇'] },
  { id: 310106, names: ['静安区', '静安'] },
  { id: 310115, names: ['浦东新区', '浦东'] },
  { id: 440100, names: ['广州市', '广州'] },
  { id: 440300, names: ['深圳市', '深圳'] },
  { id: 440104, names: ['越秀区', '越秀'] },
  { id: 440106, names: ['天河区', '天河'] },
  { id: 440304, names: ['福田区', '福田'] },
  { id: 440305, names: ['南山区', '南山'] },
  { id: 330100, names: ['杭州市', '杭州'] },
  { id: 330106, names: ['西湖区', '西湖'] },
  { id: 330108, names: ['滨江区', '滨江'] },
  { id: 510100, names: ['成都市', '成都'] },
  { id: 510107, names: ['武侯区', '武侯'] },
  { id: 510109, names: ['高新区', '高新'] },
  { id: 420100, names: ['武汉市', '武汉'] },
  { id: 420106, names: ['武昌区', '武昌'] },
  { id: 420111, names: ['洪山区', '洪山'] },
  { id: 610100, names: ['西安市', '西安'] },
  { id: 610103, names: ['碑林区', '碑林'] },
  { id: 610113, names: ['雁塔区', '雁塔'] },
  { id: 320100, names: ['南京市', '南京'] },
  { id: 320102, names: ['玄武区', '玄武'] },
  { id: 320106, names: ['鼓楼区', '鼓楼'] },
  { id: 530100, names: ['昆明市', '昆明'] },
  { id: 350200, names: ['厦门市', '厦门'] },
  { id: 350203, names: ['思明区', '思明'] },
  { id: 350206, names: ['湖里区', '湖里'] },
  // seed-full 常用 cityCode（与 cityCode 字段一致）
  { id: 430100, names: ['长沙市', '长沙'] },
  { id: 410100, names: ['郑州市', '郑州'] },
  { id: 370200, names: ['青岛市', '青岛'] },
  { id: 320500, names: ['苏州市', '苏州'] },
  { id: 350100, names: ['福州市', '福州'] },
  { id: 210100, names: ['沈阳市', '沈阳'] },
  { id: 230100, names: ['哈尔滨市', '哈尔滨'] },
  { id: 520100, names: ['贵阳市', '贵阳'] },
  { id: 460100, names: ['海口市', '海口'] },
  { id: 640100, names: ['银川市', '银川'] },
  { id: 630100, names: ['西宁市', '西宁'] },
  { id: 320200, names: ['无锡市', '无锡'] },
  { id: 330200, names: ['宁波市', '宁波'] },
  { id: 340100, names: ['合肥市', '合肥'] },
  { id: 360100, names: ['南昌市', '南昌'] },
  { id: 370100, names: ['济南市', '济南'] },
  { id: 440600, names: ['佛山市', '佛山'] },
  { id: 441900, names: ['东莞市', '东莞'] },
  { id: 540100, names: ['拉萨市', '拉萨'] },
  { id: 340000, names: ['安徽省', '安徽'] },
  { id: 370000, names: ['山东省', '山东'] },
  { id: 360000, names: ['江西省', '江西'] },
  { id: 410000, names: ['河南省', '河南'] },
  { id: 430000, names: ['湖南省', '湖南'] },
  { id: 210000, names: ['辽宁省', '辽宁'] },
  { id: 230000, names: ['黑龙江省', '黑龙江'] },
  { id: 520000, names: ['贵州省', '贵州'] },
  { id: 460000, names: ['海南省', '海南'] },
  { id: 640000, names: ['宁夏回族自治区', '宁夏'] },
  { id: 630000, names: ['青海省', '青海'] },
  { id: 540000, names: ['西藏自治区', '西藏'] },
]

export type RegionSeedRow = { id: number; name: string; level: number; parentId: number }

function inferRegionLevel(id: number): number {
  if (id === 100000) return 1
  if (id % 10000 === 0) return 2
  if (id % 100 === 0) return 3
  return 4
}

function inferRegionParentId(id: number): number {
  if (id === 100000) return 0
  if (id % 10000 === 0) return 100000
  if (id % 100 === 0) return Math.floor(id / 10000) * 10000
  return Math.floor(id / 100) * 100
}

/** 供回填脚本写入 Region 表（按 level 升序） */
export function buildRegionSeedRows(): RegionSeedRow[] {
  const rows: RegionSeedRow[] = [
    { id: 100000, name: '中国', level: 1, parentId: 0 },
  ]
  for (const entry of REGION_ENTRIES) {
    rows.push({
      id: entry.id,
      name: entry.names[0],
      level: inferRegionLevel(entry.id),
      parentId: inferRegionParentId(entry.id),
    })
  }
  return rows.sort((a, b) => a.level - b.level || a.id - b.id)
}

export function regionDisplayName(regionId: number): string | null {
  const entry = REGION_ENTRIES.find((e) => e.id === regionId)
  return entry?.names[0] ?? null
}

const ALIAS_TO_ID = new Map<string, number>()

function registerAlias(name: string, id: number): void {
  const norm = normalizeValue(name)
  if (!norm) return
  ALIAS_TO_ID.set(norm, id)
}

for (const entry of REGION_ENTRIES) {
  for (const name of entry.names) {
    registerAlias(name, entry.id)
  }
}

/** cityCode 字符串 → regionId（无效则 null） */
export function regionIdFromCityCode(cityCode: string | null | undefined): number | null {
  if (!cityCode?.trim()) return null
  const n = Number.parseInt(cityCode.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 输入片段是否为已知地名 */
export function regionIdForAlias(token: string): number | null {
  const norm = normalizeValue(token)
  if (!norm) return null
  return ALIAS_TO_ID.get(norm) ?? null
}

export function regionFacetRaw(regionId: number): string {
  return `rgn:${regionId}`
}

/** 判断 kw 值是否应因地名 facet 而排除计分 */
export function isRegionKwValue(kwValue: string): boolean {
  return regionIdForAlias(kwValue) != null
}

/** 从 primary 片段收集已解析为地名的标签（用于抑制 kw:地名） */
export function regionLabelsFromSegments(segments: string[]): Set<string> {
  const out = new Set<string>()
  for (const seg of segments) {
    if (regionIdForAlias(seg) != null) {
      out.add(normalizeValue(seg))
    }
  }
  return out
}
