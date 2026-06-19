/** Haversine 公式：计算两点间的直线距离（公里） */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

/** 模糊化距离显示 */
export function fuzzyDistance(km: number): string {
  if (km < 1) return '< 1km'
  if (km < 3) return '~2km'
  if (km < 5) return '~4km'
  if (km < 10) return '~8km'
  if (km < 20) return '~15km'
  if (km < 50) return '~30km'
  return `> 50km`
}
