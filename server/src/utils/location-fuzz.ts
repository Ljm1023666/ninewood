/**
 * 位置模糊工具 — 精确定位加 50m 噪声后存储，原始坐标永不落库
 */

export function fuzzLocation(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  // 0.00045 度 ≈ 50m，随机方向偏移
  const jitter = () => (Math.random() - 0.5) * 0.0009
  return {
    lat: Math.round((lat + jitter()) * 1e6) / 1e6,
    lng: Math.round((lng + jitter()) * 1e6) / 1e6,
  }
}

/**
 * 行政区划层级模拟距离 — 开发阶段用
 * level diff: 0=同区, 1=同市不同区, 2=同省不同市, 3+=跨省
 */
export function simulatedDistanceLabel(
  levelDiff: number,
): { distanceKm: number; label: string } {
  if (levelDiff <= 0) return { distanceKm: 0, label: '同区' }
  if (levelDiff === 1)
    return { distanceKm: 5 + Math.floor(Math.random() * 15), label: '约 5-20 公里' }
  if (levelDiff === 2)
    return {
      distanceKm: 20 + Math.floor(Math.random() * 180),
      label: '同城/附近',
    }
  return { distanceKm: 200, label: '跨区' }
}

/**
 * 确定性距离（基于 region ID hash，避免每次刷新不同）
 */
export function deterministicDistanceKm(r1: number, r2: number): number {
  const seed = r1 * 10000 + r2
  const r = Math.sin(seed) * 10000
  return 1 + (r - Math.floor(r)) * 49 // 1-50 km
}
