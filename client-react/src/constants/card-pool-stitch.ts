import { taxonomySpectrumColorForNodeId } from '@/components/card-pool/taxonomy'

/** Stitch 定稿：按分类节点锁定的强调色（优先于数量档位/哈希） */
const STITCH_NODE_ACCENTS: Record<string, string> = {
  // 车辆/出行
  'ofa-wash': '#22d3ee',
  'ofa-film': '#c084fc',
  'ofa-repair': '#fb923c',
  'ofa-tow': '#94a3b8',
  'ofa-charge': '#4ade80',
  'ofa-chauffeur': '#facc15',
  'ofa-inspect': '#f59e0b',
  // 线上服务（L2 子类）
  'ol-design': '#fb923c',
  'ol-content': '#38bdf8',
  'ol-ecom': '#f97316',
  'ol-pro': '#fbbf24',
  'ol-voice': '#e879f9',
  'ol-write': '#fb923c',
  'ol-music': '#fb7185',
  'ol-misc': '#a78bfa',
  'ol-dev': '#ca8a04',
  'ol-edu': '#a855f7',
  'of-travel': '#ea580c',
}

export function stitchAccentForNode(nodeId: string): string {
  return (
    STITCH_NODE_ACCENTS[nodeId] ??
    taxonomySpectrumColorForNodeId(nodeId) ??
    '#38bdf8'
  )
}

/** 叠层卡包正面渐变 */
export function stitchTileFaceGradient(accent: string): string {
  return `linear-gradient(168deg, color-mix(in srgb, ${accent} 88%, #ffffff 12%) 0%, ${accent} 30%, color-mix(in srgb, ${accent} 42%, #14141a) 58%, #1a1a20 82%, #0c0c10 100%)`
}

/** Stitch 画布参考（1376×768 桌面） */
export const STITCH_CARD_POOL = {
  gridCols: 3,
  gridGapPx: 16,
  tileHeightPx: 96,
  tileRadiusPx: 14,
  packWidthPx: 68,
  packHeightPx: 72,
} as const
